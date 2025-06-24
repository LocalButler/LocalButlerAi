# butler_agent_pkg/task_manager_agent.py
"""Defines the TaskManagerAgent for the Local Butler AI application."""

import logging
from google.adk.agents import Agent
from google.adk.models import Gemini
from google.adk.tools.function_tool import FunctionTool

from .config import settings
from . import task_manager_prompts
from .tools import task_management_tools # Import the new task tools
from .tools import memory_tool

logger = logging.getLogger(__name__)

# Define ADK tools based on the functions in task_management_tools.py
task_manager_tools = [
    FunctionTool(func=task_management_tools.create_task),
    FunctionTool(func=task_management_tools.get_task_status),
    FunctionTool(func=task_management_tools.update_task),
    FunctionTool(func=task_management_tools.list_tasks),
]

def resume_pending_task(tool_context):
    """
    Checks the session state for a pending task and resumes it if present.
    """
    session_state = tool_context.state
    pending_task = session_state.get("pending_task")
    if pending_task:
        # Here you would implement logic to resume or handle the pending task
        # For demonstration, we just log and return a message
        logger.info(f"Resuming pending task: {pending_task}")
        return {"status": "resumed", "task": pending_task}
    return {"status": "no_pending_task"}

# Example: Add this as a tool for the agent so it runs on transfer or startup
resume_pending_task_tool = FunctionTool(func=resume_pending_task)
task_manager_tools.append(resume_pending_task_tool)

# Attach memory tools so the agent can store and recall user/task details
memory_tools = [
    FunctionTool(func=memory_tool.memorize),
    FunctionTool(func=memory_tool.memorize_list_item),
    FunctionTool(func=memory_tool.forget_list_item),
    FunctionTool(func=memory_tool.get_memory),
]
task_manager_tools.extend(memory_tools)

# Configure the Google LLM with API key for task_manager_agent
task_manager_agent_llm_model = Gemini(
    model=settings.DEFAULT_MODEL
)

task_manager_agent = Agent(
    model=task_manager_agent_llm_model,
    name="TaskManagerAgent",
    description="Manages the lifecycle of all tasks, including creation, status tracking, updates, and retrieval from the database.",
    instruction=task_manager_prompts.TASK_MANAGER_AGENT_INSTRUCTION,
    tools=task_manager_tools,
)

logger.info(f"TaskManagerAgent initialized with model: {settings.DEFAULT_MODEL}")
logger.info(f"TaskManagerAgent tools: {[tool.func.__name__ for tool in task_manager_tools]}")
