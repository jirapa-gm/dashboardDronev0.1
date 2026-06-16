const fs = require('fs');

let content = fs.readFileSync('c:/Users/ASUS/Desktop/work/webapp/src/components/TacticalMapView.jsx', 'utf8');

if (!content.includes('./TacticalMapView.css')) {
  content = content.replace(/import \{ CompassIcon/, "import './TacticalMapView.css';\nimport { CompassIcon");
}

const replacements = [
  [`style={{ background: '#0a0a0a' }}`, `className="tm-container flex-col-start h-full"`],
  [`<div className="flex-col-start h-full" className="tm-container flex-col-start h-full">`, `<div className="tm-container flex-col-start h-full">`],
  [`style={{ width: '1rem', height: '1rem', color: '#f97316' }}`, `className="tm-icon-orange"`],
  [`style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}`, `className="tm-title"`],
  [`className="rounded-full font-bold" style={{ fontSize: '11px', padding: '2px 10px', background: 'rgba(249,115,22,.12)', color: '#f97316', border: '1px solid rgba(249,115,22,.35)' }}`, `className="tm-badge-orange rounded-full font-bold"`],
  [`className="rounded-full font-bold animate-pulse" style={{ fontSize: '11px', padding: '2px 10px', background: 'rgba(239,68,68,.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,.4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}`, `className="tm-badge-red rounded-full font-bold animate-pulse"`],
  [`style={{ fontSize: '10px', padding: '6px 12px', background: showSweep ? '#22c55e18' : '#1a1a1a', border: '1px solid ' + (showSweep ? '#22c55e' : '#2a2a2a'), color: showSweep ? '#22c55e' : '#555', cursor: 'pointer' }}`, `className={showSweep ? 'tm-btn-sweep-active rounded font-bold' : 'tm-btn-sweep-inactive rounded font-bold'}`],
  [`className="rounded font-bold" className={showSweep ? 'tm-btn-sweep-active rounded font-bold' : 'tm-btn-sweep-inactive rounded font-bold'}`, `className={showSweep ? 'tm-btn-sweep-active rounded font-bold' : 'tm-btn-sweep-inactive rounded font-bold'}`],
  [`style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}`, `className="tm-icon-text"`],
  [`style={{ width: '100%', height: '100%' }}`, `className="tm-map-container"`],
  [`className="legend-box" style={{ background: 'rgba(14,14,14,0.92)', border: '1px solid #2a2a2a', backdropFilter: 'blur(8px)' }}`, `className="legend-box tm-legend-overlay"`],
  [`style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold', marginBottom: 2 }}`, `className="tm-legend-title"`],
  [`className="rounded" style={{ background: c, opacity: .75, width: 12, height: 12 }}`, `className="rounded tm-legend-color-box" style={{ background: c }}`],
  [`className="font-mono" style={{ fontSize: 10, fontWeight: 'bold', color: c }}`, `className="font-mono tm-legend-label" style={{ color: c }}`],
  [`style={{ fontSize: 9, color: '#444', marginLeft: 'auto' }}`, `className="tm-legend-val font-mono"`],
  [`className="flex-col-start gap-1-5" style={{ borderTop: '1px solid #2a2a2a', paddingTop: 8, marginTop: 4 }}`, `className="flex-col-start gap-1-5 tm-legend-divider"`],
  [`className="rounded-full" style={{ background: c, opacity: .85, width: 10, height: 10 }}`, `className="rounded-full tm-legend-dot" style={{ background: c }}`],
  [`style={{ fontSize: 9, color: '#555' }}`, `className="tm-legend-dot-label"`],
  [`style={{ borderTop: '1px solid #2a2a2a', paddingTop: 8, marginTop: 4 }}`, `className="tm-legend-divider"`],
  [`style={{ fontSize: 9, color: '#444' }}`, `className="tm-legend-hint"`],
  [`className="stats-overlay-box" style={{ background: 'rgba(14,14,14,0.92)', border: '1px solid #2a2a2a', backdropFilter: 'blur(8px)', minWidth: '150px' }}`, `className="stats-overlay-box tm-stats-overlay"`],
  [`style={{ fontSize: 11, color: '#555' }}`, `className="tm-stats-label"`],
  [`className="font-mono" style={{ fontSize: 13, fontWeight: 'bold', color: c }}`, `className="font-mono tm-stats-val" style={{ color: c }}`],
  [`style={{ borderTop: '1px solid #222', paddingTop: 6, marginTop: 2 }}`, `className="tm-stats-divider"`],
  [`className="font-mono" style={{ fontSize: 9, fontWeight: 'bold', color: radarMode === 'global' ? '#3b82f6' : '#f97316', display: 'flex', alignItems: 'center', gap: '4px' }}`, `className="font-mono tm-stats-flex" style={{ color: radarMode === 'global' ? '#3b82f6' : '#f97316' }}`],
  [`style={{ borderTop: '1px solid #222', paddingTop: 8, marginTop: 8 }}`, `className="tm-active-det-divider"`],
  [`style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', marginBottom: 6, display: 'flex', alignItems: 'center', gap: '4px' }}`, `className="tm-active-det-title"`],
  [`className="animate-pulse" style={{ width: 6, height: 6, background: '#ef4444', borderRadius: '50%' }}`, `className="animate-pulse tm-pulse-dot"`],
  [`className="flex-col-start gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1" style={{ pointerEvents: 'auto' }}`, `className="flex-col-start gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1 tm-scroll-container"`],
  [`style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 6px' }}`, `className="flex-row-between tm-det-card"`],
  [`className="flex-row-between" className="flex-row-between tm-det-card"`, `className="flex-row-between tm-det-card"`],
  [`style={{ fontSize: 11, fontWeight: 'bold', color: d.droneColor, fontFamily: 'monospace' }}`, `className="tm-det-drone-id" style={{ color: d.droneColor }}`],
  [`style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}`, `className="tm-det-dist"`],
  [`style={{ fontSize: 9, color: '#777' }}`, `className="tm-det-label"`],
  [`style={{ fontSize: 9, fontWeight: 'bold', color: '#f87171' }}`, `className="tm-det-id"`],
  [`style={{ fontSize: 10, color: '#555', fontStyle: 'italic', padding: '4px 0' }}`, `className="tm-det-empty"`]
];

replacements.forEach(([from, to]) => {
  content = content.split(from).join(to);
});

fs.writeFileSync('c:/Users/ASUS/Desktop/work/webapp/src/components/TacticalMapView.jsx', content);
