const STATS = [
  { label: 'Total Events',    key: 'total',    color: 'text-white',      icon: '⚡' },
  { label: 'Group GA',        key: 'ga',       color: 'text-orange-400', icon: '●'  },
  { label: 'Group GB',        key: 'gb',       color: 'text-yellow-400', icon: '●'  },
  { label: 'Avg Speed (m/s)', key: 'avgSpeed', color: 'text-[#bbb]',     icon: '→'  },
];

export default function StatsPanel({ events }) {
  const total    = events.length;
  const ga       = events.filter(e => e.group === 'GA').length;
  const gb       = events.filter(e => e.group === 'GB').length;
  const avgSpeed = total > 0 ? (events.reduce((s, e) => s + e.speed, 0) / total).toFixed(2) : '—';

  const values   = { total, ga, gb, avgSpeed };

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {STATS.map(({ label, key, color, icon }) => (
        <div key={label} className="bg-[#141414] border border-[#3a3a3a] rounded-xl px-3.5 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[11px] opacity-70">{icon}</span>
            <div className="text-[10px] text-[#555] uppercase tracking-widest">{label}</div>
          </div>
          <div className={`text-2xl font-bold leading-none font-mono ${color}`}>{values[key]}</div>
        </div>
      ))}
    </div>
  );
}