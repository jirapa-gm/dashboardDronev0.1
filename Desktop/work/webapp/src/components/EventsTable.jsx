import { useState } from 'react';
import Pagination    from './Pagination';
import TimelineChart from './TimelineChart';
import { buildDailyMap, buildDistribution, buildFreqBands } from '../utils/chartUtils';

const PER_PAGE = 8;

const COLUMNS = [
  { key: 'datetime',    label: 'Datetime' },
  { key: 'group',       label: 'Group'    },
  { key: 'subgroup',    label: 'Subgroup' },
  { key: 'detector_id', label: 'Detector' },
  { key: 'drone_id',    label: 'Drone ID' },
  { key: 'model',       label: 'Model'    },
  { key: 'latitude',    label: 'Lat'      },
  { key: 'longitude',   label: 'Lon'      },
  { key: 'height',      label: 'H (m)'    },
  { key: 'speed',       label: 'S (m/s)'  },
  { key: 'freq',        label: 'Freq'     },
];

function exportCSV(events) {
  const header = COLUMNS.map((c) => c.label).join(',');
  const rows   = events.map((e) =>
    [
      `"${e.datetime}"`, `"${e.group}"`, `"${e.subgroup}"`, `"${e.detector_id}"`,
      `"${e.drone_id}"`, `"${e.model}"`,
      e.latitude.toFixed(6), e.longitude.toFixed(6),
      e.height, e.speed, e.freq,
    ].join(','),
  );
  const blob = new Blob(['\uFEFF' + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), {
    href:     url,
    download: `drone_events_${new Date().toISOString().split('T')[0]}.csv`,
  }).click();
  URL.revokeObjectURL(url);
}

function buildLineSVG(dailyMap, days) {
  if (!days.length) return '<text x="300" y="70" text-anchor="middle" font-size="11" fill="#aaa">No data</text>';

  const W = 680, H = 160, PL = 36, PR = 16, PT = 20, PB = 40;
  const cW = W - PL - PR, cH = H - PT - PB;
  const n  = days.length;

  const gaVals = days.map((d) => dailyMap[d]?.GA || 0);
  const gbVals = days.map((d) => dailyMap[d]?.GB || 0);
  const totVals = days.map((d) => (dailyMap[d]?.GA || 0) + (dailyMap[d]?.GB || 0));
  const maxV   = Math.max(...totVals, 1);

  const xOf = (i) => PL + (n === 1 ? cW / 2 : (i / (n - 1)) * cW);
  const yOf = (v) => PT + cH - (v / maxV) * cH;
  const step = n > 10 ? Math.ceil(n / 8) : 1;

  const grids = Array.from({ length: 5 }, (_, i) => {
    const v = Math.round((maxV / 4) * i);
    const y = yOf(v);
    return `
      <line x1="${PL}" y1="${y.toFixed(1)}" x2="${W - PR}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4,3"/>
      <text x="${PL - 4}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#9ca3af">${v}</text>`;
  }).join('');

  const gaPts = days.map((_, i) => `${xOf(i).toFixed(1)},${yOf(gaVals[i]).toFixed(1)}`).join(' ');
  const gbPts = days.map((_, i) => `${xOf(i).toFixed(1)},${yOf(gbVals[i]).toFixed(1)}`).join(' ');

  const makeDots = (pts, vals, color, labelOffset) =>
    days.map((_, i) => {
      const tokens = pts.split(' ');
      if (!tokens[i]) return '';
      const showLbl  = (i % step === 0 || i === n - 1) && vals[i] > 0;
      return `
        <circle cx="${xOf(i).toFixed(1)}" cy="${yOf(vals[i]).toFixed(1)}" r="3.5" fill="${color}" stroke="#fff" stroke-width="1.5"/>
        ${showLbl ? `<text x="${xOf(i).toFixed(1)}" y="${(yOf(vals[i]) + labelOffset).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="700" fill="${color}">${vals[i]}</text>` : ''}`;
    }).join('');

  const xLabels = days.map((d, i) =>
    (i % step === 0 || i === n - 1) ? `<text x="${xOf(i).toFixed(1)}" y="${(PT + cH + 16).toFixed(1)}" text-anchor="middle" font-size="9" fill="#6b7280">${d.slice(5)}</text>` : '',
  ).join('');

  const areaPath = (pts) => `M${xOf(0).toFixed(1)},${(PT + cH).toFixed(1)} L${pts} L${xOf(n - 1).toFixed(1)},${(PT + cH).toFixed(1)} Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="gag" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f97316" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="gbg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#eab308" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#eab308" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${grids}
    <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${PT + cH}" stroke="#d1d5db" stroke-width="1.5"/>
    <line x1="${PL}" y1="${PT + cH}" x2="${W - PR}" y2="${PT + cH}" stroke="#d1d5db" stroke-width="1.5"/>
    <path d="${areaPath(gbPts)}" fill="url(#gbg)"/>
    <path d="${areaPath(gaPts)}" fill="url(#gag)"/>
    <polyline points="${gbPts}" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="${gaPts}" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${makeDots(gbPts, gbVals, '#eab308', 14)}
    ${makeDots(gaPts, gaVals, '#f97316', -6)}
    ${xLabels}
  </svg>`;
}

function exportPDF(events) {
  const now       = new Date();
  const dateStr   = now.toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
  const isoDate   = now.toISOString().split('T')[0];

  const total     = events.length;
  const ga        = events.filter((e) => e.group === 'GA').length;
  const gb        = events.filter((e) => e.group === 'GB').length;
  const speeds    = events.map((e) => e.speed);
  const heights   = events.map((e) => e.height);
  const avgSpeed  = total > 0 ? (speeds.reduce((s, v) => s + v, 0)   / total).toFixed(1) : '—';
  const avgHeight = total > 0 ? Math.round(heights.reduce((s, v) => s + v, 0) / total)   : '—';
  const maxSpeed  = total > 0 ? Math.max(...speeds).toFixed(1)  : '—';

  const dailyMap  = buildDailyMap(events);
  const days      = Object.keys(dailyMap).sort();
  const lineChart = buildLineSVG(dailyMap, days);

  const R    = 44;
  const circ = 2 * Math.PI * R;
  const gaA  = circ * (ga / Math.max(total, 1));
  const gbA  = circ * (gb / Math.max(total, 1));

  const models    = buildDistribution(events, 'model');
  const maxMdl    = Math.max(...models.map(([, v]) => v), 1);
  const ROW_H     = 20;
  const modelBars = models.slice(0, 7).map(([name, count], i) => {
    const bw = (count / maxMdl) * 190;
    const y  = i * (ROW_H + 4);
    return `
      <text x="0" y="${y + ROW_H - 6}" font-size="9" fill="#374151" font-family="sans-serif">${name}</text>
      <rect x="115" y="${y + 3}" width="${bw.toFixed(1)}" height="${ROW_H - 6}" rx="3" fill="#f97316" opacity="0.8"/>
      <text x="${(115 + bw + 5).toFixed(1)}" y="${y + ROW_H - 6}" font-size="9" fill="#9ca3af" font-family="monospace">${count}</text>`;
  }).join('');
  const modelSvgH = Math.min(models.length, 7) * (ROW_H + 4);

  const FREQ_COLORS = ['#38bdf8', '#a78bfa', '#34d399'];
  const freqBands   = buildFreqBands(events);
  const freqRows    = freqBands.map(({ band, count }, i) => {
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
    const color = FREQ_COLORS[i % FREQ_COLORS.length];
    return `<tr>
      <td><span style="display:inline-block;width:8px;height:8px;border-radius:2px; background:${color};margin-right:6px;vertical-align:middle"></span>${band} MHz</td>
      <td>${count}</td><td>${pct}%</td>
      <td><div style="background:#f3f4f6;border-radius:3px;height:7px;width:120px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:3px"></div>
      </div></td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8"/>
<title>DroneSentinel Report ${isoDate}</title>
<style>
  @page { size:A4 portrait; margin:14mm 16mm; }
  *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:10px; color:#1f2937; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .hdr { display:flex; align-items:center; justify-content:space-between; padding-bottom:10px; border-bottom:2px solid #f97316; margin-bottom:14px; }
  .hdr-left { display:flex; align-items:center; gap:10px; }
  .hdr-icon { width:36px; height:36px; border-radius:9px; background:linear-gradient(135deg,#ea580c,#f97316); display:flex; align-items:center; justify-content:center; font-size:18px; }
  .hdr-title { font-size:20px; font-weight:800; color:#111; letter-spacing:-.02em; }
  .hdr-sub   { font-size:8.5px; color:#9ca3af; text-transform:uppercase; letter-spacing:.08em; margin-top:1px; }
  .hdr-right { text-align:right; }
  .hdr-right .lbl { font-size:8px; color:#9ca3af; text-transform:uppercase; letter-spacing:.08em; }
  .hdr-right .val { font-size:11px; color:#111; font-family:monospace; margin-top:1px; }
  .sec { margin-bottom:14px; }
  .sec-title { font-size:8px; font-weight:700; color:#ea580c; text-transform:uppercase; letter-spacing:.14em; margin-bottom:8px; display:flex; align-items:center; gap:6px; }
  .sec-title::after { content:''; flex:1; height:1px; background:#f3f4f6; }
  .kpi-row { display:grid; grid-template-columns:repeat(6,1fr); gap:8px; }
  .kpi     { border:1px solid #f3f4f6; border-radius:8px; padding:10px 10px 8px; border-top:2.5px solid #f97316; background:#fafafa; }
  .kpi.y   { border-top-color:#eab308; } .kpi.g { border-top-color:#22c55e; }
  .kpi.b   { border-top-color:#3b82f6; } .kpi.p { border-top-color:#a855f7; }
  .kpi-v   { font-size:20px; font-weight:800; color:#111; line-height:1; font-family:monospace; }
  .kpi-l   { font-size:7.5px; color:#9ca3af; text-transform:uppercase; letter-spacing:.06em; margin-top:4px; }
  .row2    { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; }
  .card    { border:1px solid #f3f4f6; border-radius:8px; padding:12px; background:#fafafa; }
  .card-title { font-size:9px; font-weight:700; color:#374151; margin-bottom:8px; }
  .card-sub   { font-size:8px; color:#9ca3af; font-weight:400; margin-left:4px; }
  .line-legend { display:flex; gap:14px; margin-bottom:6px; }
  .ll-item { display:flex; align-items:center; gap:5px; }
  .ll-dot  { width:7px; height:7px; border-radius:50%; border:1.5px solid #fff; }
  .ll-line { width:20px; height:2.5px; border-radius:2px; }
  .ll-label{ font-size:8.5px; color:#6b7280; }
  .donut-wrap { display:flex; align-items:center; gap:14px; }
  .donut-leg  { display:flex; flex-direction:column; gap:8px; }
  .dl-item { display:flex; align-items:center; gap:7px; }
  .dl-dot  { width:10px; height:10px; border-radius:3px; flex-shrink:0; }
  .dl-name { font-size:9px; color:#6b7280; font-family:monospace; }
  .dl-val  { font-size:13px; font-weight:800; font-family:monospace; margin-left:auto; }
  .freq-tbl { border-collapse:collapse; width:100%; }
  .freq-tbl th { font-size:8px; color:#9ca3af; text-align:left; padding:4px 6px; border-bottom:1px solid #f3f4f6; }
  .freq-tbl td { font-size:9px; padding:3px 6px; border-bottom:1px solid #f9fafb; }
  .ftr { margin-top:10px; padding-top:8px; border-top:1px solid #f3f4f6; display:flex; justify-content:space-between; align-items:center; }
  .ftr-txt  { font-size:8px; color:#d1d5db; text-transform:uppercase; letter-spacing:.06em; }
  .ftr-logo { font-size:11px; font-weight:800; color:#f97316; }
  @media print { body { background:#fff; } .sec { page-break-inside:avoid; } }
</style>
</head>
<body>

<div class="hdr">
  <div class="hdr-left">
    <div class="hdr-icon">🛸</div>
    <div>
      <div class="hdr-title">DroneSentinel</div>
      <div class="hdr-sub">Detection Analytics Report</div>
    </div>
  </div>
  <div class="hdr-right">
    <div class="lbl">Generated</div>
    <div class="val">${dateStr}</div>
  </div>
</div>

<div class="sec">
  <div class="sec-title">Summary Metrics</div>
  <div class="kpi-row">
    <div class="kpi"><div class="kpi-v" style="color:#f97316">${total}</div><div class="kpi-l">Total Events</div></div>
    <div class="kpi"><div class="kpi-v" style="color:#ea580c">${ga}</div><div class="kpi-l">Group GA</div></div>
    <div class="kpi y"><div class="kpi-v">${gb}</div><div class="kpi-l">Group GB</div></div>
    <div class="kpi g"><div class="kpi-v">${avgSpeed}</div><div class="kpi-l">Avg Speed m/s</div></div>
    <div class="kpi b"><div class="kpi-v">${avgHeight}</div><div class="kpi-l">Avg Height m</div></div>
    <div class="kpi p"><div class="kpi-v">${maxSpeed}</div><div class="kpi-l">Max Speed m/s</div></div>
  </div>
</div>

<div class="sec">
  <div class="sec-title">Daily Detection Trend — GA vs GB</div>
  <div class="card">
    <div class="line-legend">
      <div class="ll-item"><div class="ll-dot" style="background:#f97316"></div><div class="ll-line" style="background:#f97316"></div><span class="ll-label">Group GA</span></div>
      <div class="ll-item"><div class="ll-dot" style="background:#eab308"></div><div class="ll-line" style="background:#eab308"></div><span class="ll-label">Group GB</span></div>
      <span style="margin-left:auto;font-size:8px;color:#9ca3af">${days.length} วัน</span>
    </div>
    <div style="overflow:hidden">${lineChart}</div>
  </div>
</div>

<div class="sec">
  <div class="sec-title">Distribution Analysis</div>
  <div class="row2">
    <div class="card">
      <div class="card-title">Group Split</div>
      <div class="donut-wrap">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="${R}" fill="none" stroke="#f3f4f6" stroke-width="15"/>
          <circle cx="50" cy="50" r="${R}" fill="none" stroke="#eab308" stroke-width="15" stroke-dasharray="${gbA.toFixed(2)} ${(circ - gbA).toFixed(2)}" stroke-dashoffset="${(circ * 0.25).toFixed(2)}" opacity="0.85"/>
          <circle cx="50" cy="50" r="${R}" fill="none" stroke="#f97316" stroke-width="15" stroke-dasharray="${gaA.toFixed(2)} ${(circ - gaA).toFixed(2)}" stroke-dashoffset="${(circ * 0.25 + gbA).toFixed(2)}" opacity="0.9"/>
          <text x="50" y="46" text-anchor="middle" font-size="17" font-weight="800" fill="#111" font-family="monospace">${total}</text>
          <text x="50" y="59" text-anchor="middle" font-size="8" fill="#9ca3af" font-family="monospace">TOTAL</text>
        </svg>
        <div class="donut-leg">
          <div class="dl-item"><div class="dl-dot" style="background:#f97316"></div><span class="dl-name">GA</span><span class="dl-val" style="color:#ea580c">${ga}</span></div>
          <div class="dl-item"><div class="dl-dot" style="background:#eab308"></div><span class="dl-name">GB</span><span class="dl-val" style="color:#ca8a04">${gb}</span></div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Frequency Distribution</div>
      <table class="freq-tbl">
        <thead><tr><th>Freq Band</th><th>Count</th><th>%</th><th>Bar</th></tr></thead>
        <tbody>${freqRows}</tbody>
      </table>
    </div>
  </div>
  <div class="card">
    <div class="card-title">Drone Model Distribution <span class="card-sub">top ${Math.min(models.length, 7)}</span></div>
    <svg xmlns="http://www.w3.org/2000/svg" width="680" height="${modelSvgH}" viewBox="0 0 680 ${modelSvgH}" style="width:100%;height:${modelSvgH}px">
      ${modelBars}
    </svg>
  </div>
</div>

<div class="ftr">
  <span class="ftr-txt">DroneSentinel · ${isoDate} · ${total} events</span>
  <span class="ftr-logo">DroneSentinel</span>
</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 900);
  } else {
    alert('Please allow pop-ups for PDF export');
  }
}

export default function EventsTable({ events, isLoading, currentPage, setCurrentPage }) {
  const [tableCollapsed,    setTableCollapsed]    = useState(false);
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);

  const totalPages = Math.max(1, Math.ceil(events.length / PER_PAGE));
  const slice      = events.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0f0f0f]">
      <div className="px-4 py-3 border-b border-[#3a3a3a] flex items-center justify-between bg-[#1a1a1a] flex-none">
        <div className="flex items-center gap-3">
          <button onClick={() => setTableCollapsed((v) => !v)} className="p-1 hover:bg-[#2a2a2a] rounded transition-colors text-[#666] hover:text-[#aaa] bg-transparent border-0">
            <svg className={`w-3 h-3 transition-transform ${tableCollapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <span className="text-sm font-bold text-white">Detection Events</span>
          <span className="px-2 py-0.5 bg-[#2a2a2a] text-[#f97316] text-[10px] font-bold rounded-full border border-orange-900/30">
            {events.length}
          </span>
        </div>

        <div className="flex gap-2">
          <button onClick={() => exportCSV(events)} disabled={isLoading || !events.length} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-[#ccc] bg-[#232323] hover:bg-[#2e2e2e] border border-[#3d3d3d] hover:border-[#555] rounded-md transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Export CSV
          </button>

          <button onClick={() => exportPDF(events)} disabled={isLoading || !events.length} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-[#f97316] hover:bg-[#ea580c] rounded-md transition-all active:scale-95 shadow-lg shadow-orange-900/20 disabled:opacity-30 disabled:cursor-not-allowed border-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            Report PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {!tableCollapsed && (
          <>
            {isLoading ? (
              <div className="p-10 text-center text-gray-500">
                <div className="w-6 h-6 border-2 border-[#3a3a3a] border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
                Loading data...
              </div>
            ) : events.length === 0 ? (
              <div className="p-10 text-center text-[#555] text-sm">No events found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" style={{ minWidth: '700px' }}>
                  <thead className="sticky top-0 bg-[#1a1a1a] z-10 border-b border-[#2a2a2a]">
                    <tr>
                      {COLUMNS.map((c) => (
                        <th key={c.key} className="px-4 py-3 text-[10px] font-bold text-[#666] uppercase tracking-wider whitespace-nowrap">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slice.map((e, i) => (
                      <tr key={i} className="border-b border-[#181818] hover:bg-[#151515] transition-colors group">
                        <td className="px-4 py-2 text-[11px] font-mono text-[#666] group-hover:text-gray-300 whitespace-nowrap">{e.datetime.replace('T', ' ')}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${ e.group === 'GA' ? 'bg-orange-900/20 text-orange-400 border border-orange-900/30' : 'bg-yellow-900/20 text-yellow-400 border border-yellow-900/30' }`}>
                            {e.group}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-[11px] text-[#666]">{e.subgroup}</td>
                        <td className="px-4 py-2 text-[11px] text-[#666]">{e.detector_id}</td>
                        <td className="px-4 py-2 text-[11px] font-mono text-[#888]">{e.drone_id}</td>
                        <td className="px-4 py-2 text-[11px] text-gray-200 whitespace-nowrap">{e.model}</td>
                        <td className="px-4 py-2 text-[11px] font-mono text-[#666]">{e.latitude.toFixed(4)}</td>
                        <td className="px-4 py-2 text-[11px] font-mono text-[#666]">{e.longitude.toFixed(4)}</td>
                        <td className="px-4 py-2 text-[11px] text-[#888] font-mono">{e.height}</td>
                        <td className="px-4 py-2 text-[11px] text-[#888] font-mono">{e.speed}</td>
                        <td className="px-4 py-2 text-[11px] text-[#666] font-mono">{e.freq}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {events.length > 0 && (
              <div className="border-t border-[#2a2a2a] bg-[#121212]">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            )}
          </>
        )}

        <div className="border-t border-[#3a3a3a]">
          <button onClick={() => setTimelineCollapsed((v) => !v)} className="w-full flex items-center justify-between px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#202020] transition-colors border-0">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Daily Timeline</span>
            </div>
            <svg className={`w-3 h-3 text-[#444] transition-transform duration-200 ${timelineCollapsed ? '-rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {!timelineCollapsed && (
            <div className="p-4 bg-[#0f0f0f]">
              <TimelineChart events={events} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}