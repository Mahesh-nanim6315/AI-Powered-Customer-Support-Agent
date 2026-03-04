import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

let socketInstance: Socket | null = null;

function getSocket(token: string): Socket {
    if (!socketInstance || !socketInstance.connected) {
        socketInstance = io(SOCKET_URL, {
            auth: {
                token,
            },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });
    }
    return socketInstance;
}

export function useSocket(token: string | null) {
    useEffect(() => {
        if (!token) {
            if (socketInstance) {
                socketInstance.disconnect();
                socketInstance = null;
            }
            return;
        }

        const socket = getSocket(token);

        return () => {
            if (socket) {
                socket.off('connect');
                socket.off('disconnect');
            }
        };
    }, [token]);

    const subscribe = useCallback((event: string, callback: (data: any) => void) => {
        if (!socketInstance) return;
        socketInstance.on(event, callback);
        return () => {
            socketInstance?.off(event, callback);
        };
    }, []);

    const emit = useCallback((event: string, data: any) => {
        if (!socketInstance) return;
        socketInstance.emit(event, data);
    }, []);

    return { subscribe, emit, socket: socketInstance };
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
            if (!token) return;
            const socket = getSocket(token);
            socket.emit(event, data);
        },
        [token]
    );
}
