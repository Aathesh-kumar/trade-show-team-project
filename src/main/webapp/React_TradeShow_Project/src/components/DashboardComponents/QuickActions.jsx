import DashboardStyles from '../../styles/Dashboard.module.css';
import { MdRefresh, MdAdd, MdDownload, MdTerminal } from 'react-icons/md';
import { usePost } from '../customUtilHooks/usePost';
import { buildUrl, ENDPOINTS } from '../../services/api';

export default function QuickActions({ onRefresh }) {
    // Post hook for actions
    const { execute: executeAction, loading: actionLoading } = usePost(buildUrl('/dashboard/actions'), {
        onSuccess: (response, requestData) => {
            console.log('Action executed:', requestData.action);
            alert(`${requestData.action} completed successfully!`);
            if (onRefresh) onRefresh();
        },
        onError: (error, requestData) => {
            console.error('Action failed:', error);
            alert(`Failed to execute ${requestData.action}: ${error.message}`);
        }
    });

    const handleAction = async (actionType) => {
        try {
            await executeAction({ 
                action: actionType,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            // Error already handled in usePost hook
        }
    };

    const actions = [
        { 
            icon: <MdRefresh />, 
            label: 'Restart Server', 
            color: '#3B82F6',
            action: 'restart_server'
        },
        { 
            icon: <MdAdd />, 
            label: 'New Tool', 
            color: '#3B82F6',
            action: 'new_tool'
        },
        { 
            icon: <MdDownload />, 
            label: 'Backup Config', 
            color: '#3B82F6',
            action: 'backup_config'
        },
        { 
            icon: <MdTerminal />, 
            label: 'Open CLI', 
            color: '#3B82F6',
            action: 'open_cli'
        }
    ];

    return (
        <div className={DashboardStyles.quickActions}>
            <h2>Quick Actions</h2>
            <div className={DashboardStyles.actionsGrid}>
                {actions.map((action, index) => (
                    <button 
                        key={index} 
                        className={DashboardStyles.actionBtn}
                        onClick={() => handleAction(action.action)}
                        disabled={actionLoading}
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