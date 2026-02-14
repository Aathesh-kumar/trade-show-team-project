import { useState, useEffect } from 'react';


export const useGet = (url, options = {}) => {
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

    const buildUrl = () => {
        if (!url) {
            throw new Error('URL is required for GET request');
        }

        const queryString = new URLSearchParams(params).toString();
        return queryString ? `${url}?${queryString}` : url;
    };

    // Main fetch function
    const fetchData = async (signal) => {
        try {
            // url validation
            if (!url) {
                throw new Error('URL cannot be empty');
            }

            // url formating
            if (typeof url !== 'string') {
                throw new Error('URL must be a string');
            }

            setLoading(true);
            setError(null);

            const fullUrl = buildUrl();

            // url params validation
            if (params && typeof params !== 'object') {
                throw new Error('Params must be an object');
            }

            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                signal // For cleanup/abort
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                switch (response.status) {
                    case 400:
                        throw new Error(errorData.message || 'Bad Request: Invalid parameters')
                    case 401:
                        throw new Error('Unauthorized: Please login to continue');
                    case 402:
                        throw new Error('Forbidden: You do not have permission to access this resource');
                    case 403:
                        throw new Error('Not Found: The requested resource does not exist');
                    case 404:
                        throw new Error('Server Error: Please try again later');
                    case 503:
                        throw new Error('Service Unavailable: Server is temporarily down');
                    default:
                        throw new Error(
                            errorData.message ||
                            `HTTP Error: ${response.status} ${response.statusText}`
                        );
                }
            }

            // parsing the result
            let result;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                throw new Error('Response is not JSON format');
            }

            // Check if response has data
            if (result === null || result === undefined) {
                throw new Error('No data received from server');
            }

            setData(result);

            // Success callback
            if (onSuccess) {
                onSuccess(result);
            }

            return result;

        } catch (err) {
            // Handle abort errors
            if (err.name === 'AbortError') {
                console.log('Request was cancelled');
                return;
            }

            // Network errors
            if (err.message === 'Failed to fetch') {
                err.message = 'Network error. Please check your internet connection.';
            }

            // Timeout errors
            if (err.name === 'TimeoutError') {
                err.message = 'Request timeout. The server took too long to respond.';
            }

            setError(err.message);

            // Error callback
            if (onError) {
                onError(err);
            }

            console.error('GET Request Error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Refetch function
    const refetch = () => {
        const controller = new AbortController();
        fetchData(controller.signal);
        return controller;
    };

    // Effect for automatic fetching
    useEffect(() => {
        if (!immediate || !url) return;

        const controller = new AbortController();
        fetchData(controller.signal);

        // Cleanup function - abort request if component unmounts
        return () => {
            controller.abort();
        };
    }, [url, ...dependencies]);

    return {
        data,
        loading,
        error,
        refetch
    };
};

export default useGet;