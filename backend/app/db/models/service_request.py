from datetime import date, datetime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy import Integer, String, Date, ForeignKey, DateTime, func
from ..database import Base

class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    type: Mapped[str] = mapped_column(String(16), nullable=False) # off, vacation, sick
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending") # pending, approved, rejected
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", lazy="joined")
