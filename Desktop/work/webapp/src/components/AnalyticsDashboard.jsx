import { useState, useMemo, useRef, useCallback } from 'react';
import {
  buildDailyMap, buildDistribution, buildHourlyMap,
  buildDirectionMap, buildKPIs, buildFreqBands,
} from '../utils/chartUtils';
import { GA, GB, DIR_LABELS, PROTO_COLORS, MODEL_COLORS } from '../shared/constants';
import { Card, Spinner, EmptyState, GroupTabs, HBar, Toolbar } from '../shared/ui';
import { BarChartIcon, ClockIcon, CompassIcon, DroneIcon, SignalIcon, LogIcon } from '../shared/icons';

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
    <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
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
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        {summaryItems.map(({ label, value, color }) => (
          <div key={label} className="bg-[#141414] border border-[#2a2a2a] rounded-xl px-3 py-3 flex flex-col gap-1">
            <span className="text-[8px] text-[#555] uppercase tracking-widest font-bold">{label}</span>
            <div className="text-lg font-bold leading-none font-mono" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[8px] text-[#444] uppercase tracking-widest font-bold px-1">
          Subgroups — {groupFilter} · click to expand detectors
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {subgroups.map(({ sg, detectors }) => {
            const isOpen = expandedSg === sg;
            return (
              <div key={sg} style={{ gridColumn: isOpen ? '1 / -1' : undefined }} className="flex flex-col">
                <button
                  onClick={() => setExpandedSg(isOpen ? null : sg)}
                  className="flex items-center justify-between px-3 py-2.5 transition-all text-left"
                  style={{
                    background: isOpen ? `${groupColor}12` : '#141414',
                    border: `1px solid ${isOpen ? `${groupColor}55` : '#2a2a2a'}`,
                    borderRadius: isOpen ? '10px 10px 0 0' : 10,
                  }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-none" style={{ background: groupColor }} />
                    <span className="text-[12px] font-bold font-mono" style={{ color: groupColor }}>{sg}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold font-mono text-white">{detectors.length}</span>
                    <span className="text-[8px] text-[#555]">det</span>
                    <svg className={`w-3 h-3 transition-transform text-[#555] ${isOpen ? '' : '-rotate-90'}`}
                         viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </button>
                {isOpen && (
                  <div className="border border-t-0 rounded-b-xl overflow-hidden"
                       style={{ borderColor: `${groupColor}55`, background: '#0d0d0d' }}>
                    <div className="grid px-3 py-1.5 border-b"
                         style={{ gridTemplateColumns: '1.2fr 1fr 1fr', borderColor: '#1e1e1e' }}>
                      {['Detector ID', 'Latitude', 'Longitude'].map(h => (
                        <span key={h} className="text-[8px] font-bold text-[#444] uppercase tracking-widest">{h}</span>
                      ))}
                    </div>
                    {detectors.map(det => (
                      <div key={det.id}
                           className="grid px-3 py-2.5 border-b items-center hover:bg-[#141414] transition-colors"
                           style={{ gridTemplateColumns: '1.2fr 1fr 1fr', borderColor: '#161616' }}>
                        <span className="text-[11px] font-bold font-mono" style={{ color: groupColor }}>{det.id}</span>
                        <span className="text-[11px] font-mono" style={{ color: '#aaa' }}>
                          {det.lat != null ? Number(det.lat).toFixed(5) : '—'}
                        </span>
                        <span className="text-[11px] font-mono" style={{ color: '#aaa' }}>
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

// ── Single group bar chart with hover tooltip ─────────────────────────────────
function GroupBarChart({ hourly, groupKey, color, label }) {
  const [hovered, setHovered] = useState(null);
  const svgRef = useRef(null);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });

  const W = 620, H = 110;
  const PL = 28, PR = 8, PT = 10, PB = 24;
  const cW = W - PL - PR, cH = H - PT - PB;
  const vals   = hourly.map(h => h[groupKey]);
  const maxVal = Math.max(...vals, 1);
  const barW   = cW / 24;
  const peakH  = hourly.reduce((a, b) => (a[groupKey] >= b[groupKey] ? a : b), hourly[0]);

  const handleMouseMove = (e, hour) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHovered(hour);
    setTipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-2 h-2 rounded-sm flex-none" style={{ background: color }} />
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
        <span className="text-[10px] text-[#444] font-mono ml-1">
          peak {String(peakH.hour).padStart(2,'0')}:00 · {peakH[groupKey]} events
        </span>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: `${H}px` }}
           onMouseLeave={() => setHovered(null)}>
        {[0, 0.5, 1].map(pct => {
          const y = PT + cH - pct * cH;
          return (
            <g key={pct}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#1e1e1e" strokeWidth="1" />
              <text x={PL - 4} y={y + 3} textAnchor="end" fill="#555" fontSize="8" fontFamily="monospace">
                {Math.round(maxVal * pct)}
              </text>
            </g>
          );
        })}

        {hourly.map(({ hour }) => {
          const v    = vals[hour];
          const bH   = (v / maxVal) * cH;
          const x    = PL + hour * barW;
          const isHov  = hovered === hour;
          const isPeak = hour === peakH.hour && v > 0;
          return (
            <g key={hour}
               onMouseMove={e => handleMouseMove(e, hour)}
               style={{ cursor: v > 0 ? 'crosshair' : 'default' }}>
              {/* transparent hit area for easy hover */}
              <rect x={x.toFixed(1)} y={PT} width={barW.toFixed(1)} height={cH} fill="transparent" />
              {/* hover column highlight */}
              {isHov && (
                <rect x={(x + barW * 0.05).toFixed(1)} y={PT} width={(barW * 0.9).toFixed(1)} height={cH}
                      fill="#ffffff" opacity="0.04" rx="2" />
              )}
              {v > 0 && (
                <rect
                  x={(x + barW * 0.15).toFixed(1)}
                  y={(PT + cH - bH).toFixed(1)}
                  width={(barW * 0.7).toFixed(1)}
                  height={bH.toFixed(1)}
                  fill={color} opacity={isHov ? 1 : 0.82} rx="2"
                />
              )}
              {isPeak && (
                <rect
                  x={(x + barW * 0.1).toFixed(1)}
                  y={(PT + cH - bH - 2).toFixed(1)}
                  width={(barW * 0.8).toFixed(1)}
                  height={(bH + 2).toFixed(1)}
                  fill="none" stroke={color} strokeWidth="1.5"
                  strokeDasharray="3 2" rx="2" opacity="0.6"
                />
              )}
              {hour % 3 === 0 && (
                <text x={(x + barW / 2).toFixed(1)} y={H - 5} textAnchor="middle"
                      fill={isHov ? '#aaa' : '#555'} fontSize="8" fontFamily="monospace">
                  {String(hour).padStart(2, '0')}
                </text>
              )}
            </g>
          );
        })}

        <line x1={PL} y1={PT} x2={PL} y2={PT + cH} stroke="#3a3a3a" strokeWidth="1" />
        <line x1={PL} y1={PT + cH} x2={W - PR} y2={PT + cH} stroke="#3a3a3a" strokeWidth="1" />
      </svg>

      {/* Tooltip */}
      {hovered !== null && (() => {
        const v    = vals[hovered];
        const total = hourly.reduce((s, h) => s + h[groupKey], 0);
        const pct  = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
        const isPeak = hovered === peakH.hour;
        const isDay  = hovered >= 6 && hovered < 18;
        // clamp so tooltip doesn't overflow right edge
        const svgW  = svgRef.current?.getBoundingClientRect().width ?? 400;
        const left  = Math.min(tipPos.x + 12, svgW - 150);
        return (
          <div style={{
            position: 'absolute',
            left,
            top: Math.max(tipPos.y - 10, 0),
            background: '#1c1c1c',
            border: `1px solid ${v > 0 ? color + '66' : '#2a2a2a'}`,
            borderRadius: 8,
            padding: '8px 12px',
            pointerEvents: 'none',
            zIndex: 20,
            minWidth: 130,
            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: 'monospace', marginBottom: 5 }}>
              {String(hovered).padStart(2,'0')}:00 – {String(hovered).padStart(2,'0')}:59
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: v > 0 ? color : '#555', fontFamily: 'monospace', marginBottom: 4 }}>
              {v} event{v !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>
              {pct}% of {label}
            </div>
            <div style={{ marginTop: 5, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {isPeak && v > 0 && (
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: color + '22', color, border: `1px solid ${color}44`, fontWeight: 700 }}>
                  PEAK
                </span>
              )}
              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#222', color: isDay ? '#facc15' : '#818cf8', border: '1px solid #333', fontWeight: 700 }}>
                {isDay ? '☀ DAYTIME' : '🌙 NIGHT'}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
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
    <div className="flex flex-col gap-4">
      {/* Date filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#555] uppercase tracking-widest font-bold">Date</span>
        <select value={selDate} onChange={e => setSelDate(e.target.value)}
          className="bg-[#111] border border-[#2a2a2a] text-[#aaa] text-[11px] rounded-lg px-2 py-1 outline-none hover:border-[#3a3a3a] transition-colors cursor-pointer">
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
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { label: 'Total Events',         value: total, sub: '100%' },
          { label: 'Daytime 06:00–18:00',  value: day,   sub: total > 0 ? `${((day/total)*100).toFixed(0)}%` : '—' },
          { label: 'Night  18:01–05:59',   value: night, sub: total > 0 ? `${((night/total)*100).toFixed(0)}%` : '—' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-[#111] rounded-lg px-3 py-2.5 border border-[#1e1e1e]">
            <div className="text-[9px] text-[#555] uppercase tracking-widest mb-1">{label}</div>
            <div className="text-[15px] font-bold text-white font-mono">{value}</div>
            <div className="text-[9px] text-[#444] mt-0.5">{sub}</div>
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
        <KpiStrip kpis={kpis} events={filtered} groupFilter={groupFilter} />

        <Card title="Hourly Distribution" icon={<ClockIcon />}>
          <HourlyChart events={filtered} precomputedHourly={hourly} isFiltered={isFiltered} />
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