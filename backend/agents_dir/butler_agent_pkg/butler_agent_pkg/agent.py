# Copyright 2025 Local Butler AI
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Main Agent module for the Butler AI agent."""

import logging
import warnings
from google.adk.agents import Agent
from .config import settings
from .butler_prompts import ROOT_AGENT_INSTRUCTION, GLOBAL_INSTRUCTION
from .common_tools import butler_common_tools

warnings.filterwarnings("ignore", category=UserWarning, module=".*pydantic.*")

# Configure logging
logger = logging.getLogger(__name__)

# Sub-agents (commented out temporarily to avoid parent conflicts)
# from .sub_agents.recipe import recipe_agent
# from .service_concierge_agent import service_concierge_agent
# from .profile_agent import user_profile_agent
# from .task_manager_agent import task_manager_agent
# from .persona_generation_agent import persona_generation_agent
# from .inventory_agent import inventory_agent
# from .dietary_agent import dietary_agent

def before_agent_callback(callback_context):
    """Initialize session state for the butler agent."""
    # Add any session initialization logic here
    pass

root_agent = Agent(
    model=settings.DEFAULT_MODEL,
    global_instruction=GLOBAL_INSTRUCTION,
    instruction=ROOT_AGENT_INSTRUCTION,
    name="butler_agent",
    tools=butler_common_tools,
    # sub_agents=[
    #     recipe_agent,
    #     service_concierge_agent,
    #     user_profile_agent,
    #     task_manager_agent,
    #     persona_generation_agent,    #     inventory_agent,
    #     dietary_agent,
    # ],
    before_agent_callback=before_agent_callback,
)

logger.info(f"ButlerAgent (root_agent) initialized with model: {settings.DEFAULT_MODEL}")
logger.info(f"ButlerAgent (root_agent) tools: {[tool.func.__name__ for tool in root_agent.tools]}")

# Example of how this agent might be used in main.py (conceptual)
# async def handle_user_query(user_query: str, session_id: str):
#     # In a real app, you'd manage session state (e.g., via ADK's SessionManager)
#     # For simplicity, ADK handles state internally based on agent interactions.
#     response = await root_agent.send_message_async(user_query)
#     return response
