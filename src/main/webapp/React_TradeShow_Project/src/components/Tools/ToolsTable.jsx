import ToolsStyles from '../../styles/Tools.module.css';
import ToolRow from './ToolRow';
import LoadingSpinner from '../Loading/LoadingSpinner';

export default function ToolsTable({ tools, selectedTool, onSelectTool, loading }) {
    return (
        <div className={ToolsStyles.tableContainer}>
            <table className={ToolsStyles.toolsTable}>
                <thead>
                    <tr>
                        <th>Tool Name</th>
                        <th>Type</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && (
                        <tr>
                            <td colSpan="3">
                                <LoadingSpinner size="small" text="Loading tools..." />
                            </td>
                        </tr>
                    )}
                    {tools.map(tool => (
                        <ToolRow
                            key={tool.id}
                            tool={tool}
                            isSelected={selectedTool?.id === tool.id}
                            onSelect={onSelectTool}
                        />
                    ))}
                </tbody>
            </table>

            {tools.length === 0 && (
                <div className={ToolsStyles.emptyState}>
                    <p>No tools found matching your search criteria.</p>
                </div>
            )}
        </div>
    );
}
