import { useEffect, useMemo, useState } from 'react';
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

export default function Settings({ selectedServer, onServerUpdated, themeMode = 'default', onThemeModeChange }) {
  const serverId = selectedServer?.serverId;
  const [serverName, setServerName] = useState(selectedServer?.serverName || '');
  const [serverUrl, setServerUrl] = useState(selectedServer?.serverUrl || '');
  const [headerType, setHeaderType] = useState('Bearer');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [tokenEndpoint, setTokenEndpoint] = useState('https://accounts.zoho.in/oauth/v2/token');
  const [message, setMessage] = useState(null);
  const [showClientSecret, setShowClientSecret] = useState(false);

  const { data: tokenData, refetch: refetchToken } = useGet('/auth', {
    immediate: !!serverId,
    params: { serverId },
    dependencies: [serverId]
  });
  const { execute: saveAuth, loading: savingAuth } = usePost(buildUrl('/auth'));
  const { execute: refreshAuth, loading: refreshingAuth } = usePost(buildUrl('/auth/refresh'));

  useEffect(() => {
    setServerName(selectedServer?.serverName || '');
    setServerUrl(selectedServer?.serverUrl || '');
  }, [selectedServer?.serverId, selectedServer?.serverName, selectedServer?.serverUrl]);

  useEffect(() => {
    if (!tokenData) {
      return;
    }
    setHeaderType(tokenData.headerType || 'Bearer');
    setAccessToken(tokenData.accessToken || '');
    setRefreshToken(tokenData.refreshToken || '');
    setExpiresAt(tokenData.expiresAt || '');
    setClientId(tokenData.clientId || '');
    setClientSecret(tokenData.clientSecret || '');
    setTokenEndpoint(tokenData.tokenEndpoint || 'https://accounts.zoho.in/oauth/v2/token');
  }, [tokenData?.updatedAt, tokenData?.serverId]);

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

  const canSaveServer = useMemo(() => !!serverId && !!serverName && !!serverUrl, [serverId, serverName, serverUrl]);

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

  const saveServer = async () => {
    setMessage(null);
    try {
      const response = await fetch(buildUrl('/server', { id: serverId }), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ serverId, serverName, serverUrl })
      });
      const body = await parseApiResponse(response);
      unwrapData(body);
      setMessage({ type: 'success', text: 'Server settings saved.' });
      onServerUpdated?.();
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const saveToken = async () => {
    setMessage(null);
    try {
      await saveAuth({
        serverId,
        headerType,
        accessToken,
        refreshToken,
        expiresAt: expiresAt || null,
        clientId,
        clientSecret,
        tokenEndpoint
      });
      window.dispatchEvent(new CustomEvent('pulse24x7-auth-token-updated', { detail: { serverId: Number(serverId) } }));
      setMessage({ type: 'success', text: 'Auth configuration saved.' });
      refetchToken();
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const refreshTokenNow = async () => {
    setMessage(null);
    try {
      const response = await refreshAuth({ serverId });
      if (response?.accessToken) {
        setAccessToken(response.accessToken);
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
          </div>
          <div className={SettingsStyles.actions}>
            <button className={SettingsStyles.btnPrimary} disabled={!canSaveServer} onClick={saveServer}>Save Server</button>
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
        </div>

        <div className={SettingsStyles.tokenAreaGrid}>
          <div className={SettingsStyles.textBlock}>
            <label>Access Token</label>
            <textarea
              rows="4"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className={SettingsStyles.textarea}
            />
          </div>
          <div className={SettingsStyles.textBlock}>
            <label>Refresh Token</label>
            <textarea
              rows="4"
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              className={SettingsStyles.textarea}
            />
          </div>
        </div>

        <DateTimeField
          label="Token Expiry"
          value={expiresAt}
          onChange={setExpiresAt}
          tooltip="Choose expiry by quick mode or exact date/time"
        />

        <div className={SettingsStyles.actions}>
          <button className={SettingsStyles.btnPrimary} onClick={saveToken} disabled={savingAuth}>Save Auth</button>
          <button className={SettingsStyles.btnSecondary} onClick={refreshTokenNow} disabled={refreshingAuth}>Refresh Access Token</button>
        </div>
      </section>
    </div>
  );
}
