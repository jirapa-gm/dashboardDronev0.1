const CARDS = [
  { label: 'Total Events',    key: null,  color: 'text-white'      },
  { label: 'Group GA',        key: 'GA',  color: 'text-orange-400' },
  { label: 'Group GB',        key: 'GB',  color: 'text-yellow-400' },
  { label: 'Avg Speed (m/s)', key: 'avg', color: 'text-[#aaa]'     },
];

export default function StatsPanel({ events }) {
  const total    = events.length;
  const ga       = events.filter((e) => e.group === 'GA').length;
  const gb       = events.filter((e) => e.group === 'GB').length;
  const avgSpeed = total > 0
    ? (events.reduce((s, e) => s + e.speed, 0) / total).toFixed(2)
    : '—';

  const values = [total, ga, gb, avgSpeed];

  return (
    <div className="grid grid-cols-2 gap-2">
      {CARDS.map(({ label, color }, i) => (
        <div key={label} className="bg-[#141414] border border-[#3a3a3a] rounded-lg px-3 py-2.5">
          <div className={`text-xl font-bold leading-none ${color}`}>{values[i]}</div>
          <div className="text-[9px] text-[#555] mt-1 uppercase tracking-widest">{label}</div>
        </div>
      ))}
    </div>
  );
}