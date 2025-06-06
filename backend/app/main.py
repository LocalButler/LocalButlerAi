import logging
import os
import uuid # For generating session IDs
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from dotenv import load_dotenv

from backend.app.config import settings
from backend.app.agents.butler_agent import butler_agent  # Fix import
from backend.app.shared_libraries.types import Recipe as RecipeOutputSchema, UserProfile as UserProfileSchema  # Fix import

load_dotenv() # Load environment variables from .env file

logger = logging.getLogger(__name__)
logging.basicConfig(level=settings.LOG_LEVEL.upper())

app = FastAPI(
    title="Local Butler AI Backend",
    description="Backend services for the Local Butler AI application, powered by ADK agents.",
    version="0.2.0" # Updated version for new architecture
)

# --- Pydantic Models for Request and Response ---
class UserQueryInput(BaseModel):
    query: str
    session_id: Optional[str] = None
    # You could add other fields like user_id if needed for multi-user systems

class AgentResponseOutput(BaseModel):
    session_id: str
    text_response: str
    structured_output: Optional[Dict[str, Any]] = None # To hold RecipeOutputSchema, etc.
    error_message: Optional[str] = None

# --- API Key Check Function (remains the same) ---
def get_api_key():
    api_key = os.getenv("LOCAL_BUTLER_API_KEY")
    if not api_key or api_key == "YOUR_GEMINI_API_KEY_HERE":
        logger.error("LOCAL_BUTLER_API_KEY is not set or is using the default placeholder.")
        raise HTTPException(
            status_code=500,
            detail="API key not configured. Please set LOCAL_BUTLER_API_KEY."
        )
    return api_key

# --- FastAPI Event Handlers (remains the same) ---
@app.on_event("startup")
async def startup_event():
    logger.info("Application startup with new ButlerAgent architecture...")
    try:
        # API Key Check Logic:
        known_placeholders = [
            "your_api_key_here",  # Add any known placeholder strings
            "YOUR_GEMINI_API_KEY",
            "YOUR_API_KEY",
            "d0a82c21bd58e66571e40a8b5e9430dea3f97aec94878e1c_placeholder" # Example if you had a placeholder for LOCAL_BUTLER_API_KEY
        ]
        api_key_valid = True

        # Check settings.LOCAL_BUTLER_API_KEY
        if not settings.LOCAL_BUTLER_API_KEY or settings.LOCAL_BUTLER_API_KEY.strip() == "":
            logging.error(
                "LOCAL_BUTLER_API_KEY is not set or is empty in the configuration. "
                "Please ensure it is configured in your .env file."
            )
            api_key_valid = False
        elif settings.LOCAL_BUTLER_API_KEY in known_placeholders: # Be careful with this check if your actual key resembles a placeholder
            logging.error(
                f"LOCAL_BUTLER_API_KEY is set to a placeholder value: '{settings.LOCAL_BUTLER_API_KEY}'. "
                "Please replace it with your actual API key in the .env file."
            )
            api_key_valid = False

        if not api_key_valid:
            logging.error(
                "Startup check failed: LOCAL_BUTLER_API_KEY is not configured correctly."
            )
            # Consider raising an error to halt startup if critical
            # raise RuntimeError("Critical configuration: LOCAL_BUTLER_API_KEY is invalid. Application cannot start.")
        else:
            logging.info("LOCAL_BUTLER_API_KEY configured correctly and check passed in main.py.")

        # You might also want to perform a similar check for settings.GEMINI_API_KEY
        # if it's also critical for startup and distinct from LOCAL_BUTLER_API_KEY

    except HTTPException as e:
        logger.error(f"Startup check failed: {e.detail}")
        # Depending on policy, you might want the app to not start or just log the error

# --- API Endpoints (New - using ButlerAgent) ---
@app.post("/chat/", response_model=AgentResponseOutput)
async def chat_with_butler(request: UserQueryInput, api_key: str = Depends(get_api_key)):
    session_id = request.session_id or str(uuid.uuid4())
    logger.info(f"Received chat request for session '{session_id}': Query: '{request.query}'")

    try:
        # Send message to the ButlerAgent
        # The ADK's agent.send_message_async handles session state internally based on session_id
        agent_turn = await butler_agent.send_message_async(
            message=request.query,
            session_id=session_id
        )

        text_response = agent_turn.output_text
        structured_data = None

        if agent_turn.structured_output:
            # The structured_output from the agent (e.g., RecipeAgent) will be here
            # It's already a dict if the sub-agent used an output_schema and output_key
            structured_data = agent_turn.structured_output
            logger.info(f"Agent returned structured output for session '{session_id}': {structured_data}")
        
        elif agent_turn.error_message:
            logger.error(f"Agent error for session '{session_id}': {agent_turn.error_message}")
            # You might want to return a different HTTP status code for agent errors
            return AgentResponseOutput(
                session_id=session_id,
                text_response=text_response or "An error occurred with the agent.",
                error_message=agent_turn.error_message
            )

        return AgentResponseOutput(
            session_id=session_id,
            text_response=text_response or "Agent processed the request.", # Ensure there's always some text
            structured_output=structured_data
        )

    except Exception as e:
        logger.error(f"Error during chat processing for session '{session_id}': {e}", exc_info=True)
        # Consider if the error is from the agent or the FastAPI layer
        # If it's a general exception, it's likely a 500
        # If it's a specific agent error not caught by agent_turn.error_message, 
        # you might want to customize the response.
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Ensure reload is False or managed carefully in production
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
