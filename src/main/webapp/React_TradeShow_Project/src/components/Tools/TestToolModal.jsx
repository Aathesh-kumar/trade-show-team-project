import { useState } from 'react';
import ToolsStyles from '../../styles/Tools.module.css';
import { MdClose, MdPlayArrow } from 'react-icons/md';
import { usePost } from '../Hooks/usePost';
import { buildUrl } from '../../services/api';

export default function TestToolModal({ tool, serverId, onClose, onCompleted }) {
    const [inputParams, setInputParams] = useState('');
    const [testResult, setTestResult] = useState(null);
    const [errors, setErrors] = useState({});

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
            }
        }
    );

    const handleTest = async () => {
        setErrors({});
        setTestResult(null);

        // Validate JSON input
        if (inputParams.trim()) {
            try {
                JSON.parse(inputParams);
            } catch (e) {
                setErrors({ inputParams: 'Invalid JSON format' });
                return;
            }
        }

        try {
            await testTool({
                serverId: serverId,
                toolId: tool.toolId && tool.toolId > 0 ? tool.toolId : null,
                toolName: tool.toolName || tool.name,
                inputParams: inputParams || '{}'
            });
        } catch (error) {
            // Error already handled in usePost hook
        }
    };

    const getExampleInput = () => {
        if (!tool.inputSchema) return '{}';
        
        try {
            const schema = typeof tool.inputSchema === 'string' 
                ? JSON.parse(tool.inputSchema) 
                : tool.inputSchema;
            
            // Generate example based on schema
            if (schema.properties) {
                const example = {};
                Object.keys(schema.properties).forEach(key => {
                    const prop = schema.properties[key];
                    if (prop.type === 'string') {
                        example[key] = prop.example || 'example_value';
                    } else if (prop.type === 'number') {
                        example[key] = prop.example || 0;
                    } else if (prop.type === 'boolean') {
                        example[key] = prop.example || false;
                    }
                });
                return JSON.stringify(example, null, 2);
            }
        } catch (e) {
            console.error('Failed to parse schema:', e);
        }
        
        return '{}';
    };

    const handleUseExample = () => {
        setInputParams(getExampleInput());
        setErrors({});
    };

    return (
        <div className={ToolsStyles.modalOverlay} onClick={onClose}>
            <div className={ToolsStyles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={ToolsStyles.modalHeader}>
                    <h2>Test Tool: {tool.toolName}</h2>
                    <button 
                        className={ToolsStyles.closeBtn} 
                        onClick={onClose}
                    >
                        <MdClose />
                    </button>
                </div>

                <div className={ToolsStyles.modalContent}>
                    {/* Tool Info */}
                    <div className={ToolsStyles.testToolInfo}>
                        <div className={ToolsStyles.infoRow}>
                            <span className={ToolsStyles.label}>Tool ID:</span>
                            <span className={ToolsStyles.value}>#{tool.toolId || tool.id}</span>
                        </div>
                        <div className={ToolsStyles.infoRow}>
                            <span className={ToolsStyles.label}>Status:</span>
                            <span 
                                className={ToolsStyles.value}
                                style={{ 
                                    color: tool.isAvailability ? '#10B981' : '#EF4444' 
                                }}
                            >
                                {tool.isAvailability ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>

                    {/* Input Parameters */}
                    <div className={ToolsStyles.formGroup}>
                        <div className={ToolsStyles.labelRow}>
                            <label htmlFor="inputParams">Input Parameters (JSON)</label>
                            <button
                                type="button"
                                className={ToolsStyles.exampleBtn}
                                onClick={handleUseExample}
                            >
                                Use Example
                            </button>
                        </div>
                        <textarea
                            id="inputParams"
                            value={inputParams}
                            onChange={(e) => {
                                setInputParams(e.target.value);
                                setErrors({});
                            }}
                            placeholder={getExampleInput()}
                            rows="8"
                            className={`${ToolsStyles.codeInput} ${errors.inputParams ? ToolsStyles.error : ''}`}
                        />
                        {errors.inputParams && (
                            <span className={ToolsStyles.errorMessage}>{errors.inputParams}</span>
                        )}
                    </div>

                    {/* Test Button */}
                    <button
                        onClick={handleTest}
                        className={ToolsStyles.testBtn}
                        disabled={loading || !tool.isAvailability}
                    >
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

                    {/* Test Result */}
                    {testResult && (
                        <div className={ToolsStyles.testResult}>
                            <div className={ToolsStyles.resultHeader}>
                                <h3>Test Result</h3>
                                <span className={ToolsStyles.resultTime}>
                                    {testResult.timestamp.toLocaleTimeString()}
                                </span>
                            </div>
                            
                            <div 
                                className={`${ToolsStyles.resultContent} ${
                                    testResult.success 
                                        ? ToolsStyles.success 
                                        : ToolsStyles.error
                                }`}
                            >
                                <div className={ToolsStyles.resultStatus}>
                                    <span className={ToolsStyles.statusIcon}>
                                        {testResult.success ? '✓' : '✗'}
                                    </span>
                                    <span className={ToolsStyles.statusText}>
                                        {testResult.success ? 'Success' : 'Failed'}
                                    </span>
                                </div>

                                <pre className={ToolsStyles.resultData}>
                                    <code>
                                        {testResult.success 
                                            ? JSON.stringify(testResult.data, null, 2)
                                            : testResult.error
                                        }
                                    </code>
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* Warning for inactive tool */}
                    {!tool.isAvailability && (
                        <div className={ToolsStyles.warningBanner}>
                            ⚠️ This tool is currently inactive and may not respond to test requests.
                        </div>
                    )}
                </div>

                <div className={ToolsStyles.modalActions}>
                    <button
                        onClick={onClose}
                        className={ToolsStyles.closeModalBtn}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
