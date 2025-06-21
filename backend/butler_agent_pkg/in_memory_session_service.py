from google.adk.sessions.base_session_service import BaseSessionService
from google.adk.sessions.session import Session
from typing import Dict, Optional

class SessionNotFoundError(Exception):
    """Custom exception for when a session is not found."""
    pass

class InMemorySessionService(BaseSessionService):
    def __init__(self):
        self.sessions: Dict[str, Session] = {}

    def get_session(self, session_id: str) -> Session:
        session = self.sessions.get(session_id)
        if session is None:
            raise SessionNotFoundError(f"Session with id '{session_id}' not found.")
        return session

    def create_session(self, session_id: str, app_name: str, user_id: str, initial_state: Optional[Dict] = None) -> Session:
        if session_id in self.sessions:
            raise ValueError(f"Session with id '{session_id}' already exists.")
        if initial_state is None:
            initial_state = {}
        self.sessions[session_id] = Session(id=session_id, app_name=app_name, user_id=user_id, state=initial_state)
        return self.sessions[session_id]

    def delete_session(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]

    def list_sessions(self):
        return list(self.sessions.values())
