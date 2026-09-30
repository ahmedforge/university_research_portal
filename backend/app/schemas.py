from datetime import date, datetime
from typing import Annotated, Any, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, model_validator


OpportunityStatus = Literal["Open", "Closed"]

Title = Annotated[str, Field(min_length=1, max_length=200)]
ResearchArea = Annotated[str, Field(min_length=1, max_length=100)]
PersonName = Annotated[str, Field(min_length=1, max_length=150)]
Department = Annotated[str, Field(min_length=1, max_length=150)]

# MySQL TEXT has a byte limit. This character limit leaves room for UTF-8.
LongText = Annotated[str, Field(min_length=1, max_length=16000)]

Positions = Annotated[
    int,
    Field(strict=True, ge=1, le=2147483647),
]


def validate_deadline(value: date) -> date:
    """Allow today or a future date, using the backend machine's local date."""
    if value < date.today():
        raise ValueError("Application deadline must be today or in the future.")
    return value


ApplicationDeadline = Annotated[date, AfterValidator(validate_deadline)]


class OpportunityInput(BaseModel):
    """Common rules for incoming opportunity data."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )


class OpportunityCreate(OpportunityInput):
    """Required fields for creating a research opportunity."""

    title: Title
    description: LongText
    research_area: ResearchArea
    faculty_name: PersonName
    department: Department
    required_skills: LongText
    positions_available: Positions
    application_deadline: ApplicationDeadline
    status: OpportunityStatus = "Open"


class OpportunityUpdate(OpportunityInput):
    """Validate only the fields included in an update request."""

    title: Title | None = None
    description: LongText | None = None
    research_area: ResearchArea | None = None
    faculty_name: PersonName | None = None
    department: Department | None = None
    required_skills: LongText | None = None
    positions_available: Positions | None = None
    application_deadline: ApplicationDeadline | None = None
    status: OpportunityStatus | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_empty_or_null_updates(cls, value: Any) -> Any:
        if isinstance(value, dict):
            if not value:
                raise ValueError("Provide at least one field to update.")

            if any(item is None for item in value.values()):
                raise ValueError("Updated fields cannot be null.")

        return value


class OpportunityResponse(BaseModel):
    """Return stored data, including database-generated fields."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    research_area: str
    faculty_name: str
    department: str
    required_skills: str
    positions_available: int
    application_deadline: date
    status: OpportunityStatus
    created_at: datetime
    updated_at: datetime
