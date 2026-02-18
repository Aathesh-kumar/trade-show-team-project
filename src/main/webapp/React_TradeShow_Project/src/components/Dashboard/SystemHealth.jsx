import { useEffect, useMemo, useRef, useState } from 'react';
import DashboardStyles from '../../styles/Dashboard.module.css';
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const MODE_META = {
  today: { label: 'Today' },
  week: { label: 'Last Week' },
  month: { label: 'Last Month' }
};

export default function SystemHealth({ data = [], timeMode = 'today', onChangeTimeMode }) {
  const [mode, setMode] = useState(timeMode);
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(0);
  const [yZoom, setYZoom] = useState(1);
  const [dragState, setDragState] = useState(null);
  const containerRef = useRef(null);

  const fullData = useMemo(() => {
    const points = Array.isArray(data) ? data : [];
    return points
      .map((point, index) => {
        const ts = parseTimestamp(point?.time);
        const value = Number(point?.value) || 0;
        if (!Number.isFinite(ts)) {
          return null;
        }
        const distinctTs = ts + (index % 10) * 100;
        return { idx: index, ts: distinctTs, rawTs: ts, value };
      })
      .filter(Boolean)
      .sort((a, b) => a.ts - b.ts);
  }, [data]);

  const visibleData = useMemo(() => {
    if (fullData.length === 0) {
      return [];
    }
    const safeStart = Math.max(0, Math.min(startIndex, fullData.length - 1));
    const safeEnd = Math.max(safeStart, Math.min(endIndex, fullData.length - 1));
    return fullData.slice(safeStart, safeEnd + 1);
  }, [fullData, startIndex, endIndex]);

  useEffect(() => {
    setMode(timeMode);
  }, [timeMode]);

  useEffect(() => {
    if (fullData.length === 0) {
      setStartIndex(0);
      setEndIndex(0);
      setYZoom(1);
      return;
    }
    setStartIndex(0);
    setEndIndex(fullData.length - 1);
    setYZoom(1);
  }, [fullData.length, mode]);

  const xDomain = useMemo(() => {
    if (visibleData.length === 0) {
      return ['auto', 'auto'];
    }
    return [visibleData[0].ts, visibleData[visibleData.length - 1].ts];
  }, [visibleData]);

  const yMax = useMemo(() => {
    const maxValue = visibleData.reduce((max, item) => Math.max(max, item.value), 0);
    if (maxValue <= 0) {
      return 10;
    }
    return Math.max(10, Math.ceil((maxValue * 1.2) / yZoom));
  }, [visibleData, yZoom]);

  const handleMode = (nextMode) => {
    setMode(nextMode);
    onChangeTimeMode?.(nextMode);
  };

  const zoom = (direction) => {
    if (fullData.length < 3) {
      return;
    }
    const span = endIndex - startIndex + 1;
    const nextSpan = direction === 'in'
      ? Math.max(8, Math.floor(span * 0.72))
      : Math.min(fullData.length, Math.ceil(span * 1.35));
    const center = Math.floor((startIndex + endIndex) / 2);
    let nextStart = Math.max(0, center - Math.floor(nextSpan / 2));
    let nextEnd = Math.min(fullData.length - 1, nextStart + nextSpan - 1);

    if (nextEnd - nextStart + 1 < nextSpan) {
      nextStart = Math.max(0, nextEnd - nextSpan + 1);
    }

    setStartIndex(nextStart);
    setEndIndex(nextEnd);
  };

  const resetView = () => {
    if (fullData.length === 0) {
      return;
    }
    setStartIndex(0);
    setEndIndex(fullData.length - 1);
    setYZoom(1);
  };

  const beginDrag = (event) => {
    if (!containerRef.current) {
      return;
    }
    setDragState({ x: event.clientX, y: event.clientY, startIndex, endIndex, yZoom });
  };

  const handleDrag = (event) => {
    if (!dragState || !containerRef.current || fullData.length === 0) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const dx = event.clientX - dragState.x;
    const dy = event.clientY - dragState.y;
    const span = dragState.endIndex - dragState.startIndex + 1;
    const shift = Math.round((-dx / Math.max(1, rect.width)) * span);

    let nextStart = Math.max(0, dragState.startIndex + shift);
    let nextEnd = Math.min(fullData.length - 1, dragState.endIndex + shift);
    if (nextEnd - nextStart + 1 < span) {
      nextStart = Math.max(0, nextEnd - span + 1);
      nextEnd = Math.min(fullData.length - 1, nextStart + span - 1);
    }

    const zoomDelta = Math.max(0.55, Math.min(5, dragState.yZoom + (dy / 220)));
    setStartIndex(nextStart);
    setEndIndex(nextEnd);
    setYZoom(zoomDelta);
  };

  const handleWheel = (event) => {
    event.preventDefault();
    zoom(event.deltaY > 0 ? 'out' : 'in');
  };

  const endDrag = () => setDragState(null);

  return (
    <div className={DashboardStyles.systemHealth}>
      <div className={DashboardStyles.sectionHeader}>
        <div>
          <h2>System Health</h2>
          <p className={DashboardStyles.sectionSubtitle}>Wave plotting with second-level points, drag-to-pan, wheel zoom, and reset.</p>
        </div>
        <div className={DashboardStyles.tabGroup}>
          {Object.entries(MODE_META).map(([key, meta]) => (
            <button
              key={key}
              className={`${DashboardStyles.tab} ${mode === key ? DashboardStyles.active : ''}`}
              onClick={() => handleMode(key)}
            >
              {meta.label}
            </button>
          ))}
          <button className={DashboardStyles.tab} onClick={() => zoom('in')}>+</button>
          <button className={DashboardStyles.tab} onClick={() => zoom('out')}>-</button>
          <button className={DashboardStyles.tab} onClick={resetView}>Reset</button>
        </div>
      </div>

      <div
        className={`${DashboardStyles.chartContainer} ${DashboardStyles.chartGrabbable} ${dragState ? DashboardStyles.chartGrabbing : ''}`}
        ref={containerRef}
        onMouseDown={beginDrag}
        onMouseMove={handleDrag}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onWheel={handleWheel}
        data-grab="true"
        data-grabbing={dragState ? 'true' : 'false'}
      >
        {fullData.length === 0 ? (
          <div className={DashboardStyles.emptyState}>No request activity for this interval.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fullData}>
              <defs>
                <linearGradient id="throughputArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary-color)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary-color)" stopOpacity={0.03} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="color-mix(in srgb, var(--text-primary) 14%, transparent)" strokeDasharray="3 3" vertical horizontal />

              <XAxis
                dataKey="ts"
                type="number"
                domain={xDomain}
                tickLine={false}
                axisLine={false}
                minTickGap={16}
                tickFormatter={(value) => formatTickTime(value, mode)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, yMax]}
              />

              <Tooltip
                cursor={{ stroke: 'color-mix(in srgb, var(--text-primary) 18%, transparent)', strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) {
                    return null;
                  }
                  return (
                    <div className={DashboardStyles.chartTooltip}>
                      <p className={DashboardStyles.chartTooltipTime}>{formatTooltipTime(label)}</p>
                      <p className={DashboardStyles.chartTooltipValue}>{payload[0].value} requests</p>
                    </div>
                  );
                }}
              />

              <Area type="monotone" dataKey="value" stroke="none" fill="url(#throughputArea)" />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--primary-color)"
                strokeWidth={2.2}
                dot={{ r: 2.6, strokeWidth: 0, fill: 'var(--primary-color)' }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
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
  if (mode === 'today') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }
  if (mode === 'week') {
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
    second: '2-digit',
    hour12: false
  });
}
