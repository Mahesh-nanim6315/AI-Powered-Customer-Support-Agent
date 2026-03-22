import { useEffect, useCallback, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

let socketInstance: Socket | null = null;
let socketToken: string | null = null;

function createNewSocket(token: string): Socket {
    const shouldReplaceSocket = !socketInstance || socketToken !== token;

    if (shouldReplaceSocket) {
        if (socketInstance) {
            socketInstance.disconnect();
        }

        socketToken = token;
        socketInstance = io(SOCKET_URL, {
            auth: { token },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5001,
            reconnectionAttempts: 5,
            transports: ['websocket', 'polling'],
        });

        socketInstance.on('connect_error', (error) => {
            console.error('Socket.io connection error:', error);
        });
    } else {
        const currentSocket = socketInstance;
        if (currentSocket && !currentSocket.connected) {
            currentSocket.connect();
        }
    }

    return socketInstance as Socket;
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
            if (socketInstance) {
                socketInstance.disconnect();
                socketInstance = null;
                socketToken = null;
            }
            socketRef.current = null;
            setSocketState(null);
            return;
        }

        const socket = getSocket(token);
        socketRef.current = socket;
        setSocketState(socket);

        return () => {
            // Keep the shared socket alive across page-level unmounts.
        };
    }, [token]);

    const subscribe = useCallback((event: string, callback: (data: any) => void) => {
        if (!socketRef.current) {
            return;
        }
        socketRef.current.on(event, callback);
        return () => {
            socketRef.current?.off(event, callback);
        };
    }, []);

    const emit = useCallback((event: string, data: any) => {
        const sock = socketRef.current || socketState;
        if (!sock) {
            return;
        }
        sock.emit(event, data);
    }, [socketState]);

    return { subscribe, emit, socket: socketState };
}

export function useSocketEvent(token: string | null, event: string, callback: (data: any) => void) {
    useEffect(() => {
        if (!token) return;

        const socket = getSocket(token);
        socket.on(event, callback);

        return () => {
            socket.off(event, callback);
        };
    }, [token, event, callback]);
}

export function useEmitSocket(token: string | null) {
    return useCallback(
        (event: string, data: any) => {
            if (!token) {
                return;
            }
            const socket = getSocket(token);
            socket.emit(event, data);
        },
        [token]
    );
}
