import { useMemo, useState } from 'react';
import DashboardStyles from '../../styles/Dashboard.module.css';
import { useGet } from '../Hooks/useGet';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import useBufferedLoading from '../Hooks/useBufferedLoading';
import LoadingSkeleton from '../Loading/LoadingSkeleton';

const TOOL_COLORS = ['#2AAAF4', '#57BDF6', '#82CFF8', '#ADDFFB', '#0EA5E9', '#38BDF8'];
const REQUEST_COLORS = {
  Success: '#16a34a',
  Errors: '#dc2626',
  Other: '#f59e0b'
};

export default function Analytics({ selectedServer }) {
  const serverId = selectedServer?.serverId;
  const [activeToolIndex, setActiveToolIndex] = useState(0);
  const [activeRequestIndex, setActiveRequestIndex] = useState(0);
  const { data: metrics, loading } = useGet('/metrics/overview', {
    immediate: !!serverId,
    params: {
      serverId,
      hours: 24 * 30,
      bucketMinutes: 120
    },
    dependencies: [serverId]
  });
  const bufferedLoading = useBufferedLoading(loading, 2200);

  const usageData = useMemo(() => {
    const tools = metrics?.topTools || [];
    return tools.map((tool) => ({
      name: tool.toolName,
      value: Number(tool.totalCalls || 0)
    })).filter((item) => item.value > 0 && !isInternalToolName(item.name));
  }, [metrics?.topTools]);

  const requestSplit = useMemo(() => {
    const stats = metrics?.requestStats || {};
    const total = Number(stats.totalRequests || 0);
    const success = Number(stats.totalSuccess || 0);
    const errors = Number(stats.totalErrors || 0);
    const other = Math.max(0, total - success - errors);
    return [
      { name: 'Success', value: success },
      { name: 'Errors', value: errors },
      { name: 'Other', value: other }
    ].filter((item) => item.value > 0);
  }, [metrics?.requestStats]);

  if (!serverId) {
    return (
      <div className={DashboardStyles.dashboard}>
        <header className={DashboardStyles.header}>
          <h1>Analytics</h1>
        </header>
        <div className={DashboardStyles.emptyState}>
          Select a server to view tool usage analytics.
        </div>
      </div>
    );
  }

  return (
    <div className={DashboardStyles.dashboard}>
      <header className={DashboardStyles.header}>
        <h1>Analytics</h1>
      </header>

      <div className={DashboardStyles.statsGrid}>
        <section className={DashboardStyles.systemHealth}>
          <div className={DashboardStyles.sectionHeader}>
            <h2>Tools Usage (Donut)</h2>
          </div>
          {bufferedLoading ? (
            <LoadingSkeleton type="card" lines={5} />
          ) : (
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={usageData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={126}
                    innerRadius={72}
                    paddingAngle={2}
                    activeIndex={activeToolIndex}
                    activeOuterRadius={136}
                    isAnimationActive={true}
                    animationDuration={850}
                    onMouseEnter={(_, index) => setActiveToolIndex(index)}
                  >
                    {usageData.map((entry, index) => (
                      <Cell key={entry.name} fill={TOOL_COLORS[index % TOOL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className={DashboardStyles.systemHealth}>
          <div className={DashboardStyles.sectionHeader}>
            <h2>Request Distribution (Pie)</h2>
          </div>
          {bufferedLoading ? (
            <LoadingSkeleton type="card" lines={5} />
          ) : (
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={requestSplit}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={125}
                    activeIndex={activeRequestIndex}
                    activeOuterRadius={136}
                    isAnimationActive={true}
                    animationDuration={850}
                    onMouseEnter={(_, index) => setActiveRequestIndex(index)}
                  >
                    {requestSplit.map((entry, index) => (
                      <Cell key={entry.name} fill={REQUEST_COLORS[entry.name] || TOOL_COLORS[index % TOOL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  color: '#0f172a'
};

function isInternalToolName(name) {
  const lower = String(name || '').toLowerCase();
  return !lower
    || lower.startsWith('__')
    || lower.includes('ping')
    || lower.includes('refresh')
    || lower.includes('token');
}
