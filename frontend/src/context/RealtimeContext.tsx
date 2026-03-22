import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket';

interface RealtimeContextType {
  isConnected: boolean;
  ticketUpdated: Record<string, any>;
  messageAdded: Record<string, any>;
  typingIndicator: Record<string, any>;
  aiMode: Record<string, any>;
  agentStatusChanged: Record<string, any>;
  ticketCreated: Record<string, any>;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function RealtimeProvider({ children, token }: { children: ReactNode; token: string | null }) {
  const [isConnected, setIsConnected] = useState(false);
  const [ticketUpdated, setTicketUpdated] = useState<Record<string, any>>({});
  const [messageAdded, setMessageAdded] = useState<Record<string, any>>({});
  const [typingIndicator, setTypingIndicator] = useState<Record<string, any>>({});
  const [aiMode, setAiMode] = useState<Record<string, any>>({});
  const [agentStatusChanged, setAgentStatusChanged] = useState<Record<string, any>>({});
  const [ticketCreated, setTicketCreated] = useState<Record<string, any>>({});

  const { subscribe, socket } = useSocket(token);
  const subscriptionsReadyRef = useRef(false);

  useEffect(() => {
    if (socket && socket.connected) {
      setIsConnected(true);
    } else if (socket && !socket.connected) {
      setIsConnected(false);
    }
  }, [socket?.connected]);

  useEffect(() => {
    if (!socket || !subscribe || subscriptionsReadyRef.current) {
      return;
    }

    subscriptionsReadyRef.current = true;

    if (socket.connected) {
      setIsConnected(true);
    }

    const unsubscribeTicketUpdated = subscribe('ticket-updated', (data) => {
      setTicketUpdated(data);
    });

    const unsubscribeTicketUpdate = subscribe('ticket_update', (data) => {
      setTicketUpdated(data);
    });

    const unsubscribeMessageAdded = subscribe('message-added', (data) => {
      setMessageAdded(data);
    });

    const unsubscribeCustomerMessage = subscribe('customer_message', (data) => {
      setMessageAdded(data);
    });

    const unsubscribeAgentReply = subscribe('agent_reply', (data) => {
      setMessageAdded(data);
    });

    const unsubscribeAiReply = subscribe('ai_reply', (data) => {
      setMessageAdded(data);
    });

    const unsubscribeTyping = subscribe('typing_indicator', (data) => {
      setTypingIndicator(data);
    });

    const unsubscribeAiMode = subscribe('ai_mode', (data) => {
      setAiMode(data);
    });

    const unsubscribeAgentStatusChanged = subscribe('agent-status-changed', (data) => {
      setAgentStatusChanged(data);
    });

    const unsubscribeTicketCreated = subscribe('ticket-created', (data) => {
      setTicketCreated(data);
    });

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      subscriptionsReadyRef.current = false;
      unsubscribeTicketUpdated?.();
      unsubscribeTicketUpdate?.();
      unsubscribeMessageAdded?.();
      unsubscribeCustomerMessage?.();
      unsubscribeAgentReply?.();
      unsubscribeAiReply?.();
      unsubscribeTyping?.();
      unsubscribeAiMode?.();
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
        typingIndicator,
        aiMode,
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
