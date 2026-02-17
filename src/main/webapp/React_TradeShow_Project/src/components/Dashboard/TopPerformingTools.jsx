import DashboardStyles from '../../styles/Dashboard.module.css';
import { MdCloud, MdSearch, MdEmail } from 'react-icons/md';

export default function TopPerformingTools({ tools = [] }) {
    const normalizedTools = tools.map((tool, index) => ({
        icon: index % 3 === 0 ? <MdCloud /> : index % 3 === 1 ? <MdSearch /> : <MdEmail />,
        name: tool.toolName,
        requests: `${Number(tool.totalCalls || 0).toLocaleString()} requests`,
        avgTime: `${Math.round(tool.avgLatency || 0)}ms avg`,
        success: `${Number(tool.successPercent || 0).toFixed(1)}% SUCCESS`,
        iconBg: index % 2 === 0 ? '#10B981' : '#3B82F6'
    }));

    return (
        <div className={DashboardStyles.topPerformingTools}>
            <h2>Top Performing Tools</h2>
            <div className={DashboardStyles.toolsList}>
                {normalizedTools.map((tool, index) => (
                    <div key={index} className={DashboardStyles.toolItem}>
                        <div className={DashboardStyles.toolIcon} style={{ backgroundColor: tool.iconBg }}>
                            {tool.icon}
                        </div>
                        <div className={DashboardStyles.toolInfo}>
                            <p className={DashboardStyles.toolName}>{tool.name}</p>
                            <p className={DashboardStyles.toolRequests}>{tool.requests}</p>
                        </div>
                        <div className={DashboardStyles.toolStats}>
                            <p className={DashboardStyles.toolAvgTime}>{tool.avgTime}</p>
                            <p className={DashboardStyles.toolSuccess}>{tool.success}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
