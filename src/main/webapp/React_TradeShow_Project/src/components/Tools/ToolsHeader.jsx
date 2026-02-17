import ToolsStyles from '../../styles/Tools.module.css';
import { MdSearch, MdRefresh } from 'react-icons/md';

export default function ToolsHeader({
    stats,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    timeRange,
    setTimeRange,
    customMinutes,
    setCustomMinutes,
    onRefresh,
    refreshing
}) {
    return (
        <header className={ToolsStyles.toolsHeader}>
            <div className={ToolsStyles.headerTop}>
                <div className={ToolsStyles.headerTitle}>
                    <h1>Tools Inventory</h1>
                    <div className={ToolsStyles.headerStats}>
                        <span className={ToolsStyles.statBadge}>
                            <span className={ToolsStyles.statDot} style={{ backgroundColor: '#3B82F6' }}></span>
                            {stats.totalTools} Tools
                        </span>
                        <span className={ToolsStyles.statBadge}>
                            <span className={ToolsStyles.statDot} style={{ backgroundColor: '#10B981' }}></span>
                            {stats.totalResources} Resources
                        </span>
                    </div>
                </div>
                <button className={ToolsStyles.createBtn} onClick={onRefresh} disabled={refreshing}>
                    <MdRefresh />
                    {refreshing ? 'Refreshing...' : 'Refresh Tools'}
                </button>
            </div>

            <div className={ToolsStyles.headerControls}>
                <div className={ToolsStyles.searchBox}>
                    <MdSearch className={ToolsStyles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search by tool name or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={ToolsStyles.searchInput}
                    />
                </div>

                <div className={ToolsStyles.filterGroup}>
                    <button 
                        className={`${ToolsStyles.filterBtn} ${filterType === 'all' ? ToolsStyles.active : ''}`}
                        onClick={() => setFilterType('all')}
                    >
                        All Types
                    </button>
                    <button 
                        className={`${ToolsStyles.filterBtn} ${filterType === 'action' ? ToolsStyles.active : ''}`}
                        onClick={() => setFilterType('action')}
                    >
                        Actions
                    </button>
                    <button
                        className={`${ToolsStyles.filterBtn} ${filterType === 'resource' ? ToolsStyles.active : ''}`}
                        onClick={() => setFilterType('resource')}
                    >
                        Resources
                    </button>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className={ToolsStyles.filterSelect}
                    >
                        <option value="current">Current tools</option>
                        <option value="1m">Past 1min</option>
                        <option value="10m">Past 10mins</option>
                        <option value="1h">Past 1hr</option>
                        <option value="2h">Past 2hrs</option>
                        <option value="24h">Past 24hrs</option>
                        <option value="custom">Custom interval</option>
                    </select>
                </div>
                {timeRange === 'custom' && (
                    <div className={ToolsStyles.filterGroup}>
                        <label className={ToolsStyles.filterLabel} htmlFor="customMinutes">Past minutes</label>
                        <input
                            id="customMinutes"
                            type="number"
                            min="1"
                            max="1440"
                            value={customMinutes}
                            onChange={(e) => setCustomMinutes(e.target.value)}
                            className={ToolsStyles.filterSelect}
                        />
                    </div>
                )}
            </div>
        </header>
    );
}
