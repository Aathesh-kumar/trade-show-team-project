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

    // Build URL with query parameters
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
            // ========================================
            // VALIDATION 1: Check if URL is provided
            // ========================================
            if (!url) {
                throw new Error('URL cannot be empty');
            }

            // ========================================
            // VALIDATION 2: Check URL format
            // ========================================
            if (typeof url !== 'string') {
                throw new Error('URL must be a string');
            }

            setLoading(true);
            setError(null);

            const fullUrl = buildUrl();

            // ========================================
            // VALIDATION 3: Check params object
            // ========================================
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

            // ========================================
            // VALIDATION 4: Check response status
            // ========================================
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Handle specific HTTP status codes
                if (response.status === 400) {
                    throw new Error(errorData.message || 'Bad Request: Invalid parameters');
                } else if (response.status === 401) {
                    throw new Error('Unauthorized: Please login to continue');
                } else if (response.status === 403) {
                    throw new Error('Forbidden: You do not have permission to access this resource');
                } else if (response.status === 404) {
                    throw new Error('Not Found: The requested resource does not exist');
                } else if (response.status === 500) {
                    throw new Error('Server Error: Please try again later');
                } else if (response.status === 503) {
                    throw new Error('Service Unavailable: Server is temporarily down');
                } else {
                    throw new Error(
                        errorData.message || 
                        `HTTP Error: ${response.status} ${response.statusText}`
                    );
                }
            }

            // ========================================
            // VALIDATION 5: Parse response
            // ========================================
            let result;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                throw new Error('Response is not JSON format');
            }

            // ========================================
            // VALIDATION 6: Check if response has data
            // ========================================
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

            // ========================================
            // VALIDATION 7: Network errors
            // ========================================
            if (err.message === 'Failed to fetch') {
                err.message = 'Network error. Please check your internet connection.';
            }

            // ========================================
            // VALIDATION 8: Timeout errors
            // ========================================
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