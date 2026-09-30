from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import engine, get_db
from app.errors import (
    ErrorResponse,
    ValidationErrorResponse,
    register_error_handlers,
)
from app.routes.opportunities import router as opportunities_router


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    """Release pooled database connections when the server shuts down."""
    try:
        yield
    finally:
        engine.dispose()


api = FastAPI(
    title="University Research Opportunity Portal",
    description="REST API for managing university research opportunities.",
    version="0.1.0",
    lifespan=lifespan,
    responses={
        400: {"model": ValidationErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)

register_error_handlers(api)


@api.get("/api/health", tags=["Health"])
def health_check(
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    """Report success only when the application can reach MySQL."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection failed.",
        ) from None

    return {"status": "ok", "database": "connected"}


api.include_router(opportunities_router)


def custom_openapi() -> dict[str, Any]:
    """Make the generated documentation match our actual error responses."""
    if api.openapi_schema is not None:
        return api.openapi_schema

    schema = get_openapi(
        title=api.title,
        version=api.version,
        description=api.description,
        routes=api.routes,
    )

    for path in schema["paths"].values():
        for operation in path.values():
            if not isinstance(operation, dict) or "responses" not in operation:
                continue

            responses = operation["responses"]
            responses.pop("422", None)

            for code, model_name in (
                ("400", "ValidationErrorResponse"),
                ("404", "ErrorResponse"),
                ("500", "ErrorResponse"),
            ):
                if code in responses:
                    responses[code]["content"] = {
                        "application/json": {
                            "schema": {
                                "$ref": f"#/components/schemas/{model_name}"
                            }
                        }
                    }

    api.openapi_schema = schema
    return schema


api.openapi = custom_openapi

settings = get_settings()

# Wrap the entire API so even unexpected 500 responses receive CORS headers.
app = CORSMiddleware(
    app=api,
    allow_origins=[settings.frontend_origin],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)