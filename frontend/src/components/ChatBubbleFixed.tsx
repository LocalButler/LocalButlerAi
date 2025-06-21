// Modern ChatBubble component with improved ADK integration
import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isStreaming?: boolean;
}

interface ADKEvent {
  invocationId?: string;
  author?: string;
  content?: {
    parts?: Array<{
      text?: string;
      functionCall?: any;
      functionResponse?: any;
    }>;
    role?: string;
  };
  actions?: {
    transferToAgent?: string;
  };
  timestamp?: number;
}

const ChatBubble: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  // Initialize session when component mounts
  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    // Check if we have a valid session stored
    const storedSessionId = localStorage.getItem('chatSessionId');
    if (storedSessionId) {
      console.log('Found stored session:', storedSessionId);
      setSessionId(storedSessionId);
    } else {
      console.log('No stored session found - will create on first message');
    }
  };

  const createSession = async (): Promise<string> => {
    console.log('Creating new ADK session...');
    const response = await fetch('http://127.0.0.1:8001/apps/butler/users/frontend_user/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appName: "butler",
        userId: "frontend_user"
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create session');
    }

    const sessionData = await response.json();
    const newSessionId = sessionData.id;
    
    // Store session in state and localStorage
    setSessionId(newSessionId);
    localStorage.setItem('chatSessionId', newSessionId);
    console.log('New session created:', newSessionId);
    
    return newSessionId;
  };

  const ensureSession = async (): Promise<string> => {
    // If we have a valid session, use it
    if (sessionId) {
      console.log('Using existing session:', sessionId);
      return sessionId;
    }
    
    // Otherwise, create a new one
    console.log('No active session, creating new one...');
    return await createSession();
  };

  const sendMessage = async (messageText: string, currentSessionId: string): Promise<string> => {
    console.log('Sending message to ADK...');
    const response = await fetch('http://127.0.0.1:8001/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appName: "butler",
        userId: "frontend_user",
        sessionId: currentSessionId,
        newMessage: {
          parts: [{ text: messageText }],
          role: "user"
        },
        streaming: false
      }),
    });

    if (!response.ok) {
      throw new Error(`Message failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('ADK Response:', data);

    // Improved response extraction - handle agent transfers and multiple response events
    if (Array.isArray(data) && data.length > 0) {
      // Find the last content event with text (could be from transferred agent)
      const contentEvents = data.filter((event: ADKEvent) => 
        event.content && 
        event.content.parts && 
        event.content.parts.some(part => part.text)
      );
      
      if (contentEvents.length > 0) {
        // Get the last response (after any agent transfers)
        const lastEvent = contentEvents[contentEvents.length - 1];
        const textPart = lastEvent.content!.parts!.find((part: any) => part.text);
        
        if (textPart?.text) {
          return textPart.text;
        }
      }
      
      // Fallback: look for any text in any event
      for (const event of data) {
        if (event.content?.parts) {
          for (const part of event.content.parts) {
            if (part.text) {
              return part.text;
            }
          }
        }
      }
    }
    
    throw new Error('No valid response found in ADK events');
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    const currentInput = inputValue; // Store input before clearing
    setInputValue('');
    setIsLoading(true);

    try {
      // Use existing session or create new one only if needed
      console.log('Ensuring we have a valid session...');
      const currentSessionId = await ensureSession();

      // Send message and get response
      const responseText = await sendMessage(currentInput, currentSessionId);

      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        text: responseText,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prevMessages) => [...prevMessages, aiMessage]);

    } catch (error) {
      console.error('Error:', error);
      
      // More detailed error messages
      let errorText = 'Sorry, I encountered an error.';
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorText = 'Unable to connect to the butler service. Please check if the backend is running.';
        } else if (error.message.includes('No valid response')) {
          errorText = 'I received your message but had trouble formulating a response. Please try again.';
        } else {
          errorText = `Error: ${error.message}`;
        }
      }
      
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        text: errorText,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem('chatSessionId');
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleChat}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-40 border border-gray-200">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">AI Butler</h3>
              <p className="text-xs opacity-90">Your personal assistant</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearConversation}
                className="text-white hover:bg-blue-700 rounded p-1 transition-colors"
                title="Clear conversation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={toggleChat}
                className="text-white hover:bg-blue-700 rounded p-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm">Start a conversation with your AI Butler!</p>
                <p className="text-xs mt-2">I can help with recipes, inventory, and more.</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 border border-gray-200 px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">Butler is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || inputValue.trim() === ''}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            {sessionId && (
              <p className="text-xs text-gray-500 mt-2">Session: {sessionId.substring(0, 8)}...</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBubble;
