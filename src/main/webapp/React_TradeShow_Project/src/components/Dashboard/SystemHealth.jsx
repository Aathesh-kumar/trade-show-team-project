import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceArea,
} from 'recharts';
import LoadingSkeleton from '../Loading/LoadingSkeleton';
import S from './SystemHealth.module.css';

const MODE_META = {
  today: { label: 'Today' },
  week:  { label: 'Last Week' },
  month: { label: 'Last Month' },
};

function parseTimestamp(value) {
  if (!value) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = new Date(String(value).replace(' ', 'T')).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function formatTickTime(ts, mode) {
  const d = new Date(ts);
  if (mode === 'today')
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (mode === 'week')
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', hour12: false });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatTooltipTime(ts) {
  return new Date(ts).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function fmtV(v) {
  if (v == null) return '';
  return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(v));
}

const CustomTooltip = ({ active, payload, label, mode }) => {
  if (!active || !payload?.length) return null;
  return (
      <div style={{
        background: '#0a1628',
        border: '1px solid rgba(59,130,246,0.45)',
        borderRadius: 10,
        padding: '10px 14px',
        fontFamily: 'inherit',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        <p style={{ margin: 0, fontSize: 11, color: '#64748b', marginBottom: 4 }}>
          {formatTooltipTime(label)}
        </p>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#60a5fa' }}>
          {payload[0].value?.toLocaleString()}
          <span style={{ fontSize: 11, color: '#475569', fontWeight: 400, marginLeft: 4 }}>requests</span>
        </p>
      </div>
  );
};

const StatPill = ({ label, value, colorClass }) => (
    <div className={S.statPill}>
      <div className={S.statLabel}>{label}</div>
      <div className={`${S.statValue} ${colorClass}`}>{value}</div>
    </div>
);

const ToolBtn = ({ onClick, children, highlight }) => (
    <button
        onClick={onClick}
        className={`${S.toolBtn} ${highlight ? S.toolBtnHighlight : ''}`}
    >
      {children}
    </button>
);

export default function SystemHealth({
                                       data = [],
                                       loading = false,
                                       timeMode = 'today',
                                       onChangeTimeMode,
                                     }) {
  const [mode, setMode]           = useState(timeMode);
  const [viewRange, setViewRange] = useState(null);   // [startIdx, endIdx] | null
  const [zoomLeft,  setZoomLeft]  = useState(null);
  const [zoomRight, setZoomRight] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [yZoom, setYZoom]         = useState(1);
  const [dragState, setDragState] = useState(null);
  const containerRef = useRef(null);

  // Sync external prop
  useEffect(() => { setMode(timeMode); }, [timeMode]);

  // Parse & sort data
  const fullData = useMemo(() => {
    const points = Array.isArray(data) ? data : [];
    return points
        .map((point, index) => {
          const ts = parseTimestamp(point?.time);
          const value = Number(point?.value) || 0;
          if (!Number.isFinite(ts)) return null;
          return { ts: ts + index, value };
        })
        .filter(Boolean)
        .sort((a, b) => a.ts - b.ts);
  }, [data]);

  // Reset on data/mode change
  useEffect(() => {
    setViewRange(null);
    setYZoom(1);
    setSelecting(false);
    setZoomLeft(null);
    setZoomRight(null);
  }, [fullData.length, mode]);

  // Visible slice
  const visibleData = useMemo(() =>
          viewRange ? fullData.slice(viewRange[0], viewRange[1] + 1) : fullData,
      [fullData, viewRange]
  );

  // Y max with zoom
  const yMax = useMemo(() => {
    const maxVal = visibleData.reduce((m, d) => Math.max(m, d.value), 0);
    return Math.max(10, Math.ceil((maxVal * 1.15) / yZoom));
  }, [visibleData, yZoom]);

  // Stats
  const stats = useMemo(() => {
    const vals = visibleData.map(d => d.value);
    if (!vals.length) return { max: 0, avg: 0, total: 0 };
    const total = vals.reduce((a, b) => a + b, 0);
    return { max: Math.max(...vals), avg: Math.round(total / vals.length), total };
  }, [visibleData]);

  const zoomBy = (factor) => {
    const total = fullData.length;
    if (total < 3) return;
    const [s, e] = viewRange ?? [0, total - 1];
    const center = (s + e) / 2;
    const half   = ((e - s) / 2) / factor;
    const ns = Math.max(0, Math.round(center - half));
    const ne = Math.min(total - 1, Math.round(center + half));
    if (ne - ns < 3) return;
    setViewRange([ns, ne]);
  };

  const zoomIn  = () => zoomBy(1.8);
  const zoomOut = () => {
    if (!viewRange) return;
    const total = fullData.length;
    const [s, e] = viewRange;
    const ns = Math.max(0, Math.round(((s + e) / 2) - ((e - s) / 2) * 1.8));
    const ne = Math.min(total - 1, Math.round(((s + e) / 2) + ((e - s) / 2) * 1.8));
    if (ns <= 0 && ne >= total - 1) { setViewRange(null); return; }
    setViewRange([ns, ne]);
  };

  const resetZoom = () => { setViewRange(null); setYZoom(1); };

  const pan = (dir) => {
    if (!viewRange) return;
    const total = fullData.length;
    const range = viewRange[1] - viewRange[0];
    const step  = Math.max(1, Math.round(range * 0.2));
    let ns = viewRange[0] + dir * step;
    let ne = viewRange[1] + dir * step;
    if (ns < 0)      { ns = 0;       ne = range; }
    if (ne >= total) { ne = total-1; ns = ne - range; }
    setViewRange([ns, ne]);
  };

  const beginDrag = (e) => {
    if (selecting) return;
    setDragState({ x: e.clientX, y: e.clientY, viewRange, yZoom });
  };

  const handleDrag = (e) => {
    if (!dragState || !containerRef.current || !fullData.length) return;
    const rect  = containerRef.current.getBoundingClientRect();
    const dx    = e.clientX - dragState.x;
    const dy    = e.clientY - dragState.y;
    const [s, en] = dragState.viewRange ?? [0, fullData.length - 1];
    const span  = en - s + 1;
    const shift = Math.round((-dx / Math.max(1, rect.width)) * span);
    let ns = Math.max(0, s + shift);
    let ne = Math.min(fullData.length - 1, en + shift);
    if (ne - ns + 1 < span) ns = Math.max(0, ne - span + 1);
    setViewRange([ns, ne]);
    setYZoom(Math.max(0.5, Math.min(4, dragState.yZoom + dy / 220)));
  };

  const endDrag = () => setDragState(null);

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.shiftKey) {
      setYZoom(prev => Math.max(0.5, Math.min(4, prev + (e.deltaY > 0 ? 0.14 : -0.14))));
      return;
    }
    e.deltaY > 0 ? zoomOut() : zoomIn();
  };

  const onChartMouseDown = (e) => {
    if (dragState) return;
    if (e?.activeLabel !== undefined) { setZoomLeft(e.activeLabel); setSelecting(true); }
  };

  const onChartMouseMove = (e) => {
    if (selecting && e?.activeLabel !== undefined) setZoomRight(e.activeLabel);
  };

  const onChartMouseUp = () => {
    setSelecting(false);
    if (zoomLeft === null || zoomRight === null || zoomLeft === zoomRight) {
      setZoomLeft(null); setZoomRight(null); return;
    }
    const [lo, hi] = zoomLeft < zoomRight ? [zoomLeft, zoomRight] : [zoomRight, zoomLeft];
    const base = viewRange ? viewRange[0] : 0;
    const si   = visibleData.findIndex(d => d.ts >= lo);
    const eiR  = [...visibleData].reverse().findIndex(d => d.ts <= hi);
    if (si < 0 || eiR < 0) { setZoomLeft(null); setZoomRight(null); return; }
    const ei = visibleData.length - 1 - eiR;
    if (ei - si < 2) { setZoomLeft(null); setZoomRight(null); return; }
    setViewRange([base + si, base + ei]);
    setZoomLeft(null); setZoomRight(null);
  };

  const isZoomed   = viewRange !== null;
  const thumbLeft  = isZoomed ? (viewRange[0] / Math.max(1, fullData.length)) * 100 : 0;
  const thumbWidth = isZoomed ? ((viewRange[1] - viewRange[0]) / Math.max(1, fullData.length)) * 100 : 100;
  const tickCount  = Math.min(8, Math.max(3, Math.floor(visibleData.length / 18)));

  const cursorClass = dragState ? S.grabbing : selecting ? S.crosshair : S.grab;

  const handleMode = (next) => { setMode(next); onChangeTimeMode?.(next); };

  return (
      <div className={S.card}>

        {/* ── Header ── */}
        <div className={S.header}>
          <div>
            <div className={S.titleRow}>
              <span className={S.liveDot} />
              <h2 className={S.title}>System Health</h2>
            </div>
            <p className={S.subtitle}>
              Request throughput · {MODE_META[mode]?.label} · {visibleData.length} pts
              {isZoomed && <span className={S.zoomedBadge}>● zoomed</span>}
            </p>
          </div>

          <div className={S.controls}>
            {/* Mode tabs */}
            <div className={S.modeTabs}>
              {Object.entries(MODE_META).map(([key, meta]) => (
                  <button
                      key={key}
                      onClick={() => handleMode(key)}
                      className={`${S.modeBtn} ${mode === key ? S.modeBtnActive : ''}`}
                  >
                    {meta.label}
                  </button>
              ))}
            </div>

            {/* Zoom / pan */}
            {isZoomed && <ToolBtn onClick={() => pan(-1)}>◀</ToolBtn>}
            {isZoomed && <ToolBtn onClick={() => pan(1)}>▶</ToolBtn>}
            <ToolBtn onClick={zoomOut}>－</ToolBtn>
            <ToolBtn onClick={zoomIn}>＋</ToolBtn>
            {isZoomed && <ToolBtn onClick={resetZoom} highlight>⟳ Reset</ToolBtn>}
          </div>
        </div>

        {/* ── Stat pills ── */}
        {!loading && fullData.length > 0 && (
            <div className={S.statRow}>
              <StatPill label="Peak"  value={fmtV(stats.max)}                        colorClass={S.statPeak}  />
              <StatPill label="Avg"   value={fmtV(stats.avg)}                        colorClass={S.statAvg}   />
              <StatPill label="Total" value={(stats.total / 1000).toFixed(0) + 'k req'} colorClass={S.statTotal} />
            </div>
        )}

        {/* ── Chart ── */}
        <div
            ref={containerRef}
            className={`${S.chartWrap} ${cursorClass}`}
            onMouseDown={beginDrag}
            onMouseMove={handleDrag}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            onWheel={handleWheel}
        >
          {loading ? (
              <LoadingSkeleton type="card" lines={6} />
          ) : fullData.length === 0 ? (
              <div className={S.emptyState}>No request activity for this interval.</div>
          ) : (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart
                      data={visibleData}
                      onMouseDown={onChartMouseDown}
                      onMouseMove={onChartMouseMove}
                      onMouseUp={onChartMouseUp}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="sh-areaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.38} />
                        <stop offset="85%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="sh-strokeGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stopColor="#60a5fa" />
                        <stop offset="50%"  stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#818cf8" />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="3 6"
                        stroke="rgba(255,255,255,0.04)"
                        vertical={false}
                    />

                    <XAxis
                        dataKey="ts"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        tickCount={tickCount}
                        tickFormatter={t => formatTickTime(t, mode)}
                        tick={{ fill: '#475569', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                        tickLine={false}
                    />

                    <YAxis
                        tickFormatter={fmtV}
                        domain={[0, yMax]}
                        tick={{ fill: '#475569', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                    />

                    <Tooltip
                        content={<CustomTooltip mode={mode} />}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />

                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke="url(#sh-strokeGrad)"
                        strokeWidth={2.5}
                        fill="url(#sh-areaFill)"
                        dot={false}
                        activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                        isAnimationActive={false}
                    />

                    {/* Drag-to-zoom selection box */}
                    {selecting && zoomLeft !== null && zoomRight !== null && (
                        <ReferenceArea
                            x1={Math.min(zoomLeft, zoomRight)}
                            x2={Math.max(zoomLeft, zoomRight)}
                            stroke="#3b82f6"
                            strokeOpacity={0.6}
                            fill="rgba(59,130,246,0.12)"
                        />
                    )}

                    {/* Brush scrubber */}
                    <Brush
                        dataKey="ts"
                        height={22}
                        stroke="rgba(59,130,246,0.25)"
                        fill="rgba(15,23,42,0.8)"
                        travellerWidth={6}
                        tickFormatter={t => formatTickTime(t, mode)}
                        onChange={(range) => {
                          if (!range || !Number.isInteger(range.startIndex)) return;
                          const base = viewRange ? viewRange[0] : 0;
                          setViewRange([base + range.startIndex, base + range.endIndex]);
                        }}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {/* ── Minimap ── */}
                <div className={S.minimap}>
                  <div
                      className={S.minimapTrack}
                      onClick={e => {
                        const rect  = e.currentTarget.getBoundingClientRect();
                        const pct   = (e.clientX - rect.left) / rect.width;
                        const range = isZoomed ? viewRange[1] - viewRange[0] : fullData.length - 1;
                        const half  = range / 2;
                        const center = Math.round(pct * fullData.length);
                        const ns = Math.max(0, Math.round(center - half));
                        const ne = Math.min(fullData.length - 1, ns + range);
                        setViewRange([ns, ne]);
                      }}
                  >
                    <div
                        className={`${S.minimapThumb} ${selecting ? S.minimapThumbStatic : ''}`}
                        style={{ left: `${thumbLeft}%`, width: `${thumbWidth}%` }}
                    />
                  </div>
                  <div className={S.minimapLabels}>
                <span className={S.minimapEdge}>
                  {fullData[0] ? formatTickTime(fullData[0].ts, mode) : ''}
                </span>
                    <span className={S.minimapHint}>
                  scroll · drag · shift+scroll y-zoom · drag to select region
                </span>
                    <span className={S.minimapEdge}>
                  {fullData[fullData.length - 1] ? formatTickTime(fullData[fullData.length - 1].ts, mode) : ''}
                </span>
                  </div>
                </div>
              </>
          )}
        </div>
      </div>
  );
}