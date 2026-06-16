const fs = require('fs');

let content = fs.readFileSync('c:/Users/ASUS/Desktop/work/webapp/src/components/Summaries.jsx', 'utf8');

// Add import for CSS
if (!content.includes('./Summaries.css')) {
  content = content.replace(/import { MiniDirRose } from '\.\/charts\/MiniDirRose';/, "import { MiniDirRose } from './charts/MiniDirRose';\nimport './Summaries.css';");
}

const replacements = [
  [`style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}`, `className="summary-header-title"`],
  [`style={{ fontSize: '11px', padding: '0.25rem 0.75rem', background:\`\${badgeColor}22\`, color:badgeColor, border:\`1px solid \${badgeColor}40\` }}`, `className="summary-header-badge rounded font-bold" style={{ background:\`\${badgeColor}22\`, color:badgeColor, border:\`1px solid \${badgeColor}40\` }}`],
  [`className="rounded font-bold" style={{ fontSize: '11px', padding: '0.25rem 0.75rem', background:\`\${badgeColor}22\`, color:badgeColor, border:\`1px solid \${badgeColor}40\` }}`, `className="summary-header-badge rounded font-bold" style={{ background:\`\${badgeColor}22\`, color:badgeColor, border:\`1px solid \${badgeColor}40\` }}`],
  [`style={{ fontSize: '11px', color: '#555', marginLeft: 'auto' }}`, `className="summary-header-subtitle"`],
  [`style={{ color }}`, `className="summary-kpi-val" style={{ color }}`],
  [`style={{ display: 'flex', alignItems: 'center', gap: '6px' }}`, `className="summary-chart-title"`],
  [`style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px' }}`, `className="summary-chart-title-start"`],
  [`style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}`, `className="summary-empty-state"`],
  [`style={{ color: '#555', fontSize: '1rem' }}`, `className="summary-empty-label"`],
  [`style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', color }}`, `className="summary-td-id" style={{ color }}`],
  [`style={{ fontSize: '11px', color: '#666' }}`, `className="summary-td-name"`],
  [`style={{ fontSize: '12px', fontFamily: 'monospace', color: '#bbb' }}`, `className="summary-td-count"`],
  [`style={{ fontSize: '12px', fontFamily: 'monospace', color: '#38bdf8' }}`, `className="summary-td-drones"`],
  [`style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', color:'#fb923c' }}`, `className="summary-td-det-count"`],
  [`style={{ fontSize: '12px', fontFamily: 'monospace', color:'#34d399' }}`, `className="summary-td-green"`],
  [`style={{ color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '12px' }}`, `className="summary-table-header"`],
  [`style={{ minWidth:'900px' }}`, `className="summary-table-main table-main"`],
  [`style={{ background:isSel?'#111':isCrit?'rgba(239,68,68,0.04)':'transparent', cursor: 'pointer' }}`, `style={{ background:isSel?'#111':isCrit?'rgba(239,68,68,0.04)':'transparent', cursor: 'pointer' }}`],
  [`style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap' }}`, `className="summary-td-date font-mono"`],
  [`style={{ fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', color:gc }}`, `className="summary-td-drone-id font-mono" style={{ color:gc }}`],
  [`style={{ fontSize: '12px', color: '#bbb', whiteSpace: 'nowrap' }}`, `className="summary-td-model"`],
  [`style={{ fontSize: '10px', padding: '2px 8px', background:\`\${tc}18\`, color:tc }}`, `className="summary-threat-badge rounded font-bold" style={{ background:\`\${tc}18\`, color:tc }}`],
  [`style={{ fontSize: '12px', color: '#777' }}`, `className="summary-td-measure font-mono"`],
  [`style={{ fontSize: '12px', color:(e.estimated_distance_m??999)<100?'#ef4444':'#777' }}`, `className="summary-td-dynamic font-mono" style={{ color:(e.estimated_distance_m??999)<100?'#ef4444':'#777' }}`],
  [`style={{ fontSize: '12px', color:(e.rssi_dbm??0)>-65?'#22c55e':(e.rssi_dbm??0)>-75?'#f97316':'#ef4444' }}`, `className="summary-td-dynamic font-mono" style={{ color:(e.rssi_dbm??0)>-65?'#22c55e':(e.rssi_dbm??0)>-75?'#f97316':'#ef4444' }}`],
  [`style={{ fontSize: '11px', color: e.has_gps?'#22c55e':'#ef4444', fontWeight: 'bold' }}`, `className="summary-td-status font-mono" style={{ color: e.has_gps?'#22c55e':'#ef4444' }}`],
  [`style={{ fontSize: '11px', color: e.registered?'#22c55e':'#ef4444', fontWeight: 'bold' }}`, `className="summary-td-status font-mono" style={{ color: e.registered?'#22c55e':'#ef4444' }}`],
  [`style={{ fontSize: '12px', fontWeight: 'bold', color:groupColor }}`, `className="summary-td-dir font-mono" style={{ color:groupColor }}`],
  [`style={{ padding: '1rem 1.25rem', backgroundColor: '#0d0d0d', borderBottom: '1px solid #1a1a1a' }}`, `className="summary-expanded-row"`],
  [`style={{ padding: '0.625rem 0.75rem' }}`, `className="summary-expanded-item rounded-lg bg-dark-11"`],
  [`style={{ marginBottom: '4px' }}`, `className="summary-expanded-label text-label-dark-gray"`],
  [`style={{ fontSize: '12px', color: '#999' }}`, `className="summary-expanded-val font-mono"`],
  [`style={{ color: '#38bdf8' }}`, `className="w-3.5 h-3.5 text-sky-400"`],
  [`style={{ color: groupColor }}`, `className="w-3.5 h-3.5" style={{ color: groupColor }}`],
  [`style={{ color: '#333' }}`, `className="w-10 h-10 text-neutral-800"`]
];

replacements.forEach(([from, to]) => {
  // Be careful with replacing strings that have className already
  // If `from` is just `style={...}`, and the tag already has `className`, we should merge or just replace.
  // We'll just replace the exact `style={...}` strings.
  content = content.split(from).join(to);
});

// Fix duplicate classes like `className="table-cell" className="summary-td-name"`
content = content.replace(/className="([^"]+)"\s+className="([^"]+)"/g, 'className="$1 $2"');
// Again for another possible match
content = content.replace(/className="([^"]+)"\s+className="([^"]+)"/g, 'className="$1 $2"');

fs.writeFileSync('c:/Users/ASUS/Desktop/work/webapp/src/components/Summaries.jsx', content);
