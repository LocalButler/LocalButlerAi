# butler_agent_pkg/__init__.py
from .agent import root_agent

# Make sure root_agent is available at multiple import paths for ADK
__all__ = ['root_agent']