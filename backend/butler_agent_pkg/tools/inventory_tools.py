# butler_agent_pkg/tools/inventory_tools.py
"""Tools for managing user's kitchen inventory. 
These tools interact with a mocked inventory database.
"""

import logging
from typing import List, Dict, Any, Union

logger = logging.getLogger(__name__)

# Mock database for inventory items
# In a real application, this would be a connection to a proper database (e.g., MongoDB)
mock_inventory_db: Dict[str, List[Dict[str, Any]]] = {
    "user_default": [ # Default inventory for new sessions or testing
        {"item_name": "eggs", "quantity": 6, "unit": "pieces"},
        {"item_name": "milk", "quantity": 0.5, "unit": "liter"},
        {"item_name": "butter", "quantity": 100, "unit": "grams"},
    ]
}

def add_item_to_inventory(user_id: str, item_name: str, quantity: Union[int, float], unit: str) -> Dict[str, Any]:
    """Adds a specified quantity of an item to the user's inventory.

    If the item with the same name and unit already exists, its quantity is updated.
    Otherwise, a new item is added.

    Args:
        user_id (str): The unique identifier for the user.
        item_name (str): The name of the item to add (e.g., 'flour', 'eggs').
        quantity (Union[int, float]): The amount of the item to add.
        unit (str): The unit of measurement for the item (e.g., 'kg', 'pieces', 'liter').

    Returns:
        Dict[str, Any]: A dictionary containing the status of the operation and a message.
                         Example: {'status': 'success', 'message': '2 kg of flour added to inventory.'}
                         Example: {'status': 'success', 'message': 'flour quantity updated to 2.5 kg.'}
    """
    logger.info(f"Attempting to add {quantity} {unit} of {item_name} for user {user_id}")
    if user_id not in mock_inventory_db:
        mock_inventory_db[user_id] = []
    
    for item in mock_inventory_db[user_id]:
        if item["item_name"].lower() == item_name.lower() and item["unit"].lower() == unit.lower():
            item["quantity"] += quantity
            logger.info(f"Updated {item_name} quantity to {item['quantity']} {unit} for user {user_id}")
            return {"status": "success", "message": f"{item_name} quantity updated to {item['quantity']} {unit}."}

    mock_inventory_db[user_id].append({"item_name": item_name, "quantity": quantity, "unit": unit})
    logger.info(f"Added {quantity} {unit} of {item_name} to inventory for user {user_id}")
    return {"status": "success", "message": f"{quantity} {unit} of {item_name} added to inventory."}

def remove_item_from_inventory(user_id: str, item_name: str, quantity: Union[int, float], unit: str) -> Dict[str, Any]:
    """Removes a specified quantity of an item from the user's inventory.

    If the quantity to remove is greater than or equal to the available quantity,
    the item is completely removed from the inventory.

    Args:
        user_id (str): The unique identifier for the user.
        item_name (str): The name of the item to remove.
        quantity (Union[int, float]): The amount of the item to remove.
        unit (str): The unit of measurement for the item.

    Returns:
        Dict[str, Any]: A dictionary containing the status of the operation and a message.
                         Example: {'status': 'success', 'message': 'Removed 1 kg of flour. Remaining: 1.5 kg.'}
                         Example: {'status': 'error', 'message': 'Item flour (kg) not found in inventory.'}
                         Example: {'status': 'error', 'message': 'Insufficient quantity of flour. Available: 0.5 kg.'}
    """
    logger.info(f"Attempting to remove {quantity} {unit} of {item_name} for user {user_id}")
    if user_id not in mock_inventory_db or not mock_inventory_db[user_id]:
        logger.warning(f"Inventory not found or empty for user {user_id}")
        return {"status": "error", "message": "Inventory not found or is empty for this user."}

    item_found = False
    item_to_remove_idx = -1 # Initialize index for removal

    for idx, item in enumerate(mock_inventory_db[user_id]):
        if item["item_name"].lower() == item_name.lower() and item["unit"].lower() == unit.lower():
            item_found = True
            if item["quantity"] > quantity:
                item["quantity"] -= quantity
                remaining_quantity = item["quantity"]
                logger.info(f"Removed {quantity} {unit} of {item_name}. Remaining: {remaining_quantity}")
                return {"status": "success", "message": f"Removed {quantity} {unit} of {item_name}. Remaining: {remaining_quantity} {unit}."}
            elif item["quantity"] == quantity:
                item_to_remove_idx = idx # Mark for removal outside the loop
                logger.info(f"Marked {item_name} for complete removal as quantity matches.")
                # Do not return yet, let it be removed after loop
                break # Item found and processed for removal
            else: # item["quantity"] < quantity
                logger.warning(f"Insufficient quantity of {item_name} to remove. Available: {item['quantity']}")
                return {"status": "error", "message": f"Insufficient quantity of {item_name}. Available: {item['quantity']} {unit}."}
    
    if item_to_remove_idx != -1:
        del mock_inventory_db[user_id][item_to_remove_idx]
        logger.info(f"Completely removed {item_name} ({unit}) from inventory for user {user_id}.")
        return {"status": "success", "message": f"Completely removed {item_name} ({unit}) from inventory."}

    if not item_found:
        logger.warning(f"Item {item_name} with unit {unit} not found in inventory for user {user_id}")
        return {"status": "error", "message": f"Item {item_name} ({unit}) not found in inventory."}
    
    # This case should ideally not be reached if logic is correct, but as a fallback:
    return {"status": "error", "message": "An unexpected error occurred during item removal."}

def check_item_in_inventory(user_id: str, item_name: str) -> Dict[str, Any]:
    """Checks if an item exists in the user's inventory and returns its details.

    Args:
        user_id (str): The unique identifier for the user.
        item_name (str): The name of the item to check.

    Returns:
        Dict[str, Any]: A dictionary containing the status, an optional item dictionary if found, and a message.
                         Example (found): {'status': 'found', 'item': {'item_name': 'flour', 'quantity': 1.5, 'unit': 'kg'}, 'message': 'flour is in your inventory.'}
                         Example (not found): {'status': 'not_found', 'message': 'salt not found in inventory.'}
    """
    logger.info(f"Checking for item {item_name} for user {user_id}")
    if user_id not in mock_inventory_db:
        logger.warning(f"Inventory not found for user {user_id}")
        return {"status": "not_found", "message": "Inventory not found for this user."}

    for item in mock_inventory_db[user_id]:
        if item["item_name"].lower() == item_name.lower():
            logger.info(f"Item {item_name} found: {item}")
            return {"status": "found", "item": item, "message": f"{item['item_name']} ({item['quantity']} {item['unit']}) is in your inventory."}
    
    logger.info(f"Item {item_name} not found for user {user_id}")
    return {"status": "not_found", "message": f"{item_name} not found in inventory."}

def list_inventory_items(user_id: str) -> Dict[str, Any]:
    """Lists all items currently in the user's inventory.

    Args:
        user_id (str): The unique identifier for the user.

    Returns:
        Dict[str, Any]: A dictionary containing the status, a list of inventory items, and a message.
                         Example: {'status': 'success', 'inventory': [{'item_name': 'flour', 'quantity': 1.5, 'unit': 'kg'}], 'message': 'Here are your inventory items.'}
                         Example (empty): {'status': 'empty', 'inventory': [], 'message': 'Your inventory is currently empty.'}
    """
    logger.info(f"Listing inventory for user {user_id}")
    if user_id not in mock_inventory_db or not mock_inventory_db[user_id]:
        logger.warning(f"Inventory is empty or not found for user {user_id}")
        return {"status": "empty", "inventory": [], "message": "Your inventory is currently empty."}
    
    current_inventory = mock_inventory_db[user_id]
    logger.info(f"Inventory for user {user_id}: {current_inventory}")
    return {"status": "success", "inventory": current_inventory, "message": "Here are your current inventory items."}

# Example usage (for testing purposes)
if __name__ == "__main__":
    print("--- Testing Inventory Tools ---")
    test_user = "user_test_alpha"
    
    print("\nInitial list (test_user):")
    print(list_inventory_items(test_user)) # Should be empty
    
    print("\nAdding items to test_user:")
    print(add_item_to_inventory(test_user, "flour", 2, "kg"))
    print(add_item_to_inventory(test_user, "sugar", 1, "kg"))
    print(add_item_to_inventory(test_user, "eggs", 12, "pieces"))
    print(add_item_to_inventory(test_user, "flour", 0.5, "kg")) # Update existing flour

    print("\nList after additions (test_user):")
    print(list_inventory_items(test_user))

    print("\nChecking items (test_user):")
    print(check_item_in_inventory(test_user, "sugar"))
    print(check_item_in_inventory(test_user, "salt")) # Not found

    print("\nRemoving items (test_user):")
    print(remove_item_from_inventory(test_user, "flour", 1, "kg")) # Remove partial
    print(check_item_in_inventory(test_user, "flour")) # Check flour after partial removal
    print(remove_item_from_inventory(test_user, "sugar", 2, "kg")) # Insufficient quantity
    print(check_item_in_inventory(test_user, "sugar")) # Check sugar (should be unchanged)
    print(remove_item_from_inventory(test_user, "salt", 1, "kg")) # Item not found
    print(remove_item_from_inventory(test_user, "eggs", 6, "pieces")) # Remove some eggs
    print(check_item_in_inventory(test_user, "eggs")) # Check eggs
    print(remove_item_from_inventory(test_user, "eggs", 6, "pieces")) # Remove remaining eggs (exact quantity)
    print(check_item_in_inventory(test_user, "eggs")) # Check eggs (should be not found)
    
    print("\nFinal list (test_user):")
    print(list_inventory_items(test_user))

    print("\n--- Testing with default user (user_default) ---")
    print("Initial list (user_default):")
    print(list_inventory_items("user_default"))
    print(add_item_to_inventory("user_default", "coffee", 250, "grams"))
    print(add_item_to_inventory("user_default", "milk", 0.5, "liter")) # Update existing milk
    print("List after additions (user_default):")
    print(list_inventory_items("user_default"))
    print(remove_item_from_inventory("user_default", "butter", 100, "grams")) # Remove all butter
    print("List after removal (user_default):")
    print(list_inventory_items("user_default"))
    print("--- End of Inventory Tools Test ---")
