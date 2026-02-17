import { useState } from 'react';
import { getAuthHeaders, parseApiResponse, unwrapData } from '../../services/api';

export const usePost = (url, options = {}) => {
    const {
        headers = {},
        onSuccess,
        onError,
        validateData
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = async (requestData, customOptions = {}) => {
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

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                    ...headers,
                    ...customOptions.headers
                },
                body: JSON.stringify(requestData)
            });

            const body = await parseApiResponse(response);
            const unwrapped = unwrapData(body);
            setData(unwrapped);
            onSuccess?.(unwrapped, requestData);
            return unwrapped;
        } catch (err) {
            setError(err.message);
            onError?.(err, requestData);
            throw err;
        } finally {
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
