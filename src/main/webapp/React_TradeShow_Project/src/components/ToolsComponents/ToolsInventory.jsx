import { useState } from 'react';
import ToolsStyles from '../../styles/Tools.module.css';
import ToolsHeader from './ToolsHeader';
import ToolsTable from './ToolsTable';
import ToolDefinitionPanel from './ToolDefinitionPanel';
import ToolsFooter from './ToolsFooter';

export default function ToolsInventory() {
    const [selectedTool, setSelectedTool] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');

    const tools = [
        {
            id: 1,
            name: 'get_weather',
            type: 'ACTION',
            description: 'Fetches current weather data for a specific location using the OpenWeather API bridge. Supports Celsius and Fahrenheit.',
            icon: '☁️',
            status: 'Active',
            latency: '124ms',
            jsonSchema: {
                name: "get_weather",
                description: "Fetch current weather",
                parameters: {
                    type: "object",
                    properties: {
                        location: {
                            type: "string"
                        },
                        unit: {
                            type: "string",
                            enum: ["c", "f"]
                        }
                    },
                    required: ["location"]
                }
            }
        },
        {
            id: 2,
            name: 'search_docs',
            type: 'RESOURCE',
            description: 'Search internal documentation and technical resources using advanced semantic search.',
            icon: '📄',
            status: 'Active',
            latency: '210ms',
            jsonSchema: {
                name: "search_docs",
                description: "Search documentation",
                parameters: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string"
                        },
                        limit: {
                            type: "number",
                            default: 10
                        }
                    },
                    required: ["query"]
                }
            }
        },
        {
            id: 3,
            name: 'send_email',
            type: 'ACTION',
            description: 'Triggers email notifications via the SMTP gateway. Supports HTML templates and attachments.',
            icon: '✉️',
            status: 'Active',
            latency: '1.2s',
            jsonSchema: {
                name: "send_email",
                description: "Send email notification",
                parameters: {
                    type: "object",
                    properties: {
                        to: {
                            type: "string"
                        },
                        subject: {
                            type: "string"
                        },
                        body: {
                            type: "string"
                        }
                    },
                    required: ["to", "subject", "body"]
                }
            }
        },
        {
            id: 4,
            name: 'db_connector',
            type: 'RESOURCE',
            description: 'Read-only access to the primary PostgreSQL database for analytics and reporting queries.',
            icon: '🗄️',
            status: 'Active',
            latency: '89ms',
            jsonSchema: {
                name: "db_connector",
                description: "Query database",
                parameters: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string"
                        },
                        database: {
                            type: "string",
                            enum: ["analytics", "production"]
                        }
                    },
                    required: ["query"]
                }
            }
        }
    ];

    const filteredTools = tools.filter(tool => {
        const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterType === 'all' || tool.type.toLowerCase() === filterType.toLowerCase();
        return matchesSearch && matchesFilter;
    });

    const stats = {
        totalTools: tools.filter(t => t.type === 'ACTION').length,
        totalResources: tools.filter(t => t.type === 'RESOURCE').length
    };

    return (
        <div className={ToolsStyles.toolsInventory}>
            <ToolsHeader 
                stats={stats}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterType={filterType}
                setFilterType={setFilterType}
            />

            <div className={ToolsStyles.toolsContent}>
                <ToolsTable 
                    tools={filteredTools}
                    selectedTool={selectedTool}
                    onSelectTool={setSelectedTool}
                />

                {selectedTool && (
                    <ToolDefinitionPanel 
                        tool={selectedTool}
                        onClose={() => setSelectedTool(null)}
                    />
                )}
            </div>

            <ToolsFooter />
        </div>
    );
}