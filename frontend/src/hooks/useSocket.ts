import { useEffect, useCallback, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

let socketInstance: Socket | null = null;
let connectionAttemptInProgress = false;

function createNewSocket(token: string): Socket {
    if (!socketInstance || !socketInstance.connected) {
        console.log('🔌 Creating new Socket.io connection to:', SOCKET_URL);
        connectionAttemptInProgress = true;
        socketInstance = io(SOCKET_URL, {
            auth: { token },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            transports: ['websocket', 'polling'],
        });

        socketInstance.on('connect', () => {
            console.log('✅ Socket.io connected! ID:', socketInstance?.id);
            connectionAttemptInProgress = false;
        });

        socketInstance.on('connect_error', (error) => {
            console.error('🔴 Socket.io connection error:', error);
            connectionAttemptInProgress = false;
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('🔌 Socket.io disconnected. Reason:', reason);
            connectionAttemptInProgress = false;
        });
    } else {
        console.log('♻️ Reusing existing Socket.io connection:', socketInstance.id);
    }
    return socketInstance;
}

function getSocket(token: string): Socket {
    // wrapper around createNewSocket that updates state if needed
    const sock = createNewSocket(token);
    return sock;
}

export function useSocket(token: string | null) {
    const [socketState, setSocketState] = useState<Socket | null>(null);
    // keep a ref to avoid stale closures
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!token) {
            console.log('❌ No token provided, disconnecting socket');
            if (socketInstance) {
                socketInstance.disconnect();
                socketInstance = null;
            }
            socketRef.current = null;
            setSocketState(null);
            return;
        }

        const socket = getSocket(token);
        socketRef.current = socket;
        setSocketState(socket);

        return () => {
            // Don't disconnect on unmount - keep the connection alive
            console.log('🔄 Component unmounting, but keeping socket connection alive');
        };
    }, [token]);

    const subscribe = useCallback((event: string, callback: (data: any) => void) => {
        if (!socketRef.current) {
            console.warn('⚠️ Socket not available for subscription:', event);
            return;
        }
        console.log('📡 Subscribing to event:', event);
        socketRef.current.on(event, callback);
        return () => {
            console.log('📴 Unsubscribing from event:', event);
            socketRef.current?.off(event, callback);
        };
    }, []);

    const emit = useCallback((event: string, data: any) => {
        const sock = socketRef.current || socketState;
        if (!sock) {
            console.warn('⚠️ Socket not available for emit:', event);
            return;
        }
        console.log('📤 Emitting event:', event, data);
        sock.emit(event, data);
    }, [socketState]);

    return { subscribe, emit, socket: socketState };
}

export function useSocketEvent(token: string | null, event: string, callback: (data: any) => void) {
    useEffect(() => {
        if (!token) return;

        const socket = getSocket(token);
        console.log('📡 useSocketEvent - listening for:', event);
        socket.on(event, callback);

        return () => {
            console.log('📴 useSocketEvent - unlistening from:', event);
            socket.off(event, callback);
        };
    }, [token, event, callback]);
}

export function useEmitSocket(token: string | null) {
    return useCallback(
        (event: string, data: any) => {
            if (!token) {
                console.warn('⚠️ No token for emit socket');
                return;
            }
            const socket = getSocket(token);
            console.log('📤 useEmitSocket - emitting:', event);
            socket.emit(event, data);
        },
        [token]
    );
}
