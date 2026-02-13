import ToolsStyles from '../../styles/Tools.module.css';

export default function ToolsFooter() {
    return (
        <footer className={ToolsStyles.toolsFooter}>
            <div className={ToolsStyles.footerLeft}>
                <div className={ToolsStyles.footerStatus}>
                    <span className={ToolsStyles.footerDot}></span>
                    Inventory Synchronized
                </div>
                <span className={ToolsStyles.footerDivider}>|</span>
                <span className={ToolsStyles.footerTime}>Last Updated: 14:45:22</span>
            </div>
            <div className={ToolsStyles.footerRight}>
                <span className={ToolsStyles.footerLabel}>Active Server:</span>
                <span className={ToolsStyles.footerServer}>mcp-server-v2</span>
                <span className={ToolsStyles.footerVersion}>V1.2.4-stable</span>
            </div>
        </footer>
    );
}