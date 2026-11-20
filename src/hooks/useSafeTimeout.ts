import { useCallback, useEffect, useRef } from 'react';

export function useSafeTimeout() {
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const clearAllTimeouts = useCallback(() => {
    for (const timer of timersRef.current) {
      clearTimeout(timer);
    }
    timersRef.current.clear();
  }, []);

  const scheduleTimeout = useCallback((callback: () => void, delayMs: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      callback();
    }, delayMs);
    timersRef.current.add(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  return { scheduleTimeout, clearAllTimeouts };
}
