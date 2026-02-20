import ToolsStyles from '../../styles/Tools.module.css';
import ToolRow from './ToolRow';
import LoadingSkeleton from '../Loading/LoadingSkeleton';

export default function ToolsTable({ tools, selectedTool, onSelectTool, loading }) {
    const showSkeleton = Boolean(loading);
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
                    {showSkeleton && (
                        <tr>
                            <td colSpan="3">
                                <LoadingSkeleton type="table" lines={6} />
                            </td>
                        </tr>
                    )}
                    {!showSkeleton && tools.map(tool => (
                        <ToolRow
                            key={tool.id}
                            tool={tool}
                            isSelected={selectedTool?.id === tool.id}
                            onSelect={onSelectTool}
                        />
                    ))}
                </tbody>
            </table>

            {!showSkeleton && tools.length === 0 && (
                <div className={ToolsStyles.emptyState}>
                    <p>No tools found matching your search criteria.</p>
                </div>
            )}
        </div>
    );
}
