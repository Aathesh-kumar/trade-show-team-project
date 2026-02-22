import DashboardStyles from '../../styles/Dashboard.module.css';
import { MdCloud, MdSearch, MdEmail } from 'react-icons/md';
import CursorStyle from "../../styles/cursor.module.css";

export default function TopPerformingTools({ tools = [] }) {
    const normalizedTools = tools
        .filter((tool) => !isInternalToolName(tool?.toolName))
        .map((tool, index) => ({
        icon: index % 3 === 0 ? <MdCloud /> : index % 3 === 1 ? <MdSearch /> : <MdEmail />,
        name: tool.toolName,
        requests: `${Number(tool.totalCalls || 0).toLocaleString()} requests`,
        avgTime: `${Math.round(tool.avgLatency || 0)}ms avg`,
        success: `${Number(tool.successPercent || 0).toFixed(1)}% SUCCESS`,
        iconBg: index % 2 === 0 ? '#10B981' : '#3B82F6'
    }));

    return (
        <div className={DashboardStyles.topPerformingTools}>
            <h2><span className={CursorStyle.cursorText}>Top Performing Tools</span></h2>
            <div className={`${DashboardStyles.toolsList}` }>
                {normalizedTools.map((tool, index) => (
                    <div key={index} className={DashboardStyles.toolItem}>
                        <div className={DashboardStyles.toolIcon} style={{ backgroundColor: tool.iconBg }}>
                            {tool.icon}
                        </div>
                        <div className={`${DashboardStyles.toolInfo}`}>
                            <p className={`${DashboardStyles.toolName}`}><span className={CursorStyle.cursorText}>{tool.name}</span></p>
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

function isInternalToolName(name) {
    const lower = String(name || '').toLowerCase();
    return !lower
        || lower.startsWith('__')
        || lower.includes('ping')
        || lower.includes('refresh')
        || lower.includes('token');
}
