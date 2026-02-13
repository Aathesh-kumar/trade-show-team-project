import { useState, useEffect } from 'react';
import { useGet } from '../customUtilHooks/useGet';
import RequestLogsStyles from '../../styles/RequestLogs.module.css';
import RequestLogsHeader from './RequestLogsHeader';
import RequestLogsTable from './RequestLogsTable';
import RequestDetailsPanel from './RequestDetailsPanel';
import RequestLogsFooter from './RequestLogsFooter';
import LoadingSkeleton from '../LoadingComponents/LoadingSkeleton';

export default function RequestLogs() {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        tool: 'all',
        timeRange: 'last-15-minutes'
    });

    // const { data: logs, loading, error, refetch } = useGet('/api/request-logs', {
    //     params: {
    //         search: filters.search,
    //         status: filters.status !== 'all' ? filters.status : undefined,
    //         tool: filters.tool !== 'all' ? filters.tool : undefined,
    //         timeRange: filters.timeRange,
    //         limit: 50
    //     },
    //     dependencies: [filters.status, filters.tool, filters.timeRange],
    //     onError: (err) => {
    //         console.error('Failed to fetch logs:', err);
    //     }
    // });

    // useEffect(() => {
    //     const interval = setInterval(() => {
    //         refetch();
    //     }, 5000);

    //     return () => clearInterval(interval);
    // }, [refetch]);

    const sampleLogs ={
        totalSuccess: 1240,
        totalErrors: 12,
        logs: [
            {
                id: 'req_88291abc',
                timestamp: '2023-10-27 14:23:45.102',
                tool: 'get_weather',
                endpoint: 'get_weather',
                method: 'POST',
                status: 200,
                statusText: 'OK',
                latency: '142ms',
                size: '1.2kb',
                requestPayload: {
                    tool: 'get_weather',
                    arguments: {
                        location: 'San Francisco, CA',
                        unit: 'celsius'
                    },
                    caller_id: 'user_550e8400'
                },
                responseBody: {
                    status: 'success',
                    data: {
                        temperature: 18,
                        condition: 'Partly Cloudy',
                        humidity: 65,
                        forecast: ['Clear', 'Sunny']
                    },
                    latency: '142ms'
                },
                mcpVersion: '1.2.4-stable',
                userAgent: 'MCP-Client/3.0.1 (node18)'
            },
            {
                id: 'req_88291abd',
                timestamp: '2023-10-27 14:23:42.891',
                tool: 'search_docs',
                endpoint: 'search_docs',
                method: 'POST',
                status: 200,
                statusText: 'OK',
                latency: '89ms',
                size: '4.5kb',
                requestPayload: {
                    tool: 'search_docs',
                    arguments: {
                        query: 'authentication',
                        limit: 10
                    }
                },
                responseBody: {
                    status: 'success',
                    results: [],
                    latency: '89ms'
                }
            },
            {
                id: 'req_88291abe',
                timestamp: '2023-10-27 14:23:41.005',
                tool: 'send_email',
                endpoint: 'send_email',
                method: 'POST',
                status: 500,
                statusText: 'ERR',
                latency: '2,140ms',
                size: '0.4kb',
                requestPayload: {
                    tool: 'send_email',
                    arguments: {
                        to: 'user@example.com',
                        subject: 'Test'
                    }
                },
                responseBody: {
                    status: 'error',
                    message: 'SMTP connection failed'
                }
            },
            {
                id: 'req_88291abf',
                timestamp: '2023-10-27 14:23:38.221',
                tool: 'get_weather',
                endpoint: 'get_weather',
                method: 'POST',
                status: 200,
                statusText: 'OK',
                latency: '115ms',
                size: '1.1kb',
                requestPayload: {},
                responseBody: {}
            },
            {
                id: 'req_88291abg',
                timestamp: '2023-10-27 14:23:35.099',
                tool: 'search_docs',
                endpoint: 'search_docs',
                method: 'POST',
                status: 429,
                statusText: 'LMT',
                latency: '12ms',
                size: '0.2kb',
                requestPayload: {},
                responseBody: {
                    status: 'error',
                    message: 'Rate limit exceeded'
                }
            }
        ]
    };

    // if (loading && !logs) {
    //     return (
    //         <div className={RequestLogsStyles.requestLogs}>
    //             <RequestLogsHeader 
    //                 filters={filters}
    //                 onFilterChange={setFilters}
    //                 stats={{ totalSuccess: 0, totalErrors: 0 }}
    //             />
    //             <LoadingSkeleton type="table" lines={10} />
    //         </div>
    //     );
    // }

    // if (error) {
    //     return (
    //         <div className={RequestLogsStyles.requestLogs}>
    //             <div className={RequestLogsStyles.errorContainer}>
    //                 <h2>Error Loading Logs</h2>
    //                 <p>{error}</p>
    //                 <button onClick={refetch}>Retry</button>
    //             </div>
    //         </div>
    //     );
    // }

    return (
        <div className={RequestLogsStyles.requestLogs}>
            <RequestLogsHeader 
                filters={filters}
                onFilterChange={setFilters}
                stats={{
                    totalSuccess: sampleLogs.totalSuccess,
                    totalErrors: sampleLogs.totalErrors
                }}
            />

            <div className={RequestLogsStyles.logsContent}>
                <RequestLogsTable 
                    logs={sampleLogs.logs}
                    selectedLog={selectedRequest}
                    onSelectLog={setSelectedRequest}
                    // loading={loading}
                />

                {selectedRequest && (
                    <RequestDetailsPanel 
                        request={selectedRequest}
                        onClose={() => setSelectedRequest(null)}
                    />
                )}
            </div>

            <RequestLogsFooter />
        </div>
    );
}