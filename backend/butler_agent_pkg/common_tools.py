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
from pymongo import MongoClient
import os

logger = logging.getLogger(__name__)

# MongoDB setup (reuse AgentZ pattern)
mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
client = MongoClient(mongo_uri)
db = client["butler_ai"]
recipes_collection = db["recipes"]

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
def save_recipe_wrapper(recipe_information_to_save: dict, tool_context: ToolContext) -> str:
    """
    Saves a given recipe (as a dict containing structured data) to MongoDB.
    Returns a confirmation message string with the MongoDB _id as the recipe ID.
    """
    logger.info(f"Attempting to save recipe to MongoDB: {str(recipe_information_to_save)[:100]}...")
    recipe_data = recipe_information_to_save.copy()
    recipe_name = recipe_data.get("name") or recipe_data.get("recipe_name") or "Untitled Recipe"
    # Optionally add user/session info if available
    user_id = getattr(tool_context, 'user_id', None)
    session_id = getattr(tool_context, 'session_id', None)
    if user_id:
        recipe_data['user_id'] = user_id
    if session_id:
        recipe_data['session_id'] = session_id
    recipe_data['name'] = recipe_name  # Ensure 'name' field exists
    try:
        result = recipes_collection.insert_one(recipe_data)
        recipe_id = str(result.inserted_id)
        logger.info(f"Recipe '{recipe_name}' saved to MongoDB with ID: {recipe_id}")
        # --- NEW: Add recipe_id to saved_recipes_list in session memory ---
        try:
            from .common_tools import butler_memorize_list_item_wrapper
        except ImportError:
            # fallback if circular import
            pass
        else:
            butler_memorize_list_item_wrapper('saved_recipes_list', recipe_id, tool_context)
        # --- END NEW ---
        return f"Okay, I've saved the '{recipe_name}' recipe for you! The recipe ID is: {recipe_id}"
    except Exception as e:
        logger.error(f"Error saving recipe to MongoDB: {e}")
        return "I'm sorry, I encountered an error while trying to save the recipe."

def generate_shopping_list_for_recipe_wrapper(recipe_id: str, tool_context: ToolContext) -> str:
    """
    Generates a shopping list for a given recipe ID by retrieving its ingredients from MongoDB.
    Returns a string containing the shopping list or an error message.
    """
    logger.info(f"Attempting to generate shopping list for recipe ID: {recipe_id} (MongoDB)")
    from bson import ObjectId
    try:
        recipe = recipes_collection.find_one({"_id": ObjectId(recipe_id)})
    except Exception as e:
        logger.error(f"Error retrieving recipe from MongoDB: {e}")
        return f"Sorry, I couldn't find a saved recipe with ID '{recipe_id}'. Please save the recipe first or check the ID."
    if not recipe:
        logger.error(f"Recipe with ID '{recipe_id}' not found in MongoDB.")
        return f"Sorry, I couldn't find a saved recipe with ID '{recipe_id}'. Please save the recipe first or check the ID."
    recipe_name = recipe.get("name", "the recipe")
    ingredients = recipe.get("ingredients")
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
            shopping_list_items.append(str(ing))
    if not shopping_list_items:
        return f"The recipe for '{recipe_name}' has an ingredients section, but it's empty. Nothing to add to the shopping list."
    shopping_list_formatted_string = "\n- ".join(shopping_list_items)
    full_shopping_list_message = f"Here's the shopping list for '{recipe_name}':\n- {shopping_list_formatted_string}"
    logger.info(f"Shopping list for '{recipe_name}' (ID: {recipe_id}) generated.")
    return full_shopping_list_message
# --- End of wrapper functions ---

butler_common_tools = [
    FunctionTool(func=butler_memorize_wrapper),
    FunctionTool(func=butler_memorize_list_item_wrapper),
    FunctionTool(func=butler_forget_list_item_wrapper),
    FunctionTool(func=butler_get_memory_wrapper),
    FunctionTool(func=save_recipe_wrapper),
    FunctionTool(func=generate_shopping_list_for_recipe_wrapper),
]
