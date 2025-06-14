# butler_agent_pkg/dietary_agent.py
"""Defines the DietaryAgent for the Local Butler AI application."""

import logging
from google.adk.agents import Agent

from .config import settings
from . import dietary_prompts

logger = logging.getLogger(__name__)

# The DietaryAgent will primarily use its LLM capabilities for analysis and advice.
# Specific tools for nutritional databases or detailed recipe analysis could be added later.
dietary_agent_tools = []

dietary_agent = Agent(
    model=settings.DEFAULT_MODEL,
    name="DietaryAgent",
    description="Analyzes dietary needs, restrictions, and preferences. Provides advice on healthy eating, ingredient substitutions, and allergen information.",
    instruction=dietary_prompts.DIETARY_AGENT_INSTRUCTION,
    tools=dietary_agent_tools,
)

logger.info(f"DietaryAgent initialized with model: {settings.DEFAULT_MODEL}")
