import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SettingsStyles from '../../styles/Settings.module.css';
import { buildUrl, getAuthHeaders, parseApiResponse, unwrapData } from '../../services/api';
import { useGet } from '../Hooks/useGet';
import { usePost } from '../Hooks/usePost';
import InputField from '../ConfigureServer/InputField';
import DateTimeField from '../ConfigureServer/DateTimeField';
import { SelectField } from '../ConfigureServer/FormFields';

const DEFAULT_TOKEN_ENDPOINT = 'https://accounts.zoho.in/oauth/v2/token';
const DEFAULT_MONITOR_INTERVAL = 30;
const MONITOR_INTERVAL_CHOICES = [5, 10, 15, 30, 60, 120, 240, 720, 1440];
const SEVERITY_CHOICES = ['info', 'warning', 'error', 'critical'];

export default function Settings({
  selectedServer,
  currentUser,
  servers = [],
  onSelectServer,
  onServerUpdated,
  onServerDeleted,
  onUnsavedStateChange,
  onRegisterSaveBeforeLeave,
  themeMode = 'system',
  resolvedTheme = 'light',
  onThemeModeChange
}) {
  const serverId = selectedServer?.serverId;
  const [serverName, setServerName] = useState(() => selectedServer?.serverName || '');
  const [serverUrl, setServerUrl] = useState(() => selectedServer?.serverUrl || '');
  const [headerType, setHeaderType] = useState('Bearer');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [tokenEndpoint, setTokenEndpoint] = useState(DEFAULT_TOKEN_ENDPOINT);
  const [oauthTokenLink, setOauthTokenLink] = useState('');
  const [monitorIntervalMinutes, setMonitorIntervalMinutes] = useState(() => Number(selectedServer?.monitorIntervalMinutes) || DEFAULT_MONITOR_INTERVAL);
  const [message, setMessage] = useState(null);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showRefreshToken, setShowRefreshToken] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showEmailSwitchModal, setShowEmailSwitchModal] = useState(false);
  const [emailSwitchStep, setEmailSwitchStep] = useState('credentials');
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [newEmailForSwitch, setNewEmailForSwitch] = useState('');
  const [emailSwitchOtp, setEmailSwitchOtp] = useState('');
  const [emailSwitchLoading, setEmailSwitchLoading] = useState(false);
  const [accountEmailState, setAccountEmailState] = useState('');
  const [showCurrentPasswordForEmail, setShowCurrentPasswordForEmail] = useState(false);
  const [deleteServerId, setDeleteServerId] = useState(() => selectedServer?.serverId || null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingServer, setDeletingServer] = useState(false);
  const [initialServer, setInitialServer] = useState({
    serverName: selectedServer?.serverName || '',
    serverUrl: selectedServer?.serverUrl || '',
    monitorIntervalMinutes: Number(selectedServer?.monitorIntervalMinutes) || DEFAULT_MONITOR_INTERVAL
  });
  const [initialAuth, setInitialAuth] = useState({
    headerType: 'Bearer',
    accessToken: '',
    refreshToken: '',
    expiresAt: '',
    clientId: '',
    clientSecret: '',
    tokenEndpoint: DEFAULT_TOKEN_ENDPOINT,
    oauthTokenLink: ''
  });
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [receiverEmail, setReceiverEmail] = useState('');
  const [minSeverity, setMinSeverity] = useState('warning');
  const [includeServerAlerts, setIncludeServerAlerts] = useState(true);
  const [includeToolAlerts, setIncludeToolAlerts] = useState(true);
  const [includeSystemAlerts, setIncludeSystemAlerts] = useState(true);
  const [initialEmailSettings, setInitialEmailSettings] = useState({
    alertsEnabled: true,
    receiverEmail: '',
    minSeverity: 'warning',
    includeServerAlerts: true,
    includeToolAlerts: true,
    includeSystemAlerts: true
  });
  const authDirtyRef = useRef(false);
  const savePendingChangesRef = useRef(async () => true);
  const accountName = useMemo(
    () => normalize(currentUser?.fullName) || normalize(currentUser?.name) || normalize(currentUser?.username) || normalize(currentUser?.email),
    [currentUser]
  );
  const accountEmail = useMemo(
    () => normalize(currentUser?.email),
    [currentUser]
  );

  useEffect(() => {
    setAccountEmailState(accountEmail);
  }, [accountEmail]);

  useEffect(() => {
    const nextName = selectedServer?.serverName || '';
    const nextUrl = selectedServer?.serverUrl || '';
    const nextMonitorInterval = Number(selectedServer?.monitorIntervalMinutes) || DEFAULT_MONITOR_INTERVAL;
    setServerName(nextName);
    setServerUrl(nextUrl);
    setMonitorIntervalMinutes(nextMonitorInterval);
    setInitialServer({ serverName: nextName, serverUrl: nextUrl, monitorIntervalMinutes: nextMonitorInterval });
    authDirtyRef.current = false;
    setHeaderType('Bearer');
    setAccessToken('');
    setRefreshToken('');
    setExpiresAt('');
    setClientId('');
    setClientSecret('');
    setTokenEndpoint(DEFAULT_TOKEN_ENDPOINT);
    setOauthTokenLink('');
    setInitialAuth({
      headerType: 'Bearer',
      accessToken: '',
      refreshToken: '',
      expiresAt: '',
      clientId: '',
      clientSecret: '',
      tokenEndpoint: DEFAULT_TOKEN_ENDPOINT,
      oauthTokenLink: ''
    });
    setDeleteServerId(selectedServer?.serverId || null);
    setDeleteConfirmText('');
  }, [selectedServer?.serverId, selectedServer?.serverName, selectedServer?.serverUrl, selectedServer?.monitorIntervalMinutes]);

  const ownedServers = useMemo(
    () => (Array.isArray(servers) ? servers : []).filter((item) => Number(item?.serverId) > 0),
    [servers]
  );

  const { refetch: refetchToken } = useGet('/auth', {
    immediate: !!serverId,
    params: { serverId },
    dependencies: [serverId],
    onSuccess: (tokenData) => {
      if (authDirtyRef.current) {
        return;
      }
      const nextAuth = mapAuthState(tokenData);
      setHeaderType(nextAuth.headerType);
      setAccessToken(nextAuth.accessToken);
      setRefreshToken(nextAuth.refreshToken);
      setExpiresAt(nextAuth.expiresAt);
      setClientId(nextAuth.clientId);
      setClientSecret(nextAuth.clientSecret);
      setTokenEndpoint(nextAuth.tokenEndpoint);
      setOauthTokenLink(nextAuth.oauthTokenLink);
      setInitialAuth(nextAuth);
    },
    onError: (error) => {
      if (authDirtyRef.current || error?.status !== 404) {
        return;
      }
      const emptyAuth = mapAuthState(null);
      setHeaderType(emptyAuth.headerType);
      setAccessToken(emptyAuth.accessToken);
      setRefreshToken(emptyAuth.refreshToken);
      setExpiresAt(emptyAuth.expiresAt);
      setClientId(emptyAuth.clientId);
      setClientSecret(emptyAuth.clientSecret);
      setTokenEndpoint(emptyAuth.tokenEndpoint);
      setOauthTokenLink(emptyAuth.oauthTokenLink);
      setInitialAuth(emptyAuth);
    }
  });
  const { execute: saveAuth, loading: savingAuth } = usePost(buildUrl('/auth'));
  const { execute: refreshAuth, loading: refreshingAuth } = usePost(buildUrl('/auth/refresh'));
  const { refetch: refetchEmailSettings } = useGet('/user-auth/email-settings', {
    immediate: true,
    onSuccess: (emailSettingsData) => {
      const next = mapEmailSettings(emailSettingsData);
      setAlertsEnabled(next.alertsEnabled);
      setReceiverEmail(next.receiverEmail);
      setMinSeverity(next.minSeverity);
      setIncludeServerAlerts(next.includeServerAlerts);
      setIncludeToolAlerts(next.includeToolAlerts);
      setIncludeSystemAlerts(next.includeSystemAlerts);
      setInitialEmailSettings(next);
    }
  });

  useEffect(() => {
    if (!serverId) {
      return undefined;
    }
    const onTokenUpdate = (event) => {
      const nextServerId = Number(event?.detail?.serverId || 0);
      if (nextServerId === Number(serverId)) {
        refetchToken();
      }
    };
    window.addEventListener('pulse24x7-auth-token-updated', onTokenUpdate);
    return () => window.removeEventListener('pulse24x7-auth-token-updated', onTokenUpdate);
  }, [serverId, refetchToken]);

  useEffect(() => {
    if (!serverId) {
      return undefined;
    }
    const id = setInterval(() => {
      refetchToken();
    }, 15000);
    return () => clearInterval(id);
  }, [serverId, refetchToken]);

  const canSaveServer = useMemo(() => {
    const interval = Number(monitorIntervalMinutes);
    return !!serverId
      && !!serverName
      && !!serverUrl
      && Number.isFinite(interval)
      && interval >= 1
      && interval <= 1440;
  }, [serverId, serverName, serverUrl, monitorIntervalMinutes]);

  const serverDirty = useMemo(() => {
    return normalize(serverName) !== normalize(initialServer.serverName)
      || normalize(serverUrl) !== normalize(initialServer.serverUrl)
      || Number(monitorIntervalMinutes) !== Number(initialServer.monitorIntervalMinutes || DEFAULT_MONITOR_INTERVAL);
  }, [serverName, serverUrl, monitorIntervalMinutes, initialServer]);

  const authDirty = useMemo(() => {
    return normalize(headerType) !== normalize(initialAuth.headerType)
      || normalize(accessToken) !== normalize(initialAuth.accessToken)
      || normalize(refreshToken) !== normalize(initialAuth.refreshToken)
      || normalize(expiresAt) !== normalize(initialAuth.expiresAt)
      || normalize(clientId) !== normalize(initialAuth.clientId)
      || normalize(clientSecret) !== normalize(initialAuth.clientSecret)
      || normalize(tokenEndpoint) !== normalize(initialAuth.tokenEndpoint)
      || normalize(oauthTokenLink) !== normalize(initialAuth.oauthTokenLink);
  }, [headerType, accessToken, refreshToken, expiresAt, clientId, clientSecret, tokenEndpoint, oauthTokenLink, initialAuth]);

  const emailDirty = useMemo(() => {
    return boolNormalize(alertsEnabled) !== boolNormalize(initialEmailSettings.alertsEnabled)
      || normalize(receiverEmail) !== normalize(initialEmailSettings.receiverEmail)
      || normalize(minSeverity) !== normalize(initialEmailSettings.minSeverity)
      || boolNormalize(includeServerAlerts) !== boolNormalize(initialEmailSettings.includeServerAlerts)
      || boolNormalize(includeToolAlerts) !== boolNormalize(initialEmailSettings.includeToolAlerts)
      || boolNormalize(includeSystemAlerts) !== boolNormalize(initialEmailSettings.includeSystemAlerts);
  }, [alertsEnabled, receiverEmail, minSeverity, includeServerAlerts, includeToolAlerts, includeSystemAlerts, initialEmailSettings]);

  const hasUnsavedChanges = serverDirty || authDirty || emailDirty;
  useEffect(() => {
    authDirtyRef.current = authDirty;
  }, [authDirty]);

  useEffect(() => {
    onUnsavedStateChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedStateChange]);

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!hasUnsavedChanges) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  const saveServer = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setMessage(null);
    }
    try {
      const response = await fetch(buildUrl('/server', { id: serverId }), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          serverId,
          serverName,
          serverUrl,
          monitorIntervalMinutes: Number(monitorIntervalMinutes) || DEFAULT_MONITOR_INTERVAL
        })
      });
      const body = await parseApiResponse(response);
      unwrapData(body);
      setInitialServer({
        serverName,
        serverUrl,
        monitorIntervalMinutes: Number(monitorIntervalMinutes) || DEFAULT_MONITOR_INTERVAL
      });
      if (!silent) {
        setMessage({ type: 'success', text: 'Server settings saved.' });
      }
      onServerUpdated?.();
      return true;
    } catch (e) {
      if (!silent) {
        setMessage({ type: 'error', text: e.message });
      }
      return false;
    }
  }, [onServerUpdated, serverId, serverName, serverUrl, monitorIntervalMinutes]);

  const saveToken = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setMessage(null);
    }
    try {
      let expiresAtSql = null;
      if (expiresAt) {
        const parsed = new Date(expiresAt);
        if (!Number.isNaN(parsed.getTime())) {
          const pad = (n) => String(n).padStart(2, '0');
          expiresAtSql = `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:00`;
        }
      }
      await saveAuth({
        serverId,
        headerType,
        accessToken,
        refreshToken,
        expiresAt: expiresAtSql,
        clientId,
        clientSecret,
        tokenEndpoint,
        oauthTokenLink
      });
      setInitialAuth({
        headerType,
        accessToken,
        refreshToken,
        expiresAt: expiresAtSql || '',
        clientId,
        clientSecret,
        tokenEndpoint,
        oauthTokenLink
      });
      window.dispatchEvent(new CustomEvent('pulse24x7-auth-token-updated', { detail: { serverId: Number(serverId) } }));
      if (!silent) {
        setMessage({ type: 'success', text: 'Auth configuration saved.' });
      }
      refetchToken();
      return true;
    } catch (e) {
      if (!silent) {
        setMessage({ type: 'error', text: e.message });
      }
      return false;
    }
  }, [accessToken, clientId, clientSecret, expiresAt, headerType, oauthTokenLink, refreshToken, refetchToken, saveAuth, serverId, tokenEndpoint]);

  const saveEmailSettings = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setMessage(null);
    }
    try {
      const response = await fetch(buildUrl('/user-auth/email-settings'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          alertsEnabled,
          receiverEmail,
          minSeverity,
          includeServerAlerts,
          includeToolAlerts,
          includeSystemAlerts
        })
      });
      const body = await parseApiResponse(response);
      const saved = mapEmailSettings(unwrapData(body), receiverEmail);
      setAlertsEnabled(saved.alertsEnabled);
      setReceiverEmail(saved.receiverEmail);
      setMinSeverity(saved.minSeverity);
      setIncludeServerAlerts(saved.includeServerAlerts);
      setIncludeToolAlerts(saved.includeToolAlerts);
      setIncludeSystemAlerts(saved.includeSystemAlerts);
      setInitialEmailSettings(saved);
      refetchEmailSettings();
      if (!silent) {
        setMessage({ type: 'success', text: 'Email alert settings saved.' });
      }
      return true;
    } catch (e) {
      if (!silent) {
        setMessage({ type: 'error', text: e.message });
      }
      return false;
    }
  }, [alertsEnabled, includeServerAlerts, includeSystemAlerts, includeToolAlerts, minSeverity, receiverEmail, refetchEmailSettings]);

  const savePendingChanges = useCallback(async () => {
    let ok = true;
    let attempted = false;

    if (serverDirty) {
      attempted = true;
      ok = (await saveServer({ silent: true })) && ok;
    }
    if (authDirty) {
      attempted = true;
      ok = (await saveToken({ silent: true })) && ok;
    }
    if (emailDirty) {
      attempted = true;
      ok = (await saveEmailSettings({ silent: true })) && ok;
    }

    if (attempted) {
      setMessage({
        type: ok ? 'success' : 'error',
        text: ok ? 'Settings saved.' : 'Failed to save some settings.'
      });
      if (ok) {
        onUnsavedStateChange?.(false);
      }
    } else {
      setMessage({ type: 'success', text: 'No changes to save.' });
    }
    return ok;
  }, [authDirty, emailDirty, onUnsavedStateChange, saveEmailSettings, saveServer, saveToken, serverDirty]);

  useEffect(() => {
    savePendingChangesRef.current = savePendingChanges;
  }, [savePendingChanges]);

  useEffect(() => {
    onRegisterSaveBeforeLeave?.(savePendingChangesRef.current);
    return () => onRegisterSaveBeforeLeave?.(null);
  }, [onRegisterSaveBeforeLeave]);

  if (!serverId) {
    return (
      <div className={SettingsStyles.settingsPage}>
        <div className={SettingsStyles.emptyCard}>
          <h2>No server selected</h2>
          <p>Select a server from Pulse24x7 dashboard to manage settings.</p>
        </div>
      </div>
    );
  }

  const refreshTokenNow = async () => {
    setMessage(null);
    try {
      const response = await refreshAuth({ serverId });
      if (response?.accessToken) {
        setAccessToken(response.accessToken);
      }
      const nextExpiresAt = formatTimestampInput(response?.expiresAt);
      if (nextExpiresAt) {
        setExpiresAt(nextExpiresAt);
      }
      setMessage({ type: 'success', text: 'Access token refreshed.' });
      refetchToken();
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const canDeleteServer = Number(deleteServerId) > 0 && deleteConfirmText.trim().toUpperCase() === 'DELETE';
  const selectedDeleteServer = ownedServers.find((item) => Number(item.serverId) === Number(deleteServerId)) || null;
  const canSaveAll = (!serverDirty || canSaveServer) && !savingAuth && !refreshingAuth;

  const deleteServerNow = async () => {
    if (!canDeleteServer || deletingServer) {
      return;
    }
    setMessage(null);
    setDeletingServer(true);
    try {
      const response = await fetch(buildUrl('/server', { id: Number(deleteServerId) }), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });
      const body = await parseApiResponse(response);
      unwrapData(body);
      setMessage({ type: 'success', text: 'Server deleted successfully.' });
      setDeleteConfirmText('');
      onServerDeleted?.(Number(deleteServerId));
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setDeletingServer(false);
    }
  };

  const resetEmailSwitchState = () => {
    setEmailSwitchStep('credentials');
    setCurrentPasswordForEmail('');
    setNewEmailForSwitch('');
    setEmailSwitchOtp('');
    setEmailSwitchLoading(false);
    setShowCurrentPasswordForEmail(false);
  };

  const sendEmailSwitchOtp = async () => {
    const nextEmail = normalize(newEmailForSwitch);
    if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setMessage({ type: 'error', text: 'Enter a valid new email address.' });
      return;
    }
    if (nextEmail.toLowerCase() === normalize(accountEmailState).toLowerCase()) {
      setMessage({ type: 'error', text: 'New email must be different from current email.' });
      return;
    }
    setMessage(null);
    setEmailSwitchLoading(true);
    try {
      const response = await fetch(buildUrl('/user-auth/email-change/send-otp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          currentPassword: currentPasswordForEmail,
          newEmail: newEmailForSwitch
        })
      });
      const body = await parseApiResponse(response);
      unwrapData(body);
      setEmailSwitchStep('otp');
      setMessage({ type: 'success', text: 'Verification code sent to the new email address.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setEmailSwitchLoading(false);
    }
  };

  const confirmEmailSwitch = async () => {
    setMessage(null);
    setEmailSwitchLoading(true);
    try {
      const response = await fetch(buildUrl('/user-auth/email-change/confirm'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          newEmail: newEmailForSwitch,
          otpCode: emailSwitchOtp
        })
      });
      const body = await parseApiResponse(response);
      const payload = unwrapData(body) || {};
      const nextToken = normalize(payload?.token);
      const nextUserEmail = normalize(payload?.user?.email) || normalize(newEmailForSwitch);
      if (nextToken) {
        localStorage.setItem('mcp_jwt', nextToken);
      }
      setAccountEmailState(nextUserEmail);
      refetchEmailSettings();
      setShowEmailSwitchModal(false);
      resetEmailSwitchState();
      setMessage({ type: 'success', text: 'Email changed successfully.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setEmailSwitchLoading(false);
    }
  };

  return (
    <div className={SettingsStyles.settingsPage}>
      <header className={SettingsStyles.settingsHeader}>
        <h1>Pulse24x7 Settings</h1>
        <p>Control server profile and secure OAuth credentials in one place.</p>
      </header>

      {message && (
        <div className={message.type === 'success' ? SettingsStyles.bannerOk : SettingsStyles.bannerErr}>
          {message.text}
        </div>
      )}

      <div className={SettingsStyles.grid}>
        <section className={`${SettingsStyles.card} ${SettingsStyles.serverCard}`}>
          <h2>Server Profile</h2>
          <p className={SettingsStyles.cardHint}>Update the connected Pulse24x7 source server details.</p>
          <div className={SettingsStyles.fieldStack}>
            <InputField
              label="Server Name"
              placeholder="Enter server name"
              value={serverName}
              onChange={setServerName}
              required={true}
              tooltip="A descriptive name for this server"
            />
            <InputField
              label="Server URL"
              placeholder="https://server.example.com/mcp"
              value={serverUrl}
              onChange={setServerUrl}
              icon="link"
              required={true}
            />
            <div className={SettingsStyles.monitorPicker}>
              <label htmlFor="monitor-interval-input">Monitoring Interval (minutes)</label>
              <div className={SettingsStyles.quickSelectButtons}>
                {MONITOR_INTERVAL_CHOICES.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    className={`${SettingsStyles.quickBtn} ${Number(monitorIntervalMinutes) === minutes ? SettingsStyles.quickBtnActive : ''}`}
                    onClick={() => setMonitorIntervalMinutes(minutes)}
                  >
                    {minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60}h` : `${minutes}m`}
                  </button>
                ))}
              </div>
              <div className={SettingsStyles.customDateTime}>
                <input
                  id="monitor-interval-input"
                  type="number"
                  min="1"
                  max="1440"
                  className={SettingsStyles.dateTimeInput}
                  value={Number(monitorIntervalMinutes) || DEFAULT_MONITOR_INTERVAL}
                  onChange={(event) => {
                    const raw = Number(event.target.value);
                    setMonitorIntervalMinutes(Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MONITOR_INTERVAL);
                  }}
                />
              </div>
            </div>
          </div>
        </section>
        <div className={SettingsStyles.rightColumn}>
          <section className={SettingsStyles.card}>
            <h2>Account</h2>
            <p className={SettingsStyles.cardHint}>Signed-in user details for Pulse24x7.</p>
            <div className={SettingsStyles.fieldStack}>
              <InputField
                label="Username"
                placeholder="Username"
                value={accountName}
                onChange={() => {}}
                readOnly={true}
              />
              <InputField
                label="Email"
                type="email"
                placeholder="Email"
                value={accountEmailState}
                onChange={() => {}}
                readOnly={true}
              />
                  <div className={SettingsStyles.actions}>
                <button
                  type="button"
                  className={SettingsStyles.btnSecondary}
                  onClick={() => {
                    resetEmailSwitchState();
                    setShowEmailSwitchModal(true);
                  }}
                >
                  Switch Email
                </button>
              </div>
            </div>
          </section>
          <section className={SettingsStyles.card}>
            <h2>Appearance</h2>
            <p className={SettingsStyles.cardHint}>Choose your preferred theme for the full workspace.</p>
            <div className={SettingsStyles.themeGroup}>
              <button
                type="button"
                className={`${SettingsStyles.themeBtn} ${themeMode === 'light' ? SettingsStyles.themeActive : ''}`}
                aria-pressed={themeMode === 'light'}
                onClick={() => onThemeModeChange?.('light')}
              >
                Light
              </button>
              <button
                type="button"
                className={`${SettingsStyles.themeBtn} ${themeMode === 'dark' ? SettingsStyles.themeActive : ''}`}
                aria-pressed={themeMode === 'dark'}
                onClick={() => onThemeModeChange?.('dark')}
              >
                Dark
              </button>
              <button
                type="button"
                className={`${SettingsStyles.themeBtn} ${themeMode === 'system' ? SettingsStyles.themeActive : ''}`}
                aria-pressed={themeMode === 'system'}
                onClick={() => onThemeModeChange?.('system')}
              >
                System
              </button>
            </div>
            <p className={SettingsStyles.cardHint}>Current active theme: <strong>{resolvedTheme === 'dark' ? 'Dark' : 'Light'}</strong></p>
          </section>
        </div>
      </div>

      <section className={SettingsStyles.cardWide}>
        <h2>OAuth Credentials</h2>
        <p className={SettingsStyles.cardHint}>Use secure values below for tool auth, refresh, and token management.</p>

        <div className={SettingsStyles.credentialGrid}>
          <SelectField
            label="Header Type"
            value={headerType}
            onChange={setHeaderType}
            options={['Bearer', 'Basic', 'ApiKey']}
          />
          <InputField
            label="Client ID"
            placeholder="OAuth client id"
            value={clientId}
            onChange={setClientId}
          />
          <InputField
            label="Client Secret"
            type={showClientSecret ? 'text' : 'password'}
            placeholder="OAuth client secret"
            value={clientSecret}
            onChange={setClientSecret}
            showToggle={true}
            onToggle={() => setShowClientSecret((prev) => !prev)}
          />
          <InputField
            label="Token Endpoint"
            placeholder="https://accounts.zoho.in/oauth/v2/token"
            value={tokenEndpoint}
            onChange={setTokenEndpoint}
            icon="link"
          />
          <InputField
            label="OAuth Token Link"
            placeholder="https://accounts.zoho.in/oauth/v2/auth?scope=..."
            value={oauthTokenLink}
            onChange={setOauthTokenLink}
            icon="link"
            tooltip="Authorization URL used to generate OAuth access and refresh tokens"
          />
        </div>

        <div className={SettingsStyles.tokenAreaGrid}>
          <InputField
            label="Access Token"
            type={showAccessToken ? 'text' : 'password'}
            placeholder="Enter access token"
            value={accessToken}
            onChange={setAccessToken}
            showToggle={true}
            onToggle={() => setShowAccessToken((prev) => !prev)}
          />
          <InputField
            label="Refresh Token"
            type={showRefreshToken ? 'text' : 'password'}
            placeholder="Enter refresh token"
            value={refreshToken}
            onChange={setRefreshToken}
            showToggle={true}
            onToggle={() => setShowRefreshToken((prev) => !prev)}
          />
        </div>

        <DateTimeField
          label="Token Expiry"
          value={expiresAt}
          onChange={setExpiresAt}
          tooltip="Choose expiry by quick mode or exact date/time"
        />

        <div className={SettingsStyles.actions}>
          <button className={SettingsStyles.btnSecondary} onClick={refreshTokenNow} disabled={refreshingAuth}>Refresh Access Token</button>
        </div>
      </section>

      <section className={`${SettingsStyles.cardWide} ${SettingsStyles.emailAlertsCard}`}>
        <h2>Email Alerts</h2>
        <p className={SettingsStyles.cardHint}>Control receiver delivery, alert threshold, and category-level notifications.</p>

        <div className={SettingsStyles.fieldStack}>
          <div className={SettingsStyles.switchRow}>
            <span>Email Alerts Enabled</span>
            <label className={SettingsStyles.toggle}>
              <input
                type="checkbox"
                checked={alertsEnabled}
                onChange={(event) => setAlertsEnabled(event.target.checked)}
              />
              <span className={SettingsStyles.toggleTrack} />
            </label>
          </div>

          <InputField
            label="Receiver Email"
            placeholder="receiver@example.com"
            value={receiverEmail}
            onChange={setReceiverEmail}
            type="email"
            required={true}
            tooltip="Default is your login email"
          />

          <SelectField
            label="Minimum Alert Severity"
            value={minSeverity}
            onChange={setMinSeverity}
            options={SEVERITY_CHOICES}
          />

          <div className={SettingsStyles.checkGrid}>
            <label className={SettingsStyles.checkItem}>
              <input
                type="checkbox"
                checked={includeServerAlerts}
                onChange={(event) => setIncludeServerAlerts(event.target.checked)}
              />
              <span>Include server status alerts</span>
            </label>
            <label className={SettingsStyles.checkItem}>
              <input
                type="checkbox"
                checked={includeToolAlerts}
                onChange={(event) => setIncludeToolAlerts(event.target.checked)}
              />
              <span>Include tool change alerts</span>
            </label>
            <label className={SettingsStyles.checkItem}>
              <input
                type="checkbox"
                checked={includeSystemAlerts}
                onChange={(event) => setIncludeSystemAlerts(event.target.checked)}
              />
              <span>Include system alerts</span>
            </label>
          </div>
        </div>
      </section>

      <section className={`${SettingsStyles.cardWide} ${SettingsStyles.dangerCard}`}>
        <h2>Danger Zone</h2>
        <p className={SettingsStyles.cardHint}>Delete a server and all of its related tool/configuration records permanently.</p>
        <div className={SettingsStyles.dangerGrid}>
          {ownedServers.length <= 1 ? (
            <div className={SettingsStyles.serverPreview}>
              <span>Current Server</span>
              <strong>{selectedServer?.serverName || 'No server selected'}</strong>
            </div>
          ) : (
            <div className={SettingsStyles.dangerField}>
              <label htmlFor="danger-server-select">Select Server To Delete</label>
              <div className={SettingsStyles.selectWrap}>
                <select
                  id="danger-server-select"
                  className={SettingsStyles.dangerSelect}
                  value={Number(deleteServerId) || ''}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setDeleteServerId(Number.isFinite(next) ? next : null);
                    onSelectServer?.(Number.isFinite(next) ? next : null);
                  }}
                >
                  {ownedServers.map((server) => (
                    <option key={server.serverId} value={server.serverId}>
                      {server.serverName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className={SettingsStyles.dangerField}>
            <label htmlFor="danger-confirm-input">Type DELETE to confirm</label>
            <input
              id="danger-confirm-input"
              className={SettingsStyles.dangerInput}
              placeholder="DELETE"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
            />
          </div>
          <div className={SettingsStyles.actions}>
            <button
              type="button"
              className={SettingsStyles.btnDanger}
              disabled={!canDeleteServer || deletingServer}
              onClick={deleteServerNow}
            >
              {deletingServer ? 'Deleting...' : `Delete ${selectedDeleteServer?.serverName || 'Server'}`}
            </button>
          </div>
        </div>
      </section>

      <section className={SettingsStyles.saveBar}>
        <button
          type="button"
          className={SettingsStyles.btnPrimary}
          disabled={!canSaveAll}
          onClick={savePendingChanges}
        >
          Save Settings
        </button>
      </section>

      {showEmailSwitchModal && (
        <div className={SettingsStyles.modalBackdrop} role="dialog" aria-modal="true" aria-label="Switch email">
          <div className={SettingsStyles.modalCard}>
            <h2>Switch Account Email</h2>
            <p className={SettingsStyles.cardHint}>Verify with current password and confirm new email with OTP.</p>
            <div className={SettingsStyles.stepRow}>
              <span className={`${SettingsStyles.stepPill} ${emailSwitchStep === 'credentials' ? SettingsStyles.stepPillActive : ''}`}>1. Authorize</span>
              <span className={`${SettingsStyles.stepPill} ${emailSwitchStep === 'otp' ? SettingsStyles.stepPillActive : ''}`}>2. Verify OTP</span>
            </div>
            {emailSwitchStep === 'credentials' ? (
              <div className={SettingsStyles.fieldStack}>
                <InputField
                  label="Current Password"
                  type={showCurrentPasswordForEmail ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={currentPasswordForEmail}
                  onChange={setCurrentPasswordForEmail}
                  showToggle={true}
                  onToggle={() => setShowCurrentPasswordForEmail((prev) => !prev)}
                />
                <InputField
                  label="New Email"
                  type="email"
                  placeholder="new-email@example.com"
                  value={newEmailForSwitch}
                  onChange={setNewEmailForSwitch}
                />
              </div>
            ) : (
              <div className={SettingsStyles.fieldStack}>
                <InputField
                  label="New Email"
                  type="email"
                  placeholder="new-email@example.com"
                  value={newEmailForSwitch}
                  onChange={() => {}}
                  readOnly={true}
                />
                <InputField
                  label="Verification Code"
                  placeholder="Enter 6-digit OTP"
                  value={emailSwitchOtp}
                  onChange={setEmailSwitchOtp}
                />
              </div>
            )}
            <div className={SettingsStyles.actions}>
              <button
                type="button"
                className={SettingsStyles.btnSecondary}
                onClick={() => {
                  setShowEmailSwitchModal(false);
                  resetEmailSwitchState();
                }}
                disabled={emailSwitchLoading}
              >
                Cancel
              </button>
              {emailSwitchStep === 'credentials' ? (
                <button
                  type="button"
                  className={SettingsStyles.btnPrimary}
                  disabled={emailSwitchLoading || !normalize(currentPasswordForEmail) || !normalize(newEmailForSwitch)}
                  onClick={sendEmailSwitchOtp}
                >
                  {emailSwitchLoading ? 'Sending...' : 'Send OTP'}
                </button>
              ) : (
                <button
                  type="button"
                  className={SettingsStyles.btnPrimary}
                  disabled={emailSwitchLoading || !normalize(emailSwitchOtp)}
                  onClick={confirmEmailSwitch}
                >
                  {emailSwitchLoading ? 'Verifying...' : 'Verify & Switch'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function normalize(value) {
  return value == null ? '' : String(value).trim();
}

function boolNormalize(value) {
  return Boolean(value);
}

function mapAuthState(tokenData) {
  return {
    headerType: normalize(tokenData?.headerType) || 'Bearer',
    accessToken: normalize(tokenData?.accessToken),
    refreshToken: normalize(tokenData?.refreshToken),
    expiresAt: formatTimestampInput(tokenData?.expiresAt),
    clientId: normalize(tokenData?.clientId),
    clientSecret: normalize(tokenData?.clientSecret),
    tokenEndpoint: normalize(tokenData?.tokenEndpoint) || DEFAULT_TOKEN_ENDPOINT,
    oauthTokenLink: normalize(tokenData?.oauthTokenLink)
  };
}

function formatTimestampInput(value) {
  if (!value) {
    return '';
  }
  const raw = String(value).trim();
  const directMatch = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (directMatch) {
    return `${directMatch[1]}T${directMatch[2]}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  const pad = (n) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function mapEmailSettings(raw) {
  return {
    alertsEnabled: raw?.alertsEnabled ?? true,
    receiverEmail: normalize(raw?.receiverEmail),
    minSeverity: normalize(raw?.minSeverity).toLowerCase() || 'warning',
    includeServerAlerts: raw?.includeServerAlerts ?? true,
    includeToolAlerts: raw?.includeToolAlerts ?? true,
    includeSystemAlerts: raw?.includeSystemAlerts ?? true
  };
}
