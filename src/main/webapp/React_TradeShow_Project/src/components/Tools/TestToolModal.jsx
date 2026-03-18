import { useMemo, useState } from 'react';
import ToolsStyles from '../../styles/Tools.module.css';
import { MdCheckCircle, MdClose, MdContentCopy, MdErrorOutline, MdPlayArrow } from 'react-icons/md';
import { usePost } from '../Hooks/usePost';
import { API_BASE, buildUrl } from '../../services/api';
import InputField from '../ConfigureServer/InputField';
import CustomDropdown from '../Common/CustomDropdown';
import { useGet } from '../Hooks/useGet';
import JsonCodeEditor from '../Common/JsonCodeEditor';

const DEFAULT_SCOPE = 'ZohoMCP.tool.execute';
const SCOPE_OPTIONS = [
    { value: 'ZohoMCP.tool.execute', label: 'Zoho MCP Tool Execute' }
];

export default function TestToolModal({ tool, serverId, onClose, onCompleted }) {
    const schema = getSchema(tool);
    const [mode, setMode] = useState('form');
    const [inputParams, setInputParams] = useState('');
    const [formValues, setFormValues] = useState(generateExample(schema));
    const [testResult, setTestResult] = useState(null);
    const [errors, setErrors] = useState({});
    const [payloadCopied, setPayloadCopied] = useState(false);
    const [requestTimeoutMs, setRequestTimeoutMs] = useState(15000);
    const [scopeRecovery, setScopeRecovery] = useState({
        active: false,
        selectedScopes: [DEFAULT_SCOPE],
        customScopes: '',
        oauthAuthUrl: '',
        tokenEndpoint: '',
        message: '',
        oauthState: ''
    });
    const [saveMessage, setSaveMessage] = useState(null);
    const [oauthState, setOauthState] = useState('');

    const { data: authData } = useGet('/auth', {
        immediate: !!serverId,
        params: { serverId },
        dependencies: [serverId]
    });

    const {
        execute: testTool,
        loading
    } = usePost(buildUrl('/tool/test'));
    const { execute: exchangeCode, loading: exchangingCode } = usePost(buildUrl('/auth/exchange-code', { serverId }));
    const apiOrigin = (() => {
        try {
            return new URL(API_BASE).origin;
        } catch {
            return '';
        }
    })();

    const handleTest = async () => {
        setErrors({});
        setTestResult(null);

        let payloadObject = {};
        if (mode === 'json') {
            if (inputParams.trim()) {
                try {
                    payloadObject = JSON.parse(inputParams);
                } catch {
                    setErrors({ inputParams: 'Invalid JSON format' });
                    return;
                }
            } else {
                payloadObject = {};
            }
        } else {
            const validation = validateSchema(schema, formValues, []);
            if (validation) {
                setErrors({ form: validation });
                return;
            }
            payloadObject = formValues;
        }

        const runRequest = async (candidatePayload) => {
            const timeout = clampRequestTimeoutMs(requestTimeoutMs);
            return testTool({
                serverId,
                toolId: tool.toolId && tool.toolId > 0 ? tool.toolId : null,
                toolName: tool.toolName || tool.name,
                inputParams: JSON.stringify(candidatePayload ?? {}),
                requestTimeoutMs: timeout
            }, { timeoutMs: timeout });
        };

        const trySetErrorState = (error) => {
            const payload = error?.payload || {};
            const needsScopeRecovery = payload?.errorCode === 'scope_mismatch'
                || /scope/i.test(String(error?.message || ''));
            if (needsScopeRecovery) {
                setScopeRecovery((prev) => ({
                    ...prev,
                    active: true,
                    ...parseScopeBreakdown(payload?.requiredScope || DEFAULT_SCOPE),
                    message: payload?.actionMessage || error.message
                }));
            }
            setTestResult({
                success: false,
                error: error?.message || 'Request failed',
                timestamp: new Date()
            });
        };

        try {
            const response = await runRequest(payloadObject);
            setTestResult({
                success: true,
                data: response?.result || response,
                timestamp: new Date()
            });
            setErrors({});
            onCompleted?.();
            return;
        } catch (firstError) {
            const sanitizedPayload = sanitizePayload(payloadObject);
            const canRetry = !isTokenLikeError(firstError) && hasMeaningfulDifference(payloadObject, sanitizedPayload);
            if (!canRetry) {
                trySetErrorState(firstError);
                return;
            }
            try {
                const retryResponse = await runRequest(sanitizedPayload);
                if (mode === 'json') {
                    setInputParams(JSON.stringify(sanitizedPayload, null, 2));
                } else {
                    setFormValues(sanitizedPayload);
                }
                setTestResult({
                    success: true,
                    data: retryResponse?.result || retryResponse,
                    timestamp: new Date()
                });
                setErrors({});
                onCompleted?.();
            } catch (retryError) {
                trySetErrorState(retryError);
            }
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

    const oauthAuthUrl = useMemo(() => {
        return String(scopeRecovery.oauthAuthUrl || authData?.oauthTokenLink || 'https://accounts.zoho.in/oauth/v2/auth').trim();
    }, [authData?.oauthTokenLink, scopeRecovery.oauthAuthUrl]);

    const tokenEndpoint = useMemo(() => {
        return String(scopeRecovery.tokenEndpoint || authData?.tokenEndpoint || 'https://accounts.zoho.in/oauth/v2/token').trim();
    }, [authData?.tokenEndpoint, scopeRecovery.tokenEndpoint]);

    const finalScope = useMemo(
        () => buildScopeString(scopeRecovery.selectedScopes, scopeRecovery.customScopes),
        [scopeRecovery.selectedScopes, scopeRecovery.customScopes]
    );

    const oauthUrl = useMemo(() => {
        const state = oauthState || scopeRecovery.oauthState;
        return buildOAuthUrl({
            authUrl: oauthAuthUrl,
            scope: finalScope,
            clientId: authData?.clientId,
            serverId,
            state
        });
    }, [finalScope, scopeRecovery.oauthState, authData?.clientId, serverId, oauthState, oauthAuthUrl]);

    const toggleScope = (scope) => {
        setScopeRecovery((prev) => {
            const selected = Array.isArray(prev.selectedScopes) ? prev.selectedScopes : [];
            const has = selected.includes(scope);
            return {
                ...prev,
                selectedScopes: has ? selected.filter((item) => item !== scope) : [...selected, scope]
            };
        });
    };

    const handleStartOAuth = () => {
        setSaveMessage(null);
        const nextState = createOAuthState(serverId);
        setOauthState(nextState);
        setScopeRecovery((prev) => ({ ...prev, oauthState: nextState }));
        const redirectUri = `${window.location.origin}/trade-show-team-project/oauth-callback.html`;
        const url = buildOAuthUrl({
            authUrl: oauthAuthUrl,
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
            const allowedOrigins = new Set([window.location.origin, apiOrigin].filter(Boolean));
            if (!allowedOrigins.has(event.origin)) {
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
            } catch {
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
            if (!isValidHttpUrl(tokenEndpoint)) {
                throw new Error('Token endpoint is invalid.');
            }
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

                        <InputField
                            label="Request Timeout (ms)"
                            type="number"
                            value={requestTimeoutMs}
                            onChange={(value) => setRequestTimeoutMs(value)}
                            tooltip="Stops the test request after the timeout is reached."
                        />

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
                                <JsonCodeEditor
                                    value={inputParams}
                                    onChange={(value) => {
                                        setInputParams(value);
                                        setErrors({});
                                    }}
                                    placeholder={JSON.stringify(generateExample(schema), null, 2)}
                                    height="320px"
                                    className={`${ToolsStyles.jsonEditor} ${errors.inputParams ? ToolsStyles.error : ''}`}
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
                                        <strong>Live payload</strong>
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
                                    <JsonCodeEditor
                                        value={JSON.stringify(formValues, null, 2)}
                                        readOnly={true}
                                        height="300px"
                                        className={ToolsStyles.jsonEditor}
                                    />
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
                                {testResult.success ? (
                                    <JsonCodeEditor
                                        value={JSON.stringify(testResult.data ?? {}, null, 2)}
                                        readOnly={true}
                                        height="220px"
                                        className={ToolsStyles.jsonEditor}
                                    />
                                ) : (
                                    <pre className={ToolsStyles.resultData}>
                                        <code>{testResult.error}</code>
                                    </pre>
                                )}
                            </div>
                        </div>
                    ) : null}

                    {scopeRecovery.active ? (
                        <div className={ToolsStyles.scopeRecoveryCard}>
                            <h3>OAuth Scope Recovery</h3>
                            <p className={ToolsStyles.scopeHint}>
                                {scopeRecovery.message || 'Scope mismatch detected. Enter correct scope and regenerate OAuth tokens.'}
                            </p>
                            <div className={ToolsStyles.scopeSelector}>
                                {SCOPE_OPTIONS.map((scope) => {
                                    const checked = Array.isArray(scopeRecovery.selectedScopes) && scopeRecovery.selectedScopes.includes(scope.value);
                                    return (
                                        <label key={scope.value} className={ToolsStyles.scopeOption}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleScope(scope.value)}
                                            />
                                            <span>{scope.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            <InputField
                                label="Custom Scopes (comma separated)"
                                value={scopeRecovery.customScopes}
                                onChange={(value) => setScopeRecovery((prev) => ({ ...prev, customScopes: value }))}
                                placeholder="scope.one,scope.two"
                                tooltip="Optional custom scopes for third-party providers"
                            />
                            <InputField
                                label="OAuth Authorization URL"
                                value={oauthAuthUrl}
                                onChange={(value) => setScopeRecovery((prev) => ({ ...prev, oauthAuthUrl: value }))}
                                placeholder="https://accounts.zoho.in/oauth/v2/auth"
                                tooltip="Enter full authorization URL. The app will not append any endpoint."
                            />
                            <InputField
                                label="Token Endpoint"
                                value={tokenEndpoint}
                                onChange={(value) => setScopeRecovery((prev) => ({ ...prev, tokenEndpoint: value }))}
                                placeholder="https://accounts.zoho.in/oauth/v2/token"
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

function clampRequestTimeoutMs(value) {
    const min = 1000;
    const max = 120000;
    const n = Number(value);
    if (!Number.isFinite(n)) {
        return 15000;
    }
    return Math.max(min, Math.min(max, Math.round(n)));
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
    } catch {
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

function buildOAuthUrl({ authUrl, scope, clientId, serverId, state, redirectUri }) {
    if (!scope || !clientId) {
        return '';
    }
    const base = String(authUrl || '').trim();
    if (!isValidHttpUrl(base)) {
        return '';
    }
    const safeRedirectUri = redirectUri || `${window.location.origin}/trade-show-team-project/oauth-callback.html`;
    const finalState = state || createOAuthState(serverId);
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}scope=${encodeURIComponent(scope)}&client_id=${encodeURIComponent(clientId)}&state=${encodeURIComponent(finalState)}&response_type=code&redirect_uri=${encodeURIComponent(safeRedirectUri)}&access_type=offline`;
}

function sanitizePayload(payload) {
    const sanitized = sanitizeNode(payload);
    if (sanitized === undefined) {
        return {};
    }
    if (typeof sanitized !== 'object' || sanitized === null) {
        return { value: sanitized };
    }
    return sanitized;
}

function sanitizeNode(value) {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value === 'string') {
        return value.trim() === '' ? undefined : value;
    }
    if (Array.isArray(value)) {
        const cleanedItems = value
            .map((item) => sanitizeNode(item))
            .filter((item) => item !== undefined);
        return cleanedItems.length > 0 ? cleanedItems : undefined;
    }
    if (typeof value === 'object') {
        const result = {};
        Object.entries(value).forEach(([key, childValue]) => {
            const cleanedValue = sanitizeNode(childValue);
            if (cleanedValue !== undefined) {
                result[key] = cleanedValue;
            }
        });
        return Object.keys(result).length > 0 ? result : undefined;
    }
    return value;
}

function hasMeaningfulDifference(original, sanitized) {
    return JSON.stringify(original ?? {}) !== JSON.stringify(sanitized ?? {});
}

function isTokenLikeError(error) {
    const status = Number(error?.status || 0);
    if (status === 401 || status === 403) {
        return true;
    }
    const payloadText = JSON.stringify(error?.payload || {}).toLowerCase();
    const message = String(error?.message || '').toLowerCase();
    const text = `${message} ${payloadText}`;
    return text.includes('unauthorized')
        || text.includes('invalid token')
        || text.includes('token expired')
        || text.includes('missing bearer token')
        || text.includes('auth token')
        || text.includes('oauth token');
}

function buildScopeString(defaultScope, additionalScopes) {
    const baseScopes = Array.isArray(defaultScope)
        ? defaultScope.map((s) => String(s || '').trim()).filter(Boolean)
        : [];
    const extras = String(additionalScopes || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    return [...new Set([...baseScopes, ...extras])].join(',');
}

function createOAuthState(serverId) {
    const randomPart = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : Math.random().toString(16).slice(2);
    return `pulse_scope_${serverId}_${randomPart}`;
}

function isValidHttpUrl(value) {
    try {
        const parsed = new URL(String(value || '').trim());
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function parseScopeBreakdown(scopeText) {
    const known = new Set(SCOPE_OPTIONS.map((item) => item.value));
    const all = String(scopeText || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    const selectedScopes = all.filter((item) => known.has(item));
    const customScopes = all.filter((item) => !known.has(item)).join(',');
    return { selectedScopes, customScopes };
}
