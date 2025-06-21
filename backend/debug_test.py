#!/usr/bin/env python3

import asyncio
import sys
import os

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

async def test_minimal():
    try:
        print("Creating runner...")
        runner = InMemoryRunner(butler_agent)
        print("Runner created successfully")
        
        print("Creating session...")
        user_id = "test_user"
        session = await runner.session_service.create_session(
            app_name=runner.app_name, user_id=user_id
        )
        print(f"Session created: {session.id}")
        
        print("Creating message content...")
        content = UserContent(parts=[Part(text="Hello, this is a simple test")])
        print("Content created")
        
        print("Running agent...")
        events = []
        async for event in runner.run_async(
            user_id=session.user_id, 
            session_id=session.id, 
            new_message=content
        ):
            events.append(event)
            print(f"Got event: {type(event)}")
            # Get just the first few events to avoid long output
            if len(events) >= 3:
                break
                
        print(f"Completed with {len(events)} events")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_minimal())
