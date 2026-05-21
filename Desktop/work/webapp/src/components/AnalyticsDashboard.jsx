import { useState, useMemo, useRef, useCallback } from 'react';
import {
  buildDailyMap, buildDistribution, buildHourlyMap,
  buildDirectionMap, buildKPIs, buildFreqBands,
} from '../utils/chartUtils';
import { GA, GB, DIR_LABELS, PROTO_COLORS, MODEL_COLORS } from '../shared/constants';
import { Card, Spinner, EmptyState, GroupTabs, HBar, Toolbar } from '../shared/ui';
import { BarChartIcon, ClockIcon, CompassIcon, DroneIcon, SignalIcon, LogIcon } from '../shared/icons';

// ── KPI Strip ─────────────────────────────────────────────────────────────────
function KpiStrip({ kpis }) {
  const items = [
    { label: 'Total Events',  value: kpis.total,               color: '#fff',    icon: '⚡' },
    { label: 'Unique Drones', value: kpis.unique,              color: '#38bdf8', icon: '🚁' },
    { label: 'Group GA',      value: kpis.ga,                  color: GA,        icon: '●'  },
    { label: 'Group GB',      value: kpis.gb,                  color: GB,        icon: '●'  },
    { label: 'High Threat',   value: kpis.highThreat,          color: '#ef4444', icon: '⚠'  },
    { label: 'Avg Speed',     value: `${kpis.avgSpeed} m/s`,   color: '#a78bfa', icon: '→'  },
    { label: 'Avg Height',    value: `${kpis.avgHeight} m`,    color: '#34d399', icon: '↑'  },
    { label: 'Max Speed',     value: `${kpis.maxSpeed} m/s`,   color: '#f43f5e', icon: '⚡' },
  ];
  return (
    <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
      {items.map(({ label, value, color, icon }) => (
        <div key={label} className="bg-[#141414] border border-[#2a2a2a] rounded-xl px-3 py-3 flex flex-col gap-1 hover:border-[#3a3a3a] transition-colors">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]" style={{ color }}>{icon}</span>
            <span className="text-[8px] text-[#555] uppercase tracking-widest font-bold">{label}</span>
          </div>
          <div className="text-lg font-bold leading-none font-mono" style={{ color }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Radar chart (direction of origin) ─────────────────────────────────────────
function RadarChart({ dirData, groupFilter }) {
  const R = 90, CX = 110, CY = 110;
  const maxVal = Math.max(...dirData.map(d => d.total), 1);
  const n      = 8;

  const polygon = (vals) => vals.map((v, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const r = (v / maxVal) * R;
    return `${(CX + r * Math.cos(angle)).toFixed(1)},${(CY + r * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');

  const gaVals = dirData.map(d => d.GA);
  const gbVals = dirData.map(d => d.GB);

  return (
    <svg viewBox="0 0 220 220" style={{ width: '100%', maxWidth: '220px', margin: '0 auto', display: 'block' }}>
      {[0.25, 0.5, 0.75, 1.0].map(pct => (
        <circle key={pct} cx={CX} cy={CY} r={R * pct} fill="none" stroke="#2a2a2a" strokeWidth="1" strokeDasharray="3 3" />
      ))}
      {DIR_LABELS.map((_, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        return <line key={i} x1={CX} y1={CY} x2={(CX + R * Math.cos(angle)).toFixed(1)} y2={(CY + R * Math.sin(angle)).toFixed(1)} stroke="#2a2a2a" strokeWidth="1" />;
      })}

      {(groupFilter !== 'GB') && <polygon points={polygon(gaVals)} fill={`${GA}22`} stroke={GA} strokeWidth="1.5" strokeLinejoin="round" />}
      {(groupFilter !== 'GA') && <polygon points={polygon(gbVals)} fill={`${GB}22`} stroke={GB} strokeWidth="1.5" strokeLinejoin="round" />}

      {DIR_LABELS.map((dir, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const lr = R + 16;
        const x = CX + lr * Math.cos(angle), y = CY + lr * Math.sin(angle);
        return (
          <g key={dir}>
            <text x={x.toFixed(1)} y={(y - 3).toFixed(1)} textAnchor="middle" fill="#aaa" fontSize="9" fontWeight="700" fontFamily="monospace">{dir}</text>
            <text x={x.toFixed(1)} y={(y + 7).toFixed(1)} textAnchor="middle" fill="#555" fontSize="7" fontFamily="monospace">{dirData[i].total}</text>
          </g>
        );
      })}
      <text x={CX} y={CY + 4} textAnchor="middle" fill="#444" fontSize="8" fontFamily="monospace">ORIGIN</text>
    </svg>
  );
}

// ── Hourly bar chart ──────────────────────────────────────────────────────────
function HourlyChart({ events }) {
  const dates  = useMemo(() => [...new Set(events.map(e => e.datetime.split('T')[0]))].sort(), [events]);
  const [selDate, setSelDate] = useState('ALL');

  const dayEvts = selDate === 'ALL' ? events : events.filter(e => e.datetime.startsWith(selDate));
  const hourly  = useMemo(() => buildHourlyMap(dayEvts), [dayEvts]);

  const W = 620, H = 130;
  const PL = 28, PR = 8, PT = 12, PB = 28;
  const cW = W - PL - PR, cH = H - PT - PB;
  const maxVal = Math.max(...hourly.map(h => h.GA + h.GB), 1);
  const barW   = cW / 24;
  const peak   = hourly.reduce((a, b) => (a.GA + a.GB >= b.GA + b.GB ? a : b), { hour: 0, GA: 0, GB: 0 });
  const total  = hourly.reduce((s, h) => s + h.GA + h.GB, 0);
  const night  = hourly.slice(0, 6).reduce((s, h) => s + h.GA + h.GB, 0);
  const day    = hourly.slice(6, 18).reduce((s, h) => s + h.GA + h.GB, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[8px] text-[#444] uppercase tracking-widest">Date</span>
        <select value={selDate} onChange={e => setSelDate(e.target.value)}
          className="bg-[#111] border border-[#2a2a2a] text-[#aaa] text-[10px] rounded-lg px-2 py-1 outline-none hover:border-[#3a3a3a] transition-colors cursor-pointer">
          <option value="ALL">All dates</option>
          {dates.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <div className="flex items-center gap-3 ml-auto">
          {[[GA,'GA'],[GB,'GB']].map(([c, l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ background: c }} />
              <span className="text-[9px] text-[#888]">{l}</span>
            </div>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: `${H}px` }}>
        {[0, 0.5, 1].map(pct => {
          const y = PT + cH - pct * cH;
          return (
            <g key={pct}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#222" strokeWidth="1" />
              <text x={PL - 3} y={y + 3} textAnchor="end" fill="#444" fontSize="7" fontFamily="monospace">{Math.round(maxVal * pct)}</text>
            </g>
          );
        })}
        {hourly.map(({ hour, GA: ga, GB: gb }) => {
          const x = PL + hour * barW;
          const tot = ga + gb, gaH = (ga / maxVal) * cH, gbH = (gb / maxVal) * cH, totH = (tot / maxVal) * cH;
          const isPeak = hour === peak.hour && tot > 0;
          return (
            <g key={hour}>
              {gb > 0 && <rect x={(x + barW * 0.1).toFixed(1)} y={(PT + cH - gbH).toFixed(1)} width={(barW * 0.8).toFixed(1)} height={gbH.toFixed(1)} fill={GB} opacity="0.7" rx="1.5" />}
              {ga > 0 && <rect x={(x + barW * 0.1).toFixed(1)} y={(PT + cH - totH).toFixed(1)} width={(barW * 0.8).toFixed(1)} height={gaH.toFixed(1)} fill={GA} opacity="0.85" rx="1.5" />}
              {isPeak && <rect x={(x + barW * 0.1 - 1).toFixed(1)} y={(PT + cH - totH - 1).toFixed(1)} width={(barW * 0.8 + 2).toFixed(1)} height={(totH + 2).toFixed(1)} fill="none" stroke={GA} strokeWidth="1" strokeDasharray="2 2" rx="2" opacity="0.6" />}
              {hour % 3 === 0 && (
                <text x={(x + barW / 2).toFixed(1)} y={H - 8} textAnchor="middle" fill="#555" fontSize="7" fontFamily="monospace">
                  {String(hour).padStart(2, '0')}
                </text>
              )}
            </g>
          );
        })}
        <line x1={PL} y1={PT} x2={PL} y2={PT + cH} stroke="#3a3a3a" strokeWidth="1" />
        <line x1={PL} y1={PT + cH} x2={W - PR} y2={PT + cH} stroke="#3a3a3a" strokeWidth="1" />
      </svg>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Peak Hour',     value: `${String(peak.hour).padStart(2,'0')}:00`, sub: `${peak.GA + peak.GB} events` },
          { label: 'Daytime 06–18', value: day,   sub: total > 0 ? `${((day/total)*100).toFixed(0)}%` : '—' },
          { label: 'Night  00–06',  value: night,  sub: total > 0 ? `${((night/total)*100).toFixed(0)}%` : '—' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-[#111] rounded-lg px-3 py-2">
            <div className="text-[8px] text-[#444] uppercase tracking-widest">{label}</div>
            <div className="text-sm font-bold text-white font-mono mt-0.5">{value}</div>
            <div className="text-[8px] text-[#555] mt-0.5">{sub}</div>
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
export default function AnalyticsDashboard({ events, isLoading }) {
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [pdfLoading,  setPdfLoading]  = useState(false);
  const contentRef = useRef(null);

  const filtered  = groupFilter === 'ALL' ? events : events.filter(e => e.group === groupFilter);
  const kpis      = useMemo(() => buildKPIs(filtered),             [filtered]);
  const dirData   = useMemo(() => buildDirectionMap(filtered),     [filtered]);
  const models    = useMemo(() => buildDistribution(filtered, 'model'),          [filtered]);
  const protocols = useMemo(() => buildDistribution(filtered, 'protocol_name'),  [filtered]);
  const freqBands = useMemo(() => buildFreqBands(filtered),        [filtered]);
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
  if (!events.length) return <EmptyState icon="📊" message="No data to analyze" sub="Adjust filters and search" />;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0f0f0f]">
      <Toolbar>
        <div className="flex items-center gap-2">
          <BarChartIcon className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-bold text-white">Analytics</span>
          <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: '#1a1a1a', color: GA, border: '1px solid rgba(249,115,22,0.25)' }}>
            {filtered.length} events
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <GroupTabs value={groupFilter} onChange={setGroupFilter} />
          <button onClick={handlePDF} disabled={pdfLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
            style={{ background: '#1a1a1a', border: '1px solid #3a3a3a', color: '#aaa' }}>
            <LogIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{pdfLoading ? 'Preparing…' : 'PDF'}</span>
          </button>
        </div>
      </Toolbar>

      <div ref={contentRef} className="p-4 flex flex-col gap-4">
        <KpiStrip kpis={kpis} />

        <Card title="Hourly Distribution" icon={<ClockIcon />}>
          <HourlyChart events={filtered} />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="Direction of Origin" icon={<CompassIcon />}>
            <RadarChart dirData={dirData} groupFilter={groupFilter} />
            <div className="flex items-center gap-4 mt-2 justify-center">
              {groupFilter !== 'GB' && <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm" style={{ background: GA }} /><span className="text-[9px] text-[#888]">GA</span></div>}
              {groupFilter !== 'GA' && <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm" style={{ background: GB }} /><span className="text-[9px] text-[#888]">GB</span></div>}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1">
              {[...dirData].sort((a,b)=>b.total-a.total).slice(0,4).map(({ dir, total }) => (
                <div key={dir} className="text-center bg-[#111] rounded-lg py-1.5">
                  <div className="text-[11px] font-bold text-white">{dir}</div>
                  <div className="text-[8px] text-[#555]">{total}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Drone Model Distribution" icon={<DroneIcon />}>
            <HBar data={models} colors={MODEL_COLORS} maxCount={maxModel} total={filtered.length} />
          </Card>

          <Card title="Protocol & Frequency" icon={<SignalIcon />}>
            <div className="mb-3">
              <div className="text-[8px] text-[#555] uppercase tracking-widest mb-1.5">Protocol</div>
              <HBar data={protocols} colors={protocols.map(([p]) => PROTO_COLORS[p] ?? '#888')} maxCount={protocols[0]?.[1] ?? 1} total={filtered.length} />
            </div>
            <div>
              <div className="text-[8px] text-[#555] uppercase tracking-widest mb-1.5">Frequency Band</div>
              <HBar data={freqBands.map(({ band, count }) => [band, count])} colors={['#38bdf8','#a75bfa','#34d399']} maxCount={Math.max(...freqBands.map(f => f.count), 1)} total={filtered.length} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}