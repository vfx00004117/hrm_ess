from __future__ import annotations

from datetime import date

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db.database import get_db
from .db.models.user import User

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


def require_manager(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "manager":
        raise _http_403("Manager role required")
    return current_user


def get_user_by_id(db: Session, user_id: int) -> User:
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def assert_manager_can_edit_target(manager: User, target: User) -> None:
    if target.role == "manager" and target.id != manager.id:
        raise _http_403("You cannot edit another manager")


def assert_user_is_manager(db: Session, user_id: int) -> None:
    u = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Manager user not found")
    if u.role != "manager":
        raise HTTPException(
            status_code=400,
            detail="manager_user_id must reference a user with role=manager",
        )


def month_bounds(month: str) -> tuple[date, date]:
    """Return [first_day, next_month_first) bounds for YYYY-MM."""
    year = int(month[:4])
    mon = int(month[5:7])
    first_day = date(year, mon, 1)
    next_month_first = date(year + 1, 1, 1) if mon == 12 else date(year, mon + 1, 1)
    return first_day, next_month_first
