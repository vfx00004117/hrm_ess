from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..department import Department
from ..profile import EmployeeProfile
from ..schemas import ProfileCreateIn, ProfileOut
from ..user import User
from ..dependencies import (
    assert_manager_can_edit_target,
    get_current_user,
    get_user_by_id,
    require_manager,
)

router = APIRouter(tags=["employee"])


def profile_to_out(profile: EmployeeProfile) -> ProfileOut:
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


@router.get("/employee/profile/me", response_model=ProfileOut)
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.execute(
        select(EmployeeProfile).where(EmployeeProfile.email == current_user.email)
    ).scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return profile_to_out(profile)


# FIX: було /employee/profile/add/{user.id}
@router.put("/employee/profile/add/{user_id}", response_model=ProfileOut)
def add_or_update_profile(
        user_id: int,
        payload: ProfileCreateIn,
        manager: User = Depends(require_manager),
        db: Session = Depends(get_db),
):
    target = get_user_by_id(db, user_id)
    assert_manager_can_edit_target(manager, target)

    profile = db.execute(
        select(EmployeeProfile).where(EmployeeProfile.email == target.email)
    ).scalar_one_or_none()

    if not profile:
        profile = EmployeeProfile(email=target.email)
        db.add(profile)

    data = payload.model_dump(exclude_unset=True)

    if "department_id" in data and data["department_id"] is not None:
        dep = db.execute(select(Department).where(Department.id == data["department_id"])).scalar_one_or_none()
        if not dep:
            raise HTTPException(status_code=404, detail="Department not found")

    for key, value in data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile_to_out(profile)
