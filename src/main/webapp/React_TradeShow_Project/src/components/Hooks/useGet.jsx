import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildUrl, getAuthHeaders, parseApiResponse, unwrapData } from '../../services/api';

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
    const [loading, setLoading] = useState(Boolean(immediate && path));
    const [error, setError] = useState(null);
    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onSuccessRef.current = onSuccess;
    }, [onSuccess]);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    const paramsKey = useMemo(() => JSON.stringify(params || {}), [params]);
    const headersKey = useMemo(() => JSON.stringify(headers || {}), [headers]);
    const dependenciesKey = useMemo(() => JSON.stringify(dependencies || []), [dependencies]);
    const resolvedUrl = useMemo(() => buildUrl(path, JSON.parse(paramsKey)), [path, paramsKey]);
    const resolvedHeaders = useMemo(() => {
        return {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...JSON.parse(headersKey)
        };
    }, [headersKey]);

    const fetchData = useCallback(async (signal) => {
        try {
            if (!path) {
                throw new Error('Path is required');
            }
            setLoading(true);
            setError(null);

            const response = await fetch(resolvedUrl, {
                method: 'GET',
                headers: resolvedHeaders,
                signal
            });

            const body = await parseApiResponse(response);
            const result = unwrapData(body);
            setData(result);
            onSuccessRef.current?.(result);
            return result;
        } catch (err) {
            if (err.name === 'AbortError') {
                return null;
            }
            setError(err.message);
            onErrorRef.current?.(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [path, resolvedUrl, resolvedHeaders]);

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
    }, [immediate, path, resolvedUrl, fetchData, dependenciesKey]);

    return {
        data,
        loading,
        error,
        refetch
    };
};

export default useGet;
