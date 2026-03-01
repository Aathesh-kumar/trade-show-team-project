import AsideItem from "./AsideItem";
import AsideStyles from '../styles/Aside.module.css';
import { MdDashboard, MdListAlt, MdBuild, MdSettings, MdDonutLarge } from "react-icons/md";
const pulseLogo = '/Logo.svg';

export default function AsideBar({ isOpen, onToggle, currentPage, onNavigate, activeServer, onLogout }) {
    const navItems = [
        { key: 'dashboard', label: 'Dashboard', icon: <MdDashboard /> },
        { key: 'logs', label: 'Logs', icon: <MdListAlt /> },
        { key: 'tools', label: 'Tools', icon: <MdBuild /> },
        { key: 'analytics', label: 'Analytics', icon: <MdDonutLarge /> },
        { key: 'settings', label: 'Settings', icon: <MdSettings /> }
    ];
    const activeMobileIndex = Math.max(0, navItems.findIndex((item) => item.key === currentPage));

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
                        icon={<MdDonutLarge />}
                        active={currentPage === 'analytics'}
                        onClick={() => onNavigate('analytics')}
                    >
                        Analytics
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

            </aside>
            {isOpen && <div className={AsideStyles.overlay} onClick={onToggle}></div>}

            <nav className={AsideStyles.mobileNav} aria-label="Mobile navigation">
                <div
                    className={AsideStyles.mobileNavTrack}
                    style={{ "--mobile-active-index": activeMobileIndex }}
                >
                    {navItems.map((item) => {
                        const active = currentPage === item.key;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                className={`${AsideStyles.mobileNavItem} ${active ? AsideStyles.mobileNavItemActive : ''}`}
                                onClick={() => onNavigate(item.key)}
                                aria-label={item.label}
                            >
                                <span className={AsideStyles.mobileNavIcon}>{item.icon}</span>
                                {active ? <span className={AsideStyles.mobileNavLabel}>{item.label}</span> : null}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
