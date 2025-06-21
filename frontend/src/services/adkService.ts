// frontend/src/services/adkService.ts

// Ensure this URL points to your ADK backend (FastAPI gateway)
// For local development, this might be http://localhost:8080 or similar.
// For deployed, it will be your Cloud Run URL.
const ADK_API_BASE_URL = process.env.REACT_APP_ADK_API_URL || 'http://127.0.0.1:8001'; // Updated to use port 8001 to match backend task

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

// Generic response structure expected from the ADK backend
// This should match the .outputs dictionary from ADK's ToolOutput
export interface ADKAgentResponse {
  [key: string]: any; // Flexible structure for different agent responses
  error?: string; // Standard error field
}


export const isAdkBackendConfigured = (): boolean => {
  // Basic check, can be enhanced (e.g., ping endpoint)
  return !!ADK_API_BASE_URL && ADK_API_BASE_URL !== 'http://localhost:8080'; // Discourage default in "prod"
};


class ADKService {
  private baseUrl = ADK_API_BASE_URL;  // Test backend connection
  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      // Use /list-apps endpoint instead of root as it actually exists
      const response = await fetch(`${this.baseUrl}/list-apps`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return { connected: false, message: `Backend returned status ${response.status}` };
      }
      
      const data = await response.json();
      return { connected: true, message: `Connected successfully. Available apps: ${data.join(', ')}` };
    } catch (error) {
      console.error("Backend connection test failed:", error);
      return { 
        connected: false, 
        message: `Failed to connect: ${(error as Error).message}` 
      };
    }
  }  async sendMessageToButler(payload: ADKChatRequestPayload): Promise<ADKAgentResponse> {
    try {
      console.log('Sending message to butler with payload:', payload);
      
      // First, create or get a session
      let sessionId = payload.session_id;
      if (!sessionId) {
        // Create a new session
        const sessionResponse = await fetch(`${this.baseUrl}/apps/butler/users/frontend_user/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages: [] }),
        });
        
        if (!sessionResponse.ok) {
          throw new Error(`Failed to create session: ${sessionResponse.status}`);
        }
        
        const sessionData = await sessionResponse.json();
        sessionId = sessionData.id;
        console.log('Created new session:', sessionId);
      }
      
      const requestBody = {
        appName: "butler",
        userId: "frontend_user",
        sessionId: sessionId,
        newMessage: {
          parts: [
            {
              text: payload.message
            }
          ],
          role: "user"
        },
        streaming: false
      };
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      // Use the /run endpoint with the correct format
      const response = await fetch(`${this.baseUrl}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error structure" }));
        console.error("ADK API Error (sendMessageToButler):", response.status, errorData);
        throw new Error(errorData.detail || `Request failed with status ${response.status}`);
      }      const data = await response.json();
      console.log('Response data:', data);
      
      // The /run endpoint returns an array of Events directly
      if (Array.isArray(data) && data.length > 0) {
        // Find the last event with agent content (role: 'model')
        const responseEvent = data
          .reverse()
          .find((event: any) => event.content && event.content.parts && event.content.role === 'model');
        
        if (responseEvent && responseEvent.content.parts.length > 0) {
          const textPart = responseEvent.content.parts.find((part: any) => part.text);
          if (textPart) {
            return { 
              text_response: textPart.text,
              session_id: sessionId // Return session ID for future messages
            };
          }
        }
      }
      
      // Fallback if we couldn't extract the response
      return { error: "Could not extract response from ADK events", session_id: sessionId };    } catch (error) {
      console.error("Network or other error in sendMessageToButler:", error);
      // Ensure a consistent error response structure
      return { 
        error: (error as Error).message || "Failed to communicate with the Butler AI service.",
        session_id: payload.session_id // Preserve session ID even on error
      };
    }
  }

  async createServiceRequestViaButler(payload: ADKServiceRequestPayload): Promise<ADKAgentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/service-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error structure" }));
        console.error("ADK API Error (createServiceRequestViaButler):", response.status, errorData);
        throw new Error(errorData.detail || `Service request failed with status ${response.status}`);
      }      return response.json();
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
