# butler_agent_pkg/sub_agents/recipe/agent.py
"""Defines the RecipeAgent for handling recipe-related tasks."""

import json
import logging
from typing import Optional
from google.adk.agents import Agent
from google.adk.tools import ToolContext # Added for tool_context type hint
from google.adk.models import Gemini

from ...config import settings
from ...shared_libraries import types # types.py now has RecipeAndShoppingListOutput
from ...tools import memory_tool # Import the whole module
from . import prompts # Import prompts from the same package
from . import tools as recipe_specific_tools # Import our new tools module

logger = logging.getLogger(__name__)

def get_memory_wrapper(key: str, tool_context: ToolContext):
    """
    Retrieves a value from session memory using its key.
    Use this to recall user preferences or other relevant session data.
    Specifically, use key 'user_profile' to get the user's profile,
    which includes their 'inventory' (a list of Ingredient objects)
    and 'preferences' (a dictionary).
    
    Args:
        key (str): The key to retrieve from memory.
        tool_context (ToolContext): The context of the tool invocation (automatically provided by ADK).
        
    Returns:
        The value associated with the key, or None if not found
    """
    return memory_tool.get_memory(key=key, tool_context=tool_context)

def check_inventory_and_create_shopping_list_wrapper(recipe_ingredients_data: str, user_inventory_data: str, recipe_title: Optional[str] = None):
    """
    Compares ingredients required for a recipe against the user's current inventory
    and generates a shopping list for missing items or insufficient quantities.
    
    Args:
        recipe_ingredients_data (str): String containing structured data representing a list of Ingredient objects required for the recipe.
        user_inventory_data (str): String containing structured data representing a list of Ingredient objects in the user's inventory.
        recipe_title (Optional[str], optional): Title of the recipe. Defaults to None.
        
    Returns:
        Dictionary containing shopping list and comparison results (will be JSON serialized by ADK if complex).
    """
    try:
        recipe_ingredients_data = json.loads(recipe_ingredients_data)
        user_inventory_data = json.loads(user_inventory_data)

        # Convert data to Ingredient objects
        # Assuming types.Ingredient can be instantiated from a dict (common for Pydantic models)
        typed_recipe_ingredients = [types.Ingredient(**data) for data in recipe_ingredients_data]
        typed_user_inventory_ingredients = [types.Ingredient(**data) for data in user_inventory_ingredients_data]

    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON for recipe/inventory ingredients: {e}")
        return {"error": "Invalid JSON format for ingredients.", "details": str(e)}
    except Exception as e: # Catch potential errors during Ingredient instantiation (e.g., validation errors)
        logger.error(f"Error instantiating Ingredient objects: {e}")
        return {"error": "Invalid ingredient data.", "details": str(e)}

    return recipe_specific_tools.check_inventory_and_create_shopping_list(
        recipe_ingredients=typed_recipe_ingredients,
        user_inventory_ingredients=typed_user_inventory_ingredients,
        recipe_title=recipe_title
    )

# RecipeAgent tools - pass functions directly
recipe_agent_tools = [
    get_memory_wrapper,
    # check_inventory_and_create_shopping_list_wrapper is no longer directly used by RecipeAgent's primary flow    # It can be called by ButlerAgent directly if a shopping list is needed for an existing recipe.
    # Add other tools if RecipeAgent needs them, e.g., a specialized food API tool
]

# Configure the Google LLM with API key for RecipeAgent
recipe_llm_model = Gemini(
    model=settings.DEFAULT_MODEL
)

recipe_agent = Agent(
    model=recipe_llm_model,
    name="RecipeAgent",
    description="A specialized agent for finding or generating recipes. It outputs structured recipe data and a conversational message.",
    instruction=prompts.RECIPE_AGENT_INSTRUCTION,
    tools=recipe_agent_tools,
    # The agent's prompt instructs the LLM to return a specific JSON structure with 'recipeOutput' and 'conversationalText' keys.
    # This entire JSON string is expected to be the agent's output.
)

logger.info(f"RecipeAgent initialized with model: {settings.DEFAULT_MODEL}")
logger.info(f"RecipeAgent tools: {[tool.__name__ for tool in recipe_agent_tools]}")