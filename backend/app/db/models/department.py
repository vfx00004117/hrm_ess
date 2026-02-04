from __future__ import annotations
from sqlalchemy import Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, mapped_column, Mapped
from ..database import Base


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    manager_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    manager = relationship("User", foreign_keys=[manager_user_id], lazy="joined")
    employees = relationship("EmployeeProfile", back_populates="department")

    __table_args__ = (
        UniqueConstraint("name", name="uq_departments_name"),
    )
