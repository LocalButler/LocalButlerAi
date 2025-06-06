# Local Butler AI

**Elevator Pitch:** Local Butler AI is your intelligent, multi-agent personal assistant designed to streamline daily tasks, learn your preferences, and proactively manage your life, starting with a sophisticated kitchen and recipe management system that extends to automated grocery delivery.

**Problem Definition:** Modern life is busy. Juggling meal planning, grocery shopping, task management, and remembering personal preferences can be overwhelming. Local Butler AI aims to alleviate this cognitive load by providing a centralized, intelligent assistant that understands your needs and automates routine activities.

## Solution Overview

Local Butler AI leverages a powerful multi-agent system built with the Google Agent Development Kit (ADK). The `MasterButlerAgent` orchestrates a team of specialized sub-agents to handle various aspects of your life.

For the Agent Development Kit Hackathon with Google Cloud, we are showcasing a flagship user journey: **"From Smart Recipe to Delivered Ingredients & Updated Kitchen."** This demonstrates how Local Butler AI can:
1.  Suggest personalized recipes based on your profile and preferences.
2.  Intelligently check your kitchen inventory for available ingredients.
3.  Generate a shopping list for missing items.
4.  Automatically draft a delivery request for these items.
5.  Manage the delivery task.
6.  Update your kitchen inventory upon delivery.
7.  Continuously learn your preferences to refine its assistance and persona.

## Key Features (Flagship Journey Focus)

*   **Personalized Recipe Generation:** Leverages Gemini API via the `RecipeAgent` to suggest recipes tailored to user preferences and dietary needs.
*   **Smart Inventory Check:** The `RecipeAgent` (or a dedicated `InventoryAgent`) compares recipe ingredients against the user's tracked kitchen inventory.
*   **Automated Shopping List Creation:** Generates a precise list of missing ingredients.
*   **AI-Powered Delivery Task Drafting:** The `ServiceConciergeAgent` uses Gemini API to convert the shopping list into a structured delivery service request.
*   **Task Lifecycle Management:** The `TaskManagerAgent` handles the creation, status updates (e.g., open for offers, pending approval, ongoing, completed), and storage (MongoDB) of delivery tasks.
*   **Kitchen Inventory Updates:** Automatically updates the user's digital kitchen inventory upon successful delivery.
*   **Adaptive Butler Persona:** The `PersonaGenerationAgent`, guided by the `UserProfileAgent` and interactions across all agents, refines a "butler persona summary" that reflects learned user preferences and habits.

## Architecture Deep Dive

**(Placeholder: Insert Architecture Diagram Image Here - e.g., `![Architecture Diagram](docs/architecture.png)`)**

### Multi-Agent System (Google ADK)

Local Butler AI is built on a sophisticated multi-agent architecture powered by the Google Agent Development Kit (ADK).

*   **`MasterButlerAgent`:** The central orchestrator. It receives user requests (via FastAPI backend), determines the appropriate specialized agent(s) to handle the request, forwards messages, and aggregates responses. It embodies the core "Butler" intelligence.
*   **Specialized Sub-Agents:**
    *   **`RecipeAgent`:** Manages all aspects of recipes – suggesting new ones (using Gemini), storing user's recipes (recipe book), parsing ingredients, and interacting with inventory data.
    *   **`InventoryAgent` (Conceptual - may be part of `RecipeAgent` for hackathon):** Responsible for tracking items in the user's kitchen.
    *   **`ServiceConciergeAgent`:** Specializes in understanding service requests. For the flagship journey, it uses Gemini to draft clear, actionable delivery tasks based on shopping lists.
    *   **`TaskManagerAgent`:** Manages the lifecycle of all tasks (e.g., grocery delivery, future errands). It interacts with MongoDB to persist task data.
    *   **`UserProfileAgent`:** Securely stores and manages user-specific data, including preferences (dietary, cuisine), interaction history, and other details necessary for personalization.
    *   **`PersonaGenerationAgent`:** Uses Gemini and data from the `UserProfileAgent` to generate and update a dynamic "butler persona summary," reflecting how the AI perceives and adapts to the user.
*   **A2A (Agent-to-Agent) Communication:** Agents communicate using structured messages, orchestrated by the `MasterButlerAgent`, ensuring efficient collaboration and data flow as defined by the ADK framework.

### Technology Stack

*   **Backend:** Python, FastAPI, Google Agent Development Kit (ADK), Gemini API
*   **Frontend:** React, Tailwind CSS, Zustand (for state management), Axios (for API calls)
*   **Databases:**
    *   MongoDB: User profiles, tasks, recipes, kitchen inventory, chat logs.
    *   PostgreSQL (Planned for full system): Bids for tasks in the marketplace.
*   **Authentication:** Auth0
*   **Deployment (Planned):** Google Cloud (Cloud Run for backend, App Engine for frontend, Cloud SQL for PostgreSQL, MongoDB Atlas or self-hosted on GCP).

## Hackathon Specifics (Agent Development Kit Hackathon with Google Cloud)

*   **ADK Usage:** The Google Agent Development Kit is the backbone of Local Butler AI. It enables the creation, management, and orchestration of our multi-agent system, facilitating complex collaboration between specialized agents. The `LlmAgent` class, tools, and message-passing capabilities of ADK are central to our implementation.
*   **Google Cloud & Gemini:** We are extensively using the Gemini API for intelligent recipe generation, service request drafting, and persona adaptation. Our deployment plan targets Google Cloud services to leverage their scalability and robustness.
*   **Innovation:** Local Butler AI's innovation lies in its holistic approach to personal assistance, demonstrated through the seamless "recipe idea to delivered ingredients" funnel. The system's ability to learn and adapt its persona based on user interactions further enhances its novelty.

## Getting Started / Setup Instructions

### Prerequisites

*   Python 3.9+
*   Node.js 18+
*   MongoDB instance (local or cloud)
*   (Optional for full system) PostgreSQL instance
*   Git

### Environment Variables

Create a `.env` file in the `backend` directory and populate it with the following:
```
GEMINI_API_KEY=your_gemini_api_key
MONGO_URI=your_mongodb_connection_string
# Add other necessary variables like Auth0 details, DB names, etc.
```
Create a `.env.local` file in the `frontend` directory:
```
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key # If frontend makes direct calls, otherwise use backend proxy
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000/api # Or your backend URL
# Add other necessary frontend variables
```

### Backend Setup

1.  Navigate to the `backend` directory: `cd backend`
2.  Create a virtual environment: `python -m venv venv`
3.  Activate the virtual environment:
    *   Windows: `.\venv\Scripts\activate`
    *   macOS/Linux: `source venv/bin/activate`
4.  Install dependencies: `pip install -r requirements.txt`
5.  Run the FastAPI server: `uvicorn app.main:app --reload --port 8000`

### Frontend Setup

1.  Navigate to the `frontend` directory: `cd frontend`
2.  Install dependencies: `npm install`
3.  Run the React development server: `npm run dev`
    (The frontend should now be accessible at `http://localhost:3000` or similar)

## Demo Video

`[Link to Demo Video - Coming Soon!]`

## Future Work

Local Butler AI is envisioned to expand its capabilities significantly:
*   **Travel Concierge Agent:** For planning and booking trips.
*   **Advanced Task Management:** Including delegation to human fulfillers via a marketplace.
*   **Deeper Home Automation Integration.**
*   **Proactive suggestions and reminders based on learned patterns.**

---
*This project is a submission for the Agent Development Kit Hackathon with Google Cloud (June 23, 2025).*
