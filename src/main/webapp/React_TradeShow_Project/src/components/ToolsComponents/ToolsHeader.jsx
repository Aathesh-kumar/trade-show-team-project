import ToolsStyles from '../../styles/Tools.module.css';
import { MdSearch, MdAdd } from 'react-icons/md';

export default function ToolsHeader({ stats, searchQuery, setSearchQuery, filterType, setFilterType }) {
    return (
        <header className={ToolsStyles.toolsHeader}>
            <div className={ToolsStyles.headerTop}>
                <div className={ToolsStyles.headerTitle}>
                    <h1>Tools Inventory</h1>
                    <div className={ToolsStyles.headerStats}>
                        <span className={ToolsStyles.statBadge}>
                            <span className={ToolsStyles.statDot} style={{ backgroundColor: '#3B82F6' }}></span>
                            {stats.totalTools} Tools
                        </span>
                        <span className={ToolsStyles.statBadge}>
                            <span className={ToolsStyles.statDot} style={{ backgroundColor: '#10B981' }}></span>
                            {stats.totalResources} Resources
                        </span>
                    </div>
                </div>
                <button className={ToolsStyles.createBtn}>
                    <MdAdd />
                    Create New Tool
                </button>
            </div>

            <div className={ToolsStyles.headerControls}>
                <div className={ToolsStyles.searchBox}>
                    <MdSearch className={ToolsStyles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search by tool name or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={ToolsStyles.searchInput}
                    />
                </div>

                <div className={ToolsStyles.filterGroup}>
                    <button 
                        className={`${ToolsStyles.filterBtn} ${filterType === 'all' ? ToolsStyles.active : ''}`}
                        onClick={() => setFilterType('all')}
                    >
                        All Types
                    </button>
                    <button 
                        className={`${ToolsStyles.filterBtn} ${filterType === 'action' ? ToolsStyles.active : ''}`}
                        onClick={() => setFilterType('action')}
                    >
                        Recently Used
                    </button>
                </div>
            </div>
        </header>
    );
}