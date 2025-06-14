# butler_agent_pkg/task_manager_agent.py
"""Defines the TaskManagerAgent for the Local Butler AI application."""

import logging
from google.adk.agents import Agent
from google.adk.tools.function_tool import FunctionTool

from .config import settings
from . import task_manager_prompts
from .tools import task_management_tools # Import the new task tools

logger = logging.getLogger(__name__)

# Define ADK tools based on the functions in task_management_tools.py
task_manager_tools = [
    FunctionTool(func=task_management_tools.create_task),
    FunctionTool(func=task_management_tools.get_task_status),
    FunctionTool(func=task_management_tools.update_task),
    FunctionTool(func=task_management_tools.list_tasks),
]

task_manager_agent = Agent(
    model=settings.DEFAULT_MODEL,
    name="TaskManagerAgent",
    description="Manages the lifecycle of all tasks, including creation, status tracking, updates, and retrieval from the database.",
    instruction=task_manager_prompts.TASK_MANAGER_AGENT_INSTRUCTION,
    tools=task_manager_tools,
)

logger.info(f"TaskManagerAgent initialized with model: {settings.DEFAULT_MODEL}")
logger.info(f"TaskManagerAgent tools: {[tool.func.__name__ for tool in task_manager_tools]}")
