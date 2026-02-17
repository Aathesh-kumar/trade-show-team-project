import { useState } from 'react';
import AppStyles from './styles/App.module.css';
import AsideBar from './components/AsideBar';
import Dashboard from './components/Dashboard/Dashboard';
import ToolsInventory from './components/Tools/ToolsInventory'
import RequestLogs from './components/RequestLogs/RequestLogs'
import ConfigureServer from './components/ConfigureServer/ConfigureServer';
import Settings from './components/Settings/Settings';
import { useGet } from './components/Hooks/useGet';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('configure-server');
  const [selectedServerId, setSelectedServerId] = useState(null);
  const { data: serversData, refetch: refetchServers } = useGet('/server/all', {
    immediate: true
  });
  const servers = Array.isArray(serversData) ? serversData : [];

  const activeServer = servers.find((server) => server.serverId === selectedServerId) || servers[0] || null;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleServerConfigured = (server) => {
    const serverId = server?.serverId || server?.id;
    if (serverId) {
      setSelectedServerId(serverId);
    }
    refetchServers();
    setCurrentPage('dashboard');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard selectedServer={activeServer} onNavigate={setCurrentPage} />;
      case 'logs':
        return <RequestLogs selectedServer={activeServer} />;
      case 'tools':
        return <ToolsInventory selectedServer={activeServer} />;
      case 'configure-server':
        return (
          <ConfigureServer 
            onClose={() => setCurrentPage('dashboard')}
            onSuccess={handleServerConfigured}
          />
        );
      case 'settings':
        return (
          <Settings
            selectedServer={activeServer}
            onServerUpdated={refetchServers}
          />
        );
      default:
        return (<ConfigureServer 
          onClose={() => setCurrentPage('dashboard')}
          onSuccess={handleServerConfigured}
        />);
    }
  };

  return (
    <>
      <main className={AppStyles.app}>
        <AsideBar 
          isOpen={isSidebarOpen} 
          onToggle={toggleSidebar}
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          activeServer={activeServer}
        />
        {renderPage()}
      </main>
    </>
  );
}

export default App;
