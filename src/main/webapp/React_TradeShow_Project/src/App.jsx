import { useEffect, useState } from 'react';
import AppStyles from './styles/App.module.css';
import AsideBar from './components/AsideBar';
import Dashboard from './components/Dashboard/Dashboard';
import ToolsInventory from './components/Tools/ToolsInventory'
import RequestLogs from './components/RequestLogs/RequestLogs'
import ConfigureServer from './components/ConfigureServer/ConfigureServer';
import Settings from './components/Settings/Settings';
import { useGet } from './components/Hooks/useGet';
import AuthPage from './components/Auth/AuthPage';
import { buildUrl, getAuthHeaders } from './services/api';
import Analytics from './components/Analytics/Analytics';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('configure-server');
  const [selectedServerId, setSelectedServerId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('pulse24x7_theme') || 'default');
  const { data: serversData, refetch: refetchServers } = useGet('/server/all', {
    immediate: !!currentUser,
    dependencies: [currentUser?.id]
  });
  const servers = Array.isArray(serversData) ? serversData : [];

  const activeServer = servers.find((server) => server.serverId === selectedServerId) || servers[0] || null;

  useEffect(() => {
    document.title = 'Pulse24x7';
    const token = localStorage.getItem('mcp_jwt');
    if (!token) {
      setAuthReady(true);
      return;
    }
    fetch(buildUrl('/user-auth/me'), {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then((body) => {
        const user = body?.data || null;
        setCurrentUser(user);
      })
      .catch(() => {
        localStorage.removeItem('mcp_jwt');
        setCurrentUser(null);
      })
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeMode);
    localStorage.setItem('pulse24x7_theme', themeMode);
  }, [themeMode]);

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
        return (
          <Dashboard
            selectedServer={activeServer}
            onNavigate={setCurrentPage}
            onSelectServer={(id) => setSelectedServerId(id)}
          />
        );
      case 'logs':
        return <RequestLogs selectedServer={activeServer} />;
      case 'tools':
        return <ToolsInventory selectedServer={activeServer} />;
      case 'analytics':
        return <Analytics selectedServer={activeServer} />;
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
            themeMode={themeMode}
            onThemeModeChange={setThemeMode}
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
      {authReady && !currentUser ? (
        <AuthPage onAuthenticated={(user) => setCurrentUser(user)} />
      ) : null}
      {!authReady ? null : currentUser ? (
      <main className={`${AppStyles.app} cursor-default`}>
        <AsideBar 
          isOpen={isSidebarOpen} 
          onToggle={toggleSidebar}
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          activeServer={activeServer}
          onLogout={() => {
            localStorage.removeItem('mcp_jwt');
            setCurrentUser(null);
          }}
        />
        {renderPage()}
      </main>
      ) : null}
    </>
  );
}

export default App;
