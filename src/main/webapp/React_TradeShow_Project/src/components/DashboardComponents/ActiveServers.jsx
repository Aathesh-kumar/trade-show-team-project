import DashboardStyles from '../../styles/Dashboard.module.css';
import { MdStorage, MdAdd } from 'react-icons/md';

export default function ActiveServers() {
    const servers = [
        { name: 'Primary-01', region: 'US-EAST-1', latency: '12ms', status: 'online' },
        { name: 'Replica-A', region: 'EU-WEST-2', latency: '84ms', status: 'online' },
        { name: 'Standby-03', region: '', latency: '—', status: 'offline' }
    ];

    return (
        <div className={DashboardStyles.activeServers}>
            <h2>Active Servers</h2>
            <div className={DashboardStyles.serversList}>
                {servers.map((server, index) => (
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
            <button className={DashboardStyles.addServerBtn}>
                <MdAdd /> ADD NEW NODE
            </button>
        </div>
    );
}