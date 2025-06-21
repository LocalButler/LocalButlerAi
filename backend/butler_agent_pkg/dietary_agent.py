# butler_agent_pkg/dietary_agent.py
"""Defines the DietaryAgent for the Local Butler AI application."""

import logging
from google.adk.agents import Agent
from google.adk.models import Gemini

from .config import settings
from . import dietary_prompts

logger = logging.getLogger(__name__)

# The DietaryAgent will primarily use its LLM capabilities for analysis and advice.
# Specific tools for nutritional databases or detailed recipe analysis could be added later.
dietary_agent_tools = []

# Configure the Google LLM with API key for dietary_agent
dietary_agent_llm_model = Gemini(
    model=settings.DEFAULT_MODEL
)

dietary_agent = Agent(
    model=dietary_agent_llm_model,
    name="DietaryAgent",
    description="Analyzes dietary needs, restrictions, and preferences. Provides advice on healthy eating, ingredient substitutions, and allergen information.",
    instruction=dietary_prompts.DIETARY_AGENT_INSTRUCTION,
    tools=dietary_agent_tools,
)

logger.info(f"DietaryAgent initialized with model: {settings.DEFAULT_MODEL}")
