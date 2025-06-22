# backend/app/api/v1/routers/agentz_get_router.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Optional
from backend.butler_agent_pkg.agent_z import get_user_data
import logging

router = APIRouter()

class AgentZGetRequest(BaseModel):
    userId: str
    type: str
    filter: Optional[Any] = None
    sessionId: Optional[str] = None

def validate_agentz_get_payload(type: str, userId: str):
    if not type or not isinstance(type, str):
        return False, "Type is required and must be a string."
    if not userId or not isinstance(userId, str):
        return False, "userId is required and must be a string."
    # Add more type-specific validation as needed
    return True, None

@router.post("/agentz/get")
async def agentz_get(request: AgentZGetRequest):
    # Validate input
    is_valid, error_msg = validate_agentz_get_payload(request.type, request.userId)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Validation failed: {error_msg}")
    try:
        result = get_user_data(request.userId, request.type, request.filter, request.sessionId)
        return {"success": True, "result": result}
    except Exception as e:
        logging.exception("Agent Z get failed")
        raise HTTPException(status_code=500, detail=f"Agent Z get failed: {str(e)}")
