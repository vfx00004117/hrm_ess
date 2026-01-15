from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from jose import jwt, JWTError

from .db import get_db
from .profile import EmployeeProfile
from .user import User
from .schemas import RegisterIn, LoginIn, TokenOut, UserOut, MeOut, ProfileOut
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

@router.get("/me/profile", response_model=ProfileOut)
def get_my_profile(
        db: Session = Depends(get_db),
        user=Depends(get_current_user),
):
    profile = (
        db.query(EmployeeProfile)
        .filter(EmployeeProfile.email == user.email)
        .first()
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return profile