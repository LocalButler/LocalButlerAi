# backend/app/api/v1/routers/agentz_router.py
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, ValidationError
from typing import Any, Optional
from backend.butler_agent_pkg.agent_z import save_user_data
import logging

router = APIRouter()

class AgentZSaveRequest(BaseModel):
    userId: str
    type: str
    data: Any
    sessionId: Optional[str] = None

def validate_agentz_payload(type: str, data: Any):
    if not type or not isinstance(type, str):
        return False, "Type is required and must be a string."
    if not data or not isinstance(data, dict):
        return False, "Data is required and must be an object."
    if type == 'mealPlan':
        if 'meals' not in data or not isinstance(data['meals'], list):
            return False, "Meal plan must include a 'meals' array."
    # ...add more type-specific validation as needed...
    return True, None

@router.post("/agentz/save")
async def agentz_save(request: AgentZSaveRequest):
    # Validate input
    is_valid, error_msg = validate_agentz_payload(request.type, request.data)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Validation failed: {error_msg}")
    try:
        result = save_user_data(request.userId, request.type, request.data, request.sessionId)
        return {"success": True, "result": result}
    except Exception as e:
        logging.exception("Agent Z save failed")
        raise HTTPException(status_code=500, detail=f"Agent Z save failed: {str(e)}")
