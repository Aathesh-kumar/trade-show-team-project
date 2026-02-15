import DashboardStyles from '../../styles/Dashboard.module.css';
import { MdCloud, MdSearch, MdEmail, MdCode, MdApi, MdDataArray } from 'react-icons/md';
import { useGet } from '../customUtilHooks/useGet';
import { buildUrl, ENDPOINTS } from '../../services/api';

// Icon mapping for different tool types
const ICON_MAP = {
    'weather': <MdCloud />,
    'search': <MdSearch />,
    'email': <MdEmail />,
    'code': <MdCode />,
    'database': <MdDataArray/>,
    'api': <MdApi/>,
    'default': <MdApi/>
};

// Color mapping for different tool types
const COLOR_MAP = {
    'weather': '#10B981',
    'search': '#3B82F6',
    'email': '#8B5CF6',
    'code': '#F59E0B',
    'database': '#EC4899',
    'api': '#06B6D4',
    'default': '#6366F1'
};

export default function TopPerformingTools({ refreshKey }) {
    // Fetch tools data
    const { data, loading, error } = useGet(buildUrl(ENDPOINTS.TOOLS), {
        immediate: true,
        dependencies: [refreshKey],
        onError: (error) => {
            console.error('Failed to fetch tools:', error);
        }
    });

    const tools = data?.tools || [];

    const getToolIcon = (toolType) => {
        return ICON_MAP[toolType?.toLowerCase()] || ICON_MAP['default'];
    };

    const getToolColor = (toolType) => {
        return COLOR_MAP[toolType?.toLowerCase()] || COLOR_MAP['default'];
    };

    return (
        <div className={DashboardStyles.topPerformingTools}>
            <h2>Top Performing Tools</h2>
            
            {loading && (
                <div className={DashboardStyles.loadingState}>
                    <div className={DashboardStyles.spinner}></div>
                    <p>Loading tools...</p>
                </div>
            )}

            {error && (
                <div className={DashboardStyles.errorState}>
                    <p>Failed to load tools data</p>
                    <span>{error}</span>
                </div>
            )}

            {!loading && !error && tools.length === 0 && (
                <div className={DashboardStyles.emptyState}>
                    <p>No tools data available</p>
                </div>
            )}

            {!loading && !error && tools.length > 0 && (
                <div className={DashboardStyles.toolsList}>
                    {tools.map((tool, index) => (
                        <div key={tool.id || index} className={DashboardStyles.toolItem}>
                            <div 
                                className={DashboardStyles.toolIcon} 
                                style={{ backgroundColor: tool.iconBg || getToolColor(tool.type) }}
                            >
                                {getToolIcon(tool.type)}
                            </div>
                            <div className={DashboardStyles.toolInfo}>
                                <p className={DashboardStyles.toolName}>{tool.name}</p>
                                <p className={DashboardStyles.toolRequests}>
                                    {tool.requests?.toLocaleString() || '0'} requests today
                                </p>
                            </div>
                            <div className={DashboardStyles.toolStats}>
                                <p className={DashboardStyles.toolAvgTime}>
                                    {tool.avgTime || '—'}
                                </p>
                                <p className={DashboardStyles.toolSuccess}>
                                    {tool.successRate || '—'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}