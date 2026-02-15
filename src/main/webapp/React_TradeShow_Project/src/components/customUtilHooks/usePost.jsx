import { useState } from 'react';

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

    const validate = (requestData) => {
        // Validation: Check if data is provided
        if (!requestData) {            
            throw new Error('Request data is required');
        }

        // Validation: Check if data is an object
        if (typeof requestData !== 'object') {
            throw new Error('Request data must be an object');
        }

        // Validation: Check for empty object
        if (Object.keys(requestData).length === 0) {
            console.log(requestData);
            throw new Error('Request data cannot be empty');
        }

        // Custom validation if provided
        if (validateData) {
            const validationResult = validateData(requestData);
            if (validationResult !== true) {
                throw new Error(validationResult || 'Validation failed');
            }
        }
    };

    const execute = async (requestData, customOptions = {}) => {
        try {
            // Validation: Check if URL is provided
            if (!url) {
                throw new Error('URL is required for POST request');
            }

            // Validate request data
            validate(requestData);

            setLoading(true);
            setError(null);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                    ...customOptions.headers
                },
                body: JSON.stringify(requestData)
            });

            // Validation: Check response status
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message || 
                    errorData.error ||
                    `HTTP Error: ${response.status} ${response.statusText}`
                );
            }

            // Parse response
            const result = await response.json();

            // Validation: Check if response has data
            if (result === null || result === undefined) {
                throw new Error('No response received from server');
            }

            setData(result);

            // Success callback
            if (onSuccess) {
                onSuccess(result, requestData);
            }

            return result;

        } catch (err) {            
            // Validation: Network errors
            if (err.message === 'Failed to fetch') {
                err.message = 'Network error. Please check your internet connection.' + err;
            }

            setError(err.message);

            // Error callback
            if (onError) {
                onError(err, requestData);
            }

            console.error('POST Request Error:', err);
            throw err; // Re-throw for caller to handle

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

// Example usage:
/*
const MyComponent = () => {
    const { data, loading, error, execute, reset } = usePost('/api/users', {
        validateData: (data) => {
            if (!data.email) return 'Email is required';
            if (!data.password) return 'Password is required';
            return true;
        },
        onSuccess: (response) => {
            console.log('User created:', response);
            toast.success('User created successfully!');
        },
        onError: (error) => {
            console.error('Failed to create user:', error);
            toast.error(error.message);
        }
    });

    const handleSubmit = async (formData) => {
        try {
            await execute(formData);
            // Handle success
        } catch (err) {
            // Handle error (already logged in hook)
        }
    };

    return (
        <form onSubmit={(e) => {
            e.preventDefault();
            handleSubmit({ email: '...', password: '...' });
        }}>
            {loading && <LoadingSpinner />}
            {error && <ErrorMessage message={error} />}
            <button type="submit" disabled={loading}>Submit</button>
        </form>
    );
};
*/
