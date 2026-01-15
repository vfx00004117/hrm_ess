from datetime import date, datetime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy import Integer, String, Date, ForeignKey, DateTime, func
from .db import Base

class EmployeeProfile(Base):
    __tablename__ = "employee_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(ForeignKey("users.email", ondelete="CASCADE"), unique=True, index=True, nullable=False)

    full_name: Mapped[str] = mapped_column(String, nullable=False)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    employee_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    position: Mapped[str] = mapped_column(String, nullable=False)
    work_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="profile", primaryjoin="EmployeeProfile.email == User.email",)
