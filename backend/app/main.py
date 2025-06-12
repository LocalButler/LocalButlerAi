import logging
import os
import uuid # For generating session IDs
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from dotenv import load_dotenv

from backend.app.config import settings
from backend.app.agents import butler_agent as butler_agent_module  # Import module
from backend.app.shared_libraries.types import Recipe as RecipeOutputSchema, UserProfile as UserProfileSchema  # Fix import

# Construct the path to the .env file in the 'backend' directory relative to this main.py file
# __file__ is backend/app/main.py -> dirname is backend/app -> dirname is backend -> join with .env
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
print(f"[DEBUG] Attempting to load .env file from: {dotenv_path}") # Debug print for .env path
load_dotenv(dotenv_path=dotenv_path, override=True) # Load environment variables from specific .env file, override if already set by other means

logger = logging.getLogger(__name__)
logging.basicConfig(level=settings.LOG_LEVEL.upper())

app = FastAPI(
    title="Local Butler AI Backend",
    description="Backend services for the Local Butler AI application, powered by ADK agents.",
    version="0.2.0" # Updated version for new architecture
)

# --- CORS Middleware Configuration ---
# Origins that are allowed to make cross-origin requests.
# For development, you might use ["*"], but for production, restrict this to your frontend's domain.
# Example: origins = ["http://localhost:3000", "https://your-frontend-domain.com"]
origins = [
    "*"  # Allows all origins for development
    # "http://localhost:3000", # Uncomment and adjust if your frontend runs on port 3000
    # "http://localhost:5173", # Common for Vite React/Vue dev servers
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, # Allows cookies to be included in requests
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], # Allows all standard methods
    allow_headers=["*"]  # Allows all headers
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
    print(f"[DEBUG] LOCAL_BUTLER_API_KEY from os.getenv: '{api_key}'") # Temporary debug print
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

@app.get("/", status_code=200)
async def read_root():
    """Provides a simple health check / welcome message for the root endpoint."""
    logger.info("Root endpoint '/' was accessed.")
    return {"message": "Welcome to the Local Butler AI Backend!", "status": "ok"}

@app.post("/chat/", response_model=AgentResponseOutput)
async def chat_with_butler(request: UserQueryInput, api_key: str = Depends(get_api_key)):
    session_id = request.session_id or str(uuid.uuid4())
    logger.info(f"Received chat request for session '{session_id}': Query: '{request.query}'")

    try:
        # Send message to the ButlerAgent
        # The ADK's agent.send_message_async handles session state internally based on session_id
        print(f"[DEBUG] Type of butler_agent in chat_with_butler: {type(butler_agent_module.butler_agent)}")
        print(f"[DEBUG] Attributes of butler_agent: {dir(butler_agent_module.butler_agent)}")
        agent_turn = await butler_agent_module.butler_agent.send_message_async(
            message=request.query,
            session_id=session_id
        ) # Revert to send_message_async

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
    pass