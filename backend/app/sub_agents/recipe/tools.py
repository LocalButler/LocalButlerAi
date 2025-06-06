# backend/app/sub_agents/recipe/tools.py
"""Tools for the RecipeAgent, including inventory checking."""

import logging
from typing import List, Dict

from backend.app.shared_libraries import types

logger = logging.getLogger(__name__)

def check_inventory_and_create_shopping_list(
    recipe_ingredients: List[types.Ingredient],
    user_inventory_ingredients: List[types.Ingredient],
    recipe_title: str = "Selected Recipe"
) -> types.ShoppingList:
    """
    Compares ingredients required for a recipe against the user's current inventory
    and generates a shopping list for missing items or insufficient quantities.

    Args:
        recipe_ingredients: A list of Ingredient objects required for the recipe.
        user_inventory_ingredients: A list of Ingredient objects representing the user's current inventory.
        recipe_title: The title of the recipe for which the shopping list is being generated.

    Returns:
        A ShoppingList object.
    """
    shopping_list_items: List[types.ShoppingListItem] = []
    
    # Create a dictionary for easier lookup of inventory items by normalized name
    # For simplicity, we'll assume quantity aggregation for items with the same name and unit in inventory
    inventory_map: Dict[str, types.Ingredient] = {}
    for item in user_inventory_ingredients:
        # Normalize name (lowercase, strip whitespace) for comparison
        normalized_name = item.name.lower().strip()
        key = f"{normalized_name}_{item.unit.lower().strip()}" # Consider unit in key for more accuracy
        
        if key in inventory_map:
            # Aggregate quantities if item with same name and unit already exists
            inventory_map[key].quantity += item.quantity
        else:
            # Make a copy to avoid modifying the original inventory list objects if they are mutable
            inventory_map[key] = types.Ingredient(**item.model_dump()) 

    for req_ingredient in recipe_ingredients:
        normalized_req_name = req_ingredient.name.lower().strip()
        req_key = f"{normalized_req_name}_{req_ingredient.unit.lower().strip()}"
        
        needed_quantity = req_ingredient.quantity
        
        if req_key in inventory_map:
            inventory_item = inventory_map[req_key]
            # Simple subtraction, assumes units are compatible if keys match
            if inventory_item.quantity >= needed_quantity:
                needed_quantity = 0
                inventory_item.quantity -= req_ingredient.quantity # Reduce available inventory for this session/check
            else:
                needed_quantity -= inventory_item.quantity
                inventory_item.quantity = 0 # All of this inventory item used up
        
        if needed_quantity > 0:
            shopping_list_items.append(
                types.ShoppingListItem(
                    name=req_ingredient.name, # Use original name for shopping list
                    quantity=needed_quantity,
                    unit=req_ingredient.unit,
                    notes=req_ingredient.notes
                )
            )
            
    logger.info(f"Generated shopping list with {len(shopping_list_items)} items for recipe: {recipe_title}")
    return types.ShoppingList(items=shopping_list_items, recipe_title=recipe_title)

# Example Usage (for testing purposes):
if __name__ == '__main__':
    # Sample recipe ingredients
    recipe_ings = [
        types.Ingredient(name="Chicken Breast", quantity=2, unit="pieces", notes="skinless, boneless"),
        types.Ingredient(name="Broccoli", quantity=1, unit="head"),
        types.Ingredient(name="Soy Sauce", quantity=3, unit="tbsp"),
        types.Ingredient(name="Garlic", quantity=2, unit="cloves"),
        types.Ingredient(name="Olive Oil", quantity=1, unit="tbsp"),
    ]

    # Sample user inventory
    user_inv = [
        types.Ingredient(name="broccoli", quantity=0.5, unit="head"), # Note: lowercase, partial quantity
        types.Ingredient(name="Soy Sauce", quantity=100, unit="ml"), # Different unit, will be treated as missing for now
        types.Ingredient(name="Garlic", quantity=5, unit="cloves"),
        types.Ingredient(name="Onion", quantity=3, unit="pieces"),
    ]

    print("Recipe Ingredients:")
    for item in recipe_ings: print(f"- {item.model_dump_json()}")
    
    print("\nUser Inventory:")
    for item in user_inv: print(f"- {item.model_dump_json()}")

    shopping_list_result = check_inventory_and_create_shopping_list(recipe_ings, user_inv, "Test Stir-fry")
    
    print("\nShopping List Result:")
    print(shopping_list_result.model_dump_json(indent=2))
    # Expected: Chicken Breast, 0.5 head Broccoli, Soy Sauce (if units don't match), Olive Oil
    # Garlic should not be on the list as user has 5 cloves and recipe needs 2.
