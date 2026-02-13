import RequestLogsStyles from '../../styles/RequestLogs.module.css';
import { MdSearch, MdFileDownload, MdHistory } from 'react-icons/md';
import { useState } from 'react';

export default function RequestLogsHeader({ filters, onFilterChange, stats }) {
    const [viewMode, setViewMode] = useState('real-time');

    const handleSearchChange = (e) => {
        onFilterChange({
            ...filters,
            search: e.target.value
        });
    };

    const handleStatusChange = (status) => {
        onFilterChange({
            ...filters,
            status: status
        });
    };

    const handleToolChange = (tool) => {
        onFilterChange({
            ...filters,
            tool: tool
        });
    };

    const handleTimeRangeChange = (timeRange) => {
        onFilterChange({
            ...filters,
            timeRange: timeRange
        });
    };

    return (
        <header className={RequestLogsStyles.logsHeader}>
            <div className={RequestLogsStyles.headerTop}>
                <div className={RequestLogsStyles.headerTitle}>
                    <h1>Request Logs</h1>
                    <div className={RequestLogsStyles.statsGroup}>
                        <div className={RequestLogsStyles.statBadge}>
                            <span className={RequestLogsStyles.successDot}></span>
                            {stats.totalSuccess.toLocaleString()} Success
                        </div>
                        <div className={RequestLogsStyles.statBadge}>
                            <span className={RequestLogsStyles.errorDot}></span>
                            {stats.totalErrors} Errors
                        </div>
                    </div>
                </div>

                <div className={RequestLogsStyles.headerActions}>
                    <div className={RequestLogsStyles.viewToggle}>
                        <button 
                            className={`${RequestLogsStyles.toggleBtn} ${viewMode === 'real-time' ? RequestLogsStyles.active : ''}`}
                            onClick={() => setViewMode('real-time')}
                        >
                            Real-time
                        </button>
                        <button 
                            className={`${RequestLogsStyles.toggleBtn} ${viewMode === 'history' ? RequestLogsStyles.active : ''}`}
                            onClick={() => setViewMode('history')}
                        >
                            <MdHistory /> History
                        </button>
                    </div>

                    <button className={RequestLogsStyles.exportBtn}>
                        <MdFileDownload />
                        Export
                    </button>
                </div>
            </div>

            <div className={RequestLogsStyles.headerControls}>
                <div className={RequestLogsStyles.searchBox}>
                    <MdSearch className={RequestLogsStyles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search by tool name, request ID, or status..."
                        value={filters.search}
                        onChange={handleSearchChange}
                        className={RequestLogsStyles.searchInput}
                    />
                </div>

                <div className={RequestLogsStyles.filterGroup}>
                    <select 
                        value={filters.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className={RequestLogsStyles.filterSelect}
                    >
                        <option value="all">All Status</option>
                        <option value="success">Success</option>
                        <option value="error">Error</option>
                        <option value="warning">Warning</option>
                    </select>

                    <select 
                        value={filters.tool}
                        onChange={(e) => handleToolChange(e.target.value)}
                        className={RequestLogsStyles.filterSelect}
                    >
                        <option value="all">All Tools</option>
                        <option value="get_weather">get_weather</option>
                        <option value="search_docs">search_docs</option>
                        <option value="send_email">send_email</option>
                    </select>

                    <select 
                        value={filters.timeRange}
                        onChange={(e) => handleTimeRangeChange(e.target.value)}
                        className={RequestLogsStyles.filterSelect}
                    >
                        <option value="last-15-minutes">Last 15 minutes</option>
                        <option value="last-hour">Last hour</option>
                        <option value="last-24-hours">Last 24 hours</option>
                        <option value="last-7-days">Last 7 days</option>
                    </select>
                </div>
            </div>
        </header>
    );
}