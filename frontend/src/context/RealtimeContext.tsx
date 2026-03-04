import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  useEffect(() => {
    if (!socket || !subscribe) return;

    const unsubscribeTicketUpdated = subscribe('ticket-updated', (data) => {
      setTicketUpdated(data);
    });

    const unsubscribeMessageAdded = subscribe('message-added', (data) => {
      setMessageAdded(data);
    });

    const unsubscribeAgentStatusChanged = subscribe('agent-status-changed', (data) => {
      setAgentStatusChanged(data);
    });

    const unsubscribeTicketCreated = subscribe('ticket-created', (data) => {
      setTicketCreated(data);
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      unsubscribeTicketUpdated?.();
      unsubscribeMessageAdded?.();
      unsubscribeAgentStatusChanged?.();
      unsubscribeTicketCreated?.();
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
