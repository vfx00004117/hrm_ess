from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import Column, Date, Integer, String, Time, Text, ForeignKey, UniqueConstraint, select
from sqlalchemy.orm import Session, relationship
from jose import jwt, JWTError

from .db import Base, get_db
from .department import Department
from .profile import EmployeeProfile
from .user import User
from .schemas import RegisterIn, LoginIn, TokenOut, UserOut, ProfileOut, ScheduleEntryOut, ScheduleDayUpsertIn, \
    ScheduleMonthOut, ScheduleRangeUpsertIn, ScheduleRangeResultOut, DepartmentOut, DepartmentCreateIn, \
    DepartmentUpdateIn, AssignEmployeeDepartmentIn
from .security import hash_password, verify_password, create_access_token
from .config import settings
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

router = APIRouter()
bearer = HTTPBearer()



def get_current_user(
        creds: HTTPAuthorizationCredentials = Depends(bearer),
        db: Session = Depends(get_db),
) -> User:
    token = creds.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.email == sub).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("/auth/register", response_model=UserOut)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if data.role not in ("employee", "manager"):
        raise HTTPException(status_code=400, detail="Invalid role")

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
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(sub=user.email, role=user.role)
    return TokenOut(accessToken=token)

# отримати профіль поточного користувача
@router.get("/me/profile", response_model=ProfileOut)
def me_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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



def require_manager(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager role required")
    return current_user

@router.put("/employees/{user_id}/department")
def assign_employee_department(
        user_id: int,
        payload: AssignEmployeeDepartmentIn,
        manager: User = Depends(require_manager),
        db: Session = Depends(get_db),
):
    target_user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.role == "manager" and target_user.id != manager.id:
        raise HTTPException(status_code=403, detail="You cannot edit another manager")

    prof = db.execute(select(EmployeeProfile).where(EmployeeProfile.email == target_user.email)).scalar_one_or_none()
    if not prof:
        prof = EmployeeProfile(email=target_user.email)
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



def get_user_by_id(db: Session, user_id: int) -> User:
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def assert_manager_can_edit_target(manager: User, target: User) -> None:
    if target.role == "manager" and target.id != manager.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot edit another manager"
        )

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
@router.get("/schedule/me", response_model=ScheduleMonthOut)
def get_my_schedule_month(
        month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
):
    year = int(month[:4])
    mon = int(month[5:7])

    first_day = date(year, mon, 1)
    if mon == 12:
        next_month_first = date(year + 1, 1, 1)
    else:
        next_month_first = date(year, mon + 1, 1)

    entries = db.execute(
        select(WorkEntry)
        .where(WorkEntry.user_id == current_user.id)
        .where(WorkEntry.date >= first_day)
        .where(WorkEntry.date < next_month_first)
        .order_by(WorkEntry.date.asc())
    ).scalars().all()

    return ScheduleMonthOut(month=month, entries=entries)

# для менеджера - отримати графік будь-якого співробітника
@router.get("/schedule/user/{user_id}", response_model=ScheduleMonthOut)
def manager_get_user_schedule_month(
        user_id: int,
        month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
        _: User = Depends(require_manager),
        db: Session = Depends(get_db),
):
    user = get_user_by_id(db, user_id)

    year = int(month[:4])
    mon = int(month[5:7])
    first_day = date(year, mon, 1)
    next_month_first = date(year + 1, 1, 1) if mon == 12 else date(year, mon + 1, 1)

    entries = db.execute(
        select(WorkEntry)
        .where(WorkEntry.user_id == user.id)
        .where(WorkEntry.date >= first_day)
        .where(WorkEntry.date < next_month_first)
        .order_by(WorkEntry.date.asc())
    ).scalars().all()

    return ScheduleMonthOut(month=month, entries=entries)

# для менеджера - вставити подію в графік будь-якого співробітника
@router.put("/schedule/user/{user_id}/day", response_model=ScheduleEntryOut)
def manager_upsert_user_day(
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
@router.put("/schedule/user/{user_id}/range", response_model=ScheduleRangeResultOut)
def manager_upsert_user_range(
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
@router.delete("/schedule/user/{user_id}/day")
def manager_delete_user_day(
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



def assert_user_is_manager(db: Session, user_id: int) -> None:
    u = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Manager user not found")
    if u.role != "manager":
        raise HTTPException(status_code=400, detail="manager_user_id must reference a user with role=manager")

@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(
        _: User = Depends(require_manager),
        db: Session = Depends(get_db),
):
    items = db.execute(select(Department).order_by(Department.name.asc())).scalars().all()
    return items

@router.post("/departments", response_model=DepartmentOut, status_code=201)
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

@router.put("/departments/{department_id}", response_model=DepartmentOut)
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