from pydantic import BaseModel, EmailStr, Field, model_validator, field_validator
from datetime import date, time, datetime
from typing import Literal, Optional

# -------------------------------
# -----------| AUTH |------------
# -------------------------------

Role = Literal["employee", "manager"]

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: Role = "employee"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    accessToken: str

# -------------------------------
# ----------| EMPLOYEE |---------
# -------------------------------

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str

class ProfileCreateIn(BaseModel):
    full_name: Optional[str] = None
    birth_date: Optional[date] = None
    employee_number: Optional[str] = None
    position: Optional[str] = None
    work_start_date: Optional[date] = None
    department_id: Optional[int] = None

class ProfileOut(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    birth_date: Optional[date] = None
    employee_number: Optional[str] = None
    position: Optional[str] = None
    work_start_date: Optional[date] = None

    department_id: Optional[int] = None
    department_name: Optional[str] = None

    class Config:
        from_attributes = True

# ------------------------------
# --------| DEPARTMENT |--------
# ------------------------------

class DepartmentOut(BaseModel):
    id: int
    name: str
    manager_user_id: Optional[int] = None

    class Config:
        from_attributes = True

class DepartmentEmployeeOut(BaseModel):
    user_id: int
    email: str
    full_name: Optional[str] = None

class DepartmentCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=128)
    manager_user_id: Optional[int] = None

class DepartmentUpdateIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=128)
    manager_user_id: Optional[int] = None

class AssignEmployeeDepartmentIn(BaseModel):
    department_id: Optional[int] = None

# --------------------------------
# ----------| SCHEDULE |----------
# --------------------------------

EntryType = Literal["shift", "off", "vacation", "sick", "trip", "other"]

class ScheduleEntryOut(BaseModel):
    date: date
    type: EntryType
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    title: Optional[str] = None

    class Config:
        from_attributes = True

class ScheduleMonthOut(BaseModel):
    month: str
    entries: list[ScheduleEntryOut]

class ScheduleDayUpsertIn(BaseModel):
    date: date
    type: EntryType
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    title: Optional[str] = None

    @field_validator("start_time", "end_time", mode="before")
    @classmethod
    def empty_string_to_none(cls, v):
        if v is None:
            return None
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    @model_validator(mode="after")
    def validate_times(self):
        if self.type == "shift":
            if not self.start_time or not self.end_time:
                raise ValueError("shift requires start_time and end_time")

        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValueError("start_time must be earlier than end_time")

        return self

class ScheduleRangeUpsertIn(BaseModel):
    start_date: date
    end_date: date
    type: EntryType

    weekdays: Optional[list[int]] = Field(default=None, description="0=Tue..6=Mon")

    start_time: Optional[time] = None
    end_time: Optional[time] = None
    title: Optional[str] = None

    overwrite: bool = True

    @field_validator("start_time", "end_time", mode="before")
    @classmethod
    def empty_string_to_none(cls, v):
        if v is None:
            return None
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    @model_validator(mode="after")
    def validate_range(self):
        if self.start_date > self.end_date:
            raise ValueError("start_date must be <= end_date")

        if self.weekdays is not None:
            bad = [d for d in self.weekdays if d < 0 or d > 6]
            if bad:
                raise ValueError("weekdays must contain only values 0..6")

        if self.type == "shift":
            if not self.start_time or not self.end_time:
                raise ValueError("shift requires start_time and end_time")
            if self.start_time >= self.end_time:
                raise ValueError("start_time must be earlier than end_time")
        else:
            if self.start_time and self.end_time and self.start_time >= self.end_time:
                raise ValueError("start_time must be earlier than end_time")

        return self

class ScheduleRangeResultOut(BaseModel):
    created: int
    updated: int
    skipped: int

# --------------------------------
# -------| SERVICE REQUEST |-------
# --------------------------------

class ServiceRequestCreateIn(BaseModel):
    type: Literal["off", "vacation", "sick"]
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date > self.end_date:
            raise ValueError("start_date must be <= end_date")
        return self

class ServiceRequestOut(BaseModel):
    id: int
    user_id: int
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None
    type: str
    start_date: date
    end_date: date
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

    @model_validator(mode="before")
    @classmethod
    def extract_user_info(cls, data):
        if hasattr(data, "user") and data.user:
            data.user_email = data.user.email
            if hasattr(data.user, "profile") and data.user.profile:
                data.user_full_name = data.user.profile.full_name
        return data

class ServiceRequestUpdateStatusIn(BaseModel):
    status: Literal["approved", "rejected"]