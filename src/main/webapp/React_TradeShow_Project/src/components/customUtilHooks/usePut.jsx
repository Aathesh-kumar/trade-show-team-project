import { useState } from 'react';

export const usePut = (baseUrl, options = {}) => {
    const {
        method = 'PUT',
        headers = {},
        onSuccess,
        onError,
        validateData
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const validate = (id, requestData) => {
        // Validation: Check if ID is provided
        if (id === null || id === undefined || id === '') {
            throw new Error('Resource ID is required for update');
        }

        // Validation: Check if ID is valid type
        if (typeof id !== 'string' && typeof id !== 'number') {
            throw new Error('Resource ID must be a string or number');
        }

        // Validation: Check if data is provided
        if (!requestData) {
            throw new Error('Update data is required');
        }

        // Validation: Check if data is an object
        if (typeof requestData !== 'object' || Array.isArray(requestData)) {
            throw new Error('Update data must be an object');
        }

        // Validation: Check for empty object (only for PUT, PATCH can have partial updates)
        if (method === 'PUT' && Object.keys(requestData).length === 0) {
            throw new Error('Update data cannot be empty for PUT requests');
        }

        // Custom validation if provided
        if (validateData) {
            const validationResult = validateData(requestData, id);
            if (validationResult !== true) {
                throw new Error(validationResult || 'Validation failed');
            }
        }
    };

    const execute = async (id, requestData, customOptions = {}) => {
        try {
            // ========================================
            // VALIDATION 9: Check if base URL is provided
            // ========================================
            if (!baseUrl) {
                throw new Error('Base URL is required for update request');
            }
    
            // ========================================
            // VALIDATION 10: Check URL format
            // ========================================
            if (typeof baseUrl !== 'string') {
                throw new Error('Base URL must be a string');
            }
    
            // Validate request
            validate(id, requestData);
    
            setLoading(true);
            setError(null);
    
            // Build full URL
            const fullUrl = `${baseUrl}?id=${id}`;
    
            // ========================================
            // Check if data is FormData or URLSearchParams
            // ========================================
            const isFormData = requestData instanceof FormData;
            const isUrlEncoded = requestData instanceof URLSearchParams;
            
            let requestBody;
            let contentTypeHeader = {};
    
            if (isFormData) {
                requestBody = requestData;
            } else if (isUrlEncoded) {
                requestBody = requestData.toString();
                contentTypeHeader = { 'Content-Type': 'application/x-www-form-urlencoded' };
            } else {
                try {
                    requestBody = JSON.stringify(requestData);
                    contentTypeHeader = { 'Content-Type': 'application/json' };
                } catch (err) {
                    throw new Error('Failed to serialize request data to JSON');
                }
            }
    
            const response = await fetch(fullUrl, {
                method: method,
                headers: {
                    ...contentTypeHeader,
                    ...headers,
                    ...customOptions.headers
                },
                body: requestBody
            });
    
            // ... rest of validation (keep existing code)
        } catch (err) {
            // ... error handling (keep existing code)
        } finally {
            setLoading(false);
        }
    };

    /**
     * Reset hook state
     */
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

/**
 * Convenience hook for PATCH requests
 */
export const usePatch = (baseUrl, options = {}) => {
    return usePut(baseUrl, { ...options, method: 'PATCH' });
};

// Example usage:
/*
// PUT example (full replacement)
const UpdateUserComponent = () => {
    const { data, loading, error, execute } = usePut('/api/users', {
        validateData: (data) => {
            if (!data.email) return 'Email is required';
            if (!data.name) return 'Name is required';
            return true;
        },
        onSuccess: (response, id) => {
            console.log('User updated:', response);
            toast.success('User updated successfully!');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleUpdate = async (userId, formData) => {
        try {
            await execute(userId, formData);
        } catch (err) {
            // Error already handled in hook
        }
    };

    return (
        <form onSubmit={(e) => {
            e.preventDefault();
            handleUpdate(123, { name: '...', email: '...' });
        }}>
            {loading && <LoadingSpinner />}
            {error && <ErrorMessage message={error} />}
            <button type="submit" disabled={loading}>Update</button>
        </form>
    );
};

// PATCH example (partial update)
const PartialUpdateComponent = () => {
    const { execute, loading } = usePatch('/api/users', {
        onSuccess: () => toast.success('Status updated!')
    });

    const toggleStatus = async (userId, newStatus) => {
        await execute(userId, { status: newStatus });
    };

    return (
        <button 
            onClick={() => toggleStatus(123, 'active')}
            disabled={loading}
        >
            Activate User
        </button>
    );
};
*/