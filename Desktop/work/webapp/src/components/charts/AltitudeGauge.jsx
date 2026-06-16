// ── Altitude gauge ─────────────────────────────────────────────────────────────
export function AltitudeGauge({ height, maxHeight = 500 }) {
  const pct   = Math.min((height ?? 0) / maxHeight, 1);
  const color = pct > 0.7 ? '#ef4444' : pct > 0.4 ? '#f97316' : '#22c55e';
  return (
    <div className="flex-col-center gap-1" style={{ width: 52 }}>
      <span className="text-label-dark-gray" style={{ fontSize: 9 }}>Alt</span>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column-reverse', width: 28, height: 90, background: '#111', borderRadius: 6, border: '1px solid #2a2a2a', overflow: 'visible' }}>
        <div style={{ width: '100%', height: `${pct * 100}%`, background: `linear-gradient(to top, ${color}cc, ${color}44)`, borderRadius: 4, transition: 'height 0.5s ease' }} />
        {[0, 100, 200, 300, 400, 500].map(t => (
          <div key={t} style={{ position: 'absolute', bottom: `${(t / maxHeight) * 100}%`, left: 0, right: 0, borderTop: '1px solid #2a2a2a', pointerEvents: 'none' }}>
            <span style={{ position: 'absolute', right: -28, top: -5, fontSize: 7, color: '#444', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{t}m</span>
          </div>
        ))}
      </div>
      <span className="font-mono" style={{ fontSize: 11, fontWeight: 'bold', color }}>{height ?? '—'}m</span>
    </div>
  );
}
