from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import (
    Column,
    Date,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
    select,
)
from sqlalchemy.orm import Session, relationship

from .config import settings
from .db import Base, get_db
from .department import Department
from .profile import EmployeeProfile
from .schemas import (
    AssignEmployeeDepartmentIn,
    DepartmentCreateIn,
    DepartmentEmployeeOut,
    DepartmentOut,
    DepartmentUpdateIn,
    LoginIn,
    ProfileOut,
    RegisterIn,
    ScheduleDayUpsertIn,
    ScheduleEntryOut,
    ScheduleMonthOut,
    ScheduleRangeResultOut,
    ScheduleRangeUpsertIn,
    TokenOut,
    UserOut,
)
from .security import create_access_token, hash_password, verify_password
from .user import User

router = APIRouter()
bearer = HTTPBearer()


def _http_401(detail: str = "Invalid token") -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def _http_403(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def get_current_user(
        creds: HTTPAuthorizationCredentials = Depends(bearer),
        db: Session = Depends(get_db),
) -> User:
    token = creds.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
        sub = payload.get("sub")
        if not sub:
            raise _http_401()
    except JWTError:
        raise _http_401()

    user = db.execute(select(User).where(User.email == sub)).scalar_one_or_none()
    if not user:
        raise _http_401("User not found")
    return user


def get_user_by_id(db: Session, user_id: int) -> User:
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def require_manager(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "manager":
        raise _http_403("Manager role required")
    return current_user


def assert_manager_can_edit_target(manager: User, target: User) -> None:
    if target.role == "manager" and target.id != manager.id:
        raise _http_403("You cannot edit another manager")


def assert_user_is_manager(db: Session, user_id: int) -> None:
    u = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Manager user not found")
    if u.role != "manager":
        raise HTTPException(status_code=400, detail="manager_user_id must reference a user with role=manager")


def _month_bounds(month: str) -> tuple[date, date]:
    """Return [first_day, next_month_first) bounds for YYYY-MM."""
    year = int(month[:4])
    mon = int(month[5:7])
    first_day = date(year, mon, 1)
    next_month_first = date(year + 1, 1, 1) if mon == 12 else date(year, mon + 1, 1)
    return first_day, next_month_first


# -------------------------------
# -----------| AUTH |------------
# -------------------------------


@router.post("/auth/register", response_model=UserOut)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    existing = db.execute(select(User.id).where(User.email == data.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        password_hash = hash_password(data.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = User(
        email=data.email,
        password_hash=password_hash,
        role=data.role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut(id=user.id, email=user.email, role=user.role)


@router.post("/auth/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == data.email)).scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(sub=user.email, role=user.role)
    return TokenOut(accessToken=token)


# ------------------------------
# ----------| PROFILE |---------
# ------------------------------


# отримати профіль поточного користувача
@router.get("/profile/me", response_model=ProfileOut)
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.execute(
        select(EmployeeProfile).where(EmployeeProfile.email == current_user.email)
    ).scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return ProfileOut(
        email=profile.email,
        full_name=profile.full_name,
        birth_date=profile.birth_date,
        employee_number=profile.employee_number,
        position=profile.position,
        work_start_date=profile.work_start_date,
        department_id=profile.department_id,
        department_name=profile.department.name if profile.department else None,
    )


# ------------------------------
# --------| DEPARTMENT |--------
# ------------------------------


@router.get("/departments/display", response_model=list[DepartmentOut])
def display_all_departments(
        _: User = Depends(require_manager),
        db: Session = Depends(get_db),
):
    items = db.execute(select(Department).order_by(Department.name.asc())).scalars().all()
    return items


@router.get("/department/display/me/employees", response_model=list[DepartmentEmployeeOut])
def display_my_employees(
        manager: User = Depends(require_manager),
        db: Session = Depends(get_db),
):
    dep = db.execute(
        select(Department).where(Department.manager_user_id == manager.id)
    ).scalar_one_or_none()

    if not dep:
        return []

    rows = (
        db.execute(
            select(User.id, EmployeeProfile.email, EmployeeProfile.full_name)
            .join(EmployeeProfile, EmployeeProfile.email == User.email)
            .where(EmployeeProfile.department_id == dep.id)
            .order_by(func.lower(func.coalesce(EmployeeProfile.full_name, "")))
        )
        .all()
    )

    return [
        DepartmentEmployeeOut(user_id=user_id, email=email, full_name=full_name)
        for user_id, email, full_name in rows
    ]


@router.post("/department/create", response_model=DepartmentOut, status_code=201)
def create_department(
        payload: DepartmentCreateIn,
        _: User = Depends(require_manager),
        db: Session = Depends(get_db),
):
    if payload.manager_user_id is not None:
        assert_user_is_manager(db, payload.manager_user_id)

    dep = Department(name=payload.name, manager_user_id=payload.manager_user_id)
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep


@router.put("/department/add/{user_id}")
def assign_employee_department(
        user_id: int,
        payload: AssignEmployeeDepartmentIn,
        manager: User = Depends(require_manager),
        db: Session = Depends(get_db),
):
    target = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    assert_manager_can_edit_target(manager, target)

    prof = db.execute(select(EmployeeProfile).where(EmployeeProfile.email == target.email)).scalar_one_or_none()
    if not prof:
        prof = EmployeeProfile(email=target.email)
        db.add(prof)

    if payload.department_id is None:
        prof.department_id = None
    else:
        dep = db.execute(select(Department).where(Department.id == payload.department_id)).scalar_one_or_none()
        if not dep:
            raise HTTPException(status_code=404, detail="Department not found")
        prof.department_id = dep.id

    db.commit()
    return {"ok": True, "department_id": prof.department_id}


@router.put("/departments/update/{department_id}", response_model=DepartmentOut)
def update_department(
        department_id: int,
        payload: DepartmentUpdateIn,
        _: User = Depends(require_manager),
        db: Session = Depends(get_db),
):
    dep = db.execute(select(Department).where(Department.id == department_id)).scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Department not found")

    data = payload.model_dump(exclude_unset=True)
    if "manager_user_id" in data and data["manager_user_id"] is not None:
        assert_user_is_manager(db, data["manager_user_id"])

    for k, v in data.items():
        setattr(dep, k, v)

    db.commit()
    db.refresh(dep)
    return dep


# --------------------------------
# ----------| SCHEDULE |----------
# --------------------------------


class WorkEntry(Base):
    __tablename__ = "work_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    date = Column(Date, nullable=False, index=True)
    type = Column(String(16), nullable=False)  # shift/off/leave/sick/trip/other

    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    title = Column(Text, nullable=True)

    user = relationship("User", lazy="joined")

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_work_entries_user_date"),
    )


# отримати графік за певний місяць
@router.get("/schedule/display/me", response_model=ScheduleMonthOut)
def get_my_month_schedule(
        month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
):
    first_day, next_month_first = _month_bounds(month)

    entries = db.execute(
        select(WorkEntry)
        .where(WorkEntry.user_id == current_user.id)
        .where(WorkEntry.date >= first_day)
        .where(WorkEntry.date < next_month_first)
        .order_by(WorkEntry.date.asc())
    ).scalars().all()

    return ScheduleMonthOut(month=month, entries=entries)


# для менеджера - отримати графік будь-якого співробітника
@router.get("/schedule/display/{user_id}", response_model=ScheduleMonthOut)
def get_user_schedule_for_month(
        user_id: int,
        month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
        _: User = Depends(require_manager),
        db: Session = Depends(get_db),
):
    user = get_user_by_id(db, user_id)
    first_day, next_month_first = _month_bounds(month)

    entries = db.execute(
        select(WorkEntry)
        .where(WorkEntry.user_id == user.id)
        .where(WorkEntry.date >= first_day)
        .where(WorkEntry.date < next_month_first)
        .order_by(WorkEntry.date.asc())
    ).scalars().all()

    return ScheduleMonthOut(month=month, entries=entries)


# для менеджера - вставити подію в графік будь-якого співробітника
@router.put("/schedule/add/day/{user_id}", response_model=ScheduleEntryOut)
def add_user_schedule_for_day(
        user_id: int,
        payload: ScheduleDayUpsertIn,
        manager: User = Depends(require_manager),
        db: Session = Depends(get_db),
):
    target = get_user_by_id(db, user_id)
    assert_manager_can_edit_target(manager, target)

    entry = db.execute(
        select(WorkEntry)
        .where(WorkEntry.user_id == target.id)
        .where(WorkEntry.date == payload.date)
    ).scalar_one_or_none()

    if not entry:
        entry = WorkEntry(user_id=target.id, date=payload.date)
        db.add(entry)

    entry.type = payload.type
    entry.start_time = payload.start_time
    entry.end_time = payload.end_time
    entry.title = payload.title

    db.commit()
    db.refresh(entry)
    return entry


# для менеджера - вставити в графік будь-якого співробітника діапазон подій
@router.put("/schedule/add/range/{user_id}/", response_model=ScheduleRangeResultOut)
def add_user_schedule_for_range(
        user_id: int,
        payload: ScheduleRangeUpsertIn,
        manager: User = Depends(require_manager),
        db: Session = Depends(get_db),
):
    target = get_user_by_id(db, user_id)
    assert_manager_can_edit_target(manager, target)

    dates: list[date] = []
    cur = payload.start_date
    while cur <= payload.end_date:
        if payload.weekdays is None or cur.weekday() in payload.weekdays:
            dates.append(cur)
        cur += timedelta(days=1)

    if not dates:
        return ScheduleRangeResultOut(created=0, updated=0, skipped=0)

    existing = db.execute(
        select(WorkEntry)
        .where(WorkEntry.user_id == target.id)
        .where(WorkEntry.date.in_(dates))
    ).scalars().all()

    by_date = {e.date: e for e in existing}

    created = updated = skipped = 0

    for d in dates:
        entry = by_date.get(d)

        if entry and not payload.overwrite:
            skipped += 1
            continue

        if not entry:
            entry = WorkEntry(user_id=target.id, date=d)
            db.add(entry)
            created += 1
        else:
            updated += 1

        entry.type = payload.type
        entry.start_time = payload.start_time
        entry.end_time = payload.end_time
        entry.title = payload.title

    db.commit()
    return ScheduleRangeResultOut(created=created, updated=updated, skipped=skipped)


# для менеджера - видалити запис в графіку будь-якого співробітника
@router.delete("/schedule/delete/day/{user_id}")
def delete_user_schedule_for_day(
        user_id: int,
        date_str: str = Query(..., alias="date", pattern=r"^\d{4}-\d{2}-\d{2}$"),
        manager: User = Depends(require_manager),
        db: Session = Depends(get_db),
):
    target = get_user_by_id(db, user_id)
    assert_manager_can_edit_target(manager, target)

    y, m, d = date_str.split("-")
    day = date(int(y), int(m), int(d))

    entry = db.execute(
        select(WorkEntry)
        .where(WorkEntry.user_id == target.id)
        .where(WorkEntry.date == day)
    ).scalar_one_or_none()

    if not entry:
        return {"ok": True}

    db.delete(entry)
    db.commit()
    return {"ok": True}