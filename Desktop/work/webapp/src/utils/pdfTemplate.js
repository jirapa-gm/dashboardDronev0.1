import { GA, GB, PROTO_COLORS, MODEL_COLORS } from '../shared/constants';

/**
 * Build the HTML string for the PDF print window.
 *
 * @param {object} p
 * @param {string}   p.titleDate
 * @param {string}   p.groupFilter   - scope used for filtering (ALL/GA/GB)
 * @param {object}   p.kpis
 * @param {Array}    p.models
 * @param {Array}    p.protocols
 * @param {Array}    p.freqBands
 * @param {Array}    p.dirData
 * @param {Array}    p.subgroups      - [{sg, detectors:[{id,lat,lon}]}]
 * @param {object}   p.options        - { sections:Set<string>, detailLevel:'group'|'subgroup'|'detector' }
 */
export function buildPdfHtml({
  titleDate, groupFilter, kpis, models, protocols, freqBands, dirData,
  subgroups = [],
  options = {},
}) {
  const {
    sections    = new Set(['kpi','subgroup','hourly','direction','model','protocol']),
    detailLevel = 'group',
  } = options;

  const has = (key) => sections.has(key);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const bar = (label, count, pct, color) =>
    `<div style="margin-bottom:7px">
      <div style="display:flex;justify-content:space-between;font-size:9px;color:#475569;margin-bottom:3px">
        <span style="font-weight:500">${label}</span>
        <span style="color:${color};font-weight:700">${count} <span style="color:#94a3b8;font-size:8px">(${pct}%)</span></span>
      </div>
      <div style="height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:3px"></div>
      </div>
    </div>`;

  // ── KPI rows ───────────────────────────────────────────────────────────────
  const kpiRows = [
    ['Total Events',  kpis.total,               '#0f172a'],
    ['Unique Drones', kpis.unique,              '#0284c7'],
    ['Group GA',      kpis.ga,                  GA],
    ['Group GB',      kpis.gb,                  GB],
    ['High Threat',   kpis.highThreat,           '#dc2626'],
    ['Avg Speed',     `${kpis.avgSpeed} m/s`,    '#7c3aed'],
    ['Avg Height',    `${kpis.avgHeight} m`,     '#059669'],
    ['Max Speed',     `${kpis.maxSpeed} m/s`,    '#e11d48'],
  ];

  // ── Model / Protocol / Freq bars ──────────────────────────────────────────
  const maxModel = models[0]?.[1] ?? 1;
  const modelRows = models.slice(0,6)
    .map(([l,c],i) => bar(l, c, Math.round(c/maxModel*100), MODEL_COLORS[i % MODEL_COLORS.length])).join('');

  const maxProto = protocols[0]?.[1] ?? 1;
  const protoRows = protocols.slice(0,4)
    .map(([l,c]) => bar(l, c, Math.round(c/maxProto*100), PROTO_COLORS[l] ?? '#475569')).join('');

  const maxFreq = Math.max(...freqBands.map(f => f.count), 1);
  const freqRows = freqBands.slice(0,3)
    .map(({band,count},i) => bar(`${band} MHz`, count, Math.round(count/maxFreq*100),
      ['#0284c7','#7c3aed','#059669'][i % 3])).join('');

  // ── Direction grid ─────────────────────────────────────────────────────────
  const topDirs = [...dirData].sort((a,b)=>b.total-a.total).slice(0,4)
    .map(({dir,total}) => `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px;text-align:center">
        <div style="font-family:'Outfit',sans-serif;font-size:13px;font-weight:700;color:#0f172a">${dir}</div>
        <div style="font-size:7px;color:#64748b;text-transform:uppercase;margin-top:1px;font-weight:500">${total} events</div>
      </div>`).join('');

  // ── Subgroup / Detector table ─────────────────────────────────────────────
  const buildSubgroupSection = () => {
    if (!has('subgroup') || groupFilter === 'ALL') return '';
    const groupColor = groupFilter === 'GA' ? GA : GB;

    if (detailLevel === 'group') {
      // just show a quick count summary
      const sgCount = subgroups.length;
      const detCount = subgroups.reduce((s, g) => s + g.detectors.length, 0);
      return `
        <div class="card" style="margin-bottom:12px">
          <div class="card-hd">🗂 Group ${groupFilter} — Overview</div>
          <div class="card-bd" style="display:flex;gap:24px;align-items:center">
            <div><div class="klabel">Subgroups</div><div class="kval" style="color:${groupColor}">${sgCount}</div></div>
            <div><div class="klabel">Detectors</div><div class="kval" style="color:#0284c7">${detCount}</div></div>
          </div>
        </div>`;
    }

    if (detailLevel === 'subgroup') {
      const rows = subgroups.map(({sg, detectors}) => `
        <tr>
          <td style="font-weight:700;color:${groupColor};font-family:monospace">${sg}</td>
          <td style="text-align:center;font-weight:700">${detectors.length}</td>
          <td style="color:#64748b;font-size:8px">${detectors.map(d=>d.id).slice(0,5).join(', ')}${detectors.length>5?' …':''}</td>
        </tr>`).join('');
      return `
        <div class="card" style="margin-bottom:12px">
          <div class="card-hd">🗂 Subgroup Breakdown — Group ${groupFilter}</div>
          <div class="card-bd">
            <table style="width:100%;border-collapse:collapse;font-size:9px">
              <thead>
                <tr style="border-bottom:1px solid #e2e8f0">
                  <th style="text-align:left;padding:4px 0;color:#64748b;text-transform:uppercase;font-size:7px;letter-spacing:1px">Subgroup</th>
                  <th style="text-align:center;padding:4px 0;color:#64748b;text-transform:uppercase;font-size:7px;letter-spacing:1px">Detectors</th>
                  <th style="text-align:left;padding:4px 0;color:#64748b;text-transform:uppercase;font-size:7px;letter-spacing:1px">Detector IDs</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`;
    }

    // detailLevel === 'detector'
    const allRows = subgroups.flatMap(({sg, detectors}) =>
      detectors.map((det, i) => `
        <tr style="border-bottom:1px solid #f1f5f9">
          ${i === 0 ? `<td rowspan="${detectors.length}" style="font-weight:700;color:${groupColor};font-family:monospace;vertical-align:top;padding-top:6px">${sg}</td>` : ''}
          <td style="font-family:monospace;font-weight:600;color:#0f172a">${det.id}</td>
          <td style="font-family:monospace;color:#475569">${det.lat != null ? Number(det.lat).toFixed(5) : '—'}</td>
          <td style="font-family:monospace;color:#475569">${det.lon != null ? Number(det.lon).toFixed(5) : '—'}</td>
        </tr>`)
    ).join('');

    return `
      <div class="card" style="margin-bottom:12px">
        <div class="card-hd">🗂 Detector List — Group ${groupFilter}</div>
        <div class="card-bd">
          <table style="width:100%;border-collapse:collapse;font-size:9px">
            <thead>
              <tr style="border-bottom:1px solid #e2e8f0">
                <th style="text-align:left;padding:4px 0;color:#64748b;text-transform:uppercase;font-size:7px;letter-spacing:1px">Subgroup</th>
                <th style="text-align:left;padding:4px 0;color:#64748b;text-transform:uppercase;font-size:7px;letter-spacing:1px">Detector ID</th>
                <th style="text-align:left;padding:4px 0;color:#64748b;text-transform:uppercase;font-size:7px;letter-spacing:1px">Latitude</th>
                <th style="text-align:left;padding:4px 0;color:#64748b;text-transform:uppercase;font-size:7px;letter-spacing:1px">Longitude</th>
              </tr>
            </thead>
            <tbody>${allRows}</tbody>
          </table>
        </div>
      </div>`;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DroneSentinel — Analytics Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:'Inter',-apple-system,sans-serif;background:#f8fafc;color:#334155;padding:20px;font-size:10px;line-height:1.4}
    .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #e2e8f0;padding-bottom:12px;margin-bottom:16px}
    .logo-area{display:flex;align-items:center;gap:6px}
    .logo-sym{color:#ea580c;font-size:20px;line-height:1}
    .title{font-family:'Outfit',sans-serif;font-size:16px;font-weight:700;color:#0f172a;letter-spacing:0.5px}
    .sub{font-size:8px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-top:1px;font-weight:500}
    .badge{display:inline-block;padding:2px 8px;border-radius:9999px;font-size:8px;font-weight:700;background:#ffedd5;color:#ea580c;border:1px solid #fed7aa;margin-top:4px}
    .meta{text-align:right;font-size:8px;color:#64748b;line-height:1.6}
    .meta-v{color:#0f172a;font-weight:600}
    .kgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
    .kcard{background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;box-shadow:0 1px 2px rgba(0,0,0,.02)}
    .klabel{font-size:7px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;font-weight:600}
    .kval{font-family:'Outfit',sans-serif;font-size:15px;font-weight:700}
    .g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,.02);display:flex;flex-direction:column}
    .card-hd{padding:6px 10px;border-bottom:1px solid #f1f5f9;font-family:'Outfit',sans-serif;font-size:8px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:1px;background:#f8fafc}
    .card-bd{padding:10px 12px;flex:1}
    .dgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
    .footer{margin-top:12px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:8px;color:#94a3b8}
    tr td{padding:4px 6px 4px 0}
    @media print{body{padding:0;background:#fff}@page{size:A4 landscape;margin:8mm}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo-area">
        <span class="logo-sym">⬢</span>
        <span class="title">DRONE SENTINEL</span>
      </div>
      <div class="sub">Detection &amp; Intelligence Analytics Report</div>
      <div class="badge">FILTER: GROUP ${groupFilter} · DETAIL: ${detailLevel.toUpperCase()}</div>
    </div>
    <div class="meta">
      <div>Generated: <span class="meta-v">${titleDate}</span></div>
      <div>Total Incidents: <span class="meta-v" style="color:#ea580c">${kpis.total}</span></div>
    </div>
  </div>

  ${has('kpi') ? `
  <div class="kgrid">
    ${kpiRows.map(([l,v,c]) => `
      <div class="kcard">
        <div class="klabel">${l}</div>
        <div class="kval" style="color:${c}">${v}</div>
      </div>`).join('')}
  </div>` : ''}

  ${buildSubgroupSection()}

  ${(has('model') || has('protocol')) ? `
  <div class="g2">
    ${has('model') ? `
    <div class="card">
      <div class="card-hd">🚁 Drone Model Distribution</div>
      <div class="card-bd">${modelRows}</div>
    </div>` : ''}
    ${has('protocol') ? `
    <div class="card">
      <div class="card-hd">📶 Protocol &amp; Frequency Analysis</div>
      <div class="card-bd">
        ${protoRows}
        <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #e2e8f0">${freqRows}</div>
      </div>
    </div>` : ''}
  </div>` : ''}

  ${has('direction') ? `
  <div class="card" style="margin-bottom:12px">
    <div class="card-hd">🧭 Direction of Origin (Top Sectors)</div>
    <div class="card-bd">
      <div class="dgrid">${topDirs}</div>
    </div>
  </div>` : ''}

  <div class="footer">
    <div>DroneSentinel Detection Intelligence System</div>
    <div>${titleDate} · Group: ${groupFilter} · Sections: ${[...sections].join(', ')}</div>
  </div>

  <script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script>
</body>
</html>`;
}
