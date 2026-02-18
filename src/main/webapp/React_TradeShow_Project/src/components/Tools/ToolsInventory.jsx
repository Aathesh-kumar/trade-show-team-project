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

const PAGE_SIZE = 10;

export default function ToolsInventory({ selectedServer }) {
    const [selectedTool, setSelectedTool] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [timeRange, setTimeRange] = useState('current');
    const [customMinutes, setCustomMinutes] = useState(10);
    const [isTestOpen, setIsTestOpen] = useState(false);
    const [page, setPage] = useState(1);

    const serverId = selectedServer?.serverId;
    const timeWindowMinutes = useMemo(() => {
        if (timeRange === 'custom') {
            return Math.min(24 * 60, Math.max(1, Number(customMinutes) || 10));
        }
        const map = { current: 0, '1m': 1, '10m': 10, '1h': 60, '2h': 120, '24h': 1440 };
        return map[timeRange] || 0;
    }, [timeRange, customMinutes]);

    const { data: tools = [], loading, error, refetch } = useGet('/tool/all', {
        immediate: !!serverId,
        params: { serverId, includeInactive: timeRange !== 'current' },
        dependencies: [serverId, timeRange]
    });

    const { data: intervalLogs } = useGet('/request-log', {
        immediate: !!serverId && timeRange !== 'current',
        params: {
            serverId,
            hours: Number((Math.max(1, timeWindowMinutes) / 60).toFixed(2)),
            limit: 300
        },
        dependencies: [serverId, timeRange, timeWindowMinutes]
    });

    const {execute: refreshTools, loading: refreshing } = usePost(buildUrl('/tool/refresh'));

    const mappedTools = useMemo(() => (tools || []).map((tool) => ({
        ...tool,
        id: tool.toolId && tool.toolId > 0 ? `tool-${tool.toolId}` : `tool-${tool.toolName}-${tool.serverId}`,
        name: tool.toolName,
        type: tool.toolType || 'ACTION',
        description: tool.toolDescription || 'No description',
        status: tool.isAvailability ? 'Active' : 'Inactive',
        latency: tool.lastLatencyMs != null ? `${tool.lastLatencyMs}ms` : 'N/A',
        jsonSchema: tool.inputSchema ? tryParse(tool.inputSchema) : { type: 'object', properties: {} },
        successRate: tool.totalRequests > 0
            ? ((tool.successRequests / tool.totalRequests) * 100).toFixed(1)
            : '0.0'
    })), [tools]);

    const timeFilteredTools = mappedTools;

    const historicalTools = useMemo(() => {
        if (timeRange === 'current') {
            return [];
        }
        const logs = Array.isArray(intervalLogs?.logs) ? intervalLogs.logs : [];
        const existing = new Set(timeFilteredTools.map((tool) => tool.name));
        const seen = new Set();

        return logs
            .map((row) => row.toolName)
            .filter(Boolean)
            .filter((toolName) => !existing.has(toolName))
            .filter((toolName) => {
                if (seen.has(toolName)) {
                    return false;
                }
                seen.add(toolName);
                return true;
            })
            .map((toolName) => ({
                id: `history-${toolName}`,
                name: toolName,
                type: 'ACTION',
                description: `Observed in ${timeWindowMinutes} minute window request logs`,
                status: 'Inactive',
                isAvailability: false,
                latency: 'N/A',
                jsonSchema: { type: 'object', properties: {} },
                successRate: '0.0',
                isHistorical: true
            }));
    }, [intervalLogs, timeFilteredTools, timeRange, timeWindowMinutes]);

    const inventoryTools = useMemo(() => [...timeFilteredTools, ...historicalTools], [timeFilteredTools, historicalTools]);

    const filteredTools = inventoryTools.filter((tool) => {
        const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterType === 'all' || tool.type.toLowerCase() === filterType.toLowerCase();
        return matchesSearch && matchesFilter;
    });

    const totalPages = Math.max(1, Math.ceil(filteredTools.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pagedTools = filteredTools.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const stats = {
        totalTools: inventoryTools.filter((t) => t.type === 'ACTION').length,
        totalResources: inventoryTools.filter((t) => t.type !== 'ACTION').length
    };
    const handleRefresh = async () => {
        if (!serverId) {
            return; 
        }
        await refreshTools({ serverId });
        refetch();
        window.dispatchEvent(new CustomEvent('pulse24x7-request-log-refresh', {
            detail: { serverId, reason: 'tools_refresh' }
        }));
        window.dispatchEvent(new CustomEvent('pulse24x7-notification-refresh'));
    };

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
                setSearchQuery={(value) => {
                    setSearchQuery(value);
                    setPage(1);
                }}
                filterType={filterType}
                setFilterType={(value) => {
                    setFilterType(value);
                    setPage(1);
                }}
                timeRange={timeRange}
                setTimeRange={(value) => {
                    setTimeRange(value);
                    setPage(1);
                }}
                customMinutes={customMinutes}
                setCustomMinutes={setCustomMinutes}
                onRefresh={handleRefresh}
                refreshing={refreshing}
            />

            {error && (
                <div className={ToolsStyles.submitError}>
                    Failed to load tools: {error}
                </div>
            )}

            <div className={ToolsStyles.toolsContent}>
                <div className={ToolsStyles.toolsMainColumn}>
                    <ToolsTable
                        tools={pagedTools}
                        selectedTool={selectedTool}
                        onSelectTool={setSelectedTool}
                        loading={loading}
                    />
                    <PaginationControls
                        page={safePage}
                        totalPages={totalPages}
                        totalItems={filteredTools.length}
                        pageSize={PAGE_SIZE}
                        onPageChange={setPage}
                        className={ToolsStyles.paginationBar}
                    />
                </div>

                {selectedTool && (
                    <ToolDefinitionPanel
                        tool={selectedTool}
                        onClose={() => setSelectedTool(null)}
                        onTest={() => setIsTestOpen(true)}
                    />
                )}
            </div>

            <ToolsFooter
                activeServer={selectedServer}
                updatedAt={new Date()}
            />

            {isTestOpen && selectedTool && (
                <TestToolModal
                    tool={selectedTool}
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
