// c:\Users\sauba\OneDrive\Escritorio\local-butlerAIapp\frontend\src\components\ChatBubble.tsx
import React, { useState, useEffect, useRef } from 'react';
import adkService from '../services/adkService'; // Ensure this path is correct
import { SparklesIcon, SendIcon, XMarkIcon } from './Icons'; // Updated to use available icons

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const ChatBubble: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined); // To maintain conversation context

  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);  // Load session ID from localStorage or create a new ADK session
  useEffect(() => {
    const initializeSession = async () => {
      let storedSessionId = localStorage.getItem('chatSessionId');
      console.log('Stored session ID:', storedSessionId);
        if (!storedSessionId) {
        try {
          console.log('Creating new ADK session...');
          // Create a proper ADK session
          const response = await fetch('http://127.0.0.1:8001/apps/butler/users/frontend_user/sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages: [] }),
          });
          
          console.log('Session creation response:', response.status);if (response.ok) {
            const sessionData = await response.json();
            storedSessionId = sessionData.id as string;
            localStorage.setItem('chatSessionId', storedSessionId);
            console.log('New ADK session created:', storedSessionId);
          } else {
            console.error('Failed to create ADK session:', response.status);
            // Fallback to local ID if session creation fails
            storedSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            localStorage.setItem('chatSessionId', storedSessionId);
            console.log('Using fallback session ID:', storedSessionId);
          }
        } catch (error) {
          console.error('Error creating ADK session:', error);
          // Fallback to local ID if session creation fails
          storedSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          localStorage.setItem('chatSessionId', storedSessionId);
          console.log('Using fallback session ID after error:', storedSessionId);
        }
      }      setSessionId(storedSessionId || undefined);
      console.log('Final session ID set:', storedSessionId);
    };

    initializeSession();
    
    // Test backend connection when component mounts
    testBackendConnection();
  }, []);

  const testBackendConnection = async () => {
    try {
      const result = await adkService.testConnection();
      setConnectionStatus(result.connected ? 'connected' : 'disconnected');
      if (!result.connected) {
        console.warn('Backend connection failed:', result.message);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('disconnected');
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen && messages.length === 0) {
      // Add a welcome message when chat is opened for the first time in a session
      const welcomeMessage = connectionStatus === 'connected' 
        ? "Hello! I'm your AI Butler Assistant. How can I help you today?"
        : "Hello! I'm your AI Butler Assistant. Note: I'm having trouble connecting to the backend service. Please check that the backend is running.";
      
      setMessages([
        {
          id: `ai_welcome_${Date.now()}`,
          text: welcomeMessage,
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
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
    setInputValue('');
    setIsLoading(true);

    let aiTextResponse = 'Sorry, I encountered an error processing your request.';

    try {
      console.log('Sending message:', inputValue);
      console.log('Current session ID:', sessionId);
      
      const processResponse = (response: any) => {
        if (response.error) {
          console.error("Error from ADK Service:", response.error);
          aiTextResponse = `Error: ${response.error}`;
        } else if (response.text_response) {
          aiTextResponse = response.text_response;
        } else if (typeof response === 'string') {
          aiTextResponse = response;
        } else if (response.detail) { // Handle FastAPI's HTTPException detail
          aiTextResponse = `Error: ${response.detail}`;
        } else if (Array.isArray(response) && response.length > 0) {
          const lastEvent = response[response.length - 1];
          if (lastEvent && lastEvent.content && lastEvent.content.parts) {
            const textPart = lastEvent.content.parts.find((part: any) => part.text);
            if (textPart) {
              aiTextResponse = textPart.text;
            }
          }
        }
      };
      
      // If no session ID, create one now
      if (!sessionId) {
        console.log('No session ID, creating one...');        try {
          const sessionResponse = await fetch('http://127.0.0.1:8001/apps/butler/users/frontend_user/sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages: [] }),
          });
          
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            const newSessionId = sessionData.id;
            setSessionId(newSessionId);
            localStorage.setItem('chatSessionId', newSessionId);
            console.log('Created session for message:', newSessionId);
            
            // Use the new session ID for the message
            const response = await adkService.sendMessageToButler({
              message: userMessage.text,
              session_id: newSessionId,
              user_id: 'frontend_user'
            });
            
            processResponse(response);
            
            // Update session ID if the service returns a new one
            if (response.session_id) {
              setSessionId(response.session_id);
              localStorage.setItem('chatSessionId', response.session_id);
            }
          } else {
            throw new Error('Failed to create session');
          }
        } catch (sessionError) {
          console.error('Failed to create session:', sessionError);
          aiTextResponse = 'Error: Failed to create chat session';
        }      } else {
        // Use existing session ID
        const response = await adkService.sendMessageToButler({
          message: userMessage.text,
          session_id: sessionId,
          user_id: 'frontend_user'
        });
        
        processResponse(response);
        
        // Update session ID if the service returns a new one
        if (response.session_id) {
          setSessionId(response.session_id);
          localStorage.setItem('chatSessionId', response.session_id);
        }
      }

      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        text: aiTextResponse,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: `err_${Date.now()}`,
        text: 'Failed to connect to the AI. Please try again.',
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

  if (!sessionId) { // Don't render until session ID is available
    return null;
  }

  return (
    <>
      {/* Chat Bubble Toggle Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-5 right-5 bg-primary hover:bg-primary-focus text-white p-4 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-transform duration-150 ease-in-out hover:scale-110 z-50"
          aria-label="Open chat"
        >
          <SparklesIcon className="h-8 w-8 text-white" /> {/* Replaced ChatBubbleOvalLeftEllipsisIcon with SparklesIcon */}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-5 sm:right-5 w-full sm:w-96 h-full sm:h-[70vh] max-h-[700px] bg-white shadow-xl rounded-t-lg sm:rounded-lg flex flex-col z-50 border border-gray-300">
          {/* Header */}
          <div className="bg-primary text-primary-content p-4 flex justify-between items-center rounded-t-lg">
            <h3 className="font-semibold text-lg">AI Assistant</h3>
            <button onClick={toggleChat} className="text-primary-content hover:text-opacity-75" aria-label="Close chat">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-grow p-4 overflow-y-auto bg-gray-100 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] p-3 rounded-xl shadow ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-content rounded-br-none'
                      : 'bg-base-100 text-base-content rounded-bl-none border border-base-300'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-right text-primary-content/70' : 'text-left text-base-content/50'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} /> {/* For scrolling to bottom */}
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-gray-300 bg-white rounded-b-lg">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter a message..."
                className="input input-bordered flex-grow focus:input-primary"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                className="btn btn-primary btn-square"
                disabled={isLoading || inputValue.trim() === ''}
                aria-label="Send message"
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <SendIcon className="h-5 w-5" />
                )}
              </button>
            </div>
             <p className="text-xs text-base-content/50 mt-2 text-center">
              By using this chat, you are consenting to the practices set forth in our Privacy Policy.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBubble;
