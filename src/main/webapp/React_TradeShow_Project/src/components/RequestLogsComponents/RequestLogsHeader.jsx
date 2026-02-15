import RequestLogsStyles from '../../styles/RequestLogs.module.css';

export default function RequestLogsHeader({
    servers,
    selectedServerId,
    onServerChange,
    toolNames,
    selectedToolId,
    onToolChange,
    selectedStatusCode,
    onStatusChange,
    timeRange,
    onTimeRangeChange,
    searchQuery,
    onSearchChange,
    successCount,
    errorCount,
    totalCount,
    onExport
}) {
    return (
        <div className={RequestLogsStyles.header}>
            <div className={RequestLogsStyles.headerTop}>
                <div>
                    <h1>Request Logs</h1>
                    <p className={RequestLogsStyles.subtitle}>
                        Monitor and analyze API requests across your MCP tools
                    </p>
                </div>

                <button 
                    className={RequestLogsStyles.exportBtn}
                    onClick={onExport}
                    disabled={totalCount === 0}
                >
                    📥 Export
                </button>
            </div>

            {/* Search Bar */}
            <div className={RequestLogsStyles.searchBar}>
                <input
                    type="text"
                    placeholder="Search by endpoint, tool, method, or status..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className={RequestLogsStyles.searchInput}
                />
            </div>

            {/* Filters */}
            <div className={RequestLogsStyles.filters}>
                {/* Server Filter */}
                <div className={RequestLogsStyles.filterGroup}>
                    <label>Server:</label>
                    <select
                        value={selectedServerId || ''}
                        onChange={(e) => onServerChange(e.target.value ? parseInt(e.target.value) : null)}
                        className={RequestLogsStyles.filterSelect}
                    >
                        {servers.map(server => (
                            <option key={server.serverId} value={server.serverId}>
                                {server.serverName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Tool Filter - Dynamic from backend */}
                <div className={RequestLogsStyles.filterGroup}>
                    <label>Tool:</label>
                    <select
                        value={selectedToolId || ''}
                        onChange={(e) => onToolChange(e.target.value ? parseInt(e.target.value) : null)}
                        className={RequestLogsStyles.filterSelect}
                    >
                        <option value="">All Tools</option>
                        {toolNames.map((toolName, index) => (
                            <option key={index} value={index}>
                                {toolName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status Code Filter */}
                <div className={RequestLogsStyles.filterGroup}>
                    <label>Status:</label>
                    <select
                        value={selectedStatusCode || ''}
                        onChange={(e) => onStatusChange(e.target.value ? parseInt(e.target.value) : null)}
                        className={RequestLogsStyles.filterSelect}
                    >
                        <option value="">All Status</option>
                        <option value="200">200 - OK</option>
                        <option value="201">201 - Created</option>
                        <option value="400">400 - Bad Request</option>
                        <option value="404">404 - Not Found</option>
                        <option value="500">500 - Server Error</option>
                    </select>
                </div>

                {/* Time Range Filter */}
                <div className={RequestLogsStyles.filterGroup}>
                    <label>Time Range:</label>
                    <select
                        value={timeRange}
                        onChange={(e) => onTimeRangeChange(parseInt(e.target.value))}
                        className={RequestLogsStyles.filterSelect}
                    >
                        <option value="1">Last Hour</option>
                        <option value="6">Last 6 Hours</option>
                        <option value="24">Last 24 Hours</option>
                        <option value="168">Last 7 Days</option>
                        <option value="720">Last 30 Days</option>
                    </select>
                </div>
            </div>

            {/* Statistics */}
            <div className={RequestLogsStyles.stats}>
                <div className={RequestLogsStyles.statItem}>
                    <span className={RequestLogsStyles.statLabel}>Total:</span>
                    <span className={RequestLogsStyles.statValue}>{totalCount}</span>
                </div>
                <div className={RequestLogsStyles.statItem}>
                    <span className={RequestLogsStyles.statLabel}>Success:</span>
                    <span className={`${RequestLogsStyles.statValue} ${RequestLogsStyles.statSuccess}`}>
                        {successCount}
                    </span>
                </div>
                <div className={RequestLogsStyles.statItem}>
                    <span className={RequestLogsStyles.statLabel}>Errors:</span>
                    <span className={`${RequestLogsStyles.statValue} ${RequestLogsStyles.statError}`}>
                        {errorCount}
                    </span>
                </div>
            </div>
        </div>
    );
}