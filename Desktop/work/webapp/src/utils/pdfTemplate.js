import { GA, GB, PROTO_COLORS, MODEL_COLORS } from '../shared/constants';

export function buildPdfHtml({ titleDate, groupFilter, kpis, models, protocols, freqBands, dirData }) {
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
