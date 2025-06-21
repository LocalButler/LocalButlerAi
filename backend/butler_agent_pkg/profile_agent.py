# butler_agent_pkg/profile_agent.py
"""Defines the UserProfileAgent for the Local Butler AI application."""

import logging
from google.adk.agents import Agent
from google.adk.models import Gemini

from .config import settings
from . import profile_prompts
from .tools import memory_tool # For memory tools
from .common_tools import butler_common_tools # Reusing butler's memory tools

logger = logging.getLogger(__name__)

# The UserProfileAgent will use the same set of memory tools as the ButlerAgent
# for consistency in accessing and managing session/user data.
user_profile_tools = butler_common_tools

# Configure the Google LLM with API key for profile_agent
profile_agent_llm_model = Gemini(
    model=settings.DEFAULT_MODEL
)

user_profile_agent = Agent(
    model=profile_agent_llm_model,
    name="UserProfileAgent",
    description="Manages user-specific data, including preferences (dietary, cuisine), interaction history, and other details necessary for personalization.",
    instruction=profile_prompts.USER_PROFILE_AGENT_INSTRUCTION,
    tools=user_profile_tools,
    # This agent is unlikely to have its own sub-agents
    # It might have a before_agent_callback if specific profile initialization is needed beyond the main butler_agent's callback
    # before_agent_callback=memory_tool.initialize_session_state, # Could also use this if it makes sense for profile specific init
)

logger.info(f"UserProfileAgent initialized with model: {settings.DEFAULT_MODEL}")
logger.info(f"UserProfileAgent tools: {[tool.func.__name__ for tool in user_profile_tools]}")
