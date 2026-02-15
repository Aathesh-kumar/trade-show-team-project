import { useState, useEffect } from 'react';
import { useGet } from '../customUtilHooks/useGet';
import { ENDPOINTS } from '../config/api';
import ToolsStyles from '../../styles/Tools.module.css';
import LoadingSkeleton from '../LoadingComponents/LoadingSkeleton';

export default function ToolsInventory() {
    const [selectedServerId, setSelectedServerId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterActive, setFilterActive] = useState('all'); // 'all', 'active', 'inactive'

    // Fetch all servers
    const { data: serversData } = useGet(ENDPOINTS.SERVERS_ALL);
    const servers = serversData?.data || [];

    // Select first server by default
    useEffect(() => {
        if (!selectedServerId && servers.length > 0) {
            setSelectedServerId(servers[0].serverId);
        }
    }, [servers, selectedServerId]);

    // Fetch tools for selected server
    const { data: toolsData, loading, error } = useGet(
        selectedServerId ? ENDPOINTS.TOOLS_BY_SERVER(selectedServerId) : null
    );

    const tools = toolsData?.data || [];

    // Filter tools
    const filteredTools = tools.filter(tool => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                tool.toolName?.toLowerCase().includes(query) ||
                tool.toolDescription?.toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }

        // Active/Inactive filter
        if (filterActive === 'active' && !tool.isAvailability) return false;
        if (filterActive === 'inactive' && tool.isAvailability) return false;

        return true;
    });

    const activeCount = tools.filter(t => t.isAvailability).length;
    const inactiveCount = tools.filter(t => !t.isAvailability).length;

    if (!selectedServerId && servers.length === 0) {
        return (
            <div className={ToolsStyles.container}>
                <div className={ToolsStyles.emptyState}>
                    <p>🔧 No servers configured yet</p>
                    <p>Add a server to view its tools</p>
                </div>
            </div>
        );
    }

    return (
        <div className={ToolsStyles.container}>
            {/* Header */}
            <div className={ToolsStyles.header}>
                <div>
                    <h1>Tools Inventory</h1>
                    <p className={ToolsStyles.subtitle}>
                        Manage and monitor all MCP tools across your servers
                    </p>
                </div>

                {/* Server Selector */}
                {servers.length > 0 && (
                    <div className={ToolsStyles.serverSelector}>
                        <label>Server:</label>
                        <select
                            value={selectedServerId || ''}
                            onChange={(e) => setSelectedServerId(parseInt(e.target.value))}
                            className={ToolsStyles.serverDropdown}
                        >
                            {servers.map(server => (
                                <option key={server.serverId} value={server.serverId}>
                                    {server.serverName}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Search and Filters */}
            <div className={ToolsStyles.controls}>
                <div className={ToolsStyles.searchBar}>
                    <input
                        type="text"
                        placeholder="Search tools by name or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={ToolsStyles.searchInput}
                    />
                </div>

                <div className={ToolsStyles.filterButtons}>
                    <button
                        className={`${ToolsStyles.filterBtn} ${filterActive === 'all' ? ToolsStyles.active : ''}`}
                        onClick={() => setFilterActive('all')}
                    >
                        All ({tools.length})
                    </button>
                    <button
                        className={`${ToolsStyles.filterBtn} ${filterActive === 'active' ? ToolsStyles.active : ''}`}
                        onClick={() => setFilterActive('active')}
                    >
                        Active ({activeCount})
                    </button>
                    <button
                        className={`${ToolsStyles.filterBtn} ${filterActive === 'inactive' ? ToolsStyles.active : ''}`}
                        onClick={() => setFilterActive('inactive')}
                    >
                        Inactive ({inactiveCount})
                    </button>
                </div>
            </div>

            {/* Tools Grid */}
            <div className={ToolsStyles.toolsGrid}>
                {loading ? (
                    <LoadingSkeleton type="card" lines={3} count={6} />
                ) : error ? (
                    <div className={ToolsStyles.error}>
                        <p>⚠️ Error loading tools: {error}</p>
                    </div>
                ) : filteredTools.length === 0 ? (
                    <div className={ToolsStyles.empty}>
                        <p>🔧 No tools found</p>
                        <small>
                            {searchQuery ? 'Try adjusting your search' : 'No tools available for this server'}
                        </small>
                    </div>
                ) : (
                    filteredTools.map(tool => (
                        <div key={tool.toolId} className={ToolsStyles.toolCard}>
                            <div className={ToolsStyles.toolHeader}>
                                <h3 className={ToolsStyles.toolName}>{tool.toolName}</h3>
                                <span className={`${ToolsStyles.statusBadge} ${tool.isAvailability ? ToolsStyles.statusActive : ToolsStyles.statusInactive
                                    }`}>
                                    {tool.isAvailability ? '✓ Active' : '⊗ Inactive'}
                                </span>
                            </div>

                            <p className={ToolsStyles.toolDescription}>
                                {tool.toolDescription || 'No description available'}
                            </p>

                            <div className={ToolsStyles.toolMeta}>
                                <div className={ToolsStyles.metaItem}>
                                    <span className={ToolsStyles.metaLabel}>Tool ID:</span>
                                    <span className={ToolsStyles.metaValue}>{tool.toolId}</span>
                                </div>
                                <div className={ToolsStyles.metaItem}>
                                    <span className={ToolsStyles.metaLabel}>Server ID:</span>
                                    <span className={ToolsStyles.metaValue}>{tool.serverId}</span>
                                </div>
                            </div>

                            <div className={ToolsStyles.toolActions}>
                                <button className={ToolsStyles.actionBtn}>
                                    📊 View Stats
                                </button>
                                <button className={ToolsStyles.actionBtn}>
                                    📝 View Logs
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}