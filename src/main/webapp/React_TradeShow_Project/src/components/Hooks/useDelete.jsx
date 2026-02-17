import { useState } from 'react';

export const useDelete = (baseUrl, options = {}) => {
    const {
        headers = {},
        onSuccess,
        onError,
        confirmDelete
    } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const validate = (id) => {
        // Validation: Check if ID is provided
        if (id === null || id === undefined || id === '') {
            throw new Error('Resource ID is required for deletion');
        }

        // Validation: Check if ID is valid type
        if (typeof id !== 'string' && typeof id !== 'number') {
            throw new Error('Resource ID must be a string or number');
        }

        // Validation: Check for negative numbers
        if (typeof id === 'number' && id < 0) {
            throw new Error('Resource ID cannot be negative');
        }
    };

    const execute = async (id, customOptions = {}) => {
        try {
            // Validation: Check if base URL is provided
            if (!baseUrl) {
                throw new Error('Base URL is required for DELETE request');
            }

            // Validate ID
            validate(id);

            // Confirmation check
            if (confirmDelete) {
                const confirmed = await confirmDelete(id);
                if (!confirmed) {
                    console.log('Delete operation cancelled by user');
                    return null;
                }
            }

            setLoading(true);
            setError(null);

            // Build full URL
            const fullUrl = `${baseUrl}/${id}`;

            const response = await fetch(fullUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                    ...customOptions.headers
                }
            });

            // Validation: Check response status
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Handle specific error codes
                if (response.status === 404) {
                    throw new Error(`Resource with ID ${id} not found`);
                } else if (response.status === 403) {
                    throw new Error('You do not have permission to delete this resource');
                } else if (response.status === 409) {
                    throw new Error('Cannot delete resource due to existing dependencies');
                } else {
                    throw new Error(
                        errorData.message || 
                        errorData.error ||
                        `HTTP Error: ${response.status} ${response.statusText}`
                    );
                }
            }

            // Parse response (some APIs return empty response on delete)
            let result;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                // For 204 No Content or empty responses
                result = { 
                    success: true, 
                    message: 'Resource deleted successfully',
                    deletedId: id 
                };
            }

            setData(result);

            // Success callback
            if (onSuccess) {
                onSuccess(result, id);
            }

            return result;

        } catch (err) {
            // Validation: Network errors
            if (err.message === 'Failed to fetch') {
                err.message = 'Network error. Please check your internet connection.';
            }

            setError(err.message);

            // Error callback
            if (onError) {
                onError(err, id);
            }

            console.error('DELETE Request Error:', err);
            throw err; // Re-throw for caller to handle

        } finally {
            setLoading(false);
        }
    };

    /**
     * Execute bulk DELETE request
     * @param {array} ids - Array of resource IDs to delete
     */
    const executeBulk = async (ids) => {
        try {
            // Validation: Check if IDs array is provided
            if (!Array.isArray(ids)) {
                throw new Error('IDs must be provided as an array');
            }

            if (ids.length === 0) {
                throw new Error('At least one ID is required for bulk deletion');
            }

            // Validate each ID
            ids.forEach((id, index) => {
                try {
                    validate(id);
                } catch (err) {
                    throw new Error(`Invalid ID at index ${index}: ${err.message}`);
                }
            });

            // Confirmation for bulk delete
            if (confirmDelete) {
                const confirmed = await confirmDelete(ids);
                if (!confirmed) {
                    console.log('Bulk delete operation cancelled by user');
                    return null;
                }
            }

            setLoading(true);
            setError(null);

            // Execute delete for each ID
            const results = await Promise.allSettled(
                ids.map(id => execute(id))
            );

            // Check for failures
            const failures = results.filter(r => r.status === 'rejected');
            
            if (failures.length > 0) {
                throw new Error(
                    `Failed to delete ${failures.length} out of ${ids.length} resources`
                );
            }

            const successResults = results.map(r => r.value);
            setData(successResults);

            return successResults;

        } catch (err) {
            setError(err.message);
            
            if (onError) {
                onError(err, ids);
            }

            console.error('Bulk DELETE Request Error:', err);
            throw err;

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
        executeBulk,
        reset
    };
};

// Example usage:
/*
const MyComponent = () => {
    const { loading, error, execute } = useDelete('/api/users', {
        confirmDelete: async (id) => {
            return window.confirm(`Are you sure you want to delete user ${id}?`);
        },
        onSuccess: (result, id) => {
            console.log('User deleted:', id);
            toast.success('User deleted successfully!');
            refetchUsers(); // Refresh the list
        },
        onError: (error, id) => {
            console.error('Failed to delete user:', error);
            toast.error(error.message);
        }
    });

    const handleDelete = async (userId) => {
        try {
            await execute(userId);
            // Handle success
        } catch (err) {
            // Handle error (already logged in hook)
        }
    };

    return (
        <div>
            {loading && <LoadingSpinner />}
            {error && <ErrorMessage message={error} />}
            <button 
                onClick={() => handleDelete(123)} 
                disabled={loading}
            >
                Delete User
            </button>
        </div>
    );
};
*/