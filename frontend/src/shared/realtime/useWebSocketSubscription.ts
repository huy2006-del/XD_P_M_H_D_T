import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import type { IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/ws-freshvend` 
  : 'http://localhost:8080/ws-freshvend';

export function useWebSocketSubscription<T = any>(
  topic: string,
  onMessageReceived: (data: T) => void
) {
  const callbackRef = useRef(onMessageReceived);
  callbackRef.current = onMessageReceived;

  useEffect(() => {
    if (!topic) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(topic, (message: IMessage) => {
          if (message.body) {
            try {
              const parsedData: T = JSON.parse(message.body);
              callbackRef.current(parsedData);
            } catch (err) {
              console.error('Lỗi parse dữ liệu WebSocket:', err);
            }
          }
        });
      },
      onStompError: (frame) => {
        console.error('Lỗi Broker:', frame.headers['message']);
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [topic]);
}