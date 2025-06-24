#!/usr/bin/env python3
"""
Simple test to verify ADK integration is working.
"""

import requests
import json

def test_adk_integration():
    base_url = "http://127.0.0.1:8000"
    
    print("=== Testing ADK Integration ===")
    
    # Test 1: Check if server is running
    try:
        response = requests.get(f"{base_url}/list-apps")
        apps = response.json()
        print(f"✓ Server is running, available apps: {apps}")
    except Exception as e:
        print(f"✗ Server not responding: {e}")
        return
    
    # Test 2: Create session
    try:
        session_data = {
            "appName": "butler",
            "userId": "test_user"
        }
        response = requests.post(
            f"{base_url}/apps/butler/users/test_user/sessions",
            json=session_data
        )
        session = response.json()
        session_id = session["id"]
        print(f"✓ Session created: {session_id}")
    except Exception as e:
        print(f"✗ Session creation failed: {e}")
        return
    
    # Test 3: Send message
    try:
        message_data = {
            "appName": "butler",
            "userId": "test_user",
            "sessionId": session_id,
            "newMessage": {
                "parts": [{"text": "Hello! Can you help me?"}],
                "role": "user"
            }
        }
        response = requests.post(
            f"{base_url}/run",
            json=message_data
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Message sent successfully!")
            print(f"   Response events: {len(result)} events")
            for i, event in enumerate(result):
                if 'content' in event and event['content']:
                    print(f"   Event {i}: {event['content']}")
        else:
            print(f"✗ Message failed with status {response.status_code}")
            print(f"   Error: {response.text}")
            
    except Exception as e:
        print(f"✗ Message sending failed: {e}")

if __name__ == "__main__":
    test_adk_integration()
