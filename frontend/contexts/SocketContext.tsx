import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinRoom: () => {},
  leaveRoom: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      // Join user's room for receiving messages
      if (user._id) {
        socketRef.current?.emit('join_room', { room: user._id });
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.log('Socket connection error:', error);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [isAuthenticated, user]);

  const joinRoom = (room: string) => {
    socketRef.current?.emit('join_room', { room });
  };

  const leaveRoom = (room: string) => {
    socketRef.current?.emit('leave_room', { room });
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, joinRoom, leaveRoom }}>
      {children}
    </SocketContext.Provider>
  );
};