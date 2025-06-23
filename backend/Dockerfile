# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY backend/ ./backend
COPY butler_agent_pkg/ ./butler_agent_pkg
COPY agents/ ./agents
COPY backend/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8001

CMD ["sh", "-c", "cd backend && adk api_server --port=8001 --allow_origins=http://localhost:5173 agents"]
