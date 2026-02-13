import { useState } from 'react';
import DashboardStyles from './demoChart.css';

export default function Chart() {
    const [activeTab, setActiveTab] = useState('24h');

    const chartPoints = [
        { x: 5, y: 85 },
        { x: 15, y: 82 },
        { x: 25, y: 88 },
        { x: 35, y: 75 },
        { x: 45, y: 70 },
        { x: 55, y: 92 },
        { x: 65, y: 95 },
        { x: 75, y: 78 },
        { x: 85, y: 65 },
        { x: 95, y: 72 }
    ];

    const createPath = () => {
        const height = 200;
        const width = 100;
        
        let path = `M 0 ${height - chartPoints[0].y}`;
        
        chartPoints.forEach((point, i) => {
            if (i === 0) return;
            const prevPoint = chartPoints[i - 1];
            const cpx1 = (prevPoint.x + point.x) / 2;
            const cpy1 = height - prevPoint.y;
            const cpx2 = (prevPoint.x + point.x) / 2;
            const cpy2 = height - point.y;
            path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${point.x} ${height - point.y}`;
        });
        
        return path;
    };

    const timeLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];

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
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={DashboardStyles.chart}>
                    <defs>
                        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    
                    <path
                        d={`${createPath()} L 100 100 L 0 100 Z`}
                        fill="url(#chartGradient)"
                    />
                    
                    <path
                        d={createPath()}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="0.5"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>

                <div className={DashboardStyles.chartLabels}>
                    {timeLabels.map((label, index) => (
                        <span key={index}>{label}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}