import { useState } from 'react';
import RequestLogsStyles from '../../styles/RequestLogs.module.css';
import { MdClose, MdContentCopy, MdPlayArrow, MdFlag } from 'react-icons/md';
import { usePost } from '../Hooks/usePost';
import { buildUrl } from '../../services/api';

export default function RequestDetailsPanel({ request, selectedServer, onClose }) {
    const [copiedSection, setCopiedSection] = useState(null);
    const [replayMessage, setReplayMessage] = useState(null);
    const { execute: replayRequest, loading: replaying } = usePost(buildUrl('/tool/test'));

    const handleCopy = (section, content) => {
        navigator.clipboard.writeText(JSON.stringify(content, null, 2));
        setCopiedSection(section);
        setTimeout(() => setCopiedSection(null), 2000);
    };

    const handleReplay = async () => {
        setReplayMessage(null);
        try {
            const payload = request?.requestPayload || {};
            const serverId = payload.serverId || request.serverId || selectedServer?.serverId;
            const toolName = payload.toolName || request.tool;
            const toolId = payload.toolId || request.toolId || null;
            let inputParams = payload.inputParams;

            if (typeof inputParams !== 'string') {
                inputParams = JSON.stringify(inputParams || {});
            }

            if (!serverId || !toolName) {
                throw new Error('Cannot replay this request. Missing server or tool information.');
            }

            await replayRequest({
                serverId,
                toolId,
                toolName,
                inputParams: inputParams || '{}'
            });
            setReplayMessage({ type: 'success', text: 'Re-request sent successfully.' });
        } catch (error) {
            setReplayMessage({ type: 'error', text: error.message || 'Failed to replay request.' });
        }
    };

    return (
        <aside className={RequestLogsStyles.detailsPanel}>
            <div className={RequestLogsStyles.panelHeader}>
                <div className={RequestLogsStyles.panelTitle}>
                    <MdFlag />
                    <h2>Request Details</h2>
                </div>
                <button className={RequestLogsStyles.closeBtn} onClick={onClose}>
                    <MdClose />
                </button>
            </div>

            <div className={RequestLogsStyles.panelContent}>
                {/* Request Info */}
                <section className={RequestLogsStyles.panelSection}>
                    <div className={RequestLogsStyles.infoGrid}>
                        <div className={RequestLogsStyles.infoItem}>
                            <label>REQUEST ID</label>
                            <span className={RequestLogsStyles.infoValue}>{request.id}</span>
                        </div>
                        <div className={RequestLogsStyles.infoItem}>
                            <label>PULSE24x7 VERSION</label>
                            <span className={RequestLogsStyles.infoValue}>{request.mcpVersion || '1.2.4-stable'}</span>
                        </div>
                    </div>
                </section>

                {/* Request Payload */}
                <section className={RequestLogsStyles.panelSection}>
                    <div className={RequestLogsStyles.sectionHeader}>
                        <h3>REQUEST PAYLOAD</h3>
                        <button
                            className={`${RequestLogsStyles.copyBtn} ${copiedSection === 'request' ? RequestLogsStyles.copied : ''}`}
                            onClick={() => handleCopy('request', request.requestPayload)}
                        >
                            <MdContentCopy />
                            {copiedSection === 'request' ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <pre className={RequestLogsStyles.jsonViewer}>
                        <code>{JSON.stringify(request.requestPayload, null, 2)}</code>
                    </pre>
                </section>

                {/* Response Body */}
                <section className={RequestLogsStyles.panelSection}>
                    <div className={RequestLogsStyles.sectionHeader}>
                        <h3>RESPONSE BODY</h3>
                        <button
                            className={`${RequestLogsStyles.copyBtn} ${copiedSection === 'response' ? RequestLogsStyles.copied : ''}`}
                            onClick={() => handleCopy('response', request.responseBody)}
                        >
                            <MdContentCopy />
                            {copiedSection === 'response' ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <pre className={RequestLogsStyles.jsonViewer}>
                        <code>{JSON.stringify(request.responseBody, null, 2)}</code>
                    </pre>
                </section>

                {/* Contextual Metadata */}
                <section className={RequestLogsStyles.panelSection}>
                    <h3>CONTEXTUAL METADATA</h3>
                    <div className={RequestLogsStyles.metadataGrid}>
                        <div className={RequestLogsStyles.metadataItem}>
                            <label>User Agent</label>
                            <span>{request.userAgent || 'Pulse24x7-Client/3.0.1 (node18)'}</span>
                        </div>
                        <div className={RequestLogsStyles.metadataItem}>
                            <label>Timestamp</label>
                            <span>{request.timestamp}</span>
                        </div>
                        <div className={RequestLogsStyles.metadataItem}>
                            <label>Latency</label>
                            <span>{request.latency}</span>
                        </div>
                        <div className={RequestLogsStyles.metadataItem}>
                            <label>Response Size</label>
                            <span>{request.size}</span>
                        </div>
                    </div>
                </section>

                {/* Action Button */}
                <section className={RequestLogsStyles.panelSection}>
                    <button className={RequestLogsStyles.replayBtn} onClick={handleReplay} disabled={replaying}>
                        <MdPlayArrow />
                        {replaying ? 'Re-requesting...' : 'Re-request'}
                    </button>
                    {replayMessage ? (
                        <div className={replayMessage.type === 'success' ? RequestLogsStyles.replaySuccess : RequestLogsStyles.replayError}>
                            {replayMessage.text}
                        </div>
                    ) : null}
                </section>
            </div>
        </aside>
    );
}
