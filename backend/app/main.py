from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    auth,
    customers,
    halls,
    movies,
    reservations,
    screenings,
)

app = FastAPI(
    title="System Zarzadzania Kinoteatrem",
    description="Cinema Management System - REST API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(movies.router)
app.include_router(halls.router)
app.include_router(screenings.router)
app.include_router(customers.router)
app.include_router(reservations.router)


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "service": "kinoteatr-api"}


@app.get("/health", tags=["health"])
def health():
    return {"status": "healthy"}
