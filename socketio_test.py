#!/usr/bin/env python3

import socketio
import time
import asyncio

# Test Socket.IO connectivity
BASE_URL = "https://help-nearby-8.preview.emergentagent.com"

async def test_socket_connection():
    """Test basic Socket.IO connection"""
    print("🔌 Testing Socket.IO Connection...")
    
    try:
        sio = socketio.AsyncClient()
        
        @sio.event
        async def connect():
            print("✅ Socket.IO connection established")
        
        @sio.event
        async def disconnect():
            print("🔌 Socket.IO connection closed")
        
        @sio.event  
        async def new_message(data):
            print(f"📩 Received message: {data}")
        
        # Connect to the server
        await sio.connect(BASE_URL)
        
        # Join a test room
        await sio.emit('join_room', {'room': 'test_user_123'})
        print("📝 Joined test room")
        
        # Send a test message
        test_message = {
            'sender_id': 'test_user_1',
            'receiver_id': 'test_user_2', 
            'message': 'Hello from Socket.IO test!',
            'job_id': 'test_job_123'
        }
        await sio.emit('send_message', test_message)
        print("📤 Sent test message")
        
        # Wait a bit for any responses
        await asyncio.sleep(2)
        
        # Disconnect
        await sio.disconnect()
        
        return True
        
    except Exception as e:
        print(f"❌ Socket.IO test failed: {str(e)}")
        return False

def main():
    """Run Socket.IO tests"""
    print("🚀 Starting Socket.IO Tests...\n")
    
    # Run async test
    result = asyncio.run(test_socket_connection())
    
    if result:
        print("\n✅ Socket.IO tests completed successfully!")
    else:
        print("\n❌ Socket.IO tests failed!")
    
    return result

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)