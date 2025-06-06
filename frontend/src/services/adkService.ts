
// frontend/src/services/adkService.ts

// Ensure this URL points to your ADK backend (FastAPI gateway)
// For local development, this might be http://localhost:8080 or similar.
// For deployed, it will be your Cloud Run URL.
const ADK_API_BASE_URL = process.env.REACT_APP_ADK_API_URL || 'http://localhost:8080'; // Fallback for local dev

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
  private baseUrl = ADK_API_BASE_URL;

  async sendMessageToButler(payload: ADKChatRequestPayload): Promise<ADKAgentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add any other headers like Authorization if you implement auth
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error structure" }));
        console.error("ADK API Error (sendMessageToButler):", response.status, errorData);
        throw new Error(errorData.detail || `Request failed with status ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error("Network or other error in sendMessageToButler:", error);
      // Ensure a consistent error response structure
      return { error: (error as Error).message || "Failed to communicate with the Butler AI service." };
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
      }
      return response.json();
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
