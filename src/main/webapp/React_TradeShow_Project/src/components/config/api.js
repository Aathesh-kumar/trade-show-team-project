// API Configuration
// Change REACT_APP_API_URL (or VITE_API_URL for Vite) in .env for different environments

const API_BASE_URL = 'http://localhost:8080/trade-show-team-project';

export const ENDPOINTS = {
    // Server endpoints
    SERVERS_ALL: `${API_BASE_URL}/server/all`,
    SERVER_BY_ID: (id) => `${API_BASE_URL}/server/?id=${id}`,
    SERVER_CREATE: `${API_BASE_URL}/server/`,
    SERVER_UPDATE: (id) => `${API_BASE_URL}/server/?id=${id}`,
    SERVER_DELETE: (id) => `${API_BASE_URL}/server/?id=${id}`,
    SERVER_HISTORY: (id, hours = 24) => `${API_BASE_URL}/server/history?id=${id}&hours=${hours}`,
    SERVER_MONITOR: (id) => `${API_BASE_URL}/server/monitor?id=${id}`,

    // Tool endpoints
    TOOLS_ALL: `${API_BASE_URL}/tool/all`,
    TOOL_BY_ID: (id) => `${API_BASE_URL}/tool/?id=${id}`,
    TOOLS_BY_SERVER: (serverId) => `${API_BASE_URL}/tool/?serverId=${serverId}`,
    TOOLS_ACTIVE: (serverId) => `${API_BASE_URL}/tool/active?serverId=${serverId}`,
    TOOL_CREATE: `${API_BASE_URL}/tool/`,
    TOOL_UPDATE: (id) => `${API_BASE_URL}/tool/?id=${id}`,
    TOOL_DELETE: (id) => `${API_BASE_URL}/tool/?id=${id}`,
    TOOL_HISTORY: (id, hours = 24) => `${API_BASE_URL}/tool/history?toolId=${id}&hours=${hours}`,

    // Request Logs endpoints (NEW)
    LOGS_ALL: (serverId, toolId, statusCode, hours = 24, limit = 100) => {
        let url = `${API_BASE_URL}/logs/all?hours=${hours}&limit=${limit}`;
        if (serverId) url += `&serverId=${serverId}`;
        if (toolId) url += `&toolId=${toolId}`;
        if (statusCode) url += `&statusCode=${statusCode}`;
        return url;
    },
    LOGS_STATS: (serverId, hours) => `${API_BASE_URL}/logs/stats?serverId=${serverId}${hours ? `&hours=${hours}` : ''}`,
    LOGS_TOOLS: (serverId) => `${API_BASE_URL}/logs/tools?serverId=${serverId}`,
    LOG_CREATE: `${API_BASE_URL}/logs/`,

    // Dashboard endpoints (NEW)
    DASHBOARD_STATS: (serverId) => `${API_BASE_URL}/dashboard/stats${serverId ? `?serverId=${serverId}` : ''}`,
    DASHBOARD_TOP_TOOLS: (serverId, limit = 5, hours = 24) =>
        `${API_BASE_URL}/dashboard/top-tools?limit=${limit}&hours=${hours}${serverId ? `&serverId=${serverId}` : ''}`,
    DASHBOARD_SYSTEM_HEALTH: (serverId, hours = 24) =>
        `${API_BASE_URL}/dashboard/system-health?hours=${hours}${serverId ? `&serverId=${serverId}` : ''}`,

    // History endpoints
    HISTORY_SERVER: (id, hours = 24) => `${API_BASE_URL}/history/server?id=${id}&hours=${hours}`,
    HISTORY_TOOL: (id, hours = 24) => `${API_BASE_URL}/history/tool?id=${id}&hours=${hours}`,

    // Health check
    HEALTH: `${API_BASE_URL}/health`
};

export default API_BASE_URL;