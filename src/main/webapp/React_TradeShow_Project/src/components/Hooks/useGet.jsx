import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildUrl, parseApiResponse, unwrapData } from '../../services/api';

export const useGet = (path, options = {}) => {
    const {
        immediate = true,
        params = {},
        headers = {},
        onSuccess,
        onError,
        dependencies = []
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(immediate);
    const [error, setError] = useState(null);

    const resolvedUrl = useMemo(() => buildUrl(path, params), [path, JSON.stringify(params)]);

    const fetchData = useCallback(async (signal) => {
        try {
            if (!path) {
                throw new Error('Path is required');
            }
            setLoading(true);
            setError(null);

            const response = await fetch(resolvedUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                signal
            });

            const body = await parseApiResponse(response);
            const result = unwrapData(body);
            setData(result);
            onSuccess?.(result);
            return result;
        } catch (err) {
            if (err.name === 'AbortError') {
                return null;
            }
            setError(err.message);
            onError?.(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [path, resolvedUrl, JSON.stringify(headers), onSuccess, onError]);

    const refetch = useCallback(() => {
        const controller = new AbortController();
        fetchData(controller.signal).catch(() => null);
        return controller;
    }, [fetchData]);

    useEffect(() => {
        if (!immediate || !path) {
            return;
        }
        const controller = new AbortController();
        fetchData(controller.signal).catch(() => null);
        return () => controller.abort();
    }, [immediate, path, resolvedUrl, ...dependencies]);

    return {
        data,
        loading,
        error,
        refetch
    };
};

export default useGet;
