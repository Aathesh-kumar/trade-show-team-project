import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SettingsStyles from '../../styles/Settings.module.css';
import { buildUrl, getAuthHeaders, parseApiResponse, unwrapData } from '../../services/api';
import { useGet } from '../Hooks/useGet';
import { usePost } from '../Hooks/usePost';
import InputField from '../ConfigureServer/InputField';
import DateTimeField from '../ConfigureServer/DateTimeField';
import { SelectField } from '../ConfigureServer/FormFields';

const themeChoices = [
  { id: 'default', label: 'Default (System)' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' }
];
const DEFAULT_TOKEN_ENDPOINT = 'https://accounts.zoho.in/oauth/v2/token';
const DEFAULT_MONITOR_INTERVAL = 30;
const MONITOR_INTERVAL_CHOICES = [5, 10, 15, 30, 60, 120, 240, 720, 1440];

export default function Settings({
  selectedServer,
  onServerUpdated,
  themeMode = 'default',
  onThemeModeChange,
  onUnsavedStateChange,
  onRegisterSaveBeforeLeave
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
  const authDirtyRef = useRef(false);

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
  }, [selectedServer?.serverId, selectedServer?.serverName, selectedServer?.serverUrl, selectedServer?.monitorIntervalMinutes]);

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

  const hasUnsavedChanges = serverDirty || authDirty;
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

    if (attempted) {
      setMessage({
        type: ok ? 'success' : 'error',
        text: ok ? 'Settings saved.' : 'Failed to save some settings.'
      });
    }
    return ok;
  }, [authDirty, saveServer, saveToken, serverDirty]);

  useEffect(() => {
    onRegisterSaveBeforeLeave?.(() => savePendingChanges);
    return () => onRegisterSaveBeforeLeave?.(null);
  }, [onRegisterSaveBeforeLeave, savePendingChanges]);

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
      if (response?.expiresAt) {
        setExpiresAt(response.expiresAt);
      }
      setMessage({ type: 'success', text: 'Access token refreshed.' });
      refetchToken();
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  return (
    <div className={SettingsStyles.settingsPage}>
      <header className={SettingsStyles.settingsHeader}>
        <h1>Pulse24x7 Settings</h1>
        <p>Control server profile, secure OAuth credentials, and product appearance in one place.</p>
      </header>

      {message && (
        <div className={message.type === 'success' ? SettingsStyles.bannerOk : SettingsStyles.bannerErr}>
          {message.text}
        </div>
      )}

      <div className={SettingsStyles.grid}>
        <section className={SettingsStyles.card}>
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
          <div className={SettingsStyles.actions}>
            <button className={SettingsStyles.btnPrimary} disabled={!canSaveServer} onClick={() => saveServer()}>Save Server</button>
          </div>
        </section>

        <section className={SettingsStyles.card}>
          <h2>Appearance</h2>
          <p className={SettingsStyles.cardHint}>Choose how Pulse24x7 should render across all pages.</p>
          <div className={SettingsStyles.themeGroup}>
            {themeChoices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className={`${SettingsStyles.themeBtn} ${themeMode === choice.id ? SettingsStyles.themeActive : ''}`}
                onClick={() => onThemeModeChange?.(choice.id)}
              >
                {choice.label}
              </button>
            ))}
          </div>
        </section>
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
          <button className={SettingsStyles.btnPrimary} onClick={() => saveToken()} disabled={savingAuth}>Save Auth</button>
          <button className={SettingsStyles.btnSecondary} onClick={refreshTokenNow} disabled={refreshingAuth}>Refresh Access Token</button>
        </div>
      </section>
    </div>
  );
}

function normalize(value) {
  return value == null ? '' : String(value).trim();
}

function mapAuthState(tokenData) {
  return {
    headerType: normalize(tokenData?.headerType) || 'Bearer',
    accessToken: normalize(tokenData?.accessToken),
    refreshToken: normalize(tokenData?.refreshToken),
    expiresAt: normalize(tokenData?.expiresAt),
    clientId: normalize(tokenData?.clientId),
    clientSecret: normalize(tokenData?.clientSecret),
    tokenEndpoint: normalize(tokenData?.tokenEndpoint) || DEFAULT_TOKEN_ENDPOINT,
    oauthTokenLink: normalize(tokenData?.oauthTokenLink)
  };
}
