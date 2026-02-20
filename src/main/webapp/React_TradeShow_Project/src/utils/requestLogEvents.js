const STORAGE_KEY = 'pulse24x7_ui_request_events';

function readStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function writeStore(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function appendUiRequestLog(serverId, payload) {
  if (!serverId) {
    return;
  }
  const key = String(serverId);
  const store = readStore();
  const items = Array.isArray(store[key]) ? store[key] : [];
  const next = [{
    id: `ui-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    serverId,
    toolId: null,
    toolName: payload.toolName || 'UI Action',
    method: payload.method || 'POST',
    statusCode: payload.statusCode || 200,
    statusText: payload.statusText || 'OK',
    latencyMs: payload.latencyMs ?? 0,
    responseSizeBytes: payload.responseSizeBytes ?? 0,
    requestPayload: payload.requestPayload || {},
    responseBody: payload.responseBody || { message: payload.message || 'Completed' },
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent
  }, ...items].slice(0, 300);

  store[key] = next;
  writeStore(store);
  window.dispatchEvent(new CustomEvent('pulse24x7-request-log-refresh', { detail: { serverId, reason: 'ui_action' } }));
}

export function getUiRequestLogs(serverId) {
  if (!serverId) {
    return [];
  }
  const store = readStore();
  const items = Array.isArray(store[String(serverId)]) ? store[String(serverId)] : [];
  return items;
}
