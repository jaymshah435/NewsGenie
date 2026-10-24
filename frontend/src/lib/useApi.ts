// Fetches data from an API path and tracks loading and errors.
// Usage: const { data, loading, error, retry } = useApi<Summary>("/api/analytics/summary");

import { useEffect, useState } from "react";
import { apiFetch } from "./api";

interface Result<T> {
  path: string | null;
  data?: T;
  error?: string;
}

export function useApi<T>(path: string | null) {
  const [result, setResult] = useState<Result<T>>({ path: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false; // ignore answers for an old path if the filters changed meanwhile
    apiFetch<T>(path)
      .then((data) => !cancelled && setResult({ path, data }))
      .catch((error: Error) => !cancelled && setResult({ path, error: error.message }));
    return () => {
      cancelled = true;
    };
  }, [path, attempt]);

  const isCurrent = result.path === path;
  return {
    data: isCurrent ? result.data : undefined,
    error: isCurrent ? result.error : undefined,
    loading: path !== null && !isCurrent,
    retry: () => {
      setResult({ path: null });
      setAttempt((n) => n + 1);
    },
  };
}
