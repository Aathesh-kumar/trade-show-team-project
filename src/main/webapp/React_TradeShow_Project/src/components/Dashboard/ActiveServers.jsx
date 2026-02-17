import DashboardStyles from '../../styles/Dashboard.module.css';
import { MdStorage, MdAdd } from 'react-icons/md';

export default function ActiveServers({ servers = [], selectedServerId, onSelectServer, onNavigate }) {
    const safeServers = Array.isArray(servers) ? servers : [];
    const normalizedServers = safeServers.map((server) => ({
        id: server.serverId,
        name: server.serverName,
        region: safeHost(server.serverUrl),
        status: server.serverUp === false ? 'offline' : 'online',
        toolCount: server.toolCount ?? 0,
        checkedAt: server.checkedAt
    }));

    return (
        <div className={DashboardStyles.activeServers}>
            <h2>Active Servers</h2>
            <div className={DashboardStyles.serversList}>
                {normalizedServers.map((server, index) => (
                    <button
                        key={index}
                        type="button"
                        className={`${DashboardStyles.serverItem} ${selectedServerId === server.id ? DashboardStyles.selectedServerItem : ''}`}
                        onClick={() => onSelectServer?.(server.id)}
                    >
                        <div className={DashboardStyles.serverIcon}>
                            <MdStorage />
                            <span className={`${DashboardStyles.serverStatusDot} ${server.status === 'online' ? DashboardStyles.online : DashboardStyles.offline}`}></span>
                        </div>
                        <div className={DashboardStyles.serverInfo}>
                            <p className={DashboardStyles.serverName}>{server.name}</p>
                            <p className={DashboardStyles.serverRegion}>{server.region || 'UNKNOWN HOST'}</p>
                        </div>
                        <div className={DashboardStyles.serverLatency}>{server.toolCount} tools</div>
                    </button>
                ))}
            </div>
            <button className={DashboardStyles.addServerBtn} onClick={() => onNavigate?.('configure-server')}>
                <MdAdd /> ADD NEW NODE
            </button>
        </div>
    );
}

function safeHost(url) {
    try {
        return new URL(url).hostname;
    } catch (e) {
        return url || '-';
    }
}
