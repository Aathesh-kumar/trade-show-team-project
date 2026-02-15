import { useState } from 'react';
import { useGet } from '../customUtilHooks/useGet';
import { useDelete } from '../customUtilHooks/useDelete';
import { ENDPOINTS } from '../config/api';
import SettingsStyles from '../../styles/Settings.module.css';
import LoadingSkeleton from '../LoadingComponents/LoadingSkeleton';
import { MdDelete, MdEdit, MdWarning } from 'react-icons/md';

export default function Settings({ onNavigate }) {
    const [editingServer, setEditingServer] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    // Fetch all servers
    const { data: serversData, loading, refetch } = useGet(ENDPOINTS.SERVERS_ALL);
    const servers = serversData?.data || [];

    // Delete server hook
    const { execute: deleteServer, loading: deleting } = useDelete('', {
        onSuccess: () => {
            setShowDeleteConfirm(null);
            refetch();
            alert('Server deleted successfully');
        },
        onError: (error) => {
            alert(`Failed to delete server: ${error.message}`);
        }
    });

    const handleDelete = (serverId) => {
        deleteServer(ENDPOINTS.SERVER_DELETE(serverId));
    };

    const handleEdit = (server) => {
        setEditingServer(server);
    };

    const handleCancelEdit = () => {
        setEditingServer(null);
    };

    return (
        <div className={SettingsStyles.container}>
            <div className={SettingsStyles.header}>
                <div>
                    <h1>Settings</h1>
                    <p className={SettingsStyles.subtitle}>
                        Manage your MCP servers and account settings
                    </p>
                </div>
            </div>

            {/* Server Management Section */}
            <div className={SettingsStyles.section}>
                <h2 className={SettingsStyles.sectionTitle}>Server Management</h2>
                <p className={SettingsStyles.sectionDescription}>
                    View and manage all your configured MCP servers
                </p>

                {loading ? (
                    <LoadingSkeleton type="card" lines={4} count={2} />
                ) : servers.length === 0 ? (
                    <div className={SettingsStyles.emptyState}>
                        <p>📊 No servers configured</p>
                        <button
                            onClick={() => onNavigate('configure-server')}
                            className={SettingsStyles.primaryBtn}
                        >
                            + Add Your First Server
                        </button>
                    </div>
                ) : (
                    <div className={SettingsStyles.serversList}>
                        {servers.map(server => (
                            <div key={server.serverId} className={SettingsStyles.serverCard}>
                                <div className={SettingsStyles.serverHeader}>
                                    <h3>{server.serverName}</h3>
                                    <div className={SettingsStyles.serverActions}>
                                        <button
                                            onClick={() => handleEdit(server)}
                                            className={SettingsStyles.editBtn}
                                        >
                                            {<MdEdit/>} Edit
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(server.serverId)}
                                            className={SettingsStyles.deleteBtn}
                                            disabled={deleting}
                                        >
                                            {<MdDelete/>} Delete
                                        </button>
                                    </div>
                                </div>

                                <div className={SettingsStyles.serverDetails}>
                                    <div className={SettingsStyles.detailRow}>
                                        <span className={SettingsStyles.detailLabel}>Server URL:</span>
                                        <span className={SettingsStyles.detailValue}>{server.serverUrl}</span>
                                    </div>

                                    <div className={SettingsStyles.detailRow}>
                                        <span className={SettingsStyles.detailLabel}>Server ID:</span>
                                        <span className={SettingsStyles.detailValue}>{server.serverId}</span>
                                    </div>

                                    <div className={SettingsStyles.detailRow}>
                                        <span className={SettingsStyles.detailLabel}>Created:</span>
                                        <span className={SettingsStyles.detailValue}>
                                            {new Date(server.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Delete Confirmation */}
                                {showDeleteConfirm === server.serverId && (
                                    <div className={SettingsStyles.confirmDelete}>
                                        <p>{<MdWarning/>} Are you sure you want to delete this server?</p>
                                        <p className={SettingsStyles.warningText}>
                                            This will also delete all associated tools and logs.
                                        </p>
                                        <div className={SettingsStyles.confirmActions}>
                                            <button
                                                onClick={() => setShowDeleteConfirm(null)}
                                                className={SettingsStyles.cancelBtn}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleDelete(server.serverId)}
                                                className={SettingsStyles.confirmBtn}
                                                disabled={deleting}
                                            >
                                                {deleting ? 'Deleting...' : 'Yes, Delete'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={() => onNavigate('configure-server')}
                    className={SettingsStyles.addServerBtn}
                >
                    + Add Another Server
                </button>
            </div>

            {/* Account Information Section */}
            <div className={SettingsStyles.section}>
                <h2 className={SettingsStyles.sectionTitle}>Account Information</h2>
                <p className={SettingsStyles.sectionDescription}>
                    Your account details and preferences
                </p>

                <div className={SettingsStyles.infoCard}>
                    <div className={SettingsStyles.infoRow}>
                        <span className={SettingsStyles.infoLabel}>Total Servers:</span>
                        <span className={SettingsStyles.infoValue}>{servers.length}</span>
                    </div>
                    <div className={SettingsStyles.infoRow}>
                        <span className={SettingsStyles.infoLabel}>Account Type:</span>
                        <span className={SettingsStyles.infoValue}>Standard</span>
                    </div>
                    <div className={SettingsStyles.infoRow}>
                        <span className={SettingsStyles.infoLabel}>Data Retention:</span>
                        <span className={SettingsStyles.infoValue}>30 days</span>
                    </div>
                </div>
            </div>
        </div>
    );
}