import AsideItem from "./AsideItem";
import AsideStyles from '../styles/Aside.module.css';
import { MdDashboard, MdListAlt, MdBuild, MdSettings } from "react-icons/md";
import { RiTerminalBoxFill } from "react-icons/ri";

export default function AsideBar({ isOpen, onToggle, currentPage, onNavigate }) {
    return (
        <>
            <aside className={`${AsideStyles.asideBar} ${isOpen ? AsideStyles.open : ''}`}>
                <div className={AsideStyles.asideHeader}>
                    <div className={AsideStyles.logo}>
                        <div className={AsideStyles.logoIcon}>
                            <RiTerminalBoxFill />
                        </div>
                        <h2 className={AsideStyles.logoText}>MCP Console</h2>
                    </div>
                </div>

                <div className={AsideStyles.asideFeature}>
                    <AsideItem
                        icon={<MdDashboard />}
                        active={currentPage === 'dashboard'}
                        onClick={() => onNavigate('dashboard')}
                    >
                        Dashboard
                    </AsideItem>
                    <AsideItem
                        icon={<MdListAlt />}
                        active={currentPage === 'logs'}
                        onClick={() => onNavigate('logs')}
                    >
                        Request Logs
                    </AsideItem>
                    <AsideItem
                        icon={<MdBuild />}
                        active={currentPage === 'tools'}
                        onClick={() => onNavigate('tools')}
                    >
                        Tools
                    </AsideItem>
                    <AsideItem icon={<MdSettings />}
                        active={currentPage === 'settings'}
                        onClick={() => onNavigate('settings')}
                    >Settings</AsideItem>
                </div>

                <div className={AsideStyles.serverStatus}>
                    <div className={AsideStyles.statusIndicator}>
                        <span className={AsideStyles.statusDot}></span>
                        <div className={AsideStyles.statusInfo}>
                            <p className={AsideStyles.statusLabel}>SERVER STATUS</p>
                            <p className={AsideStyles.statusServer}>mcp-server-v2</p>
                            <p className={AsideStyles.statusUptime}>Uptime: 14d 2h 12m</p>
                        </div>
                    </div>
                </div>

                <button className={AsideStyles.mobileToggle} onClick={onToggle}>
                    <MdDashboard />
                </button>
            </aside>
            {isOpen && <div className={AsideStyles.overlay} onClick={onToggle}></div>}
        </>
    );
}