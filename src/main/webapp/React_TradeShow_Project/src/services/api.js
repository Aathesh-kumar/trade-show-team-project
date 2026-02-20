const normalizeBase = (value) => {
    if (!value) {
        return 'http://localhost:8080/trade-show-team-project';
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
        const rawMessage = extractMessage(body);
        const normalized = String(rawMessage || '').trim();
        const errorMessage = !normalized || /^unknown error$/i.test(normalized)
            ? `Request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ''})`
            : normalized;
        const err = new Error(errorMessage);
        err.status = response.status;
        err.payload = body;
        err.code = body?.errorCode || body?.code || null;
        throw err;
    }

    return body;
};

function extractMessage(body) {
    if (!body || typeof body !== 'object') {
        return '';
    }
    const candidates = [
        body.message,
        body.error,
        body.error_description,
        body.description,
        body?.data?.message,
        body?.data?.error,
        body?.result?.message,
        body?.result?.error
    ];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate;
        }
    }
    return '';
}

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
