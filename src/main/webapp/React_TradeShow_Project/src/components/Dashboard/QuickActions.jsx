import DashboardStyles from '../../styles/Dashboard.module.css';
import { MdAdd, MdDownload, MdSyncAlt, MdWifiTethering } from 'react-icons/md';
import { usePost } from '../Hooks/usePost';
import { buildUrl } from '../../services/api';
import { appendUiRequestLog } from '../../utils/requestLogEvents';

export default function QuickActions({ onNavigate, selectedServer }) {
    const serverId = selectedServer?.serverId;
    const { execute: pingServer, loading: pinging } = usePost(buildUrl('/server/monitor'));
    const { execute: refreshAllData, loading: refreshing } = usePost(buildUrl('/tool/refresh'));

    const runPing = async () => {
        if (!serverId) {
            return;
        }
        const start = performance.now();
        try {
            await pingServer({ serverId });
            appendUiRequestLog(serverId, {
                toolName: 'Ping Server',
                requestPayload: { serverId, action: 'server_monitor' },
                responseBody: { message: 'Server ping and monitor completed.' },
                latencyMs: Math.round(performance.now() - start)
            });
            window.dispatchEvent(new CustomEvent('pulse24x7-notification-refresh'));
        } catch (error) {
            appendUiRequestLog(serverId, {
                toolName: 'Ping Server',
                statusCode: 502,
                statusText: 'ERR',
                requestPayload: { serverId, action: 'server_monitor' },
                responseBody: { message: error.message || 'Ping failed.' },
                latencyMs: Math.round(performance.now() - start)
            });
        }
    };

    const runRefresh = async () => {
        if (!serverId) {
            return;
        }
        const start = performance.now();
        try {
            await refreshAllData({ serverId });
            appendUiRequestLog(serverId, {
                toolName: 'Refresh Server Data',
                requestPayload: { serverId, action: 'refresh_tools' },
                responseBody: { message: 'Tools and inventory refreshed.' },
                latencyMs: Math.round(performance.now() - start)
            });
            window.dispatchEvent(new CustomEvent('pulse24x7-request-log-refresh', {
                detail: { serverId, reason: 'refresh_tools' }
            }));
            window.dispatchEvent(new CustomEvent('pulse24x7-notification-refresh'));
        } catch (error) {
            appendUiRequestLog(serverId, {
                toolName: 'Refresh Server Data',
                statusCode: 502,
                statusText: 'ERR',
                requestPayload: { serverId, action: 'refresh_tools' },
                responseBody: { message: error.message || 'Refresh failed.' },
                latencyMs: Math.round(performance.now() - start)
            });
        }
    };

    const actions = [
        { icon: <MdAdd />, label: 'Configure Server', color: '#3B82F6', action: () => onNavigate?.('configure-server') },
        { icon: <MdDownload />, label: 'Tools Inventory', color: '#3B82F6', action: () => onNavigate?.('tools') },
        { icon: <MdWifiTethering />, label: pinging ? 'Pinging...' : 'Ping Server', color: '#3B82F6', action: runPing, disabled: pinging || !serverId },
        { icon: <MdSyncAlt />, label: refreshing ? 'Refreshing...' : 'Refresh Server Data', color: '#3B82F6', action: runRefresh, disabled: refreshing || !serverId }
    ];

    return (
        <div className={DashboardStyles.quickActions}>
            <h2>Quick Actions</h2>
            <div className={DashboardStyles.actionsGrid}>
                {actions.map((action, index) => (
                    <button key={index} className={DashboardStyles.actionBtn} onClick={action.action} disabled={action.disabled}>
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
