# butler_agent_pkg/service_concierge_agent.py
"""Defines the ServiceConciergeAgent for the Local Butler AI application."""

import logging
from google.adk.agents import Agent
from google.adk.models import Gemini

from .config import settings
from . import service_concierge_prompts

logger = logging.getLogger(__name__)

# Define any tools specific to the ServiceConciergeAgent here if needed in the future
# For now, we'll start with no specific tools for this agent, it will primarily use LLM capabilities.
service_concierge_tools = []

# Configure the Google LLM with API key for ServiceConciergeAgent
service_concierge_llm_model = Gemini(
    model=settings.DEFAULT_MODEL
)

service_concierge_agent = Agent(
    model=service_concierge_llm_model,
    name="ServiceConciergeAgent",
    description="Handles requests for services like delivery, appointments, and other errands. Translates user needs into actionable tasks.",
    instruction=service_concierge_prompts.SERVICE_CONCIERGE_AGENT_INSTRUCTION,
    tools=service_concierge_tools,
    # sub_agents=[], # This agent likely won't have its own sub-agents initially
    # enable_reflection=False,
)

logger.info(f"ServiceConciergeAgent initialized with model: {settings.DEFAULT_MODEL}")
