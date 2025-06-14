
// frontend/src/services/adkService.ts

// Ensure this URL points to your ADK backend (FastAPI gateway)
// For local development, this might be http://localhost:8000 or similar.
// For deployed, it will be your Cloud Run URL.
const ADK_API_BASE_URL = process.env.REACT_APP_ADK_API_URL || 'http://localhost:8000'; // ADK API server on port 8000

interface ADKChatRequestPayload {
  message: string;
  section?: string; // Optional context about where in the UI the request originated
  user_id?: string;   // Optional, but good for future stateful interactions
  session_id?: string;// Optional, for conversation tracking
}

interface ADKServiceRequestPayload {
  service_type: string;
  details: string;
  // Potentially other structured data for service requests
  user_id?: string;
  session_id?: string;
}

// Standard ADK AgentRunRequest format
interface AgentRunRequest {
  appName: string;
  userId: string;
  sessionId: string;
  newMessage: {
    parts: Array<{
      text: string;
    }>;
    role?: string;
  };
  streaming?: boolean;
}

// Standard ADK session creation request
interface CreateSessionRequest {
  appName: string;
  userId: string;
  state?: Record<string, any>;
}

// Generic response structure expected from the ADK backend
// This should match the ADK Event structure
export interface ADKAgentResponse {
  [key: string]: any; // Flexible structure for different agent responses
  error?: string; // Standard error field
}

export const isAdkBackendConfigured = (): boolean => {
  // Basic check, can be enhanced (e.g., ping endpoint)
  return !!ADK_API_BASE_URL && ADK_API_BASE_URL !== 'http://localhost:8080'; // Discourage default in "prod"
};

class ADKService {
  private baseUrl = ADK_API_BASE_URL;
  private appName = 'butler_agent_pkg'; // Match our agent package name
  private defaultUserId = 'user123'; // Default user ID for development
  private currentSessionId: string | null = null; // Cache the current session ID

  // Create a new session with the ADK backend
  private async createSession(userId: string = this.defaultUserId): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/apps/${this.appName}/users/${userId}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state: {} // Initial empty state
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }      const session = await response.json();
      this.currentSessionId = session.id; // Cache the session ID
      return session.id;
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }  }

  // Get the current session ID (useful for the frontend to know the active session)
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
  
  async sendMessageToButler(payload: ADKChatRequestPayload): Promise<ADKAgentResponse> {
    try {
      const userId = payload.user_id || this.defaultUserId;
      let sessionId = payload.session_id;

      // Ignore frontend-generated session IDs that don't match ADK format
      // ADK session IDs are UUIDs, frontend generates strings like "session_timestamp_random"
      if (sessionId && !sessionId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        sessionId = undefined; // Ignore invalid session ID format
      }

      // Use cached session if available, or create a new one
      if (!sessionId) {
        sessionId = this.currentSessionId || await this.createSession(userId);
      }

      const agentRequest: AgentRunRequest = {
        appName: this.appName,
        userId: userId,
        sessionId: sessionId,
        newMessage: {
          parts: [{ text: payload.message }],
          role: 'user'
        },
        streaming: false
      };

      const response = await fetch(`${this.baseUrl}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error structure" }));
        console.error("ADK API Error (sendMessageToButler):", response.status, errorData);
        throw new Error(errorData.detail || `Request failed with status ${response.status}`);
      }
      
      const events = await response.json();
      
      // Process ADK events to extract the response
      // Look for the final model response in the events
      let responseText = '';
      let hasError = false;
      
      for (const event of events) {
        if (event.errorMessage) {
          hasError = true;
          responseText = event.errorMessage;
          break;
        }
        
        if (event.content && event.content.parts) {
          for (const part of event.content.parts) {
            if (part.text) {
              responseText += part.text;
            }
          }
        }
      }
      
      if (hasError) {
        return { error: responseText };
      }
      
      return { 
        text_response: responseText,
        session_id: sessionId,
        events: events // Include raw events for debugging
      };
      
    } catch (error) {
      console.error("Network or other error in sendMessageToButler:", error);
      // Ensure a consistent error response structure
      return { error: (error as Error).message || "Failed to communicate with the Butler AI service." };
    }
  }  async createServiceRequestViaButler(payload: ADKServiceRequestPayload): Promise<ADKAgentResponse> {
    try {
      // For service requests, we can use the same sendMessageToButler method
      // but format the message to indicate it's a service request
      const serviceMessage = `Service Request: ${payload.service_type} - ${payload.details}`;
      
      return await this.sendMessageToButler({
        message: serviceMessage,
        user_id: payload.user_id,
        session_id: payload.session_id
      });
    } catch (error) {
      console.error("Network or other error in createServiceRequestViaButler:", error);
      return { error: (error as Error).message || "Failed to create service request via Butler AI." };
    }
  }

  // Placeholder for future direct agent calls if ever needed, though Master Butler is preferred
  // async callSpecificAgent(agentName: string, query: any): Promise<any> {
  //   const response = await fetch(`${this.baseUrl}/v1/agents/${agentName}/invoke`, { // ADK standard path
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ query }) // ADK expects `query` field
  //   });
  //   if (!response.ok) {
  //     const errorData = await response.json();
  //     throw new Error(errorData.detail || `Request to ${agentName} failed`);
  //   }
  //   return response.json();
  // }
}

const adkService = new ADKService();
export default adkService;
