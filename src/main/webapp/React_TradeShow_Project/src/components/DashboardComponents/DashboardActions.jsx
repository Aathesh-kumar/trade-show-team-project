import { useState } from 'react';
import { usePost } from '../customUtilHooks/usePost';
import { ENDPOINTS } from '../config/api';
import DashboardStyles from '../../styles/Dashboard.module.css';

export default function DashboardActions({ onAddServer, onRefresh, serverId }) {
    const [monitoring, setMonitoring] = useState(false);

    // Hook for triggering server monitoring
    const { execute: triggerMonitoring } = usePost(
        serverId ? ENDPOINTS.SERVER_MONITOR(serverId) : null,
        {
            onSuccess: () => {
                setMonitoring(false);
                alert('Server monitoring triggered successfully!');
                onRefresh && onRefresh();
            },
            onError: (error) => {
                setMonitoring(false);
                alert(`Monitoring failed: ${error.message}`);
            }
        }
    );

    const handleMonitor = async () => {
        if (!serverId) {
            alert('Please select a server first');
            return;
        }
        
        setMonitoring(true);
        try {
            await triggerMonitoring(new URLSearchParams());
        } catch (err) {
            setMonitoring(false);
        }
    };

    return (
        <div className={DashboardStyles.actionsBar}>
            <div className={DashboardStyles.actionsGroup}>
                <button 
                    className={DashboardStyles.actionButton}
                    onClick={onAddServer}
                >
                    <span className={DashboardStyles.actionIcon}>➕</span>
                    Add New Server
                </button>

                <button 
                    className={DashboardStyles.actionButton}
                    onClick={handleMonitor}
                    disabled={!serverId || monitoring}
                >
                    <span className={DashboardStyles.actionIcon}>
                        {monitoring ? '⏳' : '🔍'}
                    </span>
                    {monitoring ? 'Monitoring...' : 'Run Monitor Check'}
                </button>

                <button 
                    className={DashboardStyles.actionButton}
                    onClick={onRefresh}
                >
                    <span className={DashboardStyles.actionIcon}>🔄</span>
                    Refresh Data
                </button>
            </div>

            <div className={DashboardStyles.actionsInfo}>
                <span className={DashboardStyles.infoIcon}>ℹ️</span>
                <span className={DashboardStyles.infoText}>
                    Data refreshes automatically every 5 minutes
                </span>
            </div>
        </div>
    );
}