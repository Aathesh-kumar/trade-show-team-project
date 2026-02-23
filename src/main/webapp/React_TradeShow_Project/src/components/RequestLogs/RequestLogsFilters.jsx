import RequestLogsStyles from '../../styles/RequestLogs.module.css';
import CustomDropdown from '../Common/CustomDropdown';

export default function RequestLogsFilters({ filters, onFilterChange, toolOptions = [] }) {
    const handleStatusChange = (status) => {
        onFilterChange({
            ...filters,
            status
        });
    };

    const handleToolChange = (tool) => {
        onFilterChange({
            ...filters,
            tool
        });
    };

    const handleTimeRangeChange = (timeRange) => {
        onFilterChange({
            ...filters,
            timeRange
        });
    };

    return (
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
                    { value: 'last-7-days', label: 'Last 7 days' },
                    { value: 'all-time', label: 'All Time' }
                ]}
                buttonClassName={RequestLogsStyles.filterSelect}
            />
        </div>
    );
}
