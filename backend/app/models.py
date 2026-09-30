from datetime import date, datetime

from sqlalchemy import Date, Enum, FetchedValue, Integer, String, Text, text
from sqlalchemy.dialects.mysql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ResearchOpportunity(Base):
    """Map Python attributes to the existing research_opportunities table."""

    __tablename__ = "research_opportunities"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    research_area: Mapped[str] = mapped_column(String(100), nullable=False)
    faculty_name: Mapped[str] = mapped_column(String(150), nullable=False)
    department: Mapped[str] = mapped_column(String(150), nullable=False)
    required_skills: Mapped[str] = mapped_column(Text, nullable=False)
    positions_available: Mapped[int] = mapped_column(Integer, nullable=False)
    application_deadline: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("Open", "Closed", validate_strings=True),
        nullable=False,
        server_default=text("'Open'"),
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        server_onupdate=FetchedValue(),
    )
