import DashboardStyles from '../../styles/Dashboard.module.css';
import { MdRefresh, MdAdd, MdDownload, MdTerminal } from 'react-icons/md';

export default function QuickActions() {
    const actions = [
        { icon: <MdRefresh />, label: 'Restart Server', color: '#3B82F6' },
        { icon: <MdAdd />, label: 'New Tool', color: '#3B82F6' },
        { icon: <MdDownload />, label: 'Backup Config', color: '#3B82F6' },
        { icon: <MdTerminal />, label: 'Open CLI', color: '#3B82F6' }
    ];

    return (
        <div className={DashboardStyles.quickActions}>
            <h2>Quick Actions</h2>
            <div className={DashboardStyles.actionsGrid}>
                {actions.map((action, index) => (
                    <button key={index} className={DashboardStyles.actionBtn}>
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