from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ResearchOpportunity
from app.schemas import (
    OpportunityCreate,
    OpportunityResponse,
    OpportunityUpdate,
)


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


@router.get(
    "",
    response_model=list[OpportunityResponse],
    responses={
        500: {"description": "Database operation failed"},
    },
)
def list_opportunities(
    db: Annotated[Session, Depends(get_db)],
) -> list[ResearchOpportunity]:
    """Return all opportunities, with the newest IDs first."""
    statement = select(ResearchOpportunity).order_by(
        ResearchOpportunity.id.desc()
    )

    try:
        return list(db.scalars(statement).all())
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve research opportunities.",
        ) from None


@router.get(
    "/{opportunity_id}",
    response_model=OpportunityResponse,
    responses={
        400: {"description": "Invalid opportunity ID"},
        404: {"description": "Opportunity not found"},
        500: {"description": "Database operation failed"},
    },
)
def get_opportunity(
    opportunity_id: Annotated[int, Path(ge=1, le=2147483647)],
    db: Annotated[Session, Depends(get_db)],
) -> ResearchOpportunity:
    """Return one opportunity by its database primary key."""
    try:
        opportunity = db.get(ResearchOpportunity, opportunity_id)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve the research opportunity.",
        ) from None

    if opportunity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research opportunity not found.",
        )

    return opportunity


@router.put(
    "/{opportunity_id}",
    response_model=OpportunityResponse,
    responses={
        400: {"description": "Invalid opportunity data or ID"},
        404: {"description": "Opportunity not found"},
        500: {"description": "Database operation failed"},
    },
)
def update_opportunity(
    opportunity_id: Annotated[int, Path(ge=1, le=2147483647)],
    payload: OpportunityUpdate,
    db: Annotated[Session, Depends(get_db)],
) -> ResearchOpportunity:
    """Update only the fields supplied for an existing opportunity."""
    try:
        opportunity = db.get(ResearchOpportunity, opportunity_id)

        if opportunity is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Research opportunity not found.",
            )

        update_data = payload.model_dump(exclude_unset=True)

        for field_name, field_value in update_data.items():
            setattr(opportunity, field_name, field_value)

        db.commit()
        db.refresh(opportunity)
    except HTTPException:
        raise
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update the research opportunity.",
        ) from None

    return opportunity
