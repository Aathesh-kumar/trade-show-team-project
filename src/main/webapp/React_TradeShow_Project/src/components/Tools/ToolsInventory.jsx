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
    const [timeRange, setTimeRange] = useState('24h');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [isTestOpen, setIsTestOpen] = useState(false);

    const serverId = selectedServer?.serverId;
    const queryParams = useMemo(() => {
        const params = { serverId };
        if (timeRange === 'custom' && customStart && customEnd) {
            params.start = new Date(customStart).toISOString();
            params.end = new Date(customEnd).toISOString();
        } else {
            const map = { '1h': 1, '2h': 2, '4h': 4, '8h': 8, '24h': 24 };
            params.hours = map[timeRange] || 24;
        }
        return params;
    }, [serverId, timeRange, customStart, customEnd]);

    const { data: tools = [], loading, error, refetch } = useGet('/tool/all', {
        immediate: !!serverId,
        params: queryParams,
        dependencies: [serverId, timeRange, customStart, customEnd]
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

    const filteredTools = mappedTools.filter((tool) => {
        const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterType === 'all' || tool.type.toLowerCase() === filterType.toLowerCase();
        return matchesSearch && matchesFilter;
    });

    const stats = {
        totalTools: mappedTools.filter((t) => t.type === 'ACTION').length,
        totalResources: mappedTools.filter((t) => t.type !== 'ACTION').length
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
                    <p>Select or configure an MCP server to load tools.</p>
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
                customStart={customStart}
                customEnd={customEnd}
                setCustomStart={setCustomStart}
                setCustomEnd={setCustomEnd}
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
    } catch (e) {
        return { type: 'object', raw };
    }
}
