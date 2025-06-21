import logging
import os
import uuid # For generating session IDs
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import sys
import os

# Add the backend directory to Python path for imports
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Construct the path to the .env file in the 'backend' directory relative to this main.py file
# __file__ is backend/app/main.py -> dirname is backend/app -> dirname is backend -> join with .env
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
print(f"[DEBUG] Attempting to load .env file from: {dotenv_path}") # Debug print for .env path
load_dotenv(dotenv_path=dotenv_path, override=True) # Load environment variables from specific .env file, override if already set by other means

from butler_agent_pkg.config import settings

# Set the GEMINI_API_KEY environment variable for ADK
os.environ['GEMINI_API_KEY'] = settings.GEMINI_API_KEY

from google.adk.runners import InMemoryRunner
from google.genai.types import Part, UserContent
from butler_agent_pkg.butler_agent import butler_agent
from butler_agent_pkg.shared_libraries.types import Recipe as RecipeOutputSchema, UserProfile as UserProfileSchema

logger = logging.getLogger(__name__)
logging.basicConfig(level=settings.LOG_LEVEL.upper())

app = FastAPI(
    title="Local Butler AI Backend",
    description="Backend services for the Local Butler AI application, powered by ADK agents.",
    version="0.2.0" # Updated version for new architecture
)

# Initialize ADK runner
runner = None
try:
    runner = InMemoryRunner(butler_agent)
    logger.info("ADK InMemoryRunner initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize ADK runner: {e}")

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
        # Check if ADK runner is available
        if runner is None:
            logger.error("ADK runner is not initialized.")
            raise HTTPException(status_code=500, detail="Agent runner not initialized")
          logger.info("Using ADK runner to process message...")
        # Create session using ADK session service like the LLM Auditor sample
        user_id = "frontend_user"

        # Create session 
        session = await runner.session_service.create_session(
            app_name=runner.app_name, user_id=user_id
        )
        
        # Use the correct ADK pattern with UserContent
        content = UserContent(parts=[Part(text=request.query)])
        
        events = []
        async for event in runner.run_async(
            user_id=session.user_id, session_id=session.id, new_message=content
        ):
            events.append(event)

        if not events:
            logger.warning("ADK runner returned no events.")
            return AgentResponseOutput(
                session_id=session_id,
                text_response="I'm sorry, I couldn't process that request. Please try again."
            )

        response_event = events[-1]
        logger.info(f"ADK runner returned response: {response_event}")
        
        # Extract response text
        response_text = ""
        if hasattr(response_event, 'content') and hasattr(response_event.content, 'parts'):
            for part in response_event.content.parts:
                if hasattr(part, 'text') and part.text:
                    response_text += part.text
        elif hasattr(response_event, 'text'):
            response_text = response_event.text
        else:
            response_text = str(response_event)

        return AgentResponseOutput(
            session_id=session_id,
            text_response=response_text or "Agent processed the request."
        )

    except Exception as e:
        logger.error(f"Error during chat processing for session '{session_id}': {e}", exc_info=True)
        # Print full traceback for debugging
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)