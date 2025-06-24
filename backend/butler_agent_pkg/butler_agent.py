# butler_agent_pkg/butler_agent.py
"""Defines the main ButlerAgent for the Local Butler AI application."""

import logging
from google.adk.agents import Agent
from google.adk.tools.function_tool import FunctionTool
from google.adk.models import Gemini

from .config import settings
from . import butler_prompts
from .tools import memory_tool
from .common_tools import butler_common_tools
from .sub_agents.recipe import recipe_agent
from .service_concierge_agent import service_concierge_agent # Import the new agent
from .profile_agent import user_profile_agent # Import UserProfileAgent
from .task_manager_agent import task_manager_agent # Import TaskManagerAgent
from .persona_generation_agent import persona_generation_agent # Import PersonaGenerationAgent
from .inventory_agent import inventory_agent # Import InventoryAgent
from .dietary_agent import dietary_agent # Import DietaryAgent
from .shared_libraries import constants
from .shared_libraries.types import UserProfile, Ingredient
from .agent_z import agent_z # Import Agent Z

logger = logging.getLogger(__name__)

# Configure the Google LLM with API key
llm_model = Gemini(model=settings.DEFAULT_MODEL)

butler_agent = Agent(
    model=llm_model,
    name="ButlerAgent",
    description="The main orchestrating agent for Local Butler AI. Understands user needs and delegates to specialized sub-agents or handles general queries.",
    instruction=butler_prompts.ROOT_AGENT_INSTRUCTION,
    tools=butler_common_tools,
    sub_agents=[
        recipe_agent, # Add RecipeAgent as a sub-agent
        service_concierge_agent, # Add ServiceConciergeAgent as a sub-agent
        user_profile_agent, # Add UserProfileAgent as a sub-agent
        task_manager_agent, # Add TaskManagerAgent as a sub-agent
        persona_generation_agent, # Add PersonaGenerationAgent as a sub-agent
        inventory_agent, # Add InventoryAgent as a sub-agent
        dietary_agent, # Add DietaryAgent as a sub-agent
        agent_z # Register Agent Z as a sub-agent
    ],
    before_agent_callback=memory_tool.initialize_session_state,
    # enable_reflection=True, # Consider enabling for more complex reasoning if needed
    # temperature=0.3, # Adjust temperature if needed for creativity vs. precision
)

logger.info(f"ButlerAgent initialized with model: {settings.DEFAULT_MODEL}")
logger.info(f"ButlerAgent tools: {[tool.func.__name__ for tool in butler_common_tools]}")

# Example of how this agent might be used in main.py (conceptual)
# async def handle_user_query(user_query: str, session_id: str):
#     # In a real app, you'd manage session state (e.g., via ADK's SessionManager)
#     # For simplicity, ADK handles state internally based on agent interactions.
#     response = await butler_agent.send_message_async(user_query)
#     return response
