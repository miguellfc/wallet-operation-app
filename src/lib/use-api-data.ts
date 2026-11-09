import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export function useApiData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(() => {
    let active = true;
    load()
      .then(result => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch(reason => active && setError(reason));
    return () => {
      active = false;
    };
  }, [load]);

  useFocusEffect(fetchData);

  const retry = () => {
    setError(null);
    fetchData();
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      setData(await load());
      setError(null);
    } catch (reason) {
      setError(reason);
    } finally {
      setRefreshing(false);
    }
  };

  return { data, error, retry, refresh, refreshing };
}
