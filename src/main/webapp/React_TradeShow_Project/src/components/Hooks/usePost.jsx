import { useState } from 'react';
import { getAuthHeaders, parseApiResponse, unwrapData } from '../../services/api';

export const usePost = (url, options = {}) => {
    const {
        headers = {},
        onSuccess,
        onError,
        validateData,
        timeoutMs: defaultTimeoutMs
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = async (requestData, customOptions = {}) => {
        const timeoutMsRaw = customOptions.timeoutMs ?? defaultTimeoutMs;
        const timeoutMs = Number(timeoutMsRaw) > 0 ? Number(timeoutMsRaw) : 0;
        const externalSignal = customOptions.signal;
        const controller = externalSignal ? null : new AbortController();
        const signal = externalSignal || controller?.signal;
        let timedOut = false;
        let timeoutId = null;

        try {
            if (!url) {
                throw new Error('URL is required for POST request');
            }
            if (validateData) {
                const result = validateData(requestData);
                if (result !== true) {
                    throw new Error(result || 'Validation failed');
                }
            }

            setLoading(true);
            setError(null);

            if (timeoutMs > 0 && controller) {
                timeoutId = setTimeout(() => {
                    timedOut = true;
                    try {
                        controller.abort();
                    } catch {
                        // ignore abort failures
                    }
                }, timeoutMs);
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                    ...headers,
                    ...customOptions.headers
                },
                body: JSON.stringify(requestData),
                signal
            });

            const body = await parseApiResponse(response);
            const unwrapped = unwrapData(body);
            setData(unwrapped);
            onSuccess?.(unwrapped, requestData);
            return unwrapped;
        } catch (err) {
            if (err?.name === 'AbortError' && (timedOut || timeoutMs > 0)) {
                const timeoutError = new Error(`Request timed out after ${timeoutMs}ms`);
                timeoutError.code = 'client_timeout';
                setError(timeoutError.message);
                onError?.(timeoutError, requestData);
                throw timeoutError;
            }
            setError(err.message);
            onError?.(err, requestData);
            throw err;
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            setLoading(false);
        }
    };

    const reset = () => {
        setData(null);
        setError(null);
        setLoading(false);
    };

    return {
        data,
        loading,
        error,
        execute,
        reset
    };
};
