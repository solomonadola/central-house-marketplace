import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/apiFetch';

// Loads JSON from our API. Returns { data, error, loading, reload }; error
// is the server's message (or a generic one) when the request fails.
export const useFetchJson = (url) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(url);
      const json = await res.json();
      if (json?.success === false) throw new Error(json.message);
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload };
};
