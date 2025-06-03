import { useEffect, useCallback } from 'react';
import type { WebviewMessage } from '../types';

type MessageHandler = (message: WebviewMessage) => void;

export function useMessageListener(handler: MessageHandler) {
  const handleMessage = useCallback((event: MessageEvent) => {
    const message = event.data as WebviewMessage;
    handler(message);
  }, [handler]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);
}
