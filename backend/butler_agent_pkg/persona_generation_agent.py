# butler_agent_pkg/persona_generation_agent.py
"""Defines the PersonaGenerationAgent for the Local Butler AI application."""

import logging
from google.adk.agents import Agent
from google.adk.models import Gemini

from .config import settings
from . import persona_generation_prompts
from .tools import memory_tool
from google.adk.tools.function_tool import FunctionTool

logger = logging.getLogger(__name__)

# This agent primarily uses its LLM capabilities for persona synthesis.
# Specific tools might be added later if direct data manipulation is needed here,
# but for now, it's assumed data is fed to it for processing.
persona_generation_tools = [
    FunctionTool(func=memory_tool.memorize),
    FunctionTool(func=memory_tool.memorize_list_item),
    FunctionTool(func=memory_tool.forget_list_item),
    FunctionTool(func=memory_tool.get_memory),
]

# Configure the Google LLM with API key for persona_generation_agent
persona_generation_agent_llm_model = Gemini(
    model=settings.DEFAULT_MODEL
)

persona_generation_agent = Agent(
    model=persona_generation_agent_llm_model, # Or a specific Gemini model suited for creative/synthesis tasks
    name="PersonaGenerationAgent",
    description="Generates and updates a dynamic 'butler persona summary' reflecting user preferences and interaction style, using Gemini and data from the UserProfileAgent.",
    instruction=persona_generation_prompts.PERSONA_GENERATION_AGENT_INSTRUCTION,
    tools=persona_generation_tools,
)

logger.info(f"PersonaGenerationAgent initialized with model: {settings.DEFAULT_MODEL}")
