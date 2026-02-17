import DashboardStyles from '../../styles/Dashboard.module.css';
import { MdStorage, MdAdd } from 'react-icons/md';

export default function ActiveServers({ servers = [] }) {
    const safeServers = Array.isArray(servers) ? servers : [];
    const normalizedServers = safeServers.map((server) => ({
        name: server.serverName,
        region: safeHost(server.serverUrl),
        latency: 'N/A',
        status: 'online'
    }));

    return (
        <div className={DashboardStyles.activeServers}>
            <h2>Active Servers</h2>
            <div className={DashboardStyles.serversList}>
                {normalizedServers.map((server, index) => (
                    <div key={index} className={DashboardStyles.serverItem}>
                        <div className={DashboardStyles.serverIcon}>
                            <MdStorage />
                            <span className={`${DashboardStyles.serverStatusDot} ${server.status === 'online' ? DashboardStyles.online : DashboardStyles.offline}`}></span>
                        </div>
                        <div className={DashboardStyles.serverInfo}>
                            <p className={DashboardStyles.serverName}>{server.name}</p>
                            <p className={DashboardStyles.serverRegion}>{server.region || 'OFFLINE'}</p>
                        </div>
                        <div className={DashboardStyles.serverLatency}>{server.latency}</div>
                    </div>
                ))}
            </div>
            <button className={DashboardStyles.addServerBtn} disabled>
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
