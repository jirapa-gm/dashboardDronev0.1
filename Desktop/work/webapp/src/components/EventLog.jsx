import { useState, useRef, useMemo } from 'react';
import { THREAT_COLOR, GA, GB } from '../shared/constants';
import { distColor, dirLabel, getProtocolColor, formatDate } from '../shared/helpers';
import { SearchIcon, DownloadIcon, TableIcon } from '../shared/icons';
import { Spinner, Toolbar } from '../shared/ui';
import DroneHistoryPanel from './DroneHistoryPanel';
import DroneIntelTable from './DroneIntelTable';

// ── CSV export (exports same aggregated droneStats as the table) ──────────────
function exportCSV(droneStats) {
  const headers = [
    'drone_id','model','group','detections','threat',
    'max_height_m','max_speed_ms','avg_speed_ms',
    'protocols','frequencies','directions',
    'first_seen','last_seen',
  ];
  const rows = droneStats.map(d => [
    d.drone_id,
    `"${(d.model ?? '').replace(/"/g,'""')}"`,
    d.group,
    d.detections,
    d.threat,
    d.maxHeight,
    d.maxSpeed,
    d.avgSpeed,
    `"${d.protocols?.join('; ') ?? ''}"`,
    `"${d.freqs?.join('; ') ?? ''}"`,
    `"${d.directions?.join(' ') ?? ''}"`,
    d.firstSeen,
    d.lastSeen,
  ].join(','));
  const blob = new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: `drone_intel_${new Date().toISOString().split('T')[0]}.csv` }).click();
  URL.revokeObjectURL(url);
}



// ── Main ──────────────────────────────────────────────────────────────────────
export default function EventLog({ events, droneStats, isLoading, currentPage, setCurrentPage, onSearch, defaultStartDate, defaultEndDate }) {
  const [selectedDroneId, setSelectedDroneId] = useState(null);
  const [startDate, setStartDate] = useState(defaultStartDate ?? '');
  const [endDate,   setEndDate]   = useState(defaultEndDate   ?? '');

  const handleSearch = () => {
    if (onSearch) onSearch({ startDate, endDate });
  };

  return (
    <>
      {selectedDroneId && (
        <DroneHistoryPanel droneId={selectedDroneId} allEvents={events} onClose={() => setSelectedDroneId(null)} />
      )}

      <div className="flex-1 flex-col-start overflow-hidden bg-dark-0a">
        {/* Date range search bar */}
        <div className="date-range-bar">
          <span style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'semibold', whiteSpace: 'nowrap' }}>Date Range</span>
          <div className="flex-row-center gap-2 flex-wrap flex-1">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="date-input-styled" />
            <span style={{ fontSize: 12, color: '#555' }}>—</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="date-input-styled" />
            <button onClick={handleSearch} disabled={isLoading} className="btn btn-ghost flex-row-center gap-1-5" style={{ padding: '0.25rem 0.625rem', fontSize: '12px' }}>
              {isLoading
                ? <><div className="spinner-small-white animate-spin" />Searching…</>
                : <><SearchIcon style={{ width: '0.75rem', height: '0.75rem', color: '#ea580c' }} />Search</>}
            </button>
          </div>
        </div>
        <Toolbar>
          <div className="flex-row-center gap-2">
            <TableIcon style={{ width: '1rem', height: '1rem', color: '#f97316' }} />
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>Drone Intelligence</span>
            <span className="rounded font-bold" style={{ fontSize: '9px', padding: '2px 8px', background:'#1e1e1e', color:GA, border:'1px solid rgba(249,115,22,0.3)' }}>
              {droneStats.length} drones
            </span>
          </div>
          <span style={{ fontSize: 10, color: '#444', marginLeft: 4 }}>Click a row to see 7-day history</span>
          <button onClick={() => exportCSV(droneStats)} disabled={!droneStats.length} className="btn btn-ghost flex-row-center gap-1" style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px' }}>
            <DownloadIcon style={{ width: '0.75rem', height: '0.75rem' }} />
            Export CSV
          </button>
        </Toolbar>

        <div className="flex-1 overflow-y-auto" style={{ padding: '1rem' }}>
          {isLoading
            ? (
              <div className="flex-col-start gap-3 animate-pulse">
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {Array.from({length:4}).map((_,i) => <div key={i} className="rounded-lg flex-1" style={{ height: 32, background: '#141414', border: '1px solid #2a2a2a' }} />)}
                </div>
                <div className="rounded-lg overflow-hidden border border-[#222]">
                  <div className="grid px-3 py-2.5 gap-3" style={{ gridTemplateColumns:'2fr 1.5fr 0.8fr 0.8fr 1fr 1fr 1fr 1fr 1fr', background:'#1a1a1a', borderBottom:'1px solid #2a2a2a' }}>
                    {Array.from({length:9}).map((_,i) => <div key={i} className="rounded" style={{ height: 8, background:'#2a2a2a' }} />)}
                  </div>
                  {Array.from({length:8}).map((_,i) => (
                    <div key={i} className="grid px-3 py-3 gap-3 border-b border-[#161616]" style={{ gridTemplateColumns:'2fr 1.5fr 0.8fr 0.8fr 1fr 1fr 1fr 1fr 1fr', background: i%2===0?'#0d0d0d':'#0a0a0a' }}>
                      {Array.from({length:9}).map((_,j) => <div key={j} className="rounded" style={{ background: '#1a1a1a', height: 12, width:`${50+(j*19)%40}%` }} />)}
                    </div>
                  ))}
                </div>
              </div>
            )
            : droneStats.length === 0
            ? <div className="text-center text-sm" style={{ padding: '2.5rem 0', color: '#555' }}>No drone data found</div>
            : <DroneIntelTable droneStats={droneStats} onDroneClick={setSelectedDroneId} />}
        </div>
      </div>
    </>
  );
}