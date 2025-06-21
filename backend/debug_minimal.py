#!/usr/bin/env python3
"""
Minimal debugging script to isolate the butler_agent error step by step.
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Add the backend directory to Python path for imports
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Load environment variables from the .env file in the backend directory
dotenv_path = os.path.join(backend_dir, '.env')
print(f"[DEBUG] Loading .env file from: {dotenv_path}")
load_dotenv(dotenv_path=dotenv_path, override=True)

from butler_agent_pkg.config import settings

# Set the GEMINI_API_KEY environment variable for ADK
os.environ['GEMINI_API_KEY'] = settings.GEMINI_API_KEY

print("Testing imports...")

try:
    from google.adk.runners import InMemoryRunner
    print("✓ InMemoryRunner imported successfully")
except Exception as e:
    print(f"✗ Failed to import InMemoryRunner: {e}")
    sys.exit(1)

try:
    from google.genai.types import Part, UserContent
    print("✓ Part, UserContent imported successfully")
except Exception as e:
    print(f"✗ Failed to import Part, UserContent: {e}")
    sys.exit(1)

try:
    from butler_agent_pkg.butler_agent import butler_agent
    print("✓ butler_agent imported successfully")
    print(f"butler_agent type: {type(butler_agent)}")
    print(f"butler_agent name: {butler_agent.name}")
    print(f"butler_agent model: {butler_agent.model}")
    print(f"butler_agent tools count: {len(butler_agent.tools) if butler_agent.tools else 0}")
    print(f"butler_agent sub_agents count: {len(butler_agent.sub_agents) if butler_agent.sub_agents else 0}")
except Exception as e:
    print(f"✗ Failed to import butler_agent: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\nTesting runner creation...")
try:
    runner = InMemoryRunner(butler_agent)
    print("✓ InMemoryRunner created successfully")
    print(f"runner type: {type(runner)}")
except Exception as e:
    print(f"✗ Failed to create InMemoryRunner: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\nTesting session creation...")
try:
    import asyncio
    
    async def test_session():
        user_id = "test_user"
        session = await runner.session_service.create_session(
            app_name=runner.app_name, user_id=user_id
        )
        print(f"✓ Session created successfully: {session.id}")
        return session

    session = asyncio.run(test_session())
    
except Exception as e:
    print(f"✗ Failed to create session: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\nTesting simple message processing...")
try:
    async def test_message():
        content = UserContent(parts=[Part(text="Hello, this is a test message")])
        
        print("About to call runner.run_async...")
        events = []
        async for event in runner.run_async(
            user_id=session.user_id, session_id=session.id, new_message=content
        ):
            print(f"Event received: {type(event)} - {event}")
            events.append(event)
        
        print(f"✓ Message processed successfully, {len(events)} events received")
        return events

    events = asyncio.run(test_message())
    
except Exception as e:
    print(f"✗ Failed to process message: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n✓ All tests passed!")
