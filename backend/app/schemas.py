from pydantic import BaseModel, EmailStr
from datetime import date

class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    role: str = "employee"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    accessToken: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str

class ProfileOut(BaseModel):
    email: str
    full_name: str
    birth_date: date | None
    employee_number: str
    position: str
    work_start_date: date | None
    class Config:
        from_attributes = True

class MeOut(BaseModel):
    role: str
    profile: ProfileOut | None