from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="employee")  # employee | manager

    profile = relationship("EmployeeProfile", back_populates="user", uselist=False, cascade="all,delete", primaryjoin="User.email == EmployeeProfile.email",)