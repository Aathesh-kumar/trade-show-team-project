import { useState } from 'react';
import ToolsStyles from '../../styles/Tools.module.css';
import { MdClose, MdContentCopy, MdPlayArrow, MdEdit } from 'react-icons/md';
import { FaWrench } from 'react-icons/fa';

export default function ToolDefinitionPanel({ tool, onClose, onTest }) {
    const [copied, setCopied] = useState(false);
    const schemaText = JSON.stringify(tool.jsonSchema || {}, null, 2);

    const handleCopy = () => {
        navigator.clipboard.writeText(schemaText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <aside className={ToolsStyles.definitionPanel}>
            <div className={ToolsStyles.panelHeader}>
                <div className={ToolsStyles.panelTitle}>
                    <FaWrench className={ToolsStyles.panelIcon} />
                    <h2>Tool Definition</h2>
                </div>
                <button className={ToolsStyles.closeBtn} onClick={onClose}>
                    <MdClose />
                </button>
            </div>

            <div className={ToolsStyles.panelContent}>
                <section className={ToolsStyles.panelSection}>
                    <h3>Description</h3>
                    <p className={ToolsStyles.description}>{tool.description}</p>
                </section>

                <section className={ToolsStyles.panelSection}>
                    <div className={ToolsStyles.statsRow}>
                        <div className={ToolsStyles.statItem}>
                            <label>Status</label>
                            <div className={ToolsStyles.statusValue}>
                                <span className={ToolsStyles.statusDot}></span>
                                {tool.status || (tool.isAvailability ? 'Active' : 'Inactive')}
                            </div>
                        </div>
                        <div className={ToolsStyles.statItem}>
                            <label>Avg Latency</label>
                            <div className={ToolsStyles.latencyValue}>{tool.latency}</div>
                        </div>
                    </div>
                </section>

                <section className={ToolsStyles.panelSection}>
                    <div className={ToolsStyles.sectionHeader}>
                        <h3>JSON Schema</h3>
                        <button 
                            className={`${ToolsStyles.copyBtn} ${copied ? ToolsStyles.copied : ''}`}
                            onClick={handleCopy}
                        >
                            <MdContentCopy />
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <pre className={ToolsStyles.jsonSchema}>
                        <code>{schemaText}</code>
                    </pre>
                </section>

                <section className={ToolsStyles.panelSection}>
                    <h3>Implementation Details</h3>
                    <div className={ToolsStyles.actionButtons}>
                        <button className={ToolsStyles.primaryBtn} onClick={onTest} disabled={!tool.isAvailability}>
                            <MdPlayArrow />
                            {tool.isAvailability ? 'Test Tool' : 'Tool Inactive'}
                        </button>
                        <button className={ToolsStyles.secondaryBtn}>
                            <MdEdit />
                        </button>
                    </div>
                </section>
            </div>
        </aside>
    );
}
