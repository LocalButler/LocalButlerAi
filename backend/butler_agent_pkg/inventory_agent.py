# butler_agent_pkg/inventory_agent.py
"""Defines the InventoryAgent for the Local Butler AI application.

This agent is responsible for managing the user's kitchen inventory by 
interacting with the inventory tools.
"""

import logging
from google.adk.agents import Agent
from google.adk.models import Gemini
from google.adk.tools.function_tool import FunctionTool

from .config import settings
from .inventory_prompts import INVENTORY_AGENT_INSTRUCTION
from .tools import inventory_tools

logger = logging.getLogger(__name__)

# Define ADK tools based on the functions in inventory_tools.py
# Ensure the function names match exactly with those defined in inventory_tools.py
inventory_agent_tools = [
    FunctionTool(func=inventory_tools.add_item_to_inventory),
    FunctionTool(func=inventory_tools.remove_item_from_inventory),
    FunctionTool(func=inventory_tools.check_item_in_inventory),
    FunctionTool(func=inventory_tools.list_inventory_items),
]

# Configure the Google LLM with API key for inventory_agent
inventory_agent_llm_model = Gemini(
    model=settings.DEFAULT_MODEL
)

inventory_agent = Agent(
    model=inventory_agent_llm_model,
    name="InventoryAgent",
    description="Manages the user's kitchen inventory, including adding, removing, checking, and listing items.",
    instruction=INVENTORY_AGENT_INSTRUCTION,
    tools=inventory_agent_tools,
)

logger.info(
    f"InventoryAgent '{inventory_agent.name}' initialized with model: {inventory_agent.model} "
    f"and tools: {[tool.func.__name__ for tool in inventory_agent.tools]}"
)
