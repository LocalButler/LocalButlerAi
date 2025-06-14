# backend/app/agents/butler_agent.py
"""Defines the main ButlerAgent for the Local Butler AI application."""

import logging
from google.adk.agents import Agent
from google.adk.tools.function_tool import FunctionTool

from butler_agent_pkg.config import settings
from butler_agent_pkg import butler_prompts
from butler_agent_pkg.tools import memory_tool
from butler_agent_pkg.common_tools import butler_common_tools
from butler_agent_pkg.sub_agents.recipe import recipe_agent
from butler_agent_pkg.service_concierge_agent import service_concierge_agent # Import the new agent
from butler_agent_pkg.profile_agent import user_profile_agent # Import UserProfileAgent
from butler_agent_pkg.task_manager_agent import task_manager_agent # Import TaskManagerAgent
from butler_agent_pkg.persona_generation_agent import persona_generation_agent # Import PersonaGenerationAgent
from butler_agent_pkg.inventory_agent import inventory_agent # Import InventoryAgent
from butler_agent_pkg.dietary_agent import dietary_agent # Import DietaryAgent
from butler_agent_pkg.shared_libraries import constants
from butler_agent_pkg.shared_libraries.types import UserProfile, Ingredient

logger = logging.getLogger(__name__)


def create_butler_agent():
    """Create and return a new ButlerAgent instance with a minimal set of sub-agents."""
    # For now, let's create a butler agent without sub-agents to avoid the parent conflict
    # We can add sub-agents back once we fix the agent instantiation pattern
    
    return Agent(
        model=settings.DEFAULT_MODEL,
        name="ButlerAgent",
        description="The main orchestrating agent for Local Butler AI. Understands user needs and delegates to specialized sub-agents or handles general queries.",
        instruction=butler_prompts.ROOT_AGENT_INSTRUCTION,
        tools=butler_common_tools,
        sub_agents=[],  # Temporarily empty to avoid parent conflicts
        before_agent_callback=memory_tool.initialize_session_state,
        # enable_reflection=True, # Consider enabling for more complex reasoning if needed
        # temperature=0.3, # Adjust temperature if needed for creativity vs. precision
    )


# Lazy initialization to avoid multiple parent assignment
_butler_agent_instance = None

def get_butler_agent():
    """Get the singleton ButlerAgent instance."""
    global _butler_agent_instance
    if _butler_agent_instance is None:
        _butler_agent_instance = create_butler_agent()
        logger.info(f"ButlerAgent initialized with model: {settings.DEFAULT_MODEL}")
        logger.info(f"ButlerAgent tools: {[tool.func.__name__ for tool in butler_common_tools]}")
    return _butler_agent_instance

# Example of how this agent might be used in main.py (conceptual)
# async def handle_user_query(user_query: str, session_id: str):
#     # In a real app, you'd manage session state (e.g., via ADK's SessionManager)
#     # For simplicity, ADK handles state internally based on agent interactions.
#     response = await butler_agent.send_message_async(user_query)
#     return response
