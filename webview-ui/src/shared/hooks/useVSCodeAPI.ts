import { useCallback, useEffect, useRef } from 'react';
import type { VSCodeAPI, WebviewMessage } from '../types';

declare global {
  interface Window {
    acquireVsCodeApi(): VSCodeAPI;
  }
}

export function useVSCodeAPI() {
  const vscodeApi = useRef<VSCodeAPI | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.acquireVsCodeApi) {
      vscodeApi.current = window.acquireVsCodeApi();
    }
  }, []);

  const postMessage = useCallback((message: WebviewMessage) => {
    if (vscodeApi.current) {
      vscodeApi.current.postMessage(message);
    }
  }, []);

  const getState = useCallback(() => {
    return vscodeApi.current?.getState();
  }, []);

  const setState = useCallback((state: any) => {
    if (vscodeApi.current) {
      vscodeApi.current.setState(state);
    }
  }, []);

  return {
    postMessage,
    getState,
    setState,
    isReady: !!vscodeApi.current
  };
}
