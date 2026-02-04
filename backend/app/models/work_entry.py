from __future__ import annotations

from sqlalchemy import Column, Date, ForeignKey, Integer, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import relationship

from ..db import Base


class WorkEntry(Base):
    __tablename__ = "work_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    date = Column(Date, nullable=False, index=True)
    type = Column(String(16), nullable=False)

    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    title = Column(Text, nullable=True)

    user = relationship("User", lazy="joined")

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_work_entries_user_date"),
    )
