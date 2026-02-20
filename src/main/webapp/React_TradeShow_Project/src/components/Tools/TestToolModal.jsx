import { useEffect, useMemo, useState } from 'react';
import ToolsStyles from '../../styles/Tools.module.css';
import { MdCheckCircle, MdClose, MdContentCopy, MdErrorOutline, MdPlayArrow } from 'react-icons/md';
import { usePost } from '../Hooks/usePost';
import { buildUrl } from '../../services/api';
import InputField from '../ConfigureServer/InputField';
import CustomDropdown from '../Common/CustomDropdown';
import { useGet } from '../Hooks/useGet';

const DEFAULT_SCOPE = 'ZohoMCP.tool.execute';

export default function TestToolModal({ tool, serverId, onClose, onCompleted }) {
    const schema = getSchema(tool);
    const [mode, setMode] = useState('form');
    const [inputParams, setInputParams] = useState('');
    const [formValues, setFormValues] = useState(generateExample(schema));
    const [testResult, setTestResult] = useState(null);
    const [errors, setErrors] = useState({});
    const [payloadCopied, setPayloadCopied] = useState(false);
    const [scopeRecovery, setScopeRecovery] = useState({
        active: false,
        requiredScope: DEFAULT_SCOPE,
        additionalScopes: '',
        oauthBaseUrl: 'https://accounts.zoho.in',
        message: '',
        oauthState: ''
    });
    const [saveMessage, setSaveMessage] = useState(null);

    const { data: authData } = useGet('/auth', {
        immediate: !!serverId,
        params: { serverId },
        dependencies: [serverId]
    });

    const { execute: testTool, loading } = usePost(
        buildUrl('/tool/test'),
        {
            onSuccess: (response) => {
                setTestResult({
                    success: true,
                    data: response.result || response,
                    timestamp: new Date()
                });
                setErrors({});
                onCompleted?.();
            },
            onError: (error) => {
                setTestResult({
                    success: false,
                    error: error.message,
                    timestamp: new Date()
                });
                const payload = error?.payload || {};
                const needsScopeRecovery = payload?.errorCode === 'scope_mismatch'
                    || /scope/i.test(String(error?.message || ''));
                if (needsScopeRecovery) {
                    setScopeRecovery((prev) => ({
                        ...prev,
                        active: true,
                        requiredScope: payload?.requiredScope || DEFAULT_SCOPE,
                        message: payload?.actionMessage || error.message
                    }));
                }
            }
        }
    );
    const { execute: exchangeCode, loading: exchangingCode } = usePost(buildUrl('/auth/exchange-code', { serverId }));

    const handleTest = async () => {
        setErrors({});
        setTestResult(null);

        let payloadJson = '{}';
        if (mode === 'json') {
            if (inputParams.trim()) {
                try {
                    JSON.parse(inputParams);
                } catch (e) {
                    setErrors({ inputParams: 'Invalid JSON format' });
                    return;
                }
            }
            payloadJson = inputParams || '{}';
        } else {
            const validation = validateSchema(schema, formValues, []);
            if (validation) {
                setErrors({ form: validation });
                return;
            }
            payloadJson = JSON.stringify(formValues);
        }

        try {
            await testTool({
                serverId,
                toolId: tool.toolId && tool.toolId > 0 ? tool.toolId : null,
                toolName: tool.toolName || tool.name,
                inputParams: payloadJson
            });
        } catch (error) {
            // handled in hook
        }
    };

    const handleUseExample = () => {
        const sample = generateExample(schema);
        if (mode === 'json') {
            setInputParams(JSON.stringify(sample, null, 2));
        } else {
            setFormValues(sample);
        }
        setErrors({});
    };

    useEffect(() => {
        if (!authData) {
            return;
        }
        const endpoint = String(authData.tokenEndpoint || '').trim();
        const derivedBase = endpoint ? endpoint.replace(/\/oauth\/v2\/token.*$/i, '') : '';
        setScopeRecovery((prev) => ({
            ...prev,
            oauthBaseUrl: derivedBase || prev.oauthBaseUrl
        }));
    }, [authData?.tokenEndpoint]);

    const finalScope = useMemo(
        () => buildScopeString(scopeRecovery.requiredScope || DEFAULT_SCOPE, scopeRecovery.additionalScopes),
        [scopeRecovery.requiredScope, scopeRecovery.additionalScopes]
    );

    const oauthUrl = useMemo(() => {
        const state = scopeRecovery.oauthState || `pulse_scope_${serverId}_${Date.now()}`;
        return buildOAuthUrl({
            baseUrl: scopeRecovery.oauthBaseUrl,
            scope: finalScope,
            clientId: authData?.clientId,
            serverId,
            state
        });
    }, [finalScope, scopeRecovery.oauthBaseUrl, scopeRecovery.oauthState, authData?.clientId, serverId]);

    const handleStartOAuth = () => {
        setSaveMessage(null);
        const nextState = `pulse_scope_${serverId}_${Date.now()}`;
        setScopeRecovery((prev) => ({ ...prev, oauthState: nextState }));
        const redirectUri = `${window.location.origin}/trade-show-team-project/oauth-callback.html`;
        const url = buildOAuthUrl({
            baseUrl: scopeRecovery.oauthBaseUrl,
            scope: finalScope,
            clientId: authData?.clientId,
            serverId,
            state: nextState,
            redirectUri
        });
        if (!url) {
            setSaveMessage({ type: 'error', text: 'OAuth URL cannot be generated. Check scope/client ID.' });
            return;
        }
        const popup = window.open(url, 'pulse_oauth_scope', 'width=860,height=760,resizable=yes,scrollbars=yes');
        if (!popup) {
            setSaveMessage({ type: 'error', text: 'Popup blocked. Allow popups and retry.' });
            return;
        }

        let pollId = null;
        const cleanup = () => {
            window.removeEventListener('message', onMessage);
            if (pollId) {
                clearInterval(pollId);
            }
        };

        const onMessage = async (event) => {
            if (event.origin !== window.location.origin) {
                return;
            }
            const payload = event.data || {};
            if (payload.type !== 'pulse_oauth_callback') {
                return;
            }
            const code = payload.code;
            const state = payload.state;
            if (!code || !state || state !== nextState) {
                return;
            }
            cleanup();
            popup.close();
            await handleExchangeCode(code, redirectUri, state);
        };

        window.addEventListener('message', onMessage);

        pollId = setInterval(async () => {
            try {
                if (popup.closed) {
                    cleanup();
                    return;
                }
                const popupUrl = popup.location.href;
                if (!popupUrl.startsWith(redirectUri)) {
                    return;
                }
                const params = new URL(popupUrl).searchParams;
                const code = params.get('code');
                const state = params.get('state');
                if (!code || !state || state !== nextState) {
                    return;
                }
                cleanup();
                popup.close();
                await handleExchangeCode(code, redirectUri, state);
            } catch (e) {
                // cross-origin until redirect lands on our app
            }
        }, 450);
    };

    const handleCopyOAuthUrl = async () => {
        if (!oauthUrl) {
            return;
        }
        await navigator.clipboard.writeText(oauthUrl);
        setSaveMessage({ type: 'success', text: 'OAuth URL copied.' });
    };

    const handleExchangeCode = async (code, redirectUri, stateFromRedirect) => {
        setSaveMessage(null);
        if (!serverId) {
            setSaveMessage({ type: 'error', text: 'Server is not selected. Select a server and retry OAuth.' });
            return;
        }
        try {
            const tokenEndpoint = `${(scopeRecovery.oauthBaseUrl || 'https://accounts.zoho.in').replace(/\/$/, '')}/oauth/v2/token`;
            await exchangeCode({
                serverId: Number(serverId),
                code,
                redirectUri,
                tokenEndpoint,
                state: stateFromRedirect || scopeRecovery.oauthState
            });
            window.dispatchEvent(new CustomEvent('pulse24x7-auth-token-updated', { detail: { serverId: Number(serverId) } }));
            setSaveMessage({ type: 'success', text: 'Access token and refresh token updated successfully.' });
            setScopeRecovery((prev) => ({ ...prev, active: false }));
        } catch (e) {
            const details = e?.payload?.message || e?.payload?.error || e?.message || 'Token exchange failed';
            setSaveMessage({ type: 'error', text: details });
        }
    };

    return (
        <div className={ToolsStyles.modalOverlay} onClick={onClose}>
            <div className={ToolsStyles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={ToolsStyles.modalHeader}>
                    <h2>Test Tool: {tool.toolName}</h2>
                    <button className={ToolsStyles.closeBtn} onClick={onClose}>
                        <MdClose />
                    </button>
                </div>

                <div className={ToolsStyles.modalContent}>
                    <div className={ToolsStyles.testToolInfo}>
                        <div className={ToolsStyles.infoRow}>
                            <span className={ToolsStyles.label}>Tool ID:</span>
                            <span className={ToolsStyles.value}>#{tool.toolId || tool.id}</span>
                        </div>
                        <div className={ToolsStyles.infoRow}>
                            <span className={ToolsStyles.label}>Mode:</span>
                            <span className={ToolsStyles.value}>{mode === 'form' ? 'Dynamic Form' : 'Raw JSON'}</span>
                        </div>
                    </div>

                    <div className={ToolsStyles.formGroup}>
                        <div className={ToolsStyles.labelRow}>
                            <label htmlFor="inputParams">Input Parameters</label>
                            <button type="button" className={ToolsStyles.exampleBtn} onClick={handleUseExample}>
                                Use Example
                            </button>
                        </div>

                        <div className={ToolsStyles.filterGroup}>
                            <button
                                type="button"
                                className={`${ToolsStyles.filterBtn} ${mode === 'form' ? ToolsStyles.active : ''}`}
                                onClick={() => setMode('form')}
                            >
                                Form Builder
                            </button>
                            <button
                                type="button"
                                className={`${ToolsStyles.filterBtn} ${mode === 'json' ? ToolsStyles.active : ''}`}
                                onClick={() => setMode('json')}
                            >
                                Raw JSON
                            </button>
                        </div>

                        {mode === 'json' ? (
                            <>
                                <textarea
                                    id="inputParams"
                                    value={inputParams}
                                    onChange={(e) => {
                                        setInputParams(e.target.value);
                                        setErrors({});
                                    }}
                                    placeholder={JSON.stringify(generateExample(schema), null, 2)}
                                    rows="10"
                                    className={`${ToolsStyles.codeInput} ${errors.inputParams ? ToolsStyles.error : ''}`}
                                />
                                {errors.inputParams ? <span className={ToolsStyles.errorMessage}>{errors.inputParams}</span> : null}
                            </>
                        ) : (
                            <div className={ToolsStyles.toolTestGrid}>
                                <div className={ToolsStyles.toolFormPane}>
                                    <SchemaFields
                                        schema={schema}
                                        rootValue={formValues}
                                        path={[]}
                                        parentRequired={[]}
                                        onChange={(path, nextValue) => {
                                            setFormValues((prev) => setValueAtPath(prev, path, nextValue));
                                            setErrors({});
                                        }}
                                    />
                                    {errors.form ? <span className={ToolsStyles.errorMessage}>{errors.form}</span> : null}
                                </div>

                                <div className={ToolsStyles.toolPreviewPane}>
                                    <div className={ToolsStyles.schemaLabelRow}>
                                        <strong>Live Payload</strong>
                                        <button
                                            type="button"
                                            className={`${ToolsStyles.copyBtn} ${payloadCopied ? ToolsStyles.copied : ''}`}
                                            onClick={() => {
                                                navigator.clipboard.writeText(JSON.stringify(formValues, null, 2));
                                                setPayloadCopied(true);
                                                setTimeout(() => setPayloadCopied(false), 1200);
                                            }}
                                        >
                                            <MdContentCopy />
                                            {payloadCopied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                    <pre className={ToolsStyles.jsonPreview}>
                                        <code>{JSON.stringify(formValues, null, 2)}</code>
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={handleTest} className={ToolsStyles.testBtn} disabled={loading || !tool.isAvailability}>
                        {loading ? (
                            <>
                                <div className={ToolsStyles.buttonSpinner}></div>
                                Testing...
                            </>
                        ) : (
                            <>
                                <MdPlayArrow />
                                Run Test
                            </>
                        )}
                    </button>

                    {testResult ? (
                        <div className={ToolsStyles.testResult}>
                            <div className={ToolsStyles.resultHeader}>
                                <h3>Test Result</h3>
                                <span className={ToolsStyles.resultTime}>{testResult.timestamp.toLocaleTimeString()}</span>
                            </div>
                            <div className={`${ToolsStyles.resultContent} ${testResult.success ? ToolsStyles.success : ToolsStyles.error}`}>
                                <div className={ToolsStyles.resultStatus}>
                                    <span className={ToolsStyles.statusIcon}>
                                        {testResult.success ? <MdCheckCircle /> : <MdErrorOutline />}
                                    </span>
                                    <span className={ToolsStyles.statusText}>{testResult.success ? 'Success' : 'Failed'}</span>
                                </div>
                                <pre className={ToolsStyles.resultData}>
                                    <code>{testResult.success ? JSON.stringify(testResult.data, null, 2) : testResult.error}</code>
                                </pre>
                            </div>
                        </div>
                    ) : null}

                    {scopeRecovery.active ? (
                        <div className={ToolsStyles.scopeRecoveryCard}>
                            <h3>OAuth Scope Recovery</h3>
                            <p className={ToolsStyles.scopeHint}>
                                {scopeRecovery.message || 'Scope mismatch detected. Enter correct scope and regenerate OAuth tokens.'}
                            </p>
                            <InputField
                                label="Required Scope"
                                value={scopeRecovery.requiredScope}
                                onChange={() => null}
                                placeholder="ZohoMCP.tool.execute"
                                tooltip="Default scope (fixed)"
                                readOnly={true}
                            />
                            <InputField
                                label="Additional Scopes (comma separated)"
                                value={scopeRecovery.additionalScopes}
                                onChange={(value) => setScopeRecovery((prev) => ({ ...prev, additionalScopes: value }))}
                                placeholder="scope.one,scope.two"
                                tooltip="These scopes will be appended after default scope with comma"
                            />
                            <InputField
                                label="OAuth Base URL"
                                value={scopeRecovery.oauthBaseUrl}
                                onChange={(value) => setScopeRecovery((prev) => ({ ...prev, oauthBaseUrl: value }))}
                                placeholder="https://accounts.zoho.in"
                            />
                            {oauthUrl ? (
                                <div className={ToolsStyles.oauthUrlBox}>
                                    <textarea readOnly value={oauthUrl} rows={4} className={ToolsStyles.oauthUrlText} />
                                    <div className={ToolsStyles.oauthActions}>
                                        <button type="button" className={ToolsStyles.secondaryBtn} onClick={handleCopyOAuthUrl}>
                                            Copy URL
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                            {saveMessage ? (
                                <div className={saveMessage.type === 'success' ? ToolsStyles.submitSuccess : ToolsStyles.submitError}>
                                    {saveMessage.text}
                                </div>
                            ) : null}
                            <button
                                type="button"
                                className={ToolsStyles.primaryBtn}
                                onClick={handleStartOAuth}
                                disabled={exchangingCode || !authData?.clientId}
                            >
                                {exchangingCode ? 'Regenerating...' : 'Open OAuth and Regenerate Tokens'}
                            </button>
                        </div>
                    ) : null}
                </div>

                <div className={ToolsStyles.modalActions}>
                    <button onClick={onClose} className={ToolsStyles.closeModalBtn}>Close</button>
                </div>
            </div>
        </div>
    );
}

function SchemaFields({ schema, rootValue, path, onChange, parentRequired = [] }) {
    if (!schema || typeof schema !== 'object') {
        return null;
    }

    const isObject = schema.type === 'object' || !!schema.properties;
    if (isObject && schema.properties) {
        return (
            <section className={ToolsStyles.schemaSection}>
                {path.length > 0 ? (
                    <header className={ToolsStyles.schemaSectionTitle}>
                        <span>{path[path.length - 1]}</span>
                        {schema.description ? <small className={ToolsStyles.schemaHint}>{schema.description}</small> : null}
                    </header>
                ) : null}
                {Object.entries(schema.properties).map(([key, child]) => (
                    <SchemaFields
                        key={[...path, key].join('.')}
                        schema={child}
                        rootValue={rootValue}
                        path={[...path, key]}
                        parentRequired={schema.required || []}
                        onChange={onChange}
                    />
                ))}
            </section>
        );
    }

    const name = path[path.length - 1] || 'field';
    const required = parentRequired.includes(name);
    const value = getValueAtPath(rootValue, path);

    const label = (
        <div className={ToolsStyles.schemaLabelRow}>
            <span>{name}</span>
            {required ? <span className={ToolsStyles.requiredBadge}>required</span> : null}
        </div>
    );

    if (schema.type === 'boolean') {
        return (
            <label className={ToolsStyles.schemaCheckboxRow}>
                <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => onChange(path, e.target.checked)}
                />
                <div>
                    {label}
                    {schema.description ? <small className={ToolsStyles.schemaHint}>{schema.description}</small> : null}
                </div>
            </label>
        );
    }

    if (schema.enum && Array.isArray(schema.enum)) {
        return (
            <label className={ToolsStyles.schemaField}>
                {label}
                <CustomDropdown
                    value={value ?? ''}
                    onChange={(next) => onChange(path, next)}
                    options={schema.enum.map((option) => ({ value: String(option), label: String(option) }))}
                    buttonClassName={ToolsStyles.schemaInput}
                />
                {schema.description ? <small className={ToolsStyles.schemaHint}>{schema.description}</small> : null}
            </label>
        );
    }

    if (schema.type === 'string' && Number(schema.maxLength || 0) > 120) {
        return (
            <label className={ToolsStyles.schemaField}>
                {label}
                <textarea
                    className={ToolsStyles.schemaTextarea}
                    value={value ?? ''}
                    maxLength={schema.maxLength}
                    onChange={(e) => onChange(path, e.target.value)}
                />
                {schema.description ? <small className={ToolsStyles.schemaHint}>{schema.description}</small> : null}
            </label>
        );
    }

    return (
        <label className={ToolsStyles.schemaField}>
            <InputField
                label={name}
                type={schema.type === 'number' || schema.type === 'integer' ? 'number' : 'text'}
                value={value ?? ''}
                onChange={(raw) => {
                    const parsed = (schema.type === 'number' || schema.type === 'integer')
                        ? (raw === '' ? '' : Number(raw))
                        : raw;
                    onChange(path, parsed);
                }}
                placeholder={schema.description || `Enter ${name}`}
                tooltip={schema.description || undefined}
            />
        </label>
    );
}

function getSchema(tool) {
    const raw = tool?.inputSchema || tool?.jsonSchema || {};
    try {
        if (typeof raw === 'string') {
            return JSON.parse(raw);
        }
        return raw || {};
    } catch (e) {
        return {};
    }
}

function generateExample(schema) {
    if (!schema || typeof schema !== 'object') {
        return {};
    }
    if ((schema.type === 'object' || schema.properties) && schema.properties) {
        const result = {};
        Object.entries(schema.properties).forEach(([key, child]) => {
            result[key] = generateExample(child);
        });
        return result;
    }
    if (schema.type === 'number' || schema.type === 'integer') {
        return 0;
    }
    if (schema.type === 'boolean') {
        return false;
    }
    if (schema.type === 'array') {
        return [];
    }
    if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
        return schema.enum[0];
    }
    if (schema.default !== undefined) {
        return schema.default;
    }
    if (schema.example !== undefined) {
        return schema.example;
    }
    return '';
}

function validateSchema(schema, values, path) {
    if (!schema || typeof schema !== 'object') {
        return null;
    }

    if ((schema.type === 'object' || schema.properties) && schema.properties) {
        const required = schema.required || [];
        for (const key of required) {
            const val = values?.[key];
            if (val === undefined || val === null || val === '') {
                return `Required field missing: ${[...path, key].join('.')}`;
            }
        }
        for (const [key, child] of Object.entries(schema.properties)) {
            const err = validateSchema(child, values?.[key], [...path, key]);
            if (err) {
                return err;
            }
        }
    }
    return null;
}

function setValueAtPath(source, path, value) {
    const root = JSON.parse(JSON.stringify(source || {}));
    let cursor = root;
    for (let i = 0; i < path.length - 1; i++) {
        const part = path[i];
        if (typeof cursor[part] !== 'object' || cursor[part] === null) {
            cursor[part] = {};
        }
        cursor = cursor[part];
    }
    cursor[path[path.length - 1]] = value;
    return root;
}

function getValueAtPath(source, path) {
    let cursor = source;
    for (const part of path) {
        if (cursor == null || typeof cursor !== 'object') {
            return undefined;
        }
        cursor = cursor[part];
    }
    return cursor;
}

function buildOAuthUrl({ baseUrl, scope, clientId, serverId, state, redirectUri }) {
    if (!scope || !clientId) {
        return '';
    }
    const base = (baseUrl || 'https://accounts.zoho.in').replace(/\/$/, '');
    const safeRedirectUri = redirectUri || `${window.location.origin}/trade-show-team-project/oauth-callback.html`;
    const finalState = state || `pulse_scope_${serverId}_${Date.now()}`;
    return `${base}/oauth/v2/auth?scope=${encodeURIComponent(scope)}&client_id=${encodeURIComponent(clientId)}&state=${encodeURIComponent(finalState)}&response_type=code&redirect_uri=${encodeURIComponent(safeRedirectUri)}&access_type=offline`;
}

function buildScopeString(defaultScope, additionalScopes) {
    const base = String(defaultScope || DEFAULT_SCOPE).trim();
    const extras = String(additionalScopes || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s) => s !== base);
    if (extras.length === 0) {
        return base;
    }
    return `${base},${extras.join(',')}`;
}
