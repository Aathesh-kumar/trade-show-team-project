import { useState } from 'react';
import ToolsStyles from '../../styles/Tools.module.css';
import { MdCheckCircle, MdClose, MdContentCopy, MdErrorOutline, MdPlayArrow } from 'react-icons/md';
import { usePost } from '../Hooks/usePost';
import { buildUrl } from '../../services/api';
import InputField from '../ConfigureServer/InputField';
import JsonEditor from '../Common/JsonEditor';
import JsonViewer from '../Common/JsonViewer';
import CustomDropdown from '../Common/CustomDropdown';

export default function TestToolModal({ tool, serverId, onClose, onCompleted }) {
    const schema = getSchema(tool);
    const [mode, setMode] = useState('form');
    const [inputParams, setInputParams] = useState('');
    const [formValues, setFormValues] = useState(generateExample(schema));
    const [testResult, setTestResult] = useState(null);
    const [errors, setErrors] = useState({});
    const [payloadCopied, setPayloadCopied] = useState(false);

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
                    error: normalizeError(error),
                    timestamp: new Date()
                });
            }
        }
    );

    const handleTest = async () => {
        if (!tool?.isAvailability) {
            setTestResult({
                success: false,
                error: 'This tool is inactive. Activate it before running tests.',
                timestamp: new Date()
            });
            return;
        }
        setErrors({});
        setTestResult(null);

        let payloadJson = '{}';
        if (mode === 'json') {
            if (inputParams.trim()) {
                try {
                    JSON.parse(inputParams);
                } catch {
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
        } catch {
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
                                <JsonEditor
                                    id="inputParams"
                                    value={inputParams}
                                    onChange={(nextValue) => {
                                        setInputParams(nextValue);
                                        setErrors({});
                                    }}
                                    placeholder={JSON.stringify(generateExample(schema), null, 2)}
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
                                    <JsonViewer data={formValues} className={ToolsStyles.jsonPreview} />
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
                                    <JsonViewer data={testResult.data} className={ToolsStyles.resultData} />
                                ) : (
                                    <div className={ToolsStyles.resultData}>{testResult.error}</div>
                                )}
                            </div>
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
                    value={value ?? String(schema.enum[0])}
                    onChange={(nextValue) => onChange(path, nextValue)}
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
        <div className={ToolsStyles.schemaField}>
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
        </div>
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

function normalizeError(error) {
    const message = String(error?.message || '').trim();
    if (!message || /^unknown error$/i.test(message)) {
        return 'Request failed. Please verify server status, token, and tool payload.';
    }
    return message;
}
