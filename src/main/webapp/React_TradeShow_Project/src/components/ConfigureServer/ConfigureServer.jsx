import { useState } from 'react';
import { usePost } from '../Hooks/usePost';
import ConfigureServerStyles from '../../styles/ConfigureServer.module.css';
import Breadcrumb from './Breadcrumb';
import FormSection from './FormSection';
import InputField from './InputField';
import { SelectField, SliderField, ToggleField, Toast } from './FormFields';
import DateTimeField from './DateTimeField';
import LoadingDots from '../Loading/LoadingDots';
import { MdBook, MdMessage, MdSensors } from 'react-icons/md';
import { buildUrl } from '../../services/api';

export default function ConfigureServer({ onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        serverName: '',
        serverUrl: '',
        headerType: 'Bearer',
        accessToken: '',
        refreshToken: '',
        expiresAt: '',
        clientId: '',
        clientSecret: '',
        tokenEndpoint: 'https://accounts.zoho.in/oauth/v2/token',
        connectionTimeout: 5000,
        autoReconnect: true
    });

    const [showAccessToken, setShowAccessToken] = useState(false);
    const [showRefreshToken, setShowRefreshToken] = useState(false);
    const [showClientSecret, setShowClientSecret] = useState(false);
    const [toast, setToast] = useState(null);
    const [testingConnection, setTestingConnection] = useState(false);

    const { loading, error, execute } = usePost(buildUrl('/server'), {
        validateData: (data) => {
            if (!data.serverName || data.serverName.trim().length < 3) {
                return 'Server name must be at least 3 characters';
            }
            if (!data.serverUrl || !/^https?:\/\/.+/.test(data.serverUrl)) {
                return 'Invalid server URL format (must start with http:// or https://)';
            }
            if (data.accessToken && data.accessToken.trim().length < 10) {
                return 'Access token must be at least 10 characters';
            }
            return true;
        },
        onSuccess: (response) => {
            const server = response?.server || response;
            setToast({ type: 'success', message: 'Server configured successfully!' });
            setTimeout(() => {
                onSuccess && onSuccess(server);
            }, 2000);
        },
        onError: (error) => {
            setToast({ type: 'error', message: error.message });
        }
    });
    const { execute: testServer } = usePost(buildUrl('/server/test'));

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleTestConnection = async () => {
        setTestingConnection(true);
        setToast(null);

        try {
            const response = await testServer({
                serverUrl: formData.serverUrl,
                headerType: formData.headerType,
                accessToken: formData.accessToken
            });
            setToast({
                type: 'success',
                message: `Connection successful (${response?.latencyMs ?? 0} ms)`
            });
        } catch (err) {
            setToast({
                type: 'error',
                message: err.message || 'Connection test failed'
            });
        } finally {
            setTestingConnection(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        try {
            await execute(formData);
        } catch (err) {
            // handled in hook
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
                    <FormSection
                        icon="info"
                        title="GENERAL INFORMATION"
                    >
                        <InputField
                            label="Server Name"
                            placeholder="e.g., Production Analytics Engine"
                            value={formData.serverName}
                            onChange={(value) => handleInputChange('serverName', value)}
                            required
                            tooltip="A descriptive name for your Pulse24x7 server"
                        />

                        <InputField
                            label="Server URL (Endpoint)"
                            placeholder="wss://mcp.production-server.com/v1"
                            value={formData.serverUrl}
                            onChange={(value) => handleInputChange('serverUrl', value)}
                            required
                            icon="link"
                            tooltip="WebSocket URL for the Pulse24x7 endpoint"
                        />
                    </FormSection>

                    <FormSection
                        icon="lock"
                        title="AUTHENTICATION"
                    >
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
                            label="Access Token"
                            type={showAccessToken ? 'text' : 'password'}
                            placeholder="Enter your access token"
                            value={formData.accessToken}
                            onChange={(value) => handleInputChange('accessToken', value)}
                            showToggle
                            required
                            onToggle={() => setShowAccessToken(!showAccessToken)}
                            tooltip="Primary authentication token for API access"
                        />

                        <InputField
                            label="Refresh Token"
                            type={showRefreshToken ? 'text' : 'password'}
                            placeholder="Enter refresh token if available"
                            value={formData.refreshToken}
                            onChange={(value) => handleInputChange('refreshToken', value)}
                            showToggle
                            required
                            onToggle={() => setShowRefreshToken(!showRefreshToken)}
                            tooltip="Token used to refresh the access token when it expires"
                        />

                        <InputField
                            label="Client ID (for auto refresh)"
                            placeholder="Zoho OAuth client id"
                            value={formData.clientId}
                            onChange={(value) => handleInputChange('clientId', value)}
                            tooltip="Required to regenerate access token from refresh token"
                        />

                        <InputField
                            label="Client Secret (for auto refresh)"
                            type={showClientSecret ? 'text' : 'password'}
                            placeholder="Zoho OAuth client secret"
                            value={formData.clientSecret}
                            onChange={(value) => handleInputChange('clientSecret', value)}
                            showToggle
                            onToggle={() => setShowClientSecret(!showClientSecret)}
                            tooltip="Stored for backend token refresh flow"
                        />

                        <InputField
                            label="Token Endpoint"
                            placeholder="https://accounts.zoho.in/oauth/v2/token"
                            value={formData.tokenEndpoint}
                            onChange={(value) => handleInputChange('tokenEndpoint', value)}
                            tooltip="OAuth refresh endpoint"
                        />

                        <DateTimeField
                            label="Token Expiry Time (Optional)"
                            value={formData.expiresAt}
                            onChange={(value) => handleInputChange('expiresAt', value)}
                            tooltip="When the access token will expire"
                        />
                    </FormSection>

                    <FormSection
                        icon="settings"
                        title="CONNECTION SETTINGS"
                    >
                        <SliderField
                            label="Connection Timeout"
                            value={formData.connectionTimeout}
                            onChange={(value) => handleInputChange('connectionTimeout', value)}
                            min={1000}
                            max={30000}
                            step={1000}
                            unit="ms"
                            tooltip="Maximum time to wait for server response"
                        />

                        <ToggleField
                            label="Auto-Reconnect Enabled"
                            description="The system will attempt to reconnect if dropped."
                            checked={formData.autoReconnect}
                            onChange={(value) => handleInputChange('autoReconnect', value)}
                        />
                    </FormSection>

                    {!formData.serverUrl || !formData.accessToken ? (
                        <div className={ConfigureServerStyles.testInfo}>
                            <span className={ConfigureServerStyles.infoIcon}>{<MdSensors />}</span>
                            <div>
                                <strong>Test connection status</strong>
                                <p>Enter a valid URL and access token above to verify the server status before saving.</p>
                            </div>
                        </div>
                    ) : null}

                    <div className={ConfigureServerStyles.actions}>
                        <button
                            type="button"
                            className={ConfigureServerStyles.cancelBtn}
                            onClick={onClose}
                            disabled={loading || testingConnection}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className={ConfigureServerStyles.testBtn}
                            onClick={handleTestConnection}
                            disabled={!formData.serverUrl || !formData.accessToken || testingConnection || loading}
                        >
                            {testingConnection ? (
                                <>
                                    <LoadingDots text="" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    {<MdSensors />} Test Connection
                                </>
                            )}
                        </button>

                        <button
                            type="submit"
                            className={ConfigureServerStyles.saveBtn}
                            disabled={loading || testingConnection}
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
