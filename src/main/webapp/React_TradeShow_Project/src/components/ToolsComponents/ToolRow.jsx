import ToolsStyles from '../../styles/Tools.module.css';
import { MdCloud, MdDescription, MdEmail, MdStorage, } from 'react-icons/md';

export default function ToolRow({ tool, isSelected, onSelect }) {
    const getTypeColor = (type) => {
        return type === 'ACTION' ? '#3B82F6' : '#10B981';
    };

    const getTypeIcon = (name) => {
        const icons = {
            'get_weather': <MdCloud/>,
            'search_docs': <MdDescription/>,
            'send_email': <MdEmail/>,
            'db_connector': <MdStorage/>
        };
        return icons[name] || '🔧';
    };

    return (
        <tr 
            className={`${ToolsStyles.toolRow} ${isSelected ? ToolsStyles.selected : ''}`}
            onClick={() => onSelect(tool)}
        >
            <td>
                <div className={ToolsStyles.toolName}>
                    <span className={ToolsStyles.toolIcon}>{getTypeIcon(tool.name)}</span>
                    <span className={ToolsStyles.toolNameText}>{tool.name}</span>
                </div>
            </td>
            <td>
                <span 
                    className={ToolsStyles.typeBadge}
                    style={{ 
                        backgroundColor: `${getTypeColor(tool.type)}20`,
                        color: getTypeColor(tool.type),
                        border: `1px solid ${getTypeColor(tool.type)}40`
                    }}
                >
                    {tool.type}
                </span>
            </td>
            <td>
                <span className={ToolsStyles.toolDescription}>{tool.description}</span>
            </td>
        </tr>
    );
}