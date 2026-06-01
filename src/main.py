"""
KbaseSME FastAPI App — E4-x
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from monitoring import setup_logging, add_monitoring_middleware
from routers import health, query, documents, logs, line

setup_logging(os.getenv("LOG_LEVEL", "INFO"))

app = FastAPI(
    title="KbaseSME API",
    version="0.1.0",
    docs_url="/docs" if os.getenv("APP_ENV") != "production" else None,
    redoc_url=None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

add_monitoring_middleware(app)

# Routers
app.include_router(health.router)
app.include_router(query.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(logs.router, prefix="/api")
app.include_router(line.router)
