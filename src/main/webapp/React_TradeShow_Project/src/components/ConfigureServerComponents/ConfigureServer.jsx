import { useState } from 'react';
import { usePost } from '../customUtilHooks/usePost';
import ConfigureServerStyles from '../../styles/ConfigureServer.module.css';
import Breadcrumb from './Breadcrumb';
import FormSection from './FormSection';
import InputField from './InputField';
import { SelectField, SliderField, ToggleField, Toast } from './FormFields';
import LoadingDots from '../LoadingComponents/LoadingDots';
import { MdBook, MdHelp, MdSensors } from 'react-icons/md';

export default function ConfigureServer({ onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        serverName: '',
        serverUrl: '',
        headerType: 'Bearer Token',
        apiKey: '',
        connectionTimeout: 5000,
        autoReconnect: true
    });

    const [showApiKey, setShowApiKey] = useState(false);
    const [toast, setToast] = useState(null);
    const [testingConnection, setTestingConnection] = useState(false);

    const { loading, error, execute } = usePost('http://localhost:8080/trade-show-team-project/server', {
        validateData: (data) => {
            if (!data.serverName || data.serverName.trim().length < 3) {
                return 'Server name must be at least 3 characters';
            }
            // if (!data.serverUrl || !data.serverUrl.match(/^wss?:\/\/.+/)) {
            //     return 'Invalid server URL format (must start with ws:// or wss://)';
            // }
            if (!data.apiKey || data.apiKey.trim().length < 10) {
                return 'API key must be at least 10 characters';
            }
            console.log(data.serverName);
            return true;
        },
        onSuccess: (response) => {
            setToast({ type: 'success', message: 'Server configured successfully!' });
            setTimeout(() => {
                onSuccess && onSuccess(response);
            }, 2000);
        },
        onError: (error) => {
            setToast({ type: 'error', message: error.message });
        }
    });

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
            // Simulate connection test
            await new Promise(resolve => setTimeout(resolve, 2000));

            // In real implementation, call actual API
            const success = Math.random() > 0.3; // 70% success rate for demo

            if (success) {
                setToast({
                    type: 'success',
                    message: 'Handshake verified with production-server.com'
                });
            } else {
                setToast({
                    type: 'error',
                    message: 'Connection failed. Please check your credentials.'
                });
            }
        } catch (err) {
            setToast({
                type: 'error',
                message: 'Connection test failed'
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
            // Error already handled by hook
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
                    <h1>Configure MCP Server</h1>
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
                            tooltip="A descriptive name for your MCP server"
                        />

                        <InputField
                            label="Server URL (Endpoint)"
                            placeholder="wss://mcp.production-server.com/v1"
                            value={formData.serverUrl}
                            onChange={(value) => handleInputChange('serverUrl', value)}
                            required
                            icon="link"
                            tooltip="WebSocket URL for the MCP endpoint"
                        />
                    </FormSection>

                    <FormSection
                        icon="lock"
                        title="AUTHENTICATION"
                    >
                        <div className={ConfigureServerStyles.authFields}>
                            <SelectField
                                label="Header Type"
                                value={formData.headerType}
                                onChange={(value) => handleInputChange('headerType', value)}
                                options={[
                                    'Bearer Token',
                                    'API Key',
                                    'OAuth 2.0',
                                    'Basic Auth'
                                ]}
                            />

                            <InputField
                                label="API Key / Token"
                                type={showApiKey ? 'text' : 'password'}
                                placeholder="••••••••••••••••"
                                value={formData.apiKey}
                                onChange={(value) => handleInputChange('apiKey', value)}
                                required
                                showToggle
                                onToggle={() => setShowApiKey(!showApiKey)}
                            />
                        </div>
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

                    {!formData.serverUrl || !formData.apiKey ? (
                        <div className={ConfigureServerStyles.testInfo}>
                            <span className={ConfigureServerStyles.infoIcon}>{<MdSensors/>}</span>
                            <div>
                                <strong>Test connection status</strong>
                                <p>Enter a valid URL and API key above to verify the server status before saving.</p>
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
                            disabled={!formData.serverUrl || !formData.apiKey || testingConnection || loading}
                        >
                            {testingConnection ? (
                                <>
                                    <LoadingDots text="" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <MdSensors/> Test Connection
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
                        <span className={ConfigureServerStyles.helpIcon}>{<MdBook/>}</span>
                        <div>
                            <strong>Need help with MCP?</strong>
                            <p>Check our documentation for server setup guides.</p>
                        </div>
                    </div>

                    <div className={ConfigureServerStyles.helpCard}>
                        <span className={ConfigureServerStyles.helpIcon}>{<MdHelp/>}</span>
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