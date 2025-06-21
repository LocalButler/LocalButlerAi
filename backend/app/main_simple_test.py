import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Local Butler AI Backend - Simple Test",
    description="Simple test backend for the Local Butler AI application.",
    version="0.1.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"]
)

# Request/Response models
class UserQueryInput(BaseModel):
    query: str
    session_id: Optional[str] = None

class AgentResponseOutput(BaseModel):
    session_id: str
    text_response: str
    structured_output: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

@app.get("/")
async def read_root():
    """Simple health check endpoint."""
    logger.info("Root endpoint '/' was accessed.")
    return {"message": "Welcome to the Local Butler AI Backend - Simple Test!", "status": "ok"}

@app.post("/chat/", response_model=AgentResponseOutput)
async def chat_with_butler(request: UserQueryInput):
    session_id = request.session_id or str(uuid.uuid4())
    logger.info(f"Received chat request for session '{session_id}': Query: '{request.query}'")

    try:
        # Simple echo response for testing
        response_text = f"Hello! You said: '{request.query}'. This is a test response from the Butler AI backend."
        
        return AgentResponseOutput(
            session_id=session_id,
            text_response=response_text,
            structured_output=None
        )

    except Exception as e:
        logger.error(f"Error during chat processing for session '{session_id}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
