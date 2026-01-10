import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Generic async state type
 */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing async operations with loading/error states
 * Reduces boilerplate for data fetching patterns
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: unknown[] = [],
  options: {
    immediate?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
): AsyncState<T> & {
  execute: () => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
} {
  const { immediate = true, onSuccess, onError } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await asyncFn();
      if (mountedRef.current) {
        setState({ data: result, loading: false, error: null });
        onSuccess?.(result);
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        onError?.(error);
      }
      return null;
    }
  }, [asyncFn, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) {
      execute();
    }
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, execute, reset, setData };
}

/**
 * Hook for managing async operations that can be triggered manually
 * Good for mutations (POST, PUT, DELETE)
 */
export function useAsyncCallback<T, Args extends unknown[]>(
  asyncFn: (...args: Args) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
): {
  execute: (...args: Args) => Promise<T | null>;
  loading: boolean;
  error: string | null;
  reset: () => void;
} {
  const { onSuccess, onError } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: Args) => {
      setLoading(true);
      setError(null);

      try {
        const result = await asyncFn(...args);
        if (mountedRef.current) {
          setLoading(false);
          onSuccess?.(result);
        }
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (mountedRef.current) {
          setLoading(false);
          setError(error.message);
          onError?.(error);
        }
        return null;
      }
    },
    [asyncFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return { execute, loading, error, reset };
}

/**
 * Hook for polling data at regular intervals
 */
export function usePolling<T>(
  asyncFn: () => Promise<T>,
  intervalMs: number,
  options: {
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
): AsyncState<T> & { refresh: () => Promise<T | null> } {
  const { enabled = true, onSuccess, onError } = options;

  const state = useAsync(asyncFn, [enabled], {
    immediate: enabled,
    onSuccess,
    onError,
  });

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      state.execute();
    }, intervalMs);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs]);

  return { ...state, refresh: state.execute };
}
