import DashboardStyles from '../../styles/Dashboard.module.css';
import { MdRefresh, MdAdd, MdDownload, MdTerminal } from 'react-icons/md';

export default function QuickActions({ onNavigate }) {
    const actions = [
        { icon: <MdRefresh />, label: 'Request Logs', color: '#3B82F6', action: () => onNavigate?.('logs') },
        { icon: <MdAdd />, label: 'Configure Server', color: '#3B82F6', action: () => onNavigate?.('configure-server') },
        { icon: <MdDownload />, label: 'Tools Inventory', color: '#3B82F6', action: () => onNavigate?.('tools') },
        { icon: <MdTerminal />, label: 'Dashboard', color: '#3B82F6', action: () => onNavigate?.('dashboard') }
    ];

    return (
        <div className={DashboardStyles.quickActions}>
            <h2>Quick Actions</h2>
            <div className={DashboardStyles.actionsGrid}>
                {actions.map((action, index) => (
                    <button key={index} className={DashboardStyles.actionBtn} onClick={action.action}>
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
