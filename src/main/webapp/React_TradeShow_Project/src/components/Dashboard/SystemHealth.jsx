import { useMemo, useState } from "react";
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
                    {label}
                </p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                    {payload[0].value} requests
                </p>
            </div>
        );
    }

    return null;
};


export default function SystemHealth({ data = [] }) {
    const [activeTab, setActiveTab] = useState("24h");
    const chartData = useMemo(() => {
        if (!data || data.length === 0) {
            return [
                { time: "00:00", value: 0 },
                { time: "06:00", value: 0 },
                { time: "12:00", value: 0 },
                { time: "18:00", value: 0 }
            ];
        }
        return data.map((point) => ({
            ...point,
            time: String(point.time || '').slice(11, 16)
        }));
    }, [data]);

    return (
        <div className={DashboardStyles.systemHealth}>
            <div className={DashboardStyles.sectionHeader}>
                <div>
                    <h2>System Health</h2>
                    <p className={DashboardStyles.sectionSubtitle}>Request throughput across all tools over the last 24 hours</p>
                </div>
                <div className={DashboardStyles.tabGroup}>
                    <button
                        className={`${DashboardStyles.tab} ${activeTab === '24h' ? DashboardStyles.active : ''}`}
                        onClick={() => setActiveTab('24h')}
                    >
                        24h
                    </button>
                    <button
                        className={`${DashboardStyles.tab} ${activeTab === '7d' ? DashboardStyles.active : ''}`}
                        onClick={() => setActiveTab('7d')}
                    >
                        7d
                    </button>
                    <button
                        className={`${DashboardStyles.tab} ${activeTab === '30d' ? DashboardStyles.active : ''}`}
                        onClick={() => setActiveTab('30d')}
                    >
                        30d
                    </button>
                </div>
            </div>

            <div className={DashboardStyles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <defs>
                            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.6} />
                                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#1E293B", strokeWidth: 1 }} />

                        <CartesianGrid
                            stroke="#1F2A44"
                            strokeDasharray="0"
                            vertical={true}
                            horizontal={true}
                        />

                        <XAxis
                            dataKey="time"
                            stroke="#64748B"
                            tickLine={false}
                            axisLine={false}
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
                            strokeWidth={3}
                            dot={{ r: 5, fill: "#3B82F6", stroke: "#0F172A", strokeWidth: 2 }}
                            activeDot={{ r: 7 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
