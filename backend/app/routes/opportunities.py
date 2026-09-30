from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ResearchOpportunity
from app.schemas import OpportunityCreate, OpportunityResponse


router = APIRouter(
    prefix="/api/opportunities",
    tags=["Research opportunities"],
)


@router.post(
    "",
    response_model=OpportunityResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"description": "Invalid opportunity data"},
        500: {"description": "Database operation failed"},
    },
)
def create_opportunity(
    payload: OpportunityCreate,
    db: Annotated[Session, Depends(get_db)],
) -> ResearchOpportunity:
    """Validate input, save one opportunity, and return its stored values."""
    opportunity = ResearchOpportunity(**payload.model_dump())

    try:
        db.add(opportunity)
        db.commit()
        db.refresh(opportunity)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create the research opportunity.",
        ) from None

    return opportunity
