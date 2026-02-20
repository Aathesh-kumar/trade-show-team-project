import DashboardStyles from '../../styles/Dashboard.module.css';
import { MdRefresh, MdAdd, MdDownload, MdNetworkPing } from 'react-icons/md';
import { buildUrl, getAuthHeaders, parseApiResponse } from '../../services/api';
import { appendUiRequestLog } from '../../utils/requestLogEvents';
import { useState } from 'react';

export default function QuickActions({ onNavigate, selectedServer }) {
    const [busyAction, setBusyAction] = useState('');

    const runServerAction = async (type) => {
        const serverId = selectedServer?.serverId;
        if (!serverId) {
            return;
        }
        setBusyAction(type);
        const startedAt = Date.now();
        const endpoint = type === 'ping' ? '/server/ping' : '/server/refresh-data';
        const actionName = type === 'ping' ? 'Ping Server' : 'Refresh Server Data';
        try {
            const response = await fetch(buildUrl(endpoint), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ serverId })
            });
            const body = await parseApiResponse(response);
            appendUiRequestLog(serverId, {
                toolName: actionName,
                method: 'POST',
                statusCode: 200,
                statusText: 'OK',
                latencyMs: Date.now() - startedAt,
                requestPayload: { serverId, action: actionName },
                responseBody: body?.data || body || { message: 'Completed' }
            });
        } catch (error) {
            appendUiRequestLog(serverId, {
                toolName: actionName,
                method: 'POST',
                statusCode: 500,
                statusText: 'ERR',
                latencyMs: Date.now() - startedAt,
                requestPayload: { serverId, action: actionName },
                responseBody: { error: error.message }
            });
        } finally {
            setBusyAction('');
        }
    };

    const actions = [
        { icon: <MdAdd />, label: 'Configure Server', color: '#3B82F6', action: () => onNavigate?.('configure-server') },
        { icon: <MdDownload />, label: 'Tools Inventory', color: '#3B82F6', action: () => onNavigate?.('tools') },
        { icon: <MdNetworkPing />, label: busyAction === 'ping' ? 'Pinging...' : 'Ping Server', color: '#3B82F6', action: () => runServerAction('ping'), disabled: busyAction !== '' || !selectedServer?.serverId },
        { icon: <MdRefresh />, label: busyAction === 'refresh' ? 'Refreshing...' : 'Refresh Data', color: '#3B82F6', action: () => runServerAction('refresh'), disabled: busyAction !== '' || !selectedServer?.serverId }
    ];

    return (
        <div className={DashboardStyles.quickActions}>
            <h2>Quick Actions</h2>
            <div className={DashboardStyles.actionsGrid}>
                {actions.map((action, index) => (
                    <button key={index} className={DashboardStyles.actionBtn} onClick={action.action} disabled={!!action.disabled}>
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
