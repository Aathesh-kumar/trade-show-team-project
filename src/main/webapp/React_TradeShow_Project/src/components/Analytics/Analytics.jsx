import { useMemo, useState } from 'react';
import DashboardStyles from '../../styles/Dashboard.module.css';
import { useGet } from '../Hooks/useGet';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import useBufferedLoading from '../Hooks/useBufferedLoading';
import LoadingSkeleton from '../Loading/LoadingSkeleton';

const TOOL_COLORS = ['#0b3c7a', '#1155a6', '#1d6fd6', '#2a8ef2', '#53a8ff', '#7bc0ff', '#9dd3ff', '#bfe5ff'];
const REQUEST_COLORS = {
  Success: '#16a34a',
  Error: '#dc2626',
  Others: '#f59e0b'
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
  const bufferedLoading = useBufferedLoading(loading, 1500);

  const usageData = useMemo(() => {
    const tools = metrics?.topTools || [];
    const rows = tools.map((tool) => ({
      name: tool.toolName,
      value: Number(tool.totalCalls || 0)
    })).filter((item) => item.value > 0 && !isInternalToolName(item.name));
    const total = rows.reduce((sum, item) => sum + item.value, 0);
    return rows.map((item) => ({
      ...item,
      total,
      percent: total > 0 ? item.value / total : 0
    }));
  }, [metrics?.topTools]);

  const requestSplit = useMemo(() => {
    const stats = metrics?.requestStats || {};
    const total = Number(stats.totalRequests || 0);
    const success = Number(stats.totalSuccess || 0);
    const errors = Number(stats.totalErrors || 0);
    const other = Math.max(0, total - success - errors);
    return {
      success,
      errors,
      others: other
    };
  }, [metrics?.requestStats]);

  const orderedRequestSplit = useMemo(() => {
    const success = Number(requestSplit.success || 0);
    const errors = Number(requestSplit.errors || 0);
    const others = Number(requestSplit.others || 0);
    const rows = [
      { name: 'Success', value: success },
      { name: 'Error', value: errors },
      { name: 'Others', value: others }
    ].filter((item) => item.value > 0);
    const total = rows.reduce((sum, item) => sum + item.value, 0);
    return rows.map((item) => ({
      ...item,
      total,
      percent: total > 0 ? item.value / total : 0
    }));
  }, [requestSplit]);

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
            <h2>Tools Usage</h2>
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
                    cx="40%"
                    cy="50%"
                    stroke={0}
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
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="square"
                    wrapperStyle={{ paddingRight: 6, lineHeight: '1.9', maxWidth: '47%' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className={DashboardStyles.systemHealth}>
          <div className={DashboardStyles.sectionHeader}>
            <h2>Request Distribution</h2>
          </div>
          {bufferedLoading ? (
            <LoadingSkeleton type="card" lines={5} />
          ) : (
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={orderedRequestSplit}
                    dataKey="value"
                    nameKey="name"
                    cx="40%"
                    cy="50%"
                    outerRadius={125}
                    activeIndex={activeRequestIndex}
                    activeOuterRadius={136}
                    isAnimationActive={true}
                    animationDuration={850}
                    stroke={0}
                    onMouseEnter={(_, index) => setActiveRequestIndex(index)}
                  >
                    {orderedRequestSplit.map((entry) => (
                        entry.value ?
                      <Cell key={entry.name} fill={REQUEST_COLORS[entry.name] || '#94a3b8'} /> : null
                    ))}
                  </Pie>
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ paddingRight: 6, maxWidth: '47%' }}
                    content={() => <RequestLegend items={orderedRequestSplit} />}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AnalyticsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const label = row?.name || row?.payload?.name || 'Value';
  const value = Number(row?.value || 0);
  const accent = row?.color || row?.payload?.fill || '#3b82f6';
  const total = Number(row?.payload?.total || 0);
  const computedPercent = total > 0 ? (value / total) : 0;
  const percent = Number(row?.payload?.percent ?? row?.percent ?? computedPercent);

  return (
      <div style={{
        background: 'color-mix(in srgb, var(--bg-elev-1) 96%, transparent)',
        border: `2px solid ${accent}`,
        borderRadius: 10,
        padding: '10px 14px',
        boxShadow: 'var(--shadow-soft)',
        minWidth: 150
      }}>
        <p style={{ margin: 0, fontSize: 16, color: 'var(--text-muted)', marginBottom: 4 }}>
          {label}
        </p>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: accent }}>
          {value.toLocaleString()}
        </p>
        <p style={{ margin: '4px 0 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
          {(percent * 100).toFixed(1)}%
        </p>
      </div>
  );
}

function isInternalToolName(name) {
  const lower = String(name || '').toLowerCase();
  return !lower
    || lower.startsWith('__')
    || lower.includes('tools/list')
    || lower.includes('ping')
    || lower.includes('refresh')
    || lower.includes('token');
}

function RequestLegend({ items = [] }) {
  const fixedOrder = ['Success', 'Error', 'Others'];
  const byName = new Map(items.map((item) => [item.name, item]));
  const ordered = fixedOrder.map((name) => byName.get(name)).filter(Boolean);

  return (
      <ul style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 16,
        listStyle: 'none',
        margin: 0,
        padding: 0
      }}>
        {ordered.map((item) => (
            <li key={item.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: REQUEST_COLORS[item.name] }}>
              <span style={{ width: 12, height: 10, background: REQUEST_COLORS[item.name], display: 'inline-block' }} />
              <span style={{ fontSize: 18 }}>{item.name}</span>
            </li>
        ))}
      </ul>
  );
}
