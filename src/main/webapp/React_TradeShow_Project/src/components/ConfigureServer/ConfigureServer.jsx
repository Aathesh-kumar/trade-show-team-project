import { useMemo, useState } from 'react';
import { usePost } from '../Hooks/usePost';
import ConfigureServerStyles from '../../styles/ConfigureServer.module.css';
import Breadcrumb from './Breadcrumb';
import FormSection from './FormSection';
import InputField from './InputField';
import { SelectField, SliderField, ToggleField, Toast } from './FormFields';
import LoadingDots from '../Loading/LoadingDots';
import { MdBook, MdMessage } from 'react-icons/md';
import { buildUrl, getAuthHeaders, parseApiResponse, unwrapData } from '../../services/api';

export default function ConfigureServer({ onClose, onSuccess, canLogout = false, onLogout }) {
    const redirectUri = `${window.location.origin}/trade-show-team-project/oauth-callback.html`;
    const [formData, setFormData] = useState({
        serverName: '',
        serverUrl: '',
        headerType: 'Zoho-oauthtoken',
        accessToken: '',
        refreshToken: '',
        clientId: '',
        clientSecret: '',
        requiredScope: 'ZohoMCP.tool.execute',
        additionalScopes: '',
        oauthBaseUrl: 'https://accounts.zoho.in',
        tokenEndpoint: 'https://accounts.zoho.in/oauth/v2/token',
        monitorIntervalMinutes: 30,
        connectionTimeout: 5000,
        autoReconnect: true
    });

    const [authorizationCode, setAuthorizationCode] = useState('');
    const [showClientSecret, setShowClientSecret] = useState(false);
    const [exchangingToken, setExchangingToken] = useState(false);
    const [toast, setToast] = useState(null);

    const { loading, execute } = usePost(buildUrl('/server'), {
        validateData: (data) => {
            if (!data.serverName || data.serverName.trim().length < 3) {
                return 'Server name must be at least 3 characters';
            }
            if (!data.serverUrl || !String(data.serverUrl).toLowerCase().includes('mcp/')) {
                return 'Server URL must contain `mcp/` in the endpoint path';
            }
            if (!data.headerType || !String(data.headerType).trim()) {
                return 'Header type is required';
            }
            if (!data.clientId || !String(data.clientId).trim()) {
                return 'Client ID is required';
            }
            if (!data.clientSecret || !String(data.clientSecret).trim()) {
                return 'Client Secret is required';
            }
            if (!data.requiredScope || !String(data.requiredScope).trim()) {
                return 'Required scope is required';
            }
            if (!data.oauthBaseUrl || !/^https?:\/\/.+/.test(data.oauthBaseUrl)) {
                return 'OAuth Base URL is required and must be valid';
            }
            if (!data.accessToken || !String(data.accessToken).trim() || !data.refreshToken || !String(data.refreshToken).trim()) {
                return 'Click Open OAuth and complete token generation before saving';
            }
            if (!data.tokenEndpoint || !/^https?:\/\/.+/.test(data.tokenEndpoint)) {
                return 'Token Endpoint is required and must be valid';
            }
            const interval = Number(data.monitorIntervalMinutes);
            if (!Number.isFinite(interval) || interval < 1 || interval > 1440) {
                return 'Monitor interval must be between 1 and 1440 minutes';
            }
            const timeout = Number(data.connectionTimeout);
            if (!Number.isFinite(timeout) || timeout < 1000 || timeout > 30000) {
                return 'Connection timeout must be between 1000ms and 30000ms';
            }
            return true;
        },
        onSuccess: (response) => {
            const server = response?.server || response;
            setToast({ type: 'success', message: 'Server configured successfully!' });
            setTimeout(() => {
                onSuccess && onSuccess(server);
            }, 900);
        },
        onError: (error) => {
            setToast({ type: 'error', message: error.message });
        }
    });

    const handleInputChange = (field, value) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value };
            if (field === 'clientId' || field === 'clientSecret' || field === 'oauthBaseUrl' || field === 'requiredScope' || field === 'additionalScopes') {
                next.accessToken = '';
                next.refreshToken = '';
                next.expiresAt = null;
            }
            return next;
        });
        if (field === 'clientId' || field === 'clientSecret' || field === 'oauthBaseUrl' || field === 'requiredScope' || field === 'additionalScopes') {
            setAuthorizationCode('');
        }
    };

    const quickIntervals = [5, 10, 15, 30, 60, 120];
    const finalScope = useMemo(
        () => buildScopeString(formData.requiredScope, formData.additionalScopes),
        [formData.requiredScope, formData.additionalScopes]
    );
    const oauthUrl = useMemo(
        () => buildAuthorizeUrl(formData.oauthBaseUrl, finalScope, formData.clientId, redirectUri, null),
        [formData.oauthBaseUrl, finalScope, formData.clientId, redirectUri]
    );

    const openOAuthWindow = () => {
        const clientId = String(formData.clientId || '').trim();
        const clientSecret = String(formData.clientSecret || '').trim();
        if (!clientId || !clientSecret) {
            setToast({ type: 'error', message: 'Enter client ID and client secret before opening OAuth.' });
            return;
        }
        if (authorizationCode) {
            setToast({ type: 'success', message: 'OAuth already connected. Change scope/client settings to re-authorize.' });
            return;
        }
        if (!finalScope) {
            setToast({ type: 'error', message: 'Scope is required before opening OAuth.' });
            return;
        }
        const state = `pulse_server_setup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const authUrl = buildAuthorizeUrl(formData.oauthBaseUrl, finalScope, clientId, redirectUri, state);
        if (!authUrl) {
            setToast({ type: 'error', message: 'OAuth URL cannot be generated. Check base URL, scope, and client ID.' });
            return;
        }
        const popup = window.open(authUrl, 'pulse_server_oauth', 'width=900,height=760,resizable=yes,scrollbars=yes');
        if (!popup) {
            setToast({ type: 'error', message: 'Popup blocked. Allow popups and retry OAuth.' });
            return;
        }

        let pollId = null;
        let handled = false;
        const cleanup = () => {
            window.removeEventListener('message', onMessage);
            if (pollId) {
                clearInterval(pollId);
            }
        };

        const handleCode = async (code) => {
            if (handled || !code) {
                return;
            }
            handled = true;
            cleanup();
            try {
                popup.close();
            } catch {
                // ignore popup close failures
            }
            setAuthorizationCode(code);
            await exchangeAuthorizationCode(code);
        };

        const onMessage = (event) => {
            const payload = event.data || {};
            if (payload.type !== 'pulse_oauth_callback') {
                return;
            }
            if (payload.state !== state || !payload.code) {
                return;
            }
            handleCode(payload.code);
        };
        window.addEventListener('message', onMessage);

        pollId = setInterval(async () => {
            try {
                if (popup.closed) {
                    cleanup();
                    return;
                }
                const popupHref = popup.location.href;
                const popupUrl = new URL(popupHref);
                const popupState = popupUrl.searchParams.get('state');
                const popupCode = popupUrl.searchParams.get('code');
                if (!popupCode || !popupState || popupState !== state) {
                    return;
                }
                await handleCode(popupCode);
            } catch {
                // cross-origin until redirect returns to our callback URL
            }
        }, 450);
    };

    const handleCopyOAuthUrl = async () => {
        if (!oauthUrl) {
            setToast({ type: 'error', message: 'OAuth URL is empty. Fill client ID and scope first.' });
            return;
        }
        try {
            await navigator.clipboard.writeText(oauthUrl);
            setToast({ type: 'success', message: 'OAuth URL copied.' });
        } catch {
            setToast({ type: 'error', message: 'Failed to copy OAuth URL.' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const oauthBase = String(formData.oauthBaseUrl || '').replace(/\/$/, '');
            const payload = {
                ...formData,
                scope: finalScope,
                oauthTokenLink: `${oauthBase}/oauth/v2/auth`,
                authorizationCode,
                redirectUri,
                monitorIntervalMinutes: Number(formData.monitorIntervalMinutes) || 30,
                connectionTimeout: clampTimeout(formData.connectionTimeout, formData.autoReconnect),
                expiresAt: formData.expiresAt || null
            };
            await execute(payload);
        } catch {
            // handled in hook
        }
    };

    const exchangeAuthorizationCode = async (code) => {
        const clientId = String(formData.clientId || '').trim();
        const clientSecret = String(formData.clientSecret || '').trim();
        const tokenEndpoint = String(formData.tokenEndpoint || '').trim();
        if (!clientId || !clientSecret || !tokenEndpoint) {
            setToast({ type: 'error', message: 'Token exchange needs client ID, client secret, and token endpoint.' });
            return;
        }

        setExchangingToken(true);
        setToast({ type: 'success', message: 'Authorization code captured. Exchanging for tokens...' });
        try {
            const response = await fetch(buildUrl('/server/exchange-code'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    code,
                    redirectUri,
                    clientId,
                    clientSecret,
                    tokenEndpoint
                })
            });
            const parsed = await parseApiResponse(response);
            const data = unwrapData(parsed) || {};
            if (!data?.accessToken || !data?.refreshToken) {
                throw new Error('Token exchange failed');
            }

            setFormData((prev) => ({
                ...prev,
                accessToken: data.accessToken || '',
                refreshToken: data.refreshToken || '',
                expiresAt: data.expiresAt || null
            }));
            setToast({ type: 'success', message: 'OAuth tokens generated successfully.' });
        } catch (error) {
            setToast({ type: 'error', message: error?.message || 'Failed to exchange authorization code.' });
        } finally {
            setExchangingToken(false);
        }
    };

    return (
        <div className={ConfigureServerStyles.configurePage}>
            <div className={ConfigureServerStyles.container}>
                <Breadcrumb
                    items={[
                        { label: 'Dashboard', path: '/dashboard' },
                        { label: 'Servers', path: '/servers' },
                        { label: 'Add New Server', active: true }
                    ]}
                />

                <header className={ConfigureServerStyles.header}>
                    <h1>Configure Pulse24x7 Server</h1>
                    <p>Connect a new Model Context Protocol endpoint to your monitoring network.</p>
                </header>

                <form className={ConfigureServerStyles.form} onSubmit={handleSubmit}>
                    <FormSection icon="info" title="GENERAL INFORMATION">
                        <InputField
                            label="Server Name"
                            placeholder="e.g., Production MCP Server"
                            value={formData.serverName}
                            onChange={(value) => handleInputChange('serverName', value)}
                            required
                            icon="server"
                            tooltip="A descriptive name for your Pulse24x7 server"
                        />

                        <InputField
                            label="Server URL (Endpoint)"
                            placeholder="api.example.com/mcp/v1"
                            value={formData.serverUrl}
                            onChange={(value) => handleInputChange('serverUrl', value)}
                            required
                            icon="link"
                            tooltip="Endpoint must include mcp/ in the URL path"
                        />
                    </FormSection>

                    <FormSection icon="lock" title="AUTHENTICATION">
                        <SelectField
                            label="Header Type"
                            value={formData.headerType}
                            onChange={(value) => handleInputChange('headerType', value)}
                            options={[
                                'Zoho-oauthtoken',
                                'Bearer',
                                'API Key',
                                'OAuth 2.0',
                                'Basic Auth'
                            ]}
                        />

                        <InputField
                            label="Client ID"
                            placeholder="••••••••••••••••••••••••"
                            value={formData.clientId}
                            onChange={(value) => handleInputChange('clientId', value)}
                            required
                            icon="client"
                            tooltip="OAuth client ID for token generation"
                        />

                        <InputField
                            label="Client Secret"
                            type={showClientSecret ? 'text' : 'password'}
                            placeholder="••••••••••••••••••••••••"
                            value={formData.clientSecret}
                            onChange={(value) => handleInputChange('clientSecret', value)}
                            showToggle
                            required
                            icon="secret"
                            onToggle={() => setShowClientSecret(!showClientSecret)}
                            tooltip="OAuth client secret for token generation"
                        />

                        <InputField
                            label="Required Scope"
                            placeholder="ZohoMCP.tool.execute"
                            value={formData.requiredScope}
                            onChange={() => null}
                            required
                            icon="token"
                            tooltip="Default scope (fixed)"
                            readOnly
                        />

                        <InputField
                            label="Additional Scopes (comma separated)"
                            placeholder="scope.one,scope.two"
                            value={formData.additionalScopes}
                            onChange={(value) => handleInputChange('additionalScopes', value)}
                            icon="token"
                            tooltip="These scopes will be appended after default scope with comma"
                        />

                        <InputField
                            label="OAuth Base URL"
                            placeholder="https://accounts.zoho.in"
                            value={formData.oauthBaseUrl}
                            onChange={(value) => handleInputChange('oauthBaseUrl', value)}
                            required
                            icon="link"
                        />

                        <InputField
                            label="Token Endpoint"
                            placeholder="https://accounts.zoho.in/oauth/v2/token"
                            value={formData.tokenEndpoint}
                            onChange={(value) => handleInputChange('tokenEndpoint', value)}
                            required
                            icon="token"
                            tooltip="OAuth token exchange endpoint"
                        />

                        {oauthUrl ? (
                            <div className={ConfigureServerStyles.oauthUrlBox}>
                                <textarea
                                    readOnly
                                    value={oauthUrl}
                                    rows={4}
                                    className={ConfigureServerStyles.oauthUrlText}
                                />
                                <div className={ConfigureServerStyles.oauthActions}>
                                    <button type="button" className={ConfigureServerStyles.secondaryInlineBtn} onClick={handleCopyOAuthUrl}>
                                        Copy URL
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div className={ConfigureServerStyles.actionsInline}>
                            <button
                                type="button"
                                className={ConfigureServerStyles.secondaryInlineBtn}
                                onClick={openOAuthWindow}
                                disabled={!formData.clientId || !formData.clientSecret || !finalScope || exchangingToken}
                            >
                                {exchangingToken ? 'Exchanging Token...' : authorizationCode ? 'Re-Authorize OAuth' : 'Open OAuth'}
                            </button>
                        </div>
                    </FormSection>

                    <FormSection icon="settings" title="CONNECTION SETTINGS">
                        <div className={ConfigureServerStyles.dateTimeField}>
                            <label>Server Monitor Interval (minutes)</label>
                            <div className={ConfigureServerStyles.quickSelectButtons}>
                                {quickIntervals.map((mins) => (
                                    <button
                                        key={mins}
                                        type="button"
                                        className={ConfigureServerStyles.quickBtn}
                                        onClick={() => handleInputChange('monitorIntervalMinutes', mins)}
                                    >
                                        {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                                    </button>
                                ))}
                            </div>

                            <div className={ConfigureServerStyles.customDateTime}>
                                <input
                                    type="number"
                                    min="1"
                                    max="1440"
                                    value={Number(formData.monitorIntervalMinutes) || 30}
                                    onChange={(e) => handleInputChange('monitorIntervalMinutes', Math.max(1, Math.min(1440, Number(e.target.value) || 30)))}
                                    className={ConfigureServerStyles.dateTimeInput}
                                />
                            </div>
                        </div>

                        <SliderField
                            label="Connection Timeout"
                            value={formData.connectionTimeout}
                            onChange={(value) => handleInputChange('connectionTimeout', clampTimeout(value, formData.autoReconnect))}
                            min={1000}
                            max={formData.autoReconnect ? 30000 : 10000}
                            step={1000}
                            unit="ms"
                            tooltip={formData.autoReconnect ? '1000ms to 30000ms' : 'Auto reconnect OFF: max timeout 10000ms'}
                        />

                        <ToggleField
                            label="Auto-Reconnect Enabled"
                            description={formData.autoReconnect
                                ? 'Reconnect mode ON (extended timeout range enabled).'
                                : 'Reconnect mode OFF (reduced timeout range).'}
                            checked={Boolean(formData.autoReconnect)}
                            onChange={(value) => {
                                const nextTimeout = clampTimeout(formData.connectionTimeout, value);
                                setFormData((prev) => ({ ...prev, autoReconnect: value, connectionTimeout: nextTimeout }));
                            }}
                        />
                    </FormSection>

                    <div className={ConfigureServerStyles.actions}>
                        {canLogout ? (
                            <button
                                type="button"
                                className={ConfigureServerStyles.logoutBtn}
                                onClick={onLogout}
                                disabled={loading}
                            >
                                Logout
                            </button>
                        ) : null}

                        <button
                            type="button"
                            className={ConfigureServerStyles.cancelBtn}
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className={ConfigureServerStyles.saveBtn}
                            disabled={loading}
                        >
                            {loading ? <LoadingDots text="Saving" /> : 'Save Server'}
                        </button>
                    </div>
                </form>

                <footer className={ConfigureServerStyles.helpSection}>
                    <div className={ConfigureServerStyles.helpCard}>
                        <span className={ConfigureServerStyles.helpIcon}>{<MdBook />}</span>
                        <div>
                            <strong>Need help with Pulse24x7?</strong>
                            <p>Check our documentation for server setup guides.</p>
                        </div>
                    </div>

                    <div className={ConfigureServerStyles.helpCard}>
                        <span className={ConfigureServerStyles.helpIcon}>{<MdMessage />}</span>
                        <div>
                            <strong>Community Support</strong>
                            <p>Ask questions in our developer discord channel.</p>
                        </div>
                    </div>
                </footer>
            </div>

            {toast && (
                <Toast
                    type={toast.type}
                    message={toast.message}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}

function clampTimeout(value, autoReconnect) {
    const min = 1000;
    const max = autoReconnect ? 30000 : 10000;
    const n = Number(value) || min;
    return Math.max(min, Math.min(max, n));
}

function buildScopeString(requiredScope, additionalScopes) {
    const required = String(requiredScope || '').trim();
    const extras = String(additionalScopes || '')
        .split(',')
        .map((scope) => scope.trim())
        .filter(Boolean);
    if (!required) {
        return extras.join(',');
    }
    return [required, ...extras].join(',');
}

function buildAuthorizeUrl(baseUrl, scope, clientId, redirectUri, state) {
    const base = String(baseUrl || '').replace(/\/$/, '');
    const normalizedScope = String(scope || '').trim();
    const normalizedClientId = String(clientId || '').trim();
    if (!base || !normalizedScope || !normalizedClientId) {
        return '';
    }
    const nextState = state || `pulse_server_setup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return `${base}/oauth/v2/auth?scope=${encodeURIComponent(normalizedScope)}&client_id=${encodeURIComponent(normalizedClientId)}&state=${encodeURIComponent(nextState)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&access_type=offline&prompt=consent`;
}
