from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..db.models.work_entry import WorkEntry
from ..schemas import (
    ScheduleDayUpsertIn,
    ScheduleEntryOut,
    ScheduleMonthOut,
    ScheduleRangeResultOut,
    ScheduleRangeUpsertIn,
)
from ..db.models.user import User
from ..dependencies import (
    assert_manager_can_edit_target,
    get_current_user,
    get_user_by_id,
    month_bounds,
    require_manager,
)

router = APIRouter(tags=["schedule"])


def get_month_entries(db: Session, user_id: int, month: str) -> list[WorkEntry]:
    first_day, next_month_first = month_bounds(month)
    return (
        db.execute(
            select(WorkEntry)
            .where(WorkEntry.user_id == user_id)
            .where(WorkEntry.date >= first_day)
            .where(WorkEntry.date < next_month_first)
            .order_by(WorkEntry.date.asc())
        )
        .scalars()
        .all()
    )


@router.get("/schedule/me", response_model=ScheduleMonthOut)
def get_my_month_schedule(
        month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
):
    entries = get_month_entries(db, current_user.id, month)
    return ScheduleMonthOut(month=month, entries=entries)


@router.get("/schedule/{user_id}", response_model=ScheduleMonthOut)
def get_user_schedule_for_month(
        user_id: int,
        month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
        _: User = Depends(require_manager),
        db: Session = Depends(get_db),
):
    user = get_user_by_id(db, user_id)
    entries = get_month_entries(db, user.id, month)
    return ScheduleMonthOut(month=month, entries=entries)


@router.put("/schedule/day/{user_id}", response_model=ScheduleEntryOut)
def add_user_schedule_for_day(
        user_id: int,
        payload: ScheduleDayUpsertIn,
        manager: User = Depends(require_manager),
        db: Session = Depends(get_db),
):
    target = get_user_by_id(db, user_id)
    assert_manager_can_edit_target(manager, target)

    entry = (
        db.execute(
            select(WorkEntry)
            .where(WorkEntry.user_id == target.id)
            .where(WorkEntry.date == payload.date)
        )
        .scalar_one_or_none()
    )

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


@router.put("/schedule/range/{user_id}", response_model=ScheduleRangeResultOut)
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

    existing = (
        db.execute(
            select(WorkEntry)
            .where(WorkEntry.user_id == target.id)
            .where(WorkEntry.date.in_(dates))
        )
        .scalars()
        .all()
    )
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


@router.delete("/schedule/delete/{user_id}")
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

    entry = (
        db.execute(
            select(WorkEntry)
            .where(WorkEntry.user_id == target.id)
            .where(WorkEntry.date == day)
        )
        .scalar_one_or_none()
    )

    if not entry:
        return {"ok": True}

    db.delete(entry)
    db.commit()
    return {"ok": True}
