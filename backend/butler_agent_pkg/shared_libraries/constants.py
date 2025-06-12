# backend/butler_agent_pkg/shared_libraries/constants.py
"""Global constants for the application."""

USER_PROFILE_KEY = "user_profile"
CHAT_HISTORY_KEY = "chat_history"

# --- Recipe Related Memory Keys ---
RECIPE_MEMORY_PREFIX = "recipe_detail_" # Used to store full details of a single recipe, e.g., recipe_detail_123
SAVED_RECIPES_LIST_KEY = "saved_recipes_list" # Key for a list of (recipe_id, recipe_title) tuples or similar summaries

# --- Shopping List Related Memory Keys ---
SHOPPING_LIST_MEMORY_PREFIX = "shopping_list_" # Used to store a shopping list for a specific recipe, e.g., shopping_list_123
USER_SHOPPING_LISTS_KEY = "user_all_shopping_lists" # Key for a list or dict of all active shopping lists
