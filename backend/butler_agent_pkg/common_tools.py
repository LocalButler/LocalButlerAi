# butler_agent_pkg/common_tools.py
"""Defines common tools shared across multiple agents."""

import json
import logging
import uuid # For generating unique recipe IDs
from typing import Dict, List, Union, Optional, Any # Added Optional for type hints, and Any
from google.adk.tools.function_tool import FunctionTool
from google.adk.tools import ToolContext

from .tools import memory_tool
# from .sub_agents.recipe import tools as recipe_specific_tools # Removed
from .shared_libraries import types # For type hints
from .shared_libraries import constants

logger = logging.getLogger(__name__)

# --- Wrapper functions for ButlerAgent's memory tools ---
def butler_memorize_wrapper(key: str, value: str, tool_context: ToolContext) -> Dict[str, str]:
    """
    Memorize a piece of information (as a string) as a key-value pair in the session state.
    If the key already exists, its value will be overwritten.
    """
    return memory_tool.memorize(key=key, value=value, tool_context=tool_context)

def butler_memorize_list_item_wrapper(key: str, item: str, tool_context: ToolContext) -> Dict[str, str]:
    """
    Adds an item (as a string) to a list in the session state.
    If the key does not exist, a new list is created.
    """
    return memory_tool.memorize_list_item(key=key, item=item, tool_context=tool_context)

def butler_forget_list_item_wrapper(key: str, item: str, tool_context: ToolContext) -> Dict[str, str]:
    """
    Removes an item (matched as a string) from a list in the session state.
    """
    return memory_tool.forget_list_item(key=key, item=item, tool_context=tool_context)

def butler_get_memory_wrapper(key: str, tool_context: ToolContext) -> Dict[str, Any]:
    """
    Retrieves a piece of information from the session state.
    """
    return memory_tool.get_memory(key=key, tool_context=tool_context)

# --- Recipe and Shopping List Tools --- 
def save_recipe_wrapper(recipe_information_to_save: str, tool_context: ToolContext) -> str:
    """
    Saves a given recipe (as a string containing structured data) to memory.

    The recipe is stored under a unique ID, and a summary is added to the user's list of saved recipes.
    Args:
        recipe_information_to_save: A string representing the recipe object (typically from RecipeAgent's recipeOutput).
        tool_context: The ADK tool context.
    Returns:
        A confirmation message string.
    """
    logger.info(f"Attempting to save recipe: {recipe_information_to_save[:100]}...")
    try:
        recipe_data = json.loads(recipe_information_to_save)
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding recipe JSON: {e}")
        return "I'm sorry, there was an issue understanding the recipe data. It doesn't seem to be in the correct format."

    recipe_name = recipe_data.get("name", "Untitled Recipe")
    new_recipe_id = str(uuid.uuid4())

    recipe_summary_for_list = {
        "id": new_recipe_id,
        "name": recipe_name
    }

    try:
        # Add to the list of saved recipes
        butler_memorize_list_item_wrapper(
            key=constants.SAVED_RECIPES_LIST_KEY,
            item=json.dumps(recipe_summary_for_list), # Store as string representation in the list
            tool_context=tool_context
        )

        # Save the full recipe data
        butler_memorize_wrapper(
            key=f"{constants.RECIPE_MEMORY_PREFIX}{new_recipe_id}",
            value=recipe_information_to_save, # Store the original string representation
            tool_context=tool_context
        )
        logger.info(f"Recipe '{recipe_name}' (ID: {new_recipe_id}) saved successfully.")
        return f"Okay, I've saved the '{recipe_name}' recipe for you!"
    except Exception as e:
        logger.error(f"Error saving recipe to memory: {e}")
        return "I'm sorry, I encountered an error while trying to save the recipe."

def generate_shopping_list_for_recipe_wrapper(recipe_id: str, tool_context: ToolContext) -> str:
    """
    Generates a shopping list for a given recipe ID by retrieving its ingredients from memory.
    The shopping list is then saved to memory.
    Args:
        recipe_id: The unique ID of the saved recipe.
        tool_context: The ADK tool context.
    Returns:
        A string containing the shopping list or an error message.
    """
    logger.info(f"Attempting to generate shopping list for recipe ID: {recipe_id}")
    recipe_memory_key = f"{constants.RECIPE_MEMORY_PREFIX}{recipe_id}"
    recipe_data_string = butler_get_memory_wrapper(key=recipe_memory_key, tool_context=tool_context)

    if not recipe_data_string or not isinstance(recipe_data_string, str):
        logger.error(f"Recipe with ID '{recipe_id}' not found or is not a string in memory.")
        return f"Sorry, I couldn't find a saved recipe with ID '{recipe_id}'. Please save the recipe first or check the ID."

    try:
        recipe_data = json.loads(recipe_data_string)
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding recipe JSON for shopping list (ID: {recipe_id}): {e}")
        return "I found the recipe, but there was an issue reading its data to generate the shopping list."

    recipe_name = recipe_data.get("name", "the recipe")
    ingredients = recipe_data.get("ingredients")

    if not ingredients or not isinstance(ingredients, list):
        logger.info(f"No ingredients found or invalid format for recipe '{recipe_name}' (ID: {recipe_id}).")
        return f"The recipe for '{recipe_name}' doesn't seem to have any ingredients listed, so I can't make a shopping list."

    shopping_list_items = []
    for ing in ingredients:
        if isinstance(ing, dict):
            name = ing.get('name', 'Unknown ingredient')
            quantity = ing.get('quantity', '')
            unit = ing.get('unit', '')
            shopping_list_items.append(f"{quantity} {unit} {name}".strip())
        else:
            shopping_list_items.append(str(ing)) # Fallback if ingredient format is unexpected
    
    if not shopping_list_items:
        return f"The recipe for '{recipe_name}' has an ingredients section, but it's empty. Nothing to add to the shopping list."

    shopping_list_formatted_string = "\n- ".join(shopping_list_items)
    full_shopping_list_message = f"Here's the shopping list for '{recipe_name}':\n- {shopping_list_formatted_string}"

    try:
        # Save the generated shopping list (as a list of strings) to memory
        butler_memorize_wrapper(
            key=f"{constants.SHOPPING_LIST_MEMORY_PREFIX}{recipe_id}",
            value=json.dumps(shopping_list_items), # Store as string representation of the list
            tool_context=tool_context
        )
        logger.info(f"Shopping list for '{recipe_name}' (ID: {recipe_id}) generated and saved.")
        return full_shopping_list_message
    except Exception as e:
        logger.error(f"Error saving shopping list to memory (ID: {recipe_id}): {e}")
        return "I generated the shopping list, but encountered an error while trying to save it."

# --- End of wrapper functions ---

butler_common_tools = [
    FunctionTool(func=butler_memorize_wrapper),
    FunctionTool(func=butler_memorize_list_item_wrapper),
    FunctionTool(func=butler_forget_list_item_wrapper),
    FunctionTool(func=butler_get_memory_wrapper),
    FunctionTool(func=save_recipe_wrapper),
    FunctionTool(func=generate_shopping_list_for_recipe_wrapper),
]
