# Local Butler AI Backend

This directory contains the backend server for the Local Butler AI application, built with FastAPI and the Google Agent Development Kit (ADK).

## Features

-   **Agent-based Architecture**: Utilizes a root `ButlerAgent` to orchestrate specialized sub-agents (e.g., `RecipeAgent`).
-   **Session Management**: Includes a memory tool for agents to maintain context during user interactions.
-   **Structured Configuration**: Uses Pydantic for managing application settings.
-   **Clear API**: Exposes a `/chat` endpoint for interacting with the AI.

## Project Structure

```
backend/
├── app/                    # Main application code
│   ├── agents/             # Root agent (ButlerAgent)
│   ├── sub_agents/         # Specialized agents (e.g., recipe/)
│   ├── shared_libraries/   # Constants, Pydantic types
│   ├── tools/              # Reusable tools (e.g., memory_tool.py)
│   ├── config.py           # Application configuration
│   └── main.py             # FastAPI application entrypoint
├── .env.example            # Example environment variables file
├── README.md               # This file
└── requirements.txt        # Python dependencies
```

## Setup Instructions

1.  **Clone the Repository (if you haven't already)**

2.  **Navigate to the Backend Directory**:
    ```bash
    cd path/to/local-butlerAIapp/backend
    ```

3.  **Create a Virtual Environment (Recommended)**:
    ```bash
    python -m venv venv
    ```
    Activate it:
    -   Windows (Git Bash or similar):
        ```bash
        source venv/Scripts/activate
        ```
    -   Windows (Command Prompt/PowerShell):
        ```bash
        .\venv\Scripts\activate
        ```
    -   macOS/Linux:
        ```bash
        source venv/bin/activate
        ```

4.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

5.  **Set Up Environment Variables**:
    -   Copy `.env.example` to a new file named `.env` in the `backend` directory:
        ```bash
        cp .env.example .env
        ```
    -   Open the `.env` file and replace `"YOUR_GEMINI_API_KEY_HERE"` with your actual Google Gemini API key.

## Running the Application

Once the setup is complete, you can run the FastAPI server using Uvicorn:

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

-   `--reload`: Enables auto-reload when code changes (useful for development).
-   The server will be accessible at `http://localhost:8000`.

## Interacting with the API

You can interact with the `/chat` endpoint using tools like `curl` or Postman, or directly from your frontend application.

**Example using `curl`:**

```bash
curl -X POST "http://localhost:8000/chat/" \
-H "Content-Type: application/json" \
-d '{
  "query": "Hi Butler, can you find a recipe for a simple chicken pasta?",
  "session_id": "user123-sessionABC"
}'
```

**Expected Response (Structure):**

```json
{
  "session_id": "user123-sessionABC",
  "text_response": "Hello! I can certainly help with that. Let me connect you with my RecipeAgent to find the perfect chicken pasta recipe for you... (or similar)",
  "structured_output": null, // or a recipe object if RecipeAgent responds directly
  "error_message": null
}
```

If the `RecipeAgent` successfully generates a recipe, the `structured_output` field will contain the JSON representation of the recipe.

## Next Steps for Development

-   Implement additional sub-agents (e.g., MealPlanner, FridgeAnalyzer, UserProfileManager).
-   Add more tools for agents as needed.
-   Develop comprehensive tests.
-   Integrate with your frontend application.
