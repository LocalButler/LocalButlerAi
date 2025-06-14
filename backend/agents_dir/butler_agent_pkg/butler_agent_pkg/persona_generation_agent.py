# butler_agent_pkg/persona_generation_agent.py
"""Defines the PersonaGenerationAgent for the Local Butler AI application."""

import logging
from google.adk.agents import Agent

from .config import settings
from . import persona_generation_prompts

logger = logging.getLogger(__name__)

# This agent primarily uses its LLM capabilities for persona synthesis.
# Specific tools might be added later if direct data manipulation is needed here,
# but for now, it's assumed data is fed to it for processing.
persona_generation_tools = []

persona_generation_agent = Agent(
    model=settings.DEFAULT_MODEL, # Or a specific Gemini model suited for creative/synthesis tasks
    name="PersonaGenerationAgent",
    description="Generates and updates a dynamic 'butler persona summary' reflecting user preferences and interaction style, using Gemini and data from the UserProfileAgent.",
    instruction=persona_generation_prompts.PERSONA_GENERATION_AGENT_INSTRUCTION,
    tools=persona_generation_tools,
)

logger.info(f"PersonaGenerationAgent initialized with model: {settings.DEFAULT_MODEL}")
