from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# --- Ingredient and Recipe Schemas ---
class Ingredient(BaseModel):
    name: str = Field(..., description="Name of the ingredient, e.g., 'Chicken Breast' or 'Olive Oil'")
    quantity: float = Field(..., description="Quantity of the ingredient, e.g., 2 or 0.5")
    unit: str = Field(..., description="Unit of measurement, e.g., 'pieces', 'grams', 'ml', 'tbsp'")
    notes: Optional[str] = Field(None, description="Additional notes, e.g., 'diced', 'extra virgin'")

class Recipe(BaseModel):
    title: str = Field(..., description="Clear and appealing title for the recipe.")
    description: str = Field(..., description="A short, enticing description of the recipe.")
    ingredients: List[Ingredient] = Field(..., description="A list of ingredients required for the recipe.")
    instructions: List[str] = Field(..., description="A list of clear, step-by-step cooking instructions.")
    prep_time_minutes: Optional[int] = Field(None, description="Estimated preparation time in minutes.")
    cook_time_minutes: Optional[int] = Field(None, description="Estimated cooking time in minutes.")
    servings: Optional[int] = Field(None, description="Number of servings the recipe yields.")
    cuisine_type: Optional[str] = Field(None, description="Type of cuisine, e.g., 'Italian', 'Mexican', 'Indian'.")
    dietary_suitability: Optional[List[str]] = Field(None, description="List of dietary tags, e.g., ['Vegan', 'Gluten-Free'].")
    image_url: Optional[str] = Field(None, description="Optional URL to an image of the dish.")
    source_url: Optional[str] = Field(None, description="Optional URL to the original source of the recipe.")
    notes: Optional[str] = Field(None, description="General notes about the recipe, like tips or variations.")


# --- User Profile Schema (Basic) ---
class UserProfile(BaseModel):
    user_id: str = Field(..., description="Unique identifier for the user.")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="User's preferences, e.g., {'dietary_restrictions': ['vegetarian'], 'favorite_cuisine': 'Italian'}")
    inventory: List[Ingredient] = Field(default_factory=list, description="User's current kitchen inventory.")
    # butlerPersonaSummary: Optional[str] = Field(None, description="A summary of the butler's understanding of the user.")


# --- Shopping List Schemas ---
class ShoppingListItem(BaseModel):
    name: str = Field(..., description="Name of the item to buy.")
    quantity: float = Field(..., description="Quantity needed.")
    unit: str = Field(..., description="Unit of measurement.")
    notes: Optional[str] = Field(None, description="Optional notes for the shopping item, e.g., 'brand preference'.")

class ShoppingList(BaseModel):
    items: List[ShoppingListItem] = Field(..., description="List of items to be purchased.")
    recipe_title: Optional[str] = Field(None, description="The recipe for which this shopping list was generated, if applicable.")


# --- Combined Output Schema for RecipeAgent ---
class RecipeAndShoppingListOutput(BaseModel):
    generated_recipe: Recipe = Field(..., description="The recipe generated or found by the agent.")
    shopping_list: Optional[ShoppingList] = Field(None, description="The shopping list generated based on the recipe and user's inventory. Optional if inventory check is skipped or not needed.")


# --- Configuration for JSON response from Agent ---
# To be used with agent.generate_content_config
json_response_config: Dict[str, Any] = {
    "response_mime_type": "application/json"
}

# --- Agent Invocation Schemas (Example for ButlerAgent to call RecipeAgent) ---
class RecipeAgentRequest(BaseModel):
    user_query: str = Field(..., description="The user's natural language request for a recipe.")
    user_id: Optional[str] = Field(None, description="Optional user ID to fetch profile/inventory.")
    # preferences: Optional[Dict[str, Any]] = Field(None, description="Specific preferences for this request.")
    # current_inventory: Optional[List[Ingredient]] = Field(None, description="User's current kitchen inventory, if available.")
