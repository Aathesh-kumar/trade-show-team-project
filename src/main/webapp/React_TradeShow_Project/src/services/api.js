const normalizeBase = (value) => {
    if (!value) {
        return 'http://localhost:8080/team-project-static';
    }
    return value.endsWith('/') ? value.slice(0, -1) : value;
};

export const API_BASE = normalizeBase(import.meta.env.VITE_API_BASE);

export const buildUrl = (path, params = {}) => {
    const safePath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${API_BASE}${safePath}`, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    });
    return url.toString();
};

export const parseApiResponse = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await response.json() : null;

    if (!response.ok) {
        const errorMessage = body?.message || body?.error || `${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
    }

    return body;
};

export const unwrapData = (body) => {
    if (!body) {
        return null;
    }
    if (body.status === 'success' && body.data !== undefined) {
        return body.data;
    }
    return body;
};

export const getAuthToken = () => localStorage.getItem('mcp_jwt') || '';

export const getAuthHeaders = () => {
    const token = getAuthToken();
    if (!token) {
        return {};
    }
    return {
        Authorization: `Bearer ${token}`
    };
};
