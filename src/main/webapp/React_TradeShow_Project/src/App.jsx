import { useEffect, useState } from 'react';
import AppStyles from './styles/App.module.css';
import AsideBar from './components/AsideBar';
import Dashboard from './components/Dashboard/Dashboard';
import ToolsInventory from './components/Tools/ToolsInventory';
import RequestLogs from './components/RequestLogs/RequestLogs';
import ConfigureServer from './components/ConfigureServer/ConfigureServer';
import Settings from './components/Settings/Settings';
import { useGet } from './components/Hooks/useGet';
import AuthPage from './components/Auth/AuthPage';
import { buildUrl, getAuthHeaders } from './services/api';
import Analytics from './components/Analytics/Analytics';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => localStorage.getItem('pulse24x7_current_page') || 'dashboard');
  const [selectedServerId, setSelectedServerId] = useState(() => {
    const raw = localStorage.getItem('pulse24x7_selected_server_id');
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });
  const [authReady, setAuthReady] = useState(() => !localStorage.getItem('mcp_jwt'));
  const [currentUser, setCurrentUser] = useState(null);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('pulse24x7_theme') || 'default');
  const [settingsHasUnsavedChanges, setSettingsHasUnsavedChanges] = useState(false);
  const [settingsSaveHandler, setSettingsSaveHandler] = useState(null);
  const [showLeaveSettingsModal, setShowLeaveSettingsModal] = useState(false);
  const [pendingPage, setPendingPage] = useState(null);

  const { data: serversData, loading: loadingServers, refetch: refetchServers } = useGet('/server/all', {
    immediate: !!currentUser,
    dependencies: [currentUser?.id]
  });
  const servers = Array.isArray(serversData) ? serversData : [];

  const activeServer = servers.find((server) => server.serverId === selectedServerId) || servers[0] || null;

  useEffect(() => {
    localStorage.setItem('pulse24x7_current_page', currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (selectedServerId) {
      localStorage.setItem('pulse24x7_selected_server_id', String(selectedServerId));
    } else {
      localStorage.removeItem('pulse24x7_selected_server_id');
    }
  }, [selectedServerId]);

  useEffect(() => {
    document.title = 'Pulse24x7';
    const token = localStorage.getItem('mcp_jwt');
    if (!token) {
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

  useEffect(() => {
    if (!currentUser || loadingServers) {
      return;
    }
    if (servers.length > 0) {
      const hasSelectedServer = selectedServerId != null && servers.some((server) => server.serverId === selectedServerId);
      if (!hasSelectedServer) {
        setSelectedServerId(servers[0].serverId);
      }
    } else if (selectedServerId != null) {
      setSelectedServerId(null);
    }
    if (servers.length > 0) {
      return;
    }
    if (currentPage !== 'configure-server') {
      setCurrentPage('configure-server');
    }
  }, [currentUser, loadingServers, servers, currentPage, selectedServerId]);

  const navigateTo = (nextPage) => {
    if (currentPage === 'settings' && nextPage !== 'settings' && settingsHasUnsavedChanges) {
      setPendingPage(nextPage);
      setShowLeaveSettingsModal(true);
      return;
    }
    setCurrentPage(nextPage);
  };

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

  const handleSaveAndLeaveSettings = async () => {
    if (typeof settingsSaveHandler === 'function') {
      const saved = await settingsSaveHandler();
      if (!saved) {
        return;
      }
    }
    setShowLeaveSettingsModal(false);
    setSettingsHasUnsavedChanges(false);
    setCurrentPage(pendingPage || 'dashboard');
    setPendingPage(null);
  };

  const handleDiscardAndLeaveSettings = () => {
    setShowLeaveSettingsModal(false);
    setSettingsHasUnsavedChanges(false);
    setCurrentPage(pendingPage || 'dashboard');
    setPendingPage(null);
  };

  const handleStayOnSettings = () => {
    setShowLeaveSettingsModal(false);
    setPendingPage(null);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            selectedServer={activeServer}
            onNavigate={navigateTo}
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
            onClose={() => {
              if (servers.length > 0) {
                navigateTo('dashboard');
              }
            }}
            onSuccess={handleServerConfigured}
          />
        );
      case 'settings':
        return (
          <Settings
            key={activeServer?.serverId || 'no-server'}
            selectedServer={activeServer}
            onServerUpdated={refetchServers}
            themeMode={themeMode}
            onThemeModeChange={setThemeMode}
            onUnsavedStateChange={setSettingsHasUnsavedChanges}
            onRegisterSaveBeforeLeave={setSettingsSaveHandler}
          />
        );
      default:
        return (
          <ConfigureServer
            onClose={() => {
              if (servers.length > 0) {
                navigateTo('dashboard');
              }
            }}
            onSuccess={handleServerConfigured}
          />
        );
    }
  };

  const showSidebar = servers.length > 0;

  return (
    <>
      {authReady && !currentUser ? (
        <AuthPage onAuthenticated={(user) => setCurrentUser(user)} />
      ) : null}
      {!authReady ? null : currentUser ? (
        <main className={`${AppStyles.app} cursor-default`}>
          {showSidebar ? (
            <AsideBar
              isOpen={isSidebarOpen}
              onToggle={toggleSidebar}
              currentPage={currentPage}
              onNavigate={navigateTo}
              activeServer={activeServer}
              onLogout={() => {
                localStorage.removeItem('mcp_jwt');
                localStorage.removeItem('pulse24x7_selected_server_id');
                localStorage.removeItem('pulse24x7_current_page');
                setCurrentUser(null);
              }}
            />
          ) : null}
          {renderPage()}
          {showLeaveSettingsModal ? (
            <div className={AppStyles.unsavedOverlay}>
              <div className={AppStyles.unsavedModal}>
                <h3>Save settings before leaving?</h3>
                <p>You have unsaved changes. Are you want to save the setting before moving to another page?</p>
                <div className={AppStyles.unsavedActions}>
                  <button className={AppStyles.modalPrimary} onClick={handleSaveAndLeaveSettings}>Save and Continue</button>
                  <button className={AppStyles.modalSecondary} onClick={handleDiscardAndLeaveSettings}>Continue Without Saving</button>
                  <button className={AppStyles.modalGhost} onClick={handleStayOnSettings}>Stay Here</button>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      ) : null}
    </>
  );
}

export default App;
