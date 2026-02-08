from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..db.models.department import Department
from ..db.models.profile import EmployeeProfile
from ..schemas import (
    AssignEmployeeDepartmentIn,
    DepartmentCreateIn,
    DepartmentEmployeeOut,
    DepartmentOut,
    DepartmentUpdateIn,
)
from ..db.models.user import User
from ..dependencies import (
    assert_manager_can_edit_target,
    assert_user_is_manager,
    get_user_by_id,
    require_manager,
)
from ..utils import log_profile_change

router = APIRouter(tags=["department"])


@router.get("/department/all", response_model=list[DepartmentOut])
def display_all_departments(_: User = Depends(require_manager), db: Session = Depends(get_db)):
    return db.execute(select(Department).order_by(Department.name.asc())).scalars().all()


@router.get("/department/employees", response_model=list[DepartmentEmployeeOut])
def display_my_employees(manager: User = Depends(require_manager), db: Session = Depends(get_db)):
    dep = db.execute(select(Department).where(Department.manager_user_id == manager.id)).scalar_one_or_none()
    if not dep:
        return []

    rows = (
        db.execute(
            select(User.id, EmployeeProfile.email, EmployeeProfile.full_name)
            .join(EmployeeProfile, EmployeeProfile.email == User.email)
            .where(EmployeeProfile.department_id == dep.id)
            .order_by(func.lower(func.coalesce(EmployeeProfile.full_name, "")))
        ).all()
    )

    return [DepartmentEmployeeOut(user_id=user_id, email=email, full_name=full_name) for user_id, email, full_name in rows]


@router.post("/department/create", response_model=DepartmentOut, status_code=201)
def create_department(payload: DepartmentCreateIn, _: User = Depends(require_manager), db: Session = Depends(get_db)):
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
    target = get_user_by_id(db, user_id)
    assert_manager_can_edit_target(manager, target)

    prof = db.execute(select(EmployeeProfile).where(EmployeeProfile.email == target.email)).scalar_one_or_none()
    if not prof:
        prof = EmployeeProfile(email=target.email)
        db.add(prof)
        action = "створено профіль"
    else:
        action = "оновлено профіль"

    old_dept = prof.department_id
    if payload.department_id is None:
        prof.department_id = None
    else:
        dep = db.execute(select(Department).where(Department.id == payload.department_id)).scalar_one_or_none()
        if not dep:
            raise HTTPException(status_code=404, detail="Department not found")
        prof.department_id = dep.id

    if old_dept != prof.department_id:
        db.commit()
        log_profile_change(
            author=manager,
            target_user=target,
            action=action,
            details=f"department_id: {old_dept} -> {prof.department_id}"
        )
    else:
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
