// Simple test component to verify the ADK integration works
import React, { useState } from 'react';

const ChatBubbleSimple: React.FC = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
    setResponse('Sending...');

    try {
      // First create a session
      console.log('Creating session...');
      const sessionResponse = await fetch('http://127.0.0.1:8000/apps/butler/users/frontend_user/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appName: "butler",
          userId: "frontend_user"
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create session');
      }

      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.id;
      console.log('Session created:', sessionId);

      // Now send the message
      console.log('Sending message...');
      const messageResponse = await fetch('http://127.0.0.1:8000/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appName: "butler",
          userId: "frontend_user",
          sessionId: sessionId,
          newMessage: {
            parts: [{ text: message }],
            role: "user"
          }
        }),
      });

      if (!messageResponse.ok) {
        throw new Error(`Message failed: ${messageResponse.status}`);
      }

      const data = await messageResponse.json();
      console.log('Response data:', data);

      // Extract the text response
      if (Array.isArray(data) && data.length > 0) {
        const responseEvent = data.find(event => event.content && event.content.parts);
        if (responseEvent && responseEvent.content.parts.length > 0) {
          const textPart = responseEvent.content.parts.find((part: any) => part.text);
          if (textPart) {
            setResponse(textPart.text);
          } else {
            setResponse('No text found in response');
          }
        } else {
          setResponse('No content found in response');
        }
      } else {
        setResponse('Invalid response format');
      }

    } catch (error) {
      console.error('Error:', error);
      setResponse(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '20px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>ADK Integration Test</h3>
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          style={{ width: '70%', padding: '8px', marginRight: '10px' }}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} disabled={loading || !message.trim()}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
      <div style={{ 
        minHeight: '100px', 
        padding: '10px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '4px',
        whiteSpace: 'pre-wrap'
      }}>
        <strong>Response:</strong><br />
        {response || 'No response yet...'}
      </div>
    </div>
  );
};

export default ChatBubbleSimple;
