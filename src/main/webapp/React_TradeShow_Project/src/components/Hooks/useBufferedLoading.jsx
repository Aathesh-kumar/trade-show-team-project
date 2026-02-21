import { useEffect, useRef, useState } from 'react';

export function useBufferedLoading(loading, minimumMs = 1500) {
  const [visibleLoading, setVisibleLoading] = useState(Boolean(loading));
  const startedAtRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (loading) {
      startedAtRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        setVisibleLoading(true);
      }, 0);
      return undefined;
    }

    if (!startedAtRef.current) {
      timerRef.current = setTimeout(() => setVisibleLoading(false), 0);
      return undefined;
    }

    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, minimumMs - elapsed);
    timerRef.current = setTimeout(() => {
      setVisibleLoading(false);
      startedAtRef.current = 0;
    }, remaining);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [loading, minimumMs]);

  return visibleLoading;
}

export default useBufferedLoading;
