from __future__ import annotations

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..db.database import get_db
from ..db.models.service_request import ServiceRequest
from ..db.models.work_entry import WorkEntry
from ..db.models.user import User
from ..db.models.profile import EmployeeProfile
from ..db.models.department import Department
from ..schemas import ServiceRequestCreateIn, ServiceRequestOut, ServiceRequestUpdateStatusIn
from ..dependencies import get_current_user, require_manager
from ..logger import log_schedule_change

router = APIRouter(tags=["service_requests"])

def apply_request_to_schedule(db: Session, req: ServiceRequest, manager: User):
    """Прикладає схвалену заявку до розкладу."""
    dates = [
        req.start_date + timedelta(days=x)
        for x in range((req.end_date - req.start_date).days + 1)
    ]

    existing = db.execute(
        select(WorkEntry)
        .where(WorkEntry.user_id == req.user_id)
        .where(WorkEntry.date.in_(dates))
    ).scalars().all()
    by_date = {e.date: e for e in existing}

    to_add = []
    for d in dates:
        entry = by_date.get(d)
        if not entry:
            entry = WorkEntry(user_id=req.user_id, date=d)
            to_add.append(entry)

        entry.type = req.type
        entry.start_time = None
        entry.end_time = None
        entry.title = f"Approved {req.type}"

    if to_add:
        db.add_all(to_add)

    log_schedule_change(
        author=manager,
        target_user=req.user,
        date=f"{req.start_date} - {req.end_date}",
        action="заявка схвалена",
        details=f"Тип: {req.type}"
    )

@router.post("/service-requests", response_model=ServiceRequestOut)
def create_service_request(
    payload: ServiceRequestCreateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    status = "pending"

    req = ServiceRequest(
        user_id=current_user.id,
        type=payload.type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=status
    )
    db.add(req)
    db.flush()  # Отримуємо ID
    
    db.commit()
    db.refresh(req)
    return req

@router.get("/service-requests/me", response_model=list[ServiceRequestOut])
def get_my_service_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return (
        db.execute(
            select(ServiceRequest)
            .where(ServiceRequest.user_id == current_user.id)
            .options(joinedload(ServiceRequest.user).joinedload(User.profile))
            .order_by(ServiceRequest.created_at.desc())
        )
        .scalars()
        .all()
    )

@router.get("/service-requests", response_model=list[ServiceRequestOut])
def get_all_service_requests(
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    # Знаходимо підрозділи, якими керує цей менеджер
    managed_depts = db.execute(
        select(Department.id).where(Department.manager_user_id == manager.id)
    ).scalars().all()

    if not managed_depts:
        return []

    return (
        db.execute(
            select(ServiceRequest)
            .join(User, ServiceRequest.user_id == User.id)
            .join(EmployeeProfile, User.email == EmployeeProfile.email)
            .where(EmployeeProfile.department_id.in_(managed_depts))
            .options(joinedload(ServiceRequest.user).joinedload(User.profile))
            .order_by(ServiceRequest.created_at.desc())
        )
        .scalars()
        .all()
    )

@router.patch("/service-requests/{request_id}", response_model=ServiceRequestOut)
def update_service_request_status(
    request_id: int,
    payload: ServiceRequestUpdateStatusIn,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    req = (
        db.execute(
            select(ServiceRequest)
            .where(ServiceRequest.id == request_id)
            .options(joinedload(ServiceRequest.user).joinedload(User.profile))
        )
        .scalar_one_or_none()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Перевірка: чи належить користувач до підрозділу, яким керує менеджер
    managed_depts = db.execute(
        select(Department.id).where(Department.manager_user_id == manager.id)
    ).scalars().all()
    
    user_dept_id = None
    if req.user and req.user.profile:
        user_dept_id = req.user.profile.department_id
    
    if user_dept_id not in managed_depts:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Ви не можете керувати заявками працівників інших підрозділів"
        )

    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request is already processed")

    req.status = payload.status
    
    if payload.status == "approved":
        apply_request_to_schedule(db, req, manager)

    db.commit()
    db.refresh(req)
    return req
