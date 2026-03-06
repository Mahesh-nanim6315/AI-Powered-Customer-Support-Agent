import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useSocket, useSocketEvent } from '../hooks/useSocket';

interface RealtimeContextType {
  isConnected: boolean;
  ticketUpdated: Record<string, any>;
  messageAdded: Record<string, any>;
  agentStatusChanged: Record<string, any>;
  ticketCreated: Record<string, any>;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function RealtimeProvider({ children, token }: { children: ReactNode; token: string | null }) {
  const [isConnected, setIsConnected] = useState(false);
  const [ticketUpdated, setTicketUpdated] = useState<Record<string, any>>({});
  const [messageAdded, setMessageAdded] = useState<Record<string, any>>({});
  const [agentStatusChanged, setAgentStatusChanged] = useState<Record<string, any>>({});
  const [ticketCreated, setTicketCreated] = useState<Record<string, any>>({});

  const { subscribe, socket } = useSocket(token);
  const hasSetupListenersRef = useRef(false);

  // Check connection status whenever socket changes
  useEffect(() => {
    if (socket && socket.connected) {
      console.log('🔗 Socket is connected, updating UI status');
      setIsConnected(true);
    } else if (socket && !socket.connected) {
      console.log('🔌 Socket is disconnected, updating UI status');
      setIsConnected(false);
    }
  }, [socket?.connected]);

  useEffect(() => {
    // Only setup once per token change
    if (!socket || !subscribe || hasSetupListenersRef.current) {
      return;
    }

    console.log('📡 Setting up Socket.io event listeners (first time only)');
    hasSetupListenersRef.current = true;
    
    // Check current connection state (may have already connected)
    if (socket.connected) {
      console.log('✅ Socket.io already connected, setting isConnected to true');
      setIsConnected(true);
    }

    const unsubscribeTicketUpdated = subscribe('ticket-updated', (data) => {
      console.log('🔄 Ticket updated:', data);
      setTicketUpdated(data);
    });

    const unsubscribeMessageAdded = subscribe('message-added', (data) => {
      console.log('💬 Message added:', data);
      setMessageAdded(data);
    });

    const unsubscribeAgentStatusChanged = subscribe('agent-status-changed', (data) => {
      console.log('👤 Agent status changed:', data);
      setAgentStatusChanged(data);
    });

    const unsubscribeTicketCreated = subscribe('ticket-created', (data) => {
      console.log('🎫 Ticket created:', data);
      setTicketCreated(data);
    });

    // Attach listeners for future events
    const onConnect = () => {
      console.log('✅ Socket.io connected via RealtimeContext');
      setIsConnected(true);
    };
    const onDisconnect = () => {
      console.log('🔌 Socket.io disconnected via RealtimeContext');
      setIsConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Only cleanup event listeners, not the socket itself
    return () => {
      console.log('🧹 Cleaning up event listeners (but keeping socket alive)');
      unsubscribeTicketUpdated?.();
      unsubscribeMessageAdded?.();
      unsubscribeAgentStatusChanged?.();
      unsubscribeTicketCreated?.();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket, subscribe]);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        ticketUpdated,
        messageAdded,
        agentStatusChanged,
        ticketCreated,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
}
