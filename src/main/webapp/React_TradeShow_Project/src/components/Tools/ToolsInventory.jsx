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

export default function ToolsInventory({ selectedServer }) {
    const [selectedTool, setSelectedTool] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [timeRange, setTimeRange] = useState('current');
    const [customMinutes, setCustomMinutes] = useState(10);
    const [isTestOpen, setIsTestOpen] = useState(false);

    const serverId = selectedServer?.serverId;
    const queryParams = useMemo(() => {
        const params = { serverId };
        if (timeRange === 'current') {
            params.includeInactive = false;
            return params;
        }

        params.includeInactive = true;
        if (timeRange === 'custom') {
            const safeMinutes = Math.min(24 * 60, Math.max(1, Number(customMinutes) || 10));
            params.hours = Number((safeMinutes / 60).toFixed(2));
        } else {
            const map = { '1m': Number((1 / 60).toFixed(2)), '10m': Number((10 / 60).toFixed(2)), '1h': 1, '2h': 2, '24h': 24 };
            params.hours = map[timeRange] || 1;
        }
        return params;
    }, [serverId, timeRange, customMinutes]);

    const { data: tools = [], loading, error, refetch } = useGet('/tool/all', {
        immediate: !!serverId,
        params: queryParams,
        dependencies: [serverId, timeRange, customMinutes]
    });
    const { data: intervalLogs } = useGet('/request-log', {
        immediate: !!serverId && timeRange !== 'current',
        params: {
            serverId,
            hours: queryParams.hours || 1,
            limit: 500
        },
        dependencies: [serverId, timeRange, customMinutes]
    });

    const { execute: refreshTools, loading: refreshing } = usePost(buildUrl('/tool/refresh'));

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

    const historicalTools = useMemo(() => {
        if (timeRange === 'current') {
            return [];
        }
        const logs = Array.isArray(intervalLogs?.logs) ? intervalLogs.logs : [];
        const existing = new Set(mappedTools.map((tool) => tool.name));
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
                description: `Observed in ${timeRange === 'custom' ? `past ${Math.min(24 * 60, Math.max(1, Number(customMinutes) || 10))} minutes` : 'selected interval'} request logs`,
                status: 'Inactive',
                isAvailability: false,
                latency: 'N/A',
                jsonSchema: { type: 'object', properties: {} },
                successRate: '0.0',
                isHistorical: true
            }));
    }, [intervalLogs, mappedTools, timeRange, customMinutes]);

    const inventoryTools = useMemo(() => [...mappedTools, ...historicalTools], [mappedTools, historicalTools]);

    const filteredTools = inventoryTools.filter((tool) => {
        const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterType === 'all' || tool.type.toLowerCase() === filterType.toLowerCase();
        return matchesSearch && matchesFilter;
    });

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
                setSearchQuery={setSearchQuery}
                filterType={filterType}
                setFilterType={setFilterType}
                timeRange={timeRange}
                setTimeRange={setTimeRange}
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
                <ToolsTable
                    tools={filteredTools}
                    selectedTool={selectedTool}
                    onSelectTool={setSelectedTool}
                    loading={loading}
                />

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
    } catch (_error) {
        return { type: 'object', raw };
    }
}
