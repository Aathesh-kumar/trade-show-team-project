import { useState, useEffect } from 'react';
import { useGet } from './components/customUtilHooks/useGet';
import { ENDPOINTS } from './components/config/api';
import AppStyles from './styles/App.module.css';
import AsideBar from './components/AsideBar';
import Dashboard from './components/DashboardComponents/Dashboard';
import ToolsInventory from './components/ToolsComponents/ToolsInventory';
import RequestLogs from './components/RequestLogsComponents/RequestLogs';
import ConfigureServer from './components/ConfigureServerComponents/ConfigureServer';
import Settings from './components/SettingsComponents/Settings';
// import EmptyServerState from './components/EmptyServerState';
import LoadingSpinner from './components/LoadingComponents/LoadingSpinner';

function App() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [showConfigureForm, setShowConfigureForm] = useState(false);

    // Check if user has any servers
    const { data: servers, loading: loadingServers, refetch: refetchServers } = useGet(ENDPOINTS.SERVERS_ALL, {
        onSuccess: (data) => {
            // Backend returns: { success: true, data: [...] }
            const serverList = data?.data || [];
            if (serverList.length === 0) {
                setShowConfigureForm(true);
            }
        },
        onError: (error) => {
            console.error('Failed to fetch servers:', error);
        }
    });

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleServerAdded = (serverData) => {
        console.log('Server added successfully:', serverData);
        setShowConfigureForm(false);
        setCurrentPage('dashboard');
        // Refresh servers list
        refetchServers();
    };

    const handleCloseConfigureForm = () => {
        // Only allow closing if at least one server exists
        const serversList = servers?.data || [];
        if (serversList.length > 0) {
            setShowConfigureForm(false);
            setCurrentPage('dashboard');
        } else {
            alert('Please add at least one server to continue');
        }
    };

    const handleNavigate = (page) => {
        setCurrentPage(page);
    };

    // Show loading while checking for servers
    if (loadingServers && !servers) {
        return (
            <div className={AppStyles.app}>
                <LoadingSpinner fullScreen text="Loading MCP Console..." />
            </div>
        );
    }

    // Show configure form if no servers or explicitly requested
    if (showConfigureForm || currentPage === 'configure-server') {
        return (
            <div className={AppStyles.app}>
                <ConfigureServer 
                    onClose={handleCloseConfigureForm}
                    onSuccess={handleServerAdded}
                />
            </div>
        );
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard onNavigate={handleNavigate} />;
            case 'logs':
                return <RequestLogs />;
            case 'tools':
                return <ToolsInventory />;
            case 'settings':
                return <Settings onNavigate={handleNavigate} />;
            default:
                return <Dashboard onNavigate={handleNavigate} />;
        }
    };

    return (
        <>
            <main className={AppStyles.app}>
                <AsideBar 
                    isOpen={isSidebarOpen} 
                    onToggle={toggleSidebar}
                    currentPage={currentPage}
                    onNavigate={handleNavigate}
                />
                {renderPage()}
            </main>
        </>
    );
}

export default App