import { useState, useEffect } from 'react';

export function useFetch<T = unknown>(promiseFactory: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    promiseFactory()
      .then((res) => mounted && setData(res))
      .catch((err) => mounted && setError(err))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error } as const;
}

export default useFetch;
