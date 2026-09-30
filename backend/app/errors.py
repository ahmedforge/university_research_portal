import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException


logger = logging.getLogger("uvicorn.error")


class ErrorResponse(BaseModel):
    detail: str


class ValidationIssue(BaseModel):
    field: str
    message: str


class ValidationErrorResponse(ErrorResponse):
    errors: list[ValidationIssue]


async def validation_error_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Convert request validation failures to the required 400 response."""
    errors = [
        {
            "field": ".".join(str(part) for part in error["loc"]),
            "message": error["msg"],
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": "Invalid request data.", "errors": errors},
    )


async def http_error_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    """Keep HTTP errors in a consistent format and preserve their headers."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": str(exc.detail)},
        headers=exc.headers,
    )


async def internal_error_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """Return a safe message without exposing exception details."""
    logger.error("Unhandled server error: %s", type(exc).__name__)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error."},
    )


def register_error_handlers(application: FastAPI) -> None:
    application.add_exception_handler(
        RequestValidationError, validation_error_handler
    )
    application.add_exception_handler(StarletteHTTPException, http_error_handler)
    application.add_exception_handler(SQLAlchemyError, internal_error_handler)
    application.add_exception_handler(Exception, internal_error_handler)
