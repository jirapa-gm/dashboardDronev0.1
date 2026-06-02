import { useState, useMemo, useRef, useCallback } from 'react';
import {
   buildDailyMap, buildDistribution, buildHourlyMap,
   buildDirectionMap, buildKPIs, buildFreqBands,
} from '../utils/chartUtils';
import { GA, GB, DIR_LABELS, PROTO_COLORS, MODEL_COLORS } from '../shared/constants';
import { Card, Spinner, EmptyState, GroupTabs, HBar, Toolbar } from '../shared/ui';
import { BarChartIcon, ClockIcon, CompassIcon, DroneIcon, SignalIcon, LogIcon } from '../shared/icons';
import { RadarChart, GroupBarChart } from './Charts';

// ── KPI Strip — ALL mode ──────────────────────────────────────────────────────
function KpiStripAll({ kpis }) {
  const items = [
    { label: 'Total Events',  value: kpis.total,               color: '#fff',    icon: '⚡' },
    { label: 'Unique Drones', value: kpis.unique,              color: '#38bdf8', icon: '🚁' },
    { label: 'Group GA',      value: kpis.ga,                  color: GA,        icon: '●'  },
    { label: 'Group GB',      value: kpis.gb,                  color: GB,        icon: '●'  },
    { label: 'Avg Speed',     value: `${kpis.avgSpeed} m/s`,   color: '#a78bfa', icon: '→'  },
    { label: 'Avg Height',    value: `${kpis.avgHeight} m`,    color: '#34d399', icon: '↑'  },
    { label: 'Max Speed',     value: `${kpis.maxSpeed} m/s`,   color: '#f43f5e', icon: '⚡' },
  ];
  return (
    <div className="grid-kpis-all">
      {items.map(({ label, value, color, icon }) => (
        <div key={label} className="kpi-card-dashboard">
          <div className="flex-row-center gap-1-5">
            <span style={{ fontSize: '10px', color }}>{icon}</span>
            <span className="text-label-medium-gray" style={{ fontSize: '8px', fontWeight: 'bold' }}>{label}</span>
          </div>
          <div className="font-mono" style={{ fontSize: '18px', fontWeight: 'bold', color, lineHeight: 1 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// ── KPI Strip — GA/GB mode: subgroup cards → detector lat/lon ─────────────────
function KpiStripGroup({ events, groupFilter }) {
  const [expandedSg, setExpandedSg] = useState(null);
  const groupColor = groupFilter === 'GA' ? GA : GB;

  const subgroups = useMemo(() => {
    const sgMap = {};
    events.forEach(e => {
      if (!e.subgroup) return;
      if (!sgMap[e.subgroup]) sgMap[e.subgroup] = {};
      const did = e.detector_id;
      if (did && !sgMap[e.subgroup][did]) {
        sgMap[e.subgroup][did] = {
          id:  did,
          lat: e.detector_lat ?? null,
          lon: e.detector_lon ?? null,
        };
      }
    });
    return Object.entries(sgMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([sg, dets]) => ({ sg, detectors: Object.values(dets).sort((a,b) => a.id.localeCompare(b.id)) }));
  }, [events]);

  const totalEvents  = events.length;
  const uniqueDrones = new Set(events.map(e => e.drone_id)).size;
  const totalDets    = new Set(events.map(e => e.detector_id).filter(Boolean)).size;
  const avgSpeed     = events.length ? (events.reduce((s,e) => s+(e.speed??0),0)/events.length).toFixed(1) : '—';

  const summaryItems = [
    { label: 'Events',        value: totalEvents,      color: '#fff'    },
    { label: 'Unique Drones', value: uniqueDrones,     color: '#38bdf8' },
    { label: 'Detectors',     value: totalDets,        color: '#fb923c' },
    { label: 'Avg Speed',     value: `${avgSpeed} m/s`, color: '#a78bfa' },
  ];

  return (
    <div className="flex-col-start gap-3">
      <div className="grid-kpis-group">
        {summaryItems.map(({ label, value, color }) => (
          <div key={label} className="kpi-card-dashboard">
            <span className="text-label-medium-gray" style={{ fontSize: '8px', fontWeight: 'bold' }}>{label}</span>
            <div className="font-mono" style={{ fontSize: '18px', fontWeight: 'bold', color, lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="flex-col-start gap-2">
        <div className="text-label-dark-gray px-1" style={{ fontSize: '8px', fontWeight: 'bold' }}>
          Subgroups — {groupFilter} · click to expand detectors
        </div>
        <div className="grid-subgroups">
          {subgroups.map(({ sg, detectors }) => {
            const isOpen = expandedSg === sg;
            return (
              <div key={sg} style={{ gridColumn: isOpen ? '1 / -1' : undefined }} className="flex-col-start">
                <button
                  onClick={() => setExpandedSg(isOpen ? null : sg)}
                  className={`subgroup-header-btn ${isOpen ? 'open' : 'closed'}`}
                  style={{
                    background: isOpen ? `${groupColor}12` : '#141414',
                    borderColor: isOpen ? `${groupColor}55` : '#2a2a2a',
                  }}>
                  <div className="flex-row-center gap-2">
                    <div className="rounded-full flex-none" style={{ background: groupColor, width: 8, height: 8 }} />
                    <span className="font-mono" style={{ fontSize: '12px', fontWeight: 'bold', color: groupColor }}>{sg}</span>
                  </div>
                  <div className="flex-row-center gap-2">
                    <span className="font-mono text-white" style={{ fontSize: '11px', fontWeight: 'bold' }}>{detectors.length}</span>
                    <span style={{ fontSize: '8px', color: '#555' }}>det</span>
                    <svg className="transition-transform"
                         style={{ width: '0.75rem', height: '0.75rem', color: '#555', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                         viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </button>
                {isOpen && (
                  <div className="border border-t-0 rounded-b-xl overflow-hidden"
                       style={{ borderColor: `${groupColor}55`, background: '#0d0d0d', borderTop: 0 }}>
                    <div className="detector-table-header">
                      {['Detector ID', 'Latitude', 'Longitude'].map(h => (
                        <span key={h} className="text-label-dark-gray" style={{ fontSize: '8px', fontWeight: 'bold' }}>{h}</span>
                      ))}
                    </div>
                    {detectors.map(det => (
                      <div key={det.id} className="detector-table-row">
                        <span className="font-mono" style={{ fontSize: '11px', fontWeight: 'bold', color: groupColor }}>{det.id}</span>
                        <span className="font-mono" style={{ fontSize: '11px', color: '#aaa' }}>
                          {det.lat != null ? Number(det.lat).toFixed(5) : '—'}
                        </span>
                        <span className="font-mono" style={{ fontSize: '11px', color: '#aaa' }}>
                          {det.lon != null ? Number(det.lon).toFixed(5) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── KPI Strip router ──────────────────────────────────────────────────────────
function KpiStrip({ kpis, events, groupFilter }) {
  if (groupFilter === 'ALL') return <KpiStripAll kpis={kpis} />;
  return <KpiStripGroup events={events} groupFilter={groupFilter} />;
}



// ── Hourly bar chart (GA & GB separated) ─────────────────────────────────────
function HourlyChart({ events, precomputedHourly, isFiltered }) {
  const dates   = useMemo(() => [...new Set(events.map(e => e.datetime.split('T')[0]))].sort(), [events]);
  const [selDate, setSelDate] = useState('ALL');

  const dayEvts = selDate === 'ALL' ? events : events.filter(e => e.datetime.startsWith(selDate));
  const hourly  = useMemo(() => {
    // ใช้ precomputed จาก Backend เมื่อดู ALL และยังไม่ได้ filter วัน
    if (!isFiltered && selDate === 'ALL' && precomputedHourly?.length > 0) {
      return precomputedHourly;
    }
    return buildHourlyMap(dayEvts);
  }, [dayEvts, selDate, isFiltered, precomputedHourly]);

  const total = hourly.reduce((s, h) => s + h.GA + h.GB, 0);
  const night = [...hourly.slice(18), ...hourly.slice(0, 6)].reduce((s, h) => s + h.GA + h.GB, 0);
  const day   = hourly.slice(6, 18).reduce((s, h) => s + h.GA + h.GB, 0);

  return (
    <div className="flex-col-start gap-4">
      {/* Date filter */}
      <div className="flex-row-center gap-2">
        <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>Date</span>
        <select value={selDate} onChange={e => setSelDate(e.target.value)} className="select-styled">
          <option value="ALL">All dates</option>
          {dates.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* GA chart */}
      <GroupBarChart hourly={hourly} groupKey="GA" color={GA} label="Group GA" />

      {/* Divider */}
      <div style={{ height: 1, background: '#1e1e1e' }} />

      {/* GB chart */}
      <GroupBarChart hourly={hourly} groupKey="GB" color={GB} label="Group GB" />

      {/* Summary stats */}
      <div className="grid-kpis-3">
        {[
          { label: 'Total Events',         value: total, sub: '100%' },
          { label: 'Daytime 06:00–18:00',  value: day,   sub: total > 0 ? `${((day/total)*100).toFixed(0)}%` : '—' },
          { label: 'Night  18:01–05:59',   value: night, sub: total > 0 ? `${((night/total)*100).toFixed(0)}%` : '—' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="kpi-card-small">
            <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
            <div className="font-mono" style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>{value}</div>
            <div style={{ fontSize: '9px', color: '#444', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PDF export ────────────────────────────────────────────────────────────────
function buildPdfHtml({ titleDate, groupFilter, kpis, models, protocols, freqBands, dirData }) {
  const kpiRows = [
    ['Total Events', kpis.total, '#fff'], ['Unique Drones', kpis.unique, '#38bdf8'],
    ['Group GA', kpis.ga, GA],            ['Group GB', kpis.gb, GB],
    ['High Threat', kpis.highThreat, '#ef4444'], ['Avg Speed', `${kpis.avgSpeed} m/s`, '#a78bfa'],
    ['Avg Height', `${kpis.avgHeight} m`, '#34d399'], ['Max Speed', `${kpis.maxSpeed} m/s`, '#f43f5e'],
  ];
  const bar = (label, count, pct, color) =>
    `<div style="margin-bottom:7px"><div style="display:flex;justify-content:space-between;font-size:8px;color:#888;margin-bottom:3px"><span>${label}</span><span style="color:${color};font-weight:700">${count}</span></div><div style="height:5px;background:#222;border-radius:3px"><div style="height:100%;width:${pct}%;background:${color};border-radius:3px"></div></div></div>`;

  const maxModel = models[0]?.[1] ?? 1;
  const modelRows = models.slice(0,8).map(([l,c],i) => bar(l, c, Math.round(c/maxModel*100), MODEL_COLORS[i % MODEL_COLORS.length])).join('');
  const maxProto  = protocols[0]?.[1] ?? 1;
  const protoRows = protocols.slice(0,6).map(([l,c]) => bar(l, c, Math.round(c/maxProto*100), PROTO_COLORS[l] ?? '#888')).join('');
  const maxFreq   = Math.max(...freqBands.map(f => f.count), 1);
  const freqRows  = freqBands.map(({band,count},i) => bar(`${band} MHz`, count, Math.round(count/maxFreq*100), ['#38bdf8','#a78bfa','#34d399'][i])).join('');
  const topDirs   = [...dirData].sort((a,b)=>b.total-a.total).slice(0,4)
    .map(({dir,total})=>`<div style="background:#111;border-radius:5px;padding:6px;text-align:center"><div style="font-size:11px;font-weight:700;color:#fff">${dir}</div><div style="font-size:8px;color:#555">${total}</div></div>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>DroneSentinel Analytics</title>
<style>*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Courier New',monospace;background:#0f0f0f;color:#ccc;padding:20px;font-size:10px}
.header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #2a2a2a;padding-bottom:14px;margin-bottom:18px}
.title{font-size:18px;font-weight:700;color:#f97316;letter-spacing:3px}.sub{font-size:8px;color:#555;margin-top:3px}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:8px;font-weight:700;background:rgba(249,115,22,0.15);color:#f97316;border:1px solid rgba(249,115,22,0.35);margin-top:5px}
.meta{text-align:right;font-size:8px;color:#444;line-height:1.8}
.kgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}
.kcard{background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:10px}
.klabel{font-size:7px;color:#555;text-transform:uppercase;letter-spacing:2px;margin-bottom:5px}
.kval{font-size:20px;font-weight:700;font-family:monospace}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.card{background:#141414;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden}
.card-hd{padding:7px 12px;border-bottom:1px solid #222;font-size:8px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:2px}
.card-bd{padding:12px}svg{max-width:100%;height:auto}
.dgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:8px}
.footer{margin-top:16px;padding-top:10px;border-top:1px solid #1e1e1e;display:flex;justify-content:space-between;font-size:8px;color:#333}
@media print{body{padding:10px}@page{size:A4 landscape;margin:8mm}}</style></head><body>
<div class="header"><div><div class="title">⬡ DRONESENTINEL</div><div class="sub">DETECTION ANALYTICS REPORT</div><div class="badge">GROUP: ${groupFilter}</div></div>
<div class="meta"><div>Generated: ${titleDate}</div><div>Total Events: <span style="color:#f97316;font-weight:700">${kpis.total}</span></div></div></div>
<div class="kgrid">${kpiRows.map(([l,v,c])=>`<div class="kcard"><div class="klabel">${l}</div><div class="kval" style="color:${c}">${v}</div></div>`).join('')}</div>
<div class="g2"><div class="card"><div class="card-hd">🚁 Drone Model</div><div class="card-bd">${modelRows}</div></div>
<div class="card"><div class="card-hd">📶 Protocol &amp; Frequency</div><div class="card-bd">${protoRows}<div style="margin-top:10px">${freqRows}</div></div></div></div>
<div class="g2"><div class="card"><div class="card-hd">🧭 Direction of Origin</div><div class="card-bd"><div class="dgrid">${topDirs}</div></div></div></div>
<div class="footer"><div>DroneSentinel Detection Dashboard</div><div>${titleDate} · Filter: ${groupFilter}</div></div>
<script>window.onload=function(){setTimeout(function(){window.print()},600)}<\/script></body></html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AnalyticsDashboard({
  events, summary, daily, hourly, directions,
  freqBands: precomputedFreqBands,
  droneStats,
  modelCount:      precomputedModelCount,
  protocolSummary: precomputedProtocolSummary,
  isLoading, isMockMode,
}) {
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [pdfLoading,  setPdfLoading]  = useState(false);
  const contentRef = useRef(null);

  const filtered   = groupFilter === 'ALL' ? events : events.filter(e => e.group === groupFilter);
  const isFiltered = groupFilter !== 'ALL';

  const kpis = useMemo(() => {
    if (!isFiltered && summary?.total > 0) {
      return {
        total:      summary.total,
        unique:     summary.unique_drones,
        ga:         summary.ga,
        gb:         summary.gb,
        avgSpeed:   summary.avg_speed,
        avgHeight:  summary.avg_height,
        maxSpeed:   summary.max_speed,
        highThreat: summary.high_threat,
      };
    }
    return buildKPIs(filtered);
  }, [filtered, isFiltered, summary]);

  const dirData = useMemo(() => {
    if (!isFiltered && directions?.length > 0) return directions;
    return buildDirectionMap(filtered);
  }, [filtered, isFiltered, directions]);

  const freqBands = useMemo(() => {
    if (!isFiltered && precomputedFreqBands?.length > 0) return precomputedFreqBands;
    return buildFreqBands(filtered);
  }, [filtered, isFiltered, precomputedFreqBands]);

  const models = useMemo(() => {
    if (!isFiltered && precomputedModelCount?.length > 0) return precomputedModelCount;
    return buildDistribution(filtered, 'model');
  }, [filtered, isFiltered, precomputedModelCount]);

  const protocols = useMemo(() => {
    if (!isFiltered && precomputedProtocolSummary?.length > 0) return precomputedProtocolSummary;
    return buildDistribution(filtered, 'protocol_name');
  }, [filtered, isFiltered, precomputedProtocolSummary]);

  const maxModel  = models[0]?.[1] ?? 1;

  const handlePDF = useCallback(async () => {
    setPdfLoading(true);
    try {
      const printWin = window.open('', '_blank');
      if (!printWin) { alert('Please allow pop-ups to export PDF'); return; }
      const titleDate = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
      printWin.document.write(buildPdfHtml({ titleDate, groupFilter, kpis, models, protocols, freqBands, dirData }));
      printWin.document.close();
    } finally {
      setPdfLoading(false);
    }
  }, [kpis, groupFilter, models, protocols, freqBands, dirData]);

  if (isLoading) return <Spinner label="Computing analytics…" />;
  if (!events.length && !(summary?.total > 0)) return <EmptyState icon="📊" message="No data to analyze" sub="Adjust filters and search" />;

  return (
    <div className="dashboard-main-pane">
      <Toolbar>
        <div className="flex-row-center gap-2">
          <BarChartIcon style={{ width: '1rem', height: '1rem', color: '#f97316' }} />
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>Analytics</span>
          <span className="rounded font-bold"
                style={{ fontSize: '9px', padding: '2px 8px', background: '#1a1a1a', color: GA, border: '1px solid rgba(249,115,22,0.25)' }}>
            {filtered.length} events
          </span>
        </div>
        <div className="flex-row-center gap-2" style={{ marginLeft: 'auto' }}>
          <GroupTabs value={groupFilter} onChange={setGroupFilter} />
          <button onClick={handlePDF} disabled={pdfLoading} className="btn btn-ghost flex-row-center gap-1-5" style={{ fontSize: '10px', padding: '0.375rem 0.75rem' }}>
            <LogIcon style={{ width: '0.875rem', height: '0.875rem' }} />
            <span className="hidden sm:inline">{pdfLoading ? 'Preparing…' : 'PDF'}</span>
          </button>
        </div>
      </Toolbar>

      <div ref={contentRef} className="flex-col-start gap-4" style={{ padding: '1rem' }}>
        <KpiStrip kpis={kpis} events={filtered} groupFilter={groupFilter} />

        <Card title="Hourly Distribution" icon={<ClockIcon />}>
          <HourlyChart events={filtered} precomputedHourly={hourly} isFiltered={isFiltered} />
        </Card>

        <div className="grid-cards-3">
          <Card title="Direction of Origin" icon={<CompassIcon />}>
            <RadarChart dirData={dirData} groupFilter={groupFilter} />
            <div className="flex-row-center gap-4" style={{ marginTop: 8, justifyContent: 'center' }}>
              {groupFilter !== 'GB' && <div className="flex-row-center gap-1-5"><div className="rounded" style={{ background: GA, width: 8, height: 8 }} /><span style={{ fontSize: 9, color: '#888' }}>GA</span></div>}
              {groupFilter !== 'GA' && <div className="flex-row-center gap-1-5"><div className="rounded" style={{ background: GB, width: 8, height: 8 }} /><span style={{ fontSize: 9, color: '#888' }}>GB</span></div>}
            </div>
            <div className="grid-cols-4 gap-1" style={{ marginTop: '0.75rem' }}>
              {[...dirData].sort((a,b)=>b.total-a.total).slice(0,4).map(({ dir, total }) => (
                <div key={dir} className="text-center bg-dark-11 rounded-lg" style={{ padding: '0.375rem 0' }}>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: '#fff' }}>{dir}</div>
                  <div className="text-label-dark-gray" style={{ fontSize: '8px' }}>{total}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Drone Model Distribution" icon={<DroneIcon />}>
            <HBar data={models} colors={MODEL_COLORS} maxCount={maxModel} total={filtered.length} />
          </Card>

          <Card title="Protocol & Frequency" icon={<SignalIcon />}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Protocol</div>
              <HBar data={protocols} colors={protocols.map(([p]) => PROTO_COLORS[p] ?? '#888')} maxCount={protocols[0]?.[1] ?? 1} total={filtered.length} />
            </div>
            <div>
              <div style={{ fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Frequency Band</div>
              <HBar data={freqBands.map(({ band, count }) => [band, count])} colors={['#38bdf8','#a75bfa','#34d399']} maxCount={Math.max(...freqBands.map(f => f.count), 1)} total={filtered.length} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}