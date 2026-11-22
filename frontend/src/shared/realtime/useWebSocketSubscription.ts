import { useCallback, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import type { IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export type WebSocketConnectionStatus =
  | 'IDLE'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'ERROR';

export interface WebSocketSubscriptionState {
  status: WebSocketConnectionStatus;
  isConnected: boolean;
  lastMessageAt: string | null;
  reconnectAttempts: number;
  errorMessage: string | null;
  reconnect: () => void;
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8080';

const WS_URL =
  import.meta.env.VITE_WS_URL || `${API_BASE_URL.replace(/\/$/, '')}/ws-freshvend`;

export function useWebSocketSubscription<T = unknown>(
  topic: string,
  onMessageReceived: (data: T) => void,
  enabled = true
): WebSocketSubscriptionState {
  const callbackRef = useRef(onMessageReceived);
  const hasConnectedOnceRef = useRef(false);

  const [status, setStatus] = useState<WebSocketConnectionStatus>(
    topic && enabled ? 'CONNECTING' : 'IDLE'
  );
  const [lastMessageAt, setLastMessageAt] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reconnectNonce, setReconnectNonce] = useState(0);

  useEffect(() => {
    callbackRef.current = onMessageReceived;
  });

  const reconnect = useCallback(() => {
    setErrorMessage(null);
    setStatus('RECONNECTING');
    setReconnectNonce((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!topic || !enabled) {
      setStatus('IDLE');
      return;
    }

    let isDisposed = false;
    hasConnectedOnceRef.current = false;
    setStatus(reconnectNonce > 0 ? 'RECONNECTING' : 'CONNECTING');
    setErrorMessage(null);

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      beforeConnect: () => {
        if (isDisposed) return;
        if (hasConnectedOnceRef.current) {
          setStatus('RECONNECTING');
          setReconnectAttempts((prev) => prev + 1);
        } else {
          setStatus('CONNECTING');
        }
      },
      onConnect: () => {
        if (isDisposed) return;
        hasConnectedOnceRef.current = true;
        setStatus('CONNECTED');
        setReconnectAttempts(0);
        setErrorMessage(null);

        client.subscribe(topic, (message: IMessage) => {
          if (!message.body || isDisposed) return;
          try {
            const parsedData: T = JSON.parse(message.body);
            setLastMessageAt(new Date().toISOString());
            callbackRef.current(parsedData);
          } catch (err) {
            console.error('Lỗi parse dữ liệu WebSocket:', err);
          }
        });
      },
      onDisconnect: () => {
        if (isDisposed) return;
        setStatus('DISCONNECTED');
      },
      onWebSocketClose: () => {
        if (isDisposed) return;
        setStatus((prev) => (prev === 'ERROR' ? 'ERROR' : 'DISCONNECTED'));
      },
      onWebSocketError: () => {
        if (isDisposed) return;
        setStatus('ERROR');
        setErrorMessage('Không thể kết nối tới máy chủ WebSocket (/ws-freshvend).');
      },
      onStompError: (frame) => {
        if (isDisposed) return;
        const msg = frame.headers['message'] || 'Lỗi giao thức STOMP Broker.';
        console.error('Lỗi STOMP Broker:', msg);
        setStatus('ERROR');
        setErrorMessage(msg);
      },
    });

    client.activate();

    return () => {
      isDisposed = true;
      void client.deactivate();
    };
  }, [topic, enabled, reconnectNonce]);

  return {
    status,
    isConnected: status === 'CONNECTED',
    lastMessageAt,
    reconnectAttempts,
    errorMessage,
    reconnect,
  };
}