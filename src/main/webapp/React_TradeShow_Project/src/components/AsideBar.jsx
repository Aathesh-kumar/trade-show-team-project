import AsideItem from "./AsideItem";
import AsideStyles from '../styles/Aside.module.css';
import { MdDashboard, MdListAlt, MdBuild, MdSettings } from "react-icons/md";
import pulseLogo from '../assets/pulse24x7-logo.png';

export default function AsideBar({ isOpen, onToggle, currentPage, onNavigate, activeServer, onLogout }) {
    return (
        <>
            <aside className={`${AsideStyles.asideBar} ${isOpen ? AsideStyles.open : ''}`}>
                <div className={AsideStyles.asideHeader}>
                    <div className={AsideStyles.logo}>
                        <div className={AsideStyles.logoIcon}>
                            <img src={pulseLogo} alt="Pulse24x7 logo" />
                        </div>
                        <h2 className={AsideStyles.logoText}>Pulse24x7</h2>
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
                    <AsideItem
                        icon={<MdSettings />}
                        active={currentPage === 'settings'}
                        onClick={() => onNavigate('settings')}
                    >
                        Settings
                    </AsideItem>
                </div>

                <div className={AsideStyles.serverStatus}>
                    <div className={AsideStyles.statusIndicator}>
                        <span className={AsideStyles.statusDot}></span>
                        <div className={AsideStyles.statusInfo}>
                            <p className={AsideStyles.statusLabel}>SERVER STATUS</p>
                            <p className={AsideStyles.statusServer}>{activeServer?.serverName || 'No server selected'}</p>
                            <p className={AsideStyles.statusUptime}>{activeServer?.serverUrl || 'Configure a server to start monitoring'}</p>
                        </div>
                    </div>
                </div>

                <button className={AsideStyles.logoutBtn} onClick={onLogout}>
                    Logout
                </button>

                <button className={AsideStyles.mobileToggle} onClick={onToggle}>
                    <MdDashboard />
                </button>
            </aside>
            {isOpen && <div className={AsideStyles.overlay} onClick={onToggle}></div>}
        </>
    );
}
