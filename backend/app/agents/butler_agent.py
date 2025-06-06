# backend/app/agents/butler_agent.py
"""Defines the main ButlerAgent for the Local Butler AI application."""

import logging
from google.adk.agents import Agent
from google.adk.tools.function_tool import FunctionTool

from backend.app.config import settings
from backend.app.agents import butler_prompts
from backend.app.tools import memory_tool
from backend.app.sub_agents.recipe import recipe_agent
from backend.app.shared_libraries import constants
from backend.app.shared_libraries.types import UserProfile, Ingredient

logger = logging.getLogger(__name__)

# Define the memory tools based on the functions in memory_tool.py
# These descriptions will be visible to the LLM when it decides to use a tool.
butler_memory_tools = [
    FunctionTool(
        func=memory_tool.memorize
    ),
    FunctionTool(
        func=memory_tool.memorize_list_item
    ),
    FunctionTool(
        func=memory_tool.forget_list_item
    ),
    FunctionTool(
        func=memory_tool.get_memory
    )
]

butler_agent = Agent(
    model=settings.DEFAULT_MODEL,
    name="ButlerAgent",
    description="The main orchestrating agent for Local Butler AI. Understands user needs and delegates to specialized sub-agents or handles general queries.",
    instruction=butler_prompts.ROOT_AGENT_INSTRUCTION,
    tools=butler_memory_tools,
    sub_agents=[
        recipe_agent # Add RecipeAgent as a sub-agent
    ],
    before_agent_callback=memory_tool.initialize_session_state,
    # enable_reflection=True, # Consider enabling for more complex reasoning if needed
    # temperature=0.3, # Adjust temperature if needed for creativity vs. precision
)

logger.info(f"ButlerAgent initialized with model: {settings.DEFAULT_MODEL}")
logger.info(f"ButlerAgent tools: {[tool.func.__name__ for tool in butler_memory_tools]}")

# Example of how this agent might be used in main.py (conceptual)
# async def handle_user_query(user_query: str, session_id: str):
#     # In a real app, you'd manage session state (e.g., via ADK's SessionManager)
#     # For simplicity, ADK handles state internally based on agent interactions.
#     response = await butler_agent.send_message_async(user_query)
#     return response
