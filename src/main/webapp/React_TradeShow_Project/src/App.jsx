import { useCallback, useEffect, useRef, useState } from 'react';
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
import LoadingStyles from './styles/Loading.module.css';
import { MdMenu } from 'react-icons/md';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
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
  const [allowConfigureWithServers, setAllowConfigureWithServers] = useState(false);
  const [hasConfiguredServer, setHasConfiguredServer] = useState(() => {
    const raw = Number(localStorage.getItem('pulse24x7_selected_server_id'));
    return Number.isInteger(raw) && raw > 0;
  });
  const prevServersLengthRef = useRef(0);

  const { data: serversData, loading: loadingServers, refetch: refetchServers } = useGet('/server/all', {
    immediate: !!currentUser,
    dependencies: [currentUser?.id]
  });
  const servers = Array.isArray(serversData) ? serversData : [];

  const activeServer = servers.find((server) => server.serverId === selectedServerId) || servers[0] || null;

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
      setHasConfiguredServer(true);
      const hasSelectedServer = selectedServerId != null && servers.some((server) => server.serverId === selectedServerId);
      if (!hasSelectedServer) {
        setSelectedServerId(servers[0].serverId);
      }
      if (currentPage === 'configure-server' && !allowConfigureWithServers) {
        setCurrentPage('dashboard');
      }
      return;
    } else if (selectedServerId != null) {
      setSelectedServerId(null);
      setHasConfiguredServer(false);
      setAllowConfigureWithServers(false);
    }
    if (currentPage !== 'configure-server') {
      setAllowConfigureWithServers(false);
      setCurrentPage('configure-server');
    }
  }, [currentUser, loadingServers, servers, currentPage, selectedServerId, allowConfigureWithServers]);

  useEffect(() => {
    const previousLength = prevServersLengthRef.current;
    if (previousLength === 0 && servers.length > 0 && currentPage === 'configure-server') {
      setCurrentPage('dashboard');
    }
    prevServersLengthRef.current = servers.length;
  }, [servers.length, currentPage]);

  const navigateTo = (nextPage) => {
    if (currentPage === 'settings' && nextPage !== 'settings' && settingsHasUnsavedChanges) {
      setPendingPage(nextPage);
      setShowLeaveSettingsModal(true);
      return;
    }
    setAllowConfigureWithServers(nextPage === 'configure-server');
    setCurrentPage(nextPage);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleServerConfigured = (server) => {
    const serverId = server?.serverId || server?.id;
    if (serverId) {
      setSelectedServerId(serverId);
      setHasConfiguredServer(true);
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

  const registerSettingsSaveBeforeLeave = useCallback((handler) => {
    setSettingsSaveHandler(() => (typeof handler === 'function' ? handler : null));
  }, []);

  const renderPage = () => {
    if (currentUser && loadingServers && serversData == null) {
      return (
        <div className={AppStyles.bootstrapPane}>
          <div className={LoadingStyles.spinnerContainer}>
            <div className={LoadingStyles.spinner} style={{ width: 40, height: 40, borderWidth: 4 }}></div>
            <p className={LoadingStyles.loadingText}>Loading your workspace...</p>
          </div>
        </div>
      );
    }
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
            onRegisterSaveBeforeLeave={registerSettingsSaveBeforeLeave}
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

  const showSidebar = servers.length > 0 || hasConfiguredServer;

  return (
    <>
      {authReady && !currentUser ? (
        <AuthPage
          onAuthenticated={(user) => {
            setCurrentUser(user);
            setCurrentPage('dashboard');
            setAllowConfigureWithServers(false);
            setIsSidebarOpen(false);
          }}
        />
      ) : null}
      {!authReady ? null : currentUser ? (
        <main className={`${AppStyles.app} cursor-default`}>
          {showSidebar ? (
            <button
              type="button"
              className={AppStyles.mobileNavTrigger}
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isSidebarOpen}
            >
              <MdMenu />
            </button>
          ) : null}
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
                setIsSidebarOpen(false);
                setCurrentUser(null);
                setCurrentPage('dashboard');
                setSelectedServerId(null);
                setHasConfiguredServer(false);
                setSettingsHasUnsavedChanges(false);
                setSettingsSaveHandler(null);
                setShowLeaveSettingsModal(false);
                setPendingPage(null);
                prevServersLengthRef.current = 0;
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
