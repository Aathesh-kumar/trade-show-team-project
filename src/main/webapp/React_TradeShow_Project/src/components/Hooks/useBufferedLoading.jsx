import { useEffect, useRef, useState } from 'react';

export function useBufferedLoading(loading, minimumMs = 2200) {
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
      setVisibleLoading(true);
      return undefined;
    }

    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, minimumMs - elapsed);
    timerRef.current = setTimeout(() => {
      setVisibleLoading(false);
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
