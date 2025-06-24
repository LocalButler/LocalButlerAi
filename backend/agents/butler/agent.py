# agents/butler/agent.py
"""ADK-compatible butler agent definition."""

import os
import sys

# Add the backend directory to Python path for imports
# Go up 3 levels: agent.py -> butler -> agents -> backend
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, backend_dir)

from butler_agent_pkg.butler_agent import butler_agent

# Export the agent for ADK to discover (ADK expects 'root_agent')
root_agent = butler_agent
