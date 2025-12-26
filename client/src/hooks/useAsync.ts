import { useState, useEffect, useCallback } from "react";

interface UseAsyncState<T> {
  status: "idle" | "pending" | "success" | "error";
  data: T | null;
  error: Error | null;
}

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true,
  options?: UseAsyncOptions<T>
): UseAsyncState<T> & { execute: () => Promise<void> } {
  const [state, setState] = useState<UseAsyncState<T>>({
    status: "idle",
    data: null,
    error: null,
  });

  // The execute function wraps asyncFunction and
  // handles setting state
  const execute = useCallback(async () => {
    setState({ status: "pending", data: null, error: null });
    try {
      const response = await asyncFunction();
      setState({ status: "success", data: response, error: null });
      options?.onSuccess?.(response);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState({ status: "error", data: null, error: err });
      options?.onError?.(err);
    }
  }, [asyncFunction, options]);

  // Call execute if we want to fire it right away.
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { ...state, execute };
}

export default useAsync;
