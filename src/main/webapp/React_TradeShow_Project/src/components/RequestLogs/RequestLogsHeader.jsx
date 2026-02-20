import RequestLogsStyles from '../../styles/RequestLogs.module.css';
import { MdSearch, MdFileDownload } from 'react-icons/md';
import CustomDropdown from '../Common/CustomDropdown';

export default function RequestLogsHeader({ filters, onFilterChange, stats, toolOptions = [] }) {
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
                    <CustomDropdown
                        value={filters.status}
                        onChange={handleStatusChange}
                        options={[
                            { value: 'all', label: 'All Status' },
                            { value: 'success', label: 'Success' },
                            { value: 'error', label: 'Error' },
                            { value: 'warning', label: 'Warning' }
                        ]}
                        buttonClassName={RequestLogsStyles.filterSelect}
                    />

                    <CustomDropdown
                        value={filters.tool}
                        onChange={handleToolChange}
                        options={[
                            { value: 'all', label: 'All Tools' },
                            ...toolOptions.map((toolName) => ({ value: toolName, label: toolName }))
                        ]}
                        buttonClassName={RequestLogsStyles.filterSelect}
                    />

                    <CustomDropdown
                        value={filters.timeRange}
                        onChange={handleTimeRangeChange}
                        options={[
                            { value: 'last-15-minutes', label: 'Last 15 minutes' },
                            { value: 'last-hour', label: 'Last hour' },
                            { value: 'last-24-hours', label: 'Last 24 hours' },
                            { value: 'last-7-days', label: 'Last 7 days' }
                        ]}
                        buttonClassName={RequestLogsStyles.filterSelect}
                    />
                </div>
            </div>
        </header>
    );
}
