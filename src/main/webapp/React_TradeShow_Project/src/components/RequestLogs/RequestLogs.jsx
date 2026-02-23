import { useEffect, useMemo, useState } from 'react';
import { useGet } from '../Hooks/useGet';
import RequestLogsStyles from '../../styles/RequestLogs.module.css';
import RequestLogsHeader from './RequestLogsHeader';
import RequestLogsTable from './RequestLogsTable';
import RequestDetailsPanel from './RequestDetailsPanel';
import PaginationControls from '../Common/PaginationControls';
import useDebouncedValue from '../Hooks/useDebouncedValue';
import useBufferedLoading from '../Hooks/useBufferedLoading';
import { buildUrl, getAuthHeaders, parseApiResponse } from '../../services/api';
import RequestLogsFilters from './RequestLogsFilters';

export default function RequestLogs({ selectedServer }) {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        tool: 'all',
        timeRange: 'last-24-hours'
    });
    const [page, setPage] = useState(1);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportScope, setExportScope] = useState('filtered');
    const [exporting, setExporting] = useState(false);
    const pageSize = 12;
    const debouncedSearch = useDebouncedValue(filters.search, 450);

    const hours = useMemo(() => {
        switch (filters.timeRange) {
            case 'last-15-minutes':
                return 1;
            case 'last-hour':
                return 1;
            case 'last-7-days':
                return 24 * 7;
            case 'last-24-hours':
            default:
                return 24;
            case 'all-time':
                return 24 * 365 * 20;
        }
    }, [filters.timeRange]);

    const serverId = selectedServer?.serverId;
    const { data, loading, error, refetch } = useGet('/request-log', {
        immediate: !!serverId,
        params: {
            serverId,
            search: debouncedSearch,
            status: filters.status === 'all' ? '' : filters.status,
            tool: filters.tool === 'all' ? '' : filters.tool,
            hours,
            page,
            limit: pageSize
        },
        dependencies: [serverId, debouncedSearch, filters.status, filters.tool, filters.timeRange, page]
    });
    const bufferedLoading = useBufferedLoading(loading, 1500);

    const logs = useMemo(() => {
        const rows = data?.logs || [];
        const serverLogs = rows.map((row) => mapRequestLog(row));
        return serverLogs.sort((a, b) => {
            const aTime = Date.parse(a.rawCreatedAt || '') || 0;
            const bTime = Date.parse(b.rawCreatedAt || '') || 0;
            return bTime - aTime;
        });
    }, [data]);

    useEffect(() => {
        if (!serverId) {
            return undefined;
        }
        const onRefresh = (event) => {
            const eventServerId = event?.detail?.serverId;
            if (!eventServerId || Number(eventServerId) === Number(serverId)) {
                setPage(1);
                refetch();
            }
        };
        window.addEventListener('pulse24x7-request-log-refresh', onRefresh);
        return () => window.removeEventListener('pulse24x7-request-log-refresh', onRefresh);
    }, [serverId, refetch]);
    const totalItems = data?.pagination?.totalItems || 0;
    const totalPages = Math.max(1, data?.pagination?.totalPages || 1);
    const handleFilterChange = (next) => {
        setFilters(next);
        setPage(1);
    };

    const handleExportPdf = async (rows) => {
        const jsPdfModule = await import('jspdf');
        const { jsPDF } = jsPdfModule;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const marginX = 24;
        const marginY = 30;
        const lineHeight = 16;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setFontSize(14);
        doc.text('Request Logs', marginX, marginY);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, marginX, marginY + 16);

        let y = marginY + 38;
        doc.setFontSize(9);
        doc.text('Timestamp', marginX, y);
        doc.text('Tool', marginX + 130, y);
        doc.text('Endpoint', marginX + 300, y);
        doc.text('Status', pageWidth - 170, y);
        doc.text('Latency', pageWidth - 110, y);
        doc.text('Size', pageWidth - 55, y);
        y += 10;
        doc.line(marginX, y, pageWidth - marginX, y);
        y += 12;

        for (const log of rows) {
            const endpoint = String(log.endpoint || '-');
            const endpointChunks = doc.splitTextToSize(endpoint, 280);
            const endpointText = endpointChunks[0] || '-';
            if (y > pageHeight - 24) {
                doc.addPage();
                y = marginY;
            }
            doc.text(String(log.timestamp || '-'), marginX, y);
            doc.text(String(log.tool || '-'), marginX + 130, y);
            doc.text(endpointText, marginX + 300, y);
            doc.text(String(log.status || '-'), pageWidth - 170, y);
            doc.text(String(log.latency || '-'), pageWidth - 110, y);
            doc.text(String(log.size || '-'), pageWidth - 55, y);
            y += lineHeight;
        }

        doc.save(`request-logs-${Date.now()}.pdf`);
    };

    const fetchExportLogs = async (scope) => {
        if (!serverId) {
            return [];
        }
        const limit = 500;
        const collected = [];
        let pageIndex = 1;
        let hasMore = true;
        const baseParams = {
            serverId,
            search: debouncedSearch,
            status: filters.status === 'all' ? '' : filters.status,
            tool: filters.tool === 'all' ? '' : filters.tool,
            hours
        };
        if (scope === 'all-time') {
            baseParams.hours = 24 * 365 * 20;
        }

        while (hasMore) {
            const params = new URLSearchParams({
                ...baseParams,
                page: String(pageIndex),
                limit: String(limit)
            });
            const response = await fetch(buildUrl(`/request-log?${params.toString()}`), {
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                }
            });
            const body = await parseApiResponse(response);
            const rows = body?.data?.logs || [];
            for (const row of rows) {
                collected.push(mapRequestLog(row));
            }
            hasMore = rows.length === limit;
            pageIndex += 1;
            if (pageIndex > 200) {
                break;
            }
        }
        return collected;
    };

    const handleExportConfirm = async () => {
        setExporting(true);
        try {
            let rows = [];
            if (exportScope === 'current') {
                rows = logs;
            } else {
                rows = await fetchExportLogs(exportScope);
            }
            await handleExportPdf(rows);
            setShowExportModal(false);
        } finally {
            setExporting(false);
        }
    };

    const toolOptions = useMemo(() => {
        const set = new Set(logs.map((log) => log.tool).filter(Boolean));
        return Array.from(set);
    }, [logs]);

    if (!serverId) {
        return (
            <div className={RequestLogsStyles.requestLogs}>
                <div className={RequestLogsStyles.emptyState}>
                    <p>Select a server to view request logs.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={RequestLogsStyles.requestLogs}>
            <RequestLogsHeader
                filters={filters}
                onFilterChange={handleFilterChange}
                onExportRequest={() => setShowExportModal(true)}
                stats={{
                    totalRequests: data?.stats?.totalRequests || 0,
                    totalSuccess: data?.stats?.totalSuccess || 0,
                    totalWarnings: data?.stats?.totalWarnings || 0,
                    totalErrors: data?.stats?.totalErrors || 0
                }}
                toolOptions={toolOptions}
            />

            {error && (
                <div className={RequestLogsStyles.submitError}>
                    Failed to load logs: {error}
                </div>
            )}

            <div className={RequestLogsStyles.logsContent}>
                <RequestLogsTable
                    logs={bufferedLoading ? [] : logs}
                    selectedLog={selectedRequest}
                    onSelectLog={setSelectedRequest}
                    loading={bufferedLoading}
                />

                {selectedRequest && (
                    <RequestDetailsPanel
                        request={selectedRequest}
                        selectedServer={selectedServer}
                        onClose={() => setSelectedRequest(null)}
                    />
                )}
            </div>

            <PaginationControls
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                totalPages={totalPages}
                onPageChange={setPage}
            />

            {showExportModal ? (
                <div className={RequestLogsStyles.exportOverlay} onClick={() => (!exporting ? setShowExportModal(false) : null)}>
                    <div className={RequestLogsStyles.exportModal} onClick={(e) => e.stopPropagation()}>
                        <h3>Export Request Logs</h3>
                        <p>Adjust filters for export.</p>
                        <RequestLogsFilters
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            toolOptions={toolOptions}
                        />
                        <div className={RequestLogsStyles.exportActions}>
                            <button
                                type="button"
                                className={RequestLogsStyles.exportCancel}
                                onClick={() => setShowExportModal(false)}
                                disabled={exporting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={RequestLogsStyles.exportConfirm}
                                onClick={handleExportConfirm}
                                disabled={exporting}
                            >
                                {exporting ? 'Preparing...' : 'Export'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function parseJson(raw) {
    if (!raw) {
        return {};
    }
    try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
        return { raw };
    }
}

function mapRequestLog(row) {
    const requestPayload = parseJson(row.requestPayload);
    const responseBody = parseJson(row.responseBody);
    return {
        id: row.id,
        serverId: row.serverId || row.server_id,
        toolId: row.toolId || row.tool_id,
        timestamp: formatTimestamp(row.createdAt || row.created_at),
        tool: row.toolName,
        endpoint: resolveEndpoint(row, requestPayload, responseBody),
        method: row.method || 'POST',
        status: row.statusCode,
        statusText: row.statusText || getStatusText(row.statusCode),
        latency: `${row.latencyMs}ms`,
        size: `${Math.max(0, Math.round((row.responseSizeBytes || 0) / 1024 * 10) / 10)}kb`,
        requestPayload,
        responseBody,
        userAgent: row.userAgent,
        rawCreatedAt: row.createdAt || row.created_at
    };
}

function getStatusText(statusCode) {
    const code = Number(statusCode) || 0;
    if (code >= 200 && code < 300) return 'SUCCESS';
    if (code >= 400 && code < 500) return 'WARNING';
    if (code >= 500) return 'ERROR';
    return 'UNKNOWN';
}


function formatTimestamp(raw) {
    if (!raw) {
        return '-';
    }
    const source = String(raw).trim();
    const sqlMatch = source.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    const date = sqlMatch
        ? new Date(
            Number(sqlMatch[1]),
            Number(sqlMatch[2]) - 1,
            Number(sqlMatch[3]),
            Number(sqlMatch[4]),
            Number(sqlMatch[5]),
            Number(sqlMatch[6] || 0)
        )
        : new Date(source.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) {
        return String(raw);
    }
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function resolveEndpoint(row, requestPayload, responseBody) {
    const candidates = [
        requestPayload?.mcpServerUrl,
        requestPayload?.serverUrl,
        requestPayload?.endpoint,
        responseBody?.mcpServerUrl,
        responseBody?.endpoint,
        row?.serverUrl
    ];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }
    }
    return '-';
}
