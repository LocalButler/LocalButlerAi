# butler_agent_pkg/agent_z.py
"""Agent Z: ADK custom agent for user data persistence and retrieval (MongoDB-backed)."""

import logging
from google.adk.agents import Agent
from google.adk.tools.function_tool import FunctionTool
from google.adk.models import Gemini
from .config import settings
from pymongo import MongoClient
import os

logger = logging.getLogger(__name__)

# MongoDB setup (adjust URI as needed)
mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
client = MongoClient(mongo_uri)
db = client["butler_ai"]

# --- Function tools for CRUD and session-aware ingestion ---
def save_user_data(user_id: str, data_type: str, data: dict, session_id: str) -> str:
    """Saves user data to MongoDB, requires a session ID."""
    collection = db[data_type]
    data['user_id'] = user_id
    data['session_id'] = session_id
    result = collection.insert_one(data)
    logger.info(f"Saved {data_type} for user {user_id} (session: {session_id}): {result.inserted_id}")
    return str(result.inserted_id)

def get_user_data(user_id: str, data_type: str, filter: dict = None, session_id: str = None) -> list:
    """Retrieves user data from MongoDB, optionally filtered by session ID and other filters."""
    collection = db[data_type]
    query = {"user_id": user_id}
    if session_id:
        query["session_id"] = session_id
    if filter:
        query.update(filter)
    results = list(collection.find(query, {'_id': 0}))
    logger.info(f"Fetched {len(results)} {data_type} for user {user_id} (session: {session_id})")
    return results

save_user_data_tool = FunctionTool(
    func=save_user_data
)

get_user_data_tool = FunctionTool(
    func=get_user_data
)

agent_z_llm = Gemini(model=settings.DEFAULT_MODEL)

agent_z = Agent(
    model=agent_z_llm,
    name="AgentZ",
    description="Personal data librarian agent. Handles user data persistence and retrieval for the agent ecosystem.",
    instruction="You are responsible for saving and retrieving structured user data for the current user.",
    tools=[save_user_data_tool, get_user_data_tool],
)
