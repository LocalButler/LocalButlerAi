# backend/app/tools/memory_tool.py
"""Memory tool for agents to manage session state."""

import logging
from datetime import datetime # Kept as it was in the original file
from typing import Dict, Any, List

from google.adk.agents.callback_context import CallbackContext
from google.adk.sessions.state import State
from google.adk.tools import ToolContext

from backend.app.shared_libraries import constants
from backend.app.shared_libraries.types import UserProfile, Ingredient

logger = logging.getLogger(__name__)

def memorize(key: str, value: Any, tool_context: ToolContext) -> Dict[str, str]:
    """
    Memorize a piece of information as a key-value pair in the session state.
    If the key already exists, its value will be overwritten.
    """
    session_state = tool_context.state
    session_state[key] = value
    logger.info(f"Memorized '{key}': '{value}'")
    return {"status": f"Successfully memorized '{key}' with value '{value}'."}


def memorize_list_item(key: str, item: Any, tool_context: ToolContext) -> Dict[str, str]:
    """
    Adds an item to a list in the session state.
    If the key does not exist, a new list is created.
    If the item already exists in the list, it's not added again to prevent duplicates.
    """
    session_state = tool_context.state
    if key not in session_state or not isinstance(session_state[key], list):
        session_state[key] = []

    if item not in session_state[key]:
        session_state[key].append(item)
        logger.info(f"Added item to list '{key}': '{item}'")
        return {"status": f"Successfully added item to list '{key}': '{item}'."}
    else:
        logger.info(f"Item '{item}' already exists in list '{key}'. Not adding.")
        return {"status": f"Item '{item}' already exists in list '{key}'."}


def forget_list_item(key: str, item: Any, tool_context: ToolContext) -> Dict[str, str]:
    """
    Removes an item from a list in the session state.
    """
    session_state = tool_context.state
    if key in session_state and isinstance(session_state[key], list):
        if item in session_state[key]:
            session_state[key].remove(item)
            logger.info(f"Removed item from list '{key}': '{item}'")
            return {"status": f"Successfully removed item '{item}' from list '{key}'."}
        else:
            logger.info(f"Item '{item}' not found in list '{key}'.")
            return {"status": f"Item '{item}' not found in list '{key}'."}
    else:
        logger.info(f"List '{key}' not found or is not a list.")
        return {"status": f"List '{key}' not found or is not a list."}


def get_memory(key: str, tool_context: ToolContext) -> Dict[str, Any]:
    """
    Retrieves a piece of information from the session state.
    """
    session_state = tool_context.state
    if key in session_state:
        value = session_state[key]
        logger.info(f"Retrieved '{key}': type='{type(value)}'")
        return {key: value}
    else:
        logger.info(f"Key '{key}' not found in memory.")
        return {key: None, "status": f"Key '{key}' not found."}


async def initialize_session_state(callback_context: CallbackContext) -> None:
    """
    Initializes the session state if it's not already set up.
    Ensures a default UserProfile with sample inventory exists.
    Also initializes chat history.
    """
    session_state = callback_context.state

    # Initialize UserProfile with inventory
    if not session_state.get(constants.USER_PROFILE_KEY):
        logger.info(f"'{constants.USER_PROFILE_KEY}' not found in session. Initializing with default.")

        default_inventory = [
            Ingredient(name="Eggs", quantity=6, unit="pieces"),
            Ingredient(name="Milk", quantity=1, unit="liter"),
            Ingredient(name="Bread", quantity=1, unit="loaf"),
            Ingredient(name="Butter", quantity=250, unit="grams"),
            Ingredient(name="Tomato", quantity=3, unit="pieces", notes="Roma tomatoes"),
            Ingredient(name="Onion", quantity=2, unit="pieces"),
            Ingredient(name="Garlic", quantity=1, unit="head"),
            Ingredient(name="Pasta", quantity=500, unit="grams", notes="Spaghetti"),
            Ingredient(name="Olive Oil", quantity=250, unit="ml", notes="Extra Virgin")
        ]

        default_user_profile = UserProfile(
            user_id="default_user_001", 
            preferences={
                "dietary_restrictions": ["vegetarian_friendly"],
                "favorite_cuisine": "Italian"
            },
            inventory=default_inventory
        )
        session_state[constants.USER_PROFILE_KEY] = default_user_profile
        logger.info(f"Default UserProfile object stored under key '{constants.USER_PROFILE_KEY}'.")
        logger.debug(f"Default UserProfile content: {default_user_profile.model_dump_json(indent=2)}")

    # Initialize Chat History
    if not session_state.get(constants.CHAT_HISTORY_KEY):
        session_state[constants.CHAT_HISTORY_KEY] = []
        logger.info(f"Initialized empty chat history under key '{constants.CHAT_HISTORY_KEY}'.")
    
    logger.info("Session state initialization check complete.")

# Example of how these tools might be registered with an agent:
# from google.adk.tools import Tool
# memory_tools = [
#     Tool(name="memorize", func=memorize, description="Stores a key-value pair in session memory."),
#     Tool(name="memorize_list_item", func=memorize_list_item, description="Adds an item to a list in session memory."),
#     Tool(name="forget_list_item", func=forget_list_item, description="Removes an item from a list in session memory."),
#     Tool(name="get_memory", func=get_memory, description="Retrieves a value from session memory by key.")
# ]
