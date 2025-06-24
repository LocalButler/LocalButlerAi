#!/usr/bin/env python3

import asyncio
import sys
import os
import uuid
import pytest

# Add the backend directory to Python path for imports
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Load environment variables
from dotenv import load_dotenv
dotenv_path = os.path.join(backend_dir, '.env')
load_dotenv(dotenv_path=dotenv_path, override=True)

from butler_agent_pkg.config import settings

# Set the GEMINI_API_KEY environment variable for ADK
os.environ['GEMINI_API_KEY'] = settings.GEMINI_API_KEY

from google.adk.runners import InMemoryRunner
from google.genai.types import Part, UserContent
from butler_agent_pkg.butler_agent import butler_agent

# Simulate the FastAPI context
runner = None
try:
    runner = InMemoryRunner(butler_agent)
    print("ADK InMemoryRunner initialized successfully")
except Exception as e:
    print(f"Failed to initialize ADK runner: {e}")

async def simulate_fastapi_request(query: str, session_id: str = None):
    session_id = session_id or str(uuid.uuid4())
    print(f"Received chat request for session '{session_id}': Query: '{query}'")

    try:
        # Check if ADK runner is available
        if runner is None:
            print("ADK runner is not initialized.")
            return {"error": "Agent runner not initialized"}
        
        print("Using ADK runner to process message...")
        user_id = "frontend_user"

        # Create session 
        session = await runner.session_service.create_session(
            app_name=runner.app_name, user_id=user_id
        )
        
        # Use the correct ADK pattern with UserContent
        content = UserContent(parts=[Part(text=query)])
        
        events = []
        async for event in runner.run_async(
            user_id=session.user_id, session_id=session.id, new_message=content
        ):
            events.append(event)

        if not events:
            print("ADK runner returned no events.")
            return {
                "session_id": session_id,
                "text_response": "I'm sorry, I couldn't process that request. Please try again."
            }

        response_event = events[-1]
        print(f"ADK runner returned response: {response_event}")
        
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

        return {
            "session_id": session_id,
            "text_response": response_text or "Agent processed the request."
        }

    except Exception as e:
        print(f"Error during chat processing for session '{session_id}': {e}")
        import traceback
        traceback.print_exc()
        return {"error": f"An unexpected error occurred: {str(e)}"}

async def test_fastapi_simulation():
    print("Testing FastAPI simulation...")
    result = await simulate_fastapi_request("Hello, this is a test message")
    print(f"Result: {result}")

pytestmark = pytest.mark.asyncio

if __name__ == "__main__":
    asyncio.run(test_fastapi_simulation())
