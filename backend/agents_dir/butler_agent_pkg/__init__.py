# butler_agent_pkg/__init__.py
from .butler_agent_pkg.agent import root_agent

# Make sure root_agent is available at the top level for ADK
__all__ = ['root_agent']