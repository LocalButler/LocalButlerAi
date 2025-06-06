import logging
from google.adk.agents import Agent

from backend.app.config import settings
from backend.app.agents import butler_prompts  # You may want a separate recipe_prompts.py for recipe-specific instructions
# from backend.app.tools import recipe_tools  # Uncomment if you have recipe-specific tools

logger = logging.getLogger(__name__)

recipe_agent = Agent(
    model=settings.DEFAULT_MODEL,  # Use your configured model
    name="RecipeAgent",
    description="Handles all recipe-related queries, such as suggesting recipes, listing ingredients, and providing cooking instructions.",
    instruction=getattr(butler_prompts, "RECIPE_AGENT_INSTRUCTION", "You are a helpful recipe assistant."),  # Use a recipe-specific prompt if available
    tools=[],  # Add recipe-specific tools here if you have any, e.g., recipe_tools.recipe_search
    sub_agents=[],
    before_agent_callback=None,  # Add a callback if you need to initialize state
    # temperature=0.3,  # Optional: adjust for creativity
)

logger.info(f"RecipeAgent initialized with model: {settings.DEFAULT_MODEL}")