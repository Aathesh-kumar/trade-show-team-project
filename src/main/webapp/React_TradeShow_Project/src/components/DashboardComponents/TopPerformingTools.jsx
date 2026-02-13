import DashboardStyles from '../../styles/Dashboard.module.css';
import { MdCloud, MdSearch, MdEmail } from 'react-icons/md';

export default function TopPerformingTools() {
    const tools = [
        { 
            icon: <MdCloud />, 
            name: 'get_weather', 
            requests: '42,102 requests today',
            avgTime: '89ms avg',
            success: '99.9% SUCCESS',
            iconBg: '#10B981'
        },
        { 
            icon: <MdSearch />, 
            name: 'search_docs', 
            requests: '28,450 requests today',
            avgTime: '210ms avg',
            success: '99.2% SUCCESS',
            iconBg: '#3B82F6'
        },
        { 
            icon: <MdEmail />, 
            name: 'send_email', 
            requests: '12,110 requests today',
            avgTime: '1.2s avg',
            success: '94.1% SUCCESS',
            iconBg: '#8B5CF6'
        }
    ];

    return (
        <div className={DashboardStyles.topPerformingTools}>
            <h2>Top Performing Tools</h2>
            <div className={DashboardStyles.toolsList}>
                {tools.map((tool, index) => (
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