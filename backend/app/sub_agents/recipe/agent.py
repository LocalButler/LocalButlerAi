# backend/app/sub_agents/recipe/agent.py
"""Defines the RecipeAgent for handling recipe-related tasks."""

import logging
from google.adk.agents import Agent

from backend.app.config import settings
from backend.app.shared_libraries import types # types.py now has RecipeAndShoppingListOutput
from backend.app.tools import memory_tool # Import the whole module
from . import prompts # Import prompts from the same package
from . import tools as recipe_specific_tools # Import our new tools module

logger = logging.getLogger(__name__)

def get_memory_wrapper(key: str):
    """
    Retrieves a value from session memory using its key.
    Use this to recall user preferences or other relevant session data.
    Specifically, use key 'user_profile' to get the user's profile,
    which includes their 'inventory' (a list of Ingredient objects)
    and 'preferences' (a dictionary).
    
    Args:
        key (str): The key to retrieve from memory
        
    Returns:
        The value associated with the key, or None if not found
    """
    return memory_tool.get_memory(key)

def check_inventory_and_create_shopping_list_wrapper(recipe_ingredients, user_inventory_ingredients, recipe_title=None):
    """
    Compares ingredients required for a recipe against the user's current inventory
    and generates a shopping list for missing items or insufficient quantities.
    
    Args:
        recipe_ingredients: List of Ingredient objects required for the recipe
        user_inventory_ingredients: List of Ingredient objects in user's inventory
        recipe_title (str, optional): Title of the recipe
        
    Returns:
        Dictionary containing shopping list and comparison results
    """
    return recipe_specific_tools.check_inventory_and_create_shopping_list(
        recipe_ingredients=recipe_ingredients,
        user_inventory_ingredients=user_inventory_ingredients,
        recipe_title=recipe_title
    )

# RecipeAgent tools - pass functions directly
recipe_agent_tools = [
    get_memory_wrapper,
    check_inventory_and_create_shopping_list_wrapper,
    # Add other tools if RecipeAgent needs them, e.g., a specialized food API tool
]

recipe_agent = Agent(
    model=settings.DEFAULT_MODEL,
    name="RecipeAgent",
    description="A specialized agent for finding/generating recipes and creating shopping lists based on user's inventory.",
    instruction=prompts.RECIPE_AGENT_INSTRUCTION,
    tools=recipe_agent_tools,
    # Removed output_schema, output_key, and generate_content_config
)

logger.info(f"RecipeAgent initialized with model: {settings.DEFAULT_MODEL}")
logger.info(f"RecipeAgent tools: {[tool.__name__ for tool in recipe_agent_tools]}")