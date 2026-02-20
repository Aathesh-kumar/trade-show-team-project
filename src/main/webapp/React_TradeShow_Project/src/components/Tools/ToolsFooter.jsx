import ToolsStyles from '../../styles/Tools.module.css';

export default function ToolsFooter({ activeServer, updatedAt }) {
    const updatedText = typeof updatedAt === 'string'
        ? updatedAt
        : (updatedAt?.toLocaleTimeString?.() || '-');
    return (
        <footer className={ToolsStyles.toolsFooter}>
            <div className={ToolsStyles.footerLeft}>
                <div className={ToolsStyles.footerStatus}>
                    <span className={ToolsStyles.footerDot}></span>
                    Inventory Synchronized
                </div>
                <span className={ToolsStyles.footerDivider}>|</span>
                <span className={ToolsStyles.footerTime}>Last Updated: {updatedText}</span>
            </div>
            <div className={ToolsStyles.footerRight}>
                <span className={ToolsStyles.footerLabel}>Active Server:</span>
                <span className={ToolsStyles.footerServer}>{activeServer?.serverName || 'None'}</span>
                <span className={ToolsStyles.footerVersion}>{activeServer?.serverId ? `#${activeServer.serverId}` : '-'}</span>
            </div>
        </footer>
    );
}
