import { useEffect, useMemo, useState } from 'react';
import ToolsStyles from '../../styles/Tools.module.css';
import { buildUrl, parseApiResponse, unwrapData } from '../../services/api';
import { useGet } from '../Hooks/useGet';
import { usePost } from '../Hooks/usePost';

export default function Settings({ selectedServer, onServerUpdated }) {
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
    setExpiresAt(toInputDateTime(tokenData.expiresAt));
    setClientId(tokenData.clientId || '');
    setClientSecret(tokenData.clientSecret || '');
    setTokenEndpoint(tokenData.tokenEndpoint || 'https://accounts.zoho.in/oauth/v2/token');
  }, [tokenData?.updatedAt, tokenData?.serverId]);

  const canSave = useMemo(() => !!serverId && !!serverName && !!serverUrl, [serverId, serverName, serverUrl]);

  if (!serverId) {
    return (
      <div className={ToolsStyles.toolsInventory}>
        <div className={ToolsStyles.emptyState}>
          <p>Select a server to open settings.</p>
        </div>
      </div>
    );
  }

  const saveServer = async () => {
    setMessage(null);
    try {
      const response = await fetch(buildUrl('/server', { id: serverId }), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        clientId,
        clientSecret,
        tokenEndpoint
      });
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
    <div className={ToolsStyles.toolsInventory}>
      <header className={ToolsStyles.toolsHeader}>
        <div>
          <h1>Settings</h1>
          <p>Manage server and private auth settings.</p>
        </div>
      </header>

      {message && (
        <div className={message.type === 'success' ? ToolsStyles.submitSuccess : ToolsStyles.submitError}>
          {message.text}
        </div>
      )}

      <div className={ToolsStyles.modalContent}>
        <div className={ToolsStyles.formGroup}>
          <label>Server Name</label>
          <input value={serverName} onChange={(e) => setServerName(e.target.value)} className={ToolsStyles.searchInput} />
        </div>
        <div className={ToolsStyles.formGroup}>
          <label>Server URL</label>
          <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} className={ToolsStyles.searchInput} />
        </div>
        <button className={ToolsStyles.refreshBtn} disabled={!canSave} onClick={saveServer}>Save Server</button>

        <hr />

        <div className={ToolsStyles.formGroup}>
          <label>Header Type</label>
          <input value={headerType} onChange={(e) => setHeaderType(e.target.value)} className={ToolsStyles.searchInput} />
        </div>
        <div className={ToolsStyles.formGroup}>
          <label>Access Token</label>
          <textarea rows="3" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className={ToolsStyles.codeInput} />
        </div>
        <div className={ToolsStyles.formGroup}>
          <label>Refresh Token</label>
          <textarea rows="3" value={refreshToken} onChange={(e) => setRefreshToken(e.target.value)} className={ToolsStyles.codeInput} />
        </div>
        <div className={ToolsStyles.formGroup}>
          <label>Expires At</label>
          <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={ToolsStyles.searchInput} />
        </div>
        <div className={ToolsStyles.formGroup}>
          <label>Client ID</label>
          <input value={clientId} onChange={(e) => setClientId(e.target.value)} className={ToolsStyles.searchInput} />
        </div>
        <div className={ToolsStyles.formGroup}>
          <label>Client Secret</label>
          <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} className={ToolsStyles.searchInput} />
        </div>
        <div className={ToolsStyles.formGroup}>
          <label>Token Endpoint</label>
          <input value={tokenEndpoint} onChange={(e) => setTokenEndpoint(e.target.value)} className={ToolsStyles.searchInput} />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className={ToolsStyles.refreshBtn} onClick={saveToken} disabled={savingAuth}>Save Auth</button>
          <button className={ToolsStyles.testBtn} onClick={refreshTokenNow} disabled={refreshingAuth}>Refresh Access Token</button>
        </div>
      </div>
    </div>
  );
}

function toInputDateTime(rawValue) {
  if (!rawValue) {
    return '';
  }
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}
