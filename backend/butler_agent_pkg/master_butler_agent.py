from .tools import memory_tool
from google.adk.tools.function_tool import FunctionTool

# Attach memory tools so the agent can store and recall user/session details
master_butler_tools = [
    FunctionTool(func=memory_tool.memorize),
    FunctionTool(func=memory_tool.memorize_list_item),
    FunctionTool(func=memory_tool.forget_list_item),
    FunctionTool(func=memory_tool.get_memory),
]