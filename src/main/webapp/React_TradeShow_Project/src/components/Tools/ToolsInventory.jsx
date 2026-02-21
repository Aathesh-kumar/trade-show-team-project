import { useMemo, useState } from 'react';
import ToolsStyles from '../../styles/Tools.module.css';
import ToolsHeader from './ToolsHeader';
import ToolsTable from './ToolsTable';
import ToolDefinitionPanel from './ToolDefinitionPanel';
import ToolsFooter from './ToolsFooter';
import TestToolModal from './TestToolModal';
import { useGet } from '../Hooks/useGet';
import { usePost } from '../Hooks/usePost';
import { buildUrl } from '../../services/api';
import PaginationControls from '../Common/PaginationControls';
import useBufferedLoading from '../Hooks/useBufferedLoading';

export default function ToolsInventory({ selectedServer }) {
    const [selectedTool, setSelectedTool] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [timeRange, setTimeRange] = useState('current');
    const [customMinutes, setCustomMinutes] = useState(10);
    const [isTestOpen, setIsTestOpen] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 12;

    const serverId = selectedServer?.serverId;
    const queryParams = useMemo(() => {
        const params = { serverId };
        params.includeInactive = true;
        if (timeRange === 'custom') {
            const safeMinutes = Math.min(24 * 60, Math.max(1, Number(customMinutes) || 10));
            params.minutes = safeMinutes;
        } else if (timeRange === '1m') {
            params.minutes = 1;
        } else if (timeRange === '10m') {
            params.minutes = 10;
        } else {
            const map = { '1h': 1, '2h': 2, '24h': 24 };
            params.hours = map[timeRange] || 1;
        }
        return params;
    }, [serverId, timeRange, customMinutes]);

    const {
        data: currentTools = [],
        loading: loadingCurrent,
        error: currentError,
        refetch: refetchCurrent
    } = useGet('/tool/all', {
        immediate: !!serverId && timeRange === 'current',
        params: { serverId, includeInactive: false, limit: 250 },
        dependencies: [serverId, timeRange]
    });

    const {
        data: historyTools = [],
        loading: loadingHistory,
        error: historyError,
        refetch: refetchHistory
    } = useGet('/tool/history-window', {
        immediate: !!serverId && timeRange !== 'current',
        params: { ...queryParams, limit: 250 },
        dependencies: [serverId, timeRange, customMinutes]
    });
    const tools = timeRange === 'current' ? currentTools : historyTools;
    const loading = loadingCurrent || loadingHistory;
    const error = currentError || historyError;
    const refetch = timeRange === 'current' ? refetchCurrent : refetchHistory;
    const bufferedLoading = useBufferedLoading(loading, 1500);

    const { execute: refreshTools, loading: refreshing } = usePost(buildUrl('/tool/refresh'));

    const mappedTools = useMemo(() => (tools || []).map((tool) => {
        const historicalView = timeRange !== 'current';
        const availability = historicalView ? true : Boolean(tool.isAvailability);
        return {
        ...tool,
        isAvailability: availability,
        id: tool.toolId && tool.toolId > 0 ? `tool-${tool.toolId}` : `tool-${tool.toolName}-${tool.serverId}`,
        name: tool.toolName,
        type: tool.toolType || 'ACTION',
        description: tool.toolDescription || 'No description',
        status: availability ? 'Active' : 'Inactive',
        latency: tool.lastLatencyMs != null ? `${tool.lastLatencyMs}ms` : 'N/A',
        jsonSchema: tool.inputSchema ? tryParse(tool.inputSchema) : { type: 'object', properties: {} },
        successRate: tool.totalRequests > 0
            ? ((tool.successRequests / tool.totalRequests) * 100).toFixed(1)
            : '0.0'
    }}), [tools, timeRange]);

    const filteredTools = mappedTools.filter((tool) => {
        const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterType === 'all' || tool.type.toLowerCase() === filterType.toLowerCase();
        return matchesSearch && matchesFilter;
    });
    const totalItems = filteredTools.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const pagedTools = filteredTools.slice((page - 1) * pageSize, page * pageSize);

    const stats = useMemo(() => {
        const totalTools = filteredTools.filter((t) => t.type === 'ACTION').length;
        const totalResources = filteredTools.filter((t) => t.type !== 'ACTION').length;
        return { totalTools, totalResources };
    }, [filteredTools]);

    const handleRefresh = async () => {
        if (!serverId) {
            return;
        }
        await refreshTools({ serverId });
        refetch();
    };
    const handleSearchChange = (value) => {
        setSearchQuery(value);
        setPage(1);
    };

    const handleFilterTypeChange = (value) => {
        setFilterType(value);
        setPage(1);
    };

    const handleTimeRangeChange = (value) => {
        setTimeRange(value);
        setPage(1);
    };

    const handleCustomMinutesChange = (value) => {
        setCustomMinutes(value);
        setPage(1);
    };

    const resolvedSelectedTool = selectedTool && mappedTools.some((tool) => tool.id === selectedTool.id)
        ? selectedTool
        : null;

    if (!serverId) {
        return (
            <div className={ToolsStyles.toolsInventory}>
                <div className={ToolsStyles.emptyState}>
                    <p>Select or configure a Pulse24x7 server to load tools.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={ToolsStyles.toolsInventory}>
            <ToolsHeader
                stats={stats}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                filterType={filterType}
                onFilterTypeChange={handleFilterTypeChange}
                timeRange={timeRange}
                onTimeRangeChange={handleTimeRangeChange}
                customMinutes={customMinutes}
                onCustomMinutesChange={handleCustomMinutesChange}
                onRefresh={handleRefresh}
                refreshing={refreshing}
            />

            {error && (
                <div className={ToolsStyles.submitError}>
                    Failed to load tools: {error}
                </div>
            )}

            <div className={ToolsStyles.toolsContent}>
                <ToolsTable
                    tools={bufferedLoading ? [] : pagedTools}
                    selectedTool={resolvedSelectedTool}
                    onSelectTool={setSelectedTool}
                    loading={bufferedLoading}
                />

                {resolvedSelectedTool && (
                    <ToolDefinitionPanel
                        tool={resolvedSelectedTool}
                        onClose={() => setSelectedTool(null)}
                        onTest={() => setIsTestOpen(true)}
                    />
                )}
            </div>

            <PaginationControls
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                totalPages={totalPages}
                onPageChange={setPage}
            />

            <ToolsFooter
                activeServer={selectedServer}
                updatedAt={new Date()}
            />

            {isTestOpen && resolvedSelectedTool && (
                <TestToolModal
                    tool={resolvedSelectedTool}
                    serverId={serverId}
                    onClose={() => setIsTestOpen(false)}
                    onCompleted={refetch}
                />
            )}
        </div>
    );
}

function tryParse(raw) {
    try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
        return { type: 'object', raw };
    }
}
