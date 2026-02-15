// API Configuration
const API_BASE_URL = 'http://localhost:8080/trade-show-team-project';

// API Endpoints
export const ENDPOINTS = {
    STATS: '/dashboard/stats',
    SYSTEM_HEALTH: '/dashboard/system-health',
    SERVERS: '/dashboard/servers',
    TOOLS: '/dashboard/tools',
    REFRESH_DATA: '/dashboard/refresh'
};

// Helper function to build full URL
export const buildUrl = (endpoint) => `${API_BASE_URL}${endpoint}`;

// Export base URL for hooks
export { API_BASE_URL };