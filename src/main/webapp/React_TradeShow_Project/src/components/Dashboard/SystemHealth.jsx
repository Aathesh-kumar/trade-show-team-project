import { useEffect, useMemo, useState } from "react";
import DashboardStyles from '../../styles/Dashboard.module.css';


import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Area,
    Tooltip
} from "recharts";

const TIME_MODE_META = {
    current: { label: 'Current Statistics', hours: 1, bucketMinutes: 1 },
    '12h': { label: '12hr', hours: 12, bucketMinutes: 5 },
    '1d': { label: '1day', hours: 24, bucketMinutes: 15 },
    '15d': { label: '15day', hours: 24 * 15, bucketMinutes: 180 },
    '30d': { label: '30day', hours: 24 * 30, bucketMinutes: 360 }
};

function getDetailLevelFromData(points) {
    const totalPoints = points.length;
    const nonZeroPoints = points.filter((point) => point.value > 0).length;

    if (totalPoints <= 24 || nonZeroPoints <= 12) {
        return 'detailed';
    }
    if (totalPoints >= 100) {
        return 'minimal';
    }
    return 'balanced';
}

function getXAxisInterval(pointsCount, detailLevel) {
    if (detailLevel === 'detailed') {
        return 0;
    }
    const targetLabels = detailLevel === 'minimal' ? 6 : 9;
    return Math.max(0, Math.ceil(pointsCount / targetLabels) - 1);
}

function parseTimestamp(value) {
    if (!value) {
        return null;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    const normalized = String(value).replace(' ', 'T');
    const parsed = new Date(normalized).getTime();
    return Number.isFinite(parsed) ? parsed : null;
}

function formatTickTime(ts, mode) {
    const date = new Date(ts);
    const meta = TIME_MODE_META[mode] || TIME_MODE_META.current;
    if (meta.hours <= 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    if (meta.hours <= (24 * 7)) {
        return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', hour12: false });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatTooltipTime(ts) {
    return new Date(ts).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function buildDenseSeries(data, mode) {
    const meta = TIME_MODE_META[mode] || TIME_MODE_META.current;
    const bucketMs = Math.max(1, meta.bucketMinutes) * 60_000;
    const now = Date.now();
    const end = Math.floor(now / bucketMs) * bucketMs;
    const start = end - (meta.hours * 60 * 60 * 1000);
    const counts = new Map();

    for (const point of (Array.isArray(data) ? data : [])) {
        const ts = parseTimestamp(point?.time);
        if (ts == null) {
            continue;
        }
        const bucket = Math.floor(ts / bucketMs) * bucketMs;
        const value = Number(point?.value) || 0;
        counts.set(bucket, (counts.get(bucket) || 0) + value);
    }

    const series = [];
    for (let bucket = start; bucket <= end; bucket += bucketMs) {
        series.push({
            ts: bucket,
            value: counts.get(bucket) || 0
        });
    }
    return series.filter((point) => point.value > 0);
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div
                style={{
                    background: "#0F172A",
                    border: "1px solid #1E293B",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    color: "white",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                }}
            >
                <p style={{ margin: 0, fontSize: 13, color: "#94A3B8" }}>
                    {formatTooltipTime(label)}
                </p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                    {payload[0].value} requests
                </p>
            </div>
        );
    }

    return null;
};


export default function SystemHealth({ data = [], timeMode = 'current', onChangeTimeMode }) {
    const [activeTab, setActiveTab] = useState(timeMode);
    const chartData = useMemo(() => buildDenseSeries(data, activeTab), [data, activeTab]);
    const detailLevel = getDetailLevelFromData(chartData);
    const xAxisInterval = getXAxisInterval(chartData.length, detailLevel);
    const showVerticalGrid = detailLevel !== 'minimal';
    const lineStrokeWidth = detailLevel === 'minimal' ? 2.5 : 3;
    const areaOpacity = detailLevel === 'minimal' ? 0.4 : 0.6;

    useEffect(() => {
        setActiveTab(timeMode);
    }, [timeMode]);

    const handleTab = (tab) => {
        setActiveTab(tab);
        onChangeTimeMode?.(tab);
    };

    return (
        <div className={DashboardStyles.systemHealth}>
            <div className={DashboardStyles.sectionHeader}>
                <div>
                    <h2>System Health</h2>
                    <p className={DashboardStyles.sectionSubtitle}>Request throughput across all tools based on current statistics</p>
                </div>
                <div className={DashboardStyles.tabGroup}>
                    <button
                        className={`${DashboardStyles.tab} ${activeTab === 'current' ? DashboardStyles.active : ''}`}
                        onClick={() => handleTab('current')}
                    >
                        Current Statistics
                    </button>
                    <button
                        className={`${DashboardStyles.tab} ${activeTab === '12h' ? DashboardStyles.active : ''}`}
                        onClick={() => handleTab('12h')}
                    >
                        12hr
                    </button>
                    <button
                        className={`${DashboardStyles.tab} ${activeTab === '1d' ? DashboardStyles.active : ''}`}
                        onClick={() => handleTab('1d')}
                    >
                        1day
                    </button>
                    <button
                        className={`${DashboardStyles.tab} ${activeTab === '15d' ? DashboardStyles.active : ''}`}
                        onClick={() => handleTab('15d')}
                    >
                        15day
                    </button>
                    <button
                        className={`${DashboardStyles.tab} ${activeTab === '30d' ? DashboardStyles.active : ''}`}
                        onClick={() => handleTab('30d')}
                    >
                        30day
                    </button>
                </div>
            </div>

            <div className={DashboardStyles.chartContainer}>
                {chartData.length === 0 ? (
                    <div className={DashboardStyles.emptyState}>
                        No request activity for this interval.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <defs>
                                <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={areaOpacity} />
                                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#1E293B", strokeWidth: 1 }} />

                            <CartesianGrid
                                stroke="#1F2A44"
                                strokeDasharray="0"
                                vertical={showVerticalGrid}
                                horizontal={true}
                            />

                            <XAxis
                                dataKey="ts"
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                stroke="#64748B"
                                tickLine={false}
                                axisLine={false}
                                interval={xAxisInterval}
                                minTickGap={12}
                                tickFormatter={(value) => formatTickTime(value, activeTab)}
                            />

                            <YAxis
                                stroke="#64748B"
                                tickLine={false}
                                axisLine={false}
                            />

                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="none"
                                fill="url(#lineGradient)"
                            />

                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#3B82F6"
                                strokeWidth={lineStrokeWidth}
                                dot={false}
                                activeDot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
