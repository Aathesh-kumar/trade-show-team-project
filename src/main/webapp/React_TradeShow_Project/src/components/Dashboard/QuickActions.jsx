import DashboardStyles from '../../styles/Dashboard.module.css';
import { MdRefresh, MdAdd, MdNetworkPing, MdVisibility } from 'react-icons/md';
import { buildUrl, getAuthHeaders, parseApiResponse } from '../../services/api';
import { useEffect, useState } from 'react';

export default function QuickActions({ onNavigate, selectedServer, onNotificationsChanged }) {
    const [busyAction, setBusyAction] = useState('');
    const [statusResult, setStatusResult] = useState('');

    useEffect(() => {
        setStatusResult('');
    }, [selectedServer?.serverId]);

    const runServerAction = async (type) => {
        const serverId = selectedServer?.serverId;
        if (!serverId) {
            return;
        }
        if (type !== 'status') {
            setStatusResult('');
        }
        setBusyAction(type);
        const startedAt = Date.now();
        const endpoint = type === 'ping'
            ? '/server/ping'
            : type === 'refresh'
                ? '/server/refresh-data'
                : '/server/statuses';
        const actionName = type === 'ping'
            ? 'Ping Server'
            : type === 'refresh'
                ? 'Refresh Server Data'
                : 'Check Server Status';
        try {
            const response = await fetch(buildUrl(endpoint), {
                method: type === 'status' ? 'GET' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: type === 'status' ? null : JSON.stringify({ serverId })
            });
            const body = await parseApiResponse(response);
            if (type === 'status') {
                const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
                const match = list.find((item) => item?.serverId === serverId);
                const isUp = match?.serverUp !== false;
                setStatusResult(isUp ? 'online' : 'offline');
                await createStatusNotification(isUp);
                setTimeout(() => setStatusResult(''), 5000);
            }
            await logUiRequest({
                serverId,
                toolName: `UI: ${actionName}`,
                method: type === 'status' ? 'GET' : 'POST',
                statusCode: 200,
                statusText: 'OK',
                latencyMs: Date.now() - startedAt,
                requestPayload: { serverId, action: actionName, endpoint },
                responseBody: body?.data || body || { message: 'Completed' }
            });
        } catch (error) {
            if (type === 'status') {
                setStatusResult('offline');
                setTimeout(() => setStatusResult(''), 5000);
            }
            await logUiRequest({
                serverId,
                toolName: `UI: ${actionName}`,
                method: type === 'status' ? 'GET' : 'POST',
                statusCode: 500,
                statusText: 'ERR',
                latencyMs: Date.now() - startedAt,
                requestPayload: { serverId, action: actionName, endpoint },
                responseBody: { error: error.message }
            });
        } finally {
            setBusyAction('');
        }
    };

    const logUiRequest = async (payload) => {
        const body = {
            serverId: payload.serverId,
            toolName: payload.toolName,
            method: payload.method,
            statusCode: payload.statusCode,
            statusText: payload.statusText,
            latencyMs: payload.latencyMs,
            requestPayload: payload.requestPayload,
            responseBody: payload.responseBody,
            errorMessage: payload.responseBody?.error || null
        };
        await fetch(buildUrl('/request-log'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(body)
        }).then(parseApiResponse).catch(() => null);
        window.dispatchEvent(new CustomEvent('pulse24x7-request-log-refresh', { detail: { serverId: payload.serverId, reason: 'ui_action' } }));
    };

    const createStatusNotification = async (isUp) => {
        const serverId = selectedServer?.serverId ?? null;
        const serverName = selectedServer?.serverName || 'Server';
        const title = 'Server Status';
        const message = isUp
            ? `${serverName} is reachable.`
            : `${serverName} is unreachable.`;
        await fetch(buildUrl('/notification'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                serverId,
                category: 'server',
                severity: isUp ? 'success' : 'error',
                title,
                message
            })
        }).then(parseApiResponse).catch(() => null);
        onNotificationsChanged?.();
    };

    const statusLabel = statusResult
        ? statusResult === 'online'
            ? 'Server Online'
            : 'Server Offline'
        : busyAction === 'status'
            ? 'Checking...'
            : 'Check Server';

    const actions = [
        { icon: <MdAdd />, label: 'Configure Server', color: '#3B82F6', action: () => onNavigate?.('configure-server') },
        { icon: <MdVisibility />, label: statusLabel, color: '#3B82F6', action: () => runServerAction('status'), disabled: busyAction !== '' || !selectedServer?.serverId },
        { icon: <MdNetworkPing />, label: busyAction === 'ping' ? 'Pinging...' : 'Ping Server', color: '#3B82F6', action: () => runServerAction('ping'), disabled: busyAction !== '' || !selectedServer?.serverId },
        { icon: <MdRefresh />, label: busyAction === 'refresh' ? 'Refreshing...' : 'Refresh Data', color: '#3B82F6', action: () => runServerAction('refresh'), disabled: busyAction !== '' || !selectedServer?.serverId }
    ];

    return (
        <div className={DashboardStyles.quickActions}>
            <h2>Quick Actions</h2>
            <div className={DashboardStyles.actionsGrid}>
                {actions.map((action, index) => (
                    <button
                        key={index}
                        type="button"
                        className={DashboardStyles.actionBtn}
                        onClick={action.action}
                        disabled={!!action.disabled}
                    >
                        <div className={DashboardStyles.actionIcon} style={{ color: action.color }}>
                            {action.icon}
                        </div>
                        <span>{action.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
