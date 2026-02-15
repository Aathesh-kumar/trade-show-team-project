import { useState } from 'react';
import DashboardStyles from '../../styles/Dashboard.module.css';
import { MdStorage, MdAdd } from 'react-icons/md';
import { useGet } from '../customUtilHooks/useGet';
import { usePost } from '../customUtilHooks/usePost';
import { buildUrl, ENDPOINTS } from '../../services/api';

export default function ActiveServers({ refreshKey }) {
    const [isAdding, setIsAdding] = useState(false);

    // Fetch servers data
    const { data, loading, error, refetch } = useGet(buildUrl(ENDPOINTS.SERVERS), {
        immediate: true,
        dependencies: [refreshKey],
        onError: (error) => {
            console.error('Failed to fetch servers:', error);
        }
    });

    // Post hook for adding new server
    const { execute: addServer, loading: addingServer } = usePost(buildUrl(ENDPOINTS.SERVERS), {
        onSuccess: (response) => {
            console.log('Server added successfully:', response);
            setIsAdding(false);
            refetch(); // Refresh the servers list
        },
        onError: (error) => {
            console.error('Failed to add server:', error);
            alert(`Failed to add server: ${error.message}`);
        }
    });

    const handleAddServer = async () => {
        const serverName = prompt('Enter server name:');
        const region = prompt('Enter region (e.g., US-EAST-1):');
        
        if (serverName && region) {
            try {
                await addServer({
                    name: serverName,
                    region: region,
                    status: 'online'
                });
            } catch (error) {
                // Error already handled in usePost hook
            }
        }
    };

    const servers = data?.servers || [];

    return (
        <div className={DashboardStyles.activeServers}>
            <h2>Active Servers</h2>
            
            {loading && (
                <div className={DashboardStyles.loadingState}>
                    <div className={DashboardStyles.spinner}></div>
                    <p>Loading servers...</p>
                </div>
            )}

            {error && (
                <div className={DashboardStyles.errorState}>
                    <p>Failed to load servers</p>
                    <button onClick={refetch} className={DashboardStyles.retryBtn}>
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && servers.length === 0 && (
                <div className={DashboardStyles.emptyState}>
                    <p>No servers available</p>
                </div>
            )}

            {!loading && !error && servers.length > 0 && (
                <div className={DashboardStyles.serversList}>
                    {servers.map((server, index) => (
                        <div key={server.id || index} className={DashboardStyles.serverItem}>
                            <div className={DashboardStyles.serverIcon}>
                                <MdStorage />
                                <span 
                                    className={`${DashboardStyles.serverStatusDot} ${
                                        server.status === 'online' 
                                            ? DashboardStyles.online 
                                            : DashboardStyles.offline
                                    }`}
                                ></span>
                            </div>
                            <div className={DashboardStyles.serverInfo}>
                                <p className={DashboardStyles.serverName}>{server.name}</p>
                                <p className={DashboardStyles.serverRegion}>
                                    {server.region || 'OFFLINE'}
                                </p>
                            </div>
                            <div className={DashboardStyles.serverLatency}>
                                {server.latency || '—'}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button 
                className={DashboardStyles.addServerBtn}
                onClick={handleAddServer}
                disabled={addingServer || loading}
            >
                <MdAdd /> {addingServer ? 'ADDING...' : 'ADD NEW NODE'}
            </button>
        </div>
    );
}