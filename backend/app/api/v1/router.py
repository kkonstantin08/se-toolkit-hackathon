from fastapi import APIRouter

from app.api.v1.endpoints import ai, auth, integrations, items, planner, reminders

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(items.router, prefix="/items", tags=["items"])
api_router.include_router(planner.router, prefix="/planner", tags=["planner"])
api_router.include_router(reminders.router, prefix="/reminders", tags=["reminders"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])

