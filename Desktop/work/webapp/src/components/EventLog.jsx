import { useState, useRef, useMemo } from 'react';
import { THREAT_COLOR, GA, GB } from '../shared/constants';
import { distColor, dirLabel, getProtocolColor, formatDate } from '../shared/helpers';
import { SearchIcon, DownloadIcon, TableIcon } from '../shared/icons';
import { Spinner, Toolbar } from '../shared/ui';
import DroneHistoryPanel from './DroneHistoryPanel';

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

// ── Drone intel table ─────────────────────────────────────────────────────────
function DroneIntelTable({ droneStats, onDroneClick }) {
  const [sort,    setSort]   = useState({ key: 'detections', dir: -1 });
  const [search,  setSearch] = useState('');
  const [page,    setPage]   = useState(1);
  const [groupF,  setGroupF] = useState('ALL');
  const [threatF, setThreatF]= useState('ALL');
  const PER = 12;

  const sorted = useMemo(() => {
    let arr = droneStats;
    if (search)            arr = arr.filter(d => d.drone_id?.toLowerCase().includes(search.toLowerCase()) || d.model?.toLowerCase().includes(search.toLowerCase()));
    if (groupF  !== 'ALL') arr = arr.filter(d => d.group  === groupF);
    if (threatF !== 'ALL') arr = arr.filter(d => d.threat === threatF);
    return [...arr].sort((a, b) => sort.dir * (String(a[sort.key]) < String(b[sort.key]) ? -1 : 1));
  }, [droneStats, sort, search, groupF, threatF]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER));
  const slice = sorted.slice((page - 1) * PER, page * PER);

  const th = (key, label) => (
    <th key={key} className="th-sortable" onClick={() => { setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 })); setPage(1); }}>
      {label} {sort.key === key ? (sort.dir === -1 ? '↓' : '↑') : ''}
    </th>
  );

  return (
    <>
      <div className="flex-row-center gap-2 flex-wrap" style={{ marginBottom: 12 }}>
        <div className="relative flex-1" style={{ minWidth: 160 }}>
          <input type="text" placeholder="Search drone ID / model…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="search-input-styled" />
          <SearchIcon className="absolute text-[#666]" style={{ left: '0.625rem', top: '50%', transform: 'translateY(-50%)', width: '0.75rem', height: '0.75rem' }} />
        </div>
        {[['groupF', setGroupF, groupF, [['ALL','All Groups'],['GA','GA'],['GB','GB']]],
          ['threatF', setThreatF, threatF, [['ALL','All Threats'],['HIGH','HIGH'],['MEDIUM','MEDIUM'],['LOW','LOW']]]
        ].map(([, setter, val, opts]) => (
          <select key={val} value={val} onChange={e => { setter(e.target.value); setPage(1); }}
            className="select-styled" style={{ padding: '0.375rem 0.5rem' }}>
            {opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <span className="font-mono" style={{ fontSize: 12, color: '#666', marginLeft: 'auto' }}>{sorted.length} drones</span>
      </div>

      <div className="table-wrapper rounded-lg" style={{ border: '1px solid #222' }}>
        <table className="table-main" style={{ minWidth: '720px' }}>
          <thead className="table-header" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              {th('drone_id','Drone ID')}{th('model','Model')}{th('group','Group')}{th('detections','Events')}
              {th('threat','Threat')}{th('maxHeight','Max H')}{th('maxSpeed','Max Spd')}{th('avgSpeed','Avg Spd')}
              {th('protocols','Protocol')}
              <th className="th-sortable" style={{ cursor: 'default' }}>Dirs</th>
              {th('firstSeen','First Seen')}{th('lastSeen','Last Seen')}
            </tr>
          </thead>
          <tbody>
            {slice.map(d => {
              const tc = THREAT_COLOR[d.threat] ?? '#888';
              const gc = d.group === 'GA' ? GA : GB;
              return (
                <tr key={d.drone_id} className="table-body-row" style={{ cursor: 'pointer' }} onClick={() => onDroneClick(d.drone_id)}>
                  <td className="table-cell font-mono" style={{ fontWeight: 'bold', color: gc }}>{d.drone_id}</td>
                  <td className="table-cell" style={{ color: '#ddd', whiteSpace: 'nowrap' }}>{d.model}</td>
                  <td className="table-cell"><span className="rounded-full font-bold" style={{ fontSize: '10px', padding: '2px 6px', background:`${gc}22`, color:gc, border:`1px solid ${gc}44` }}>{d.group}</span></td>
                  <td className="table-cell font-mono" style={{ fontWeight: 'bold', color: '#fff' }}>{d.detections}</td>
                  <td className="table-cell"><span className="rounded font-bold" style={{ fontSize: '10px', padding: '2px 6px', background:`${tc}22`, color:tc }}>{d.threat}</span></td>
                  <td className="table-cell font-mono" style={{ color: '#aaa' }}>{d.maxHeight} m</td>
                  <td className="table-cell font-mono" style={{ color: '#aaa' }}>{d.maxSpeed} m/s</td>
                  <td className="table-cell font-mono" style={{ color: '#aaa' }}>{d.avgSpeed} m/s</td>
                  <td className="table-cell" style={{ color: '#888' }}>{d.protocols?.join(', ') || '—'}</td>
                  <td className="table-cell font-mono" style={{ color: '#888' }}>{d.directions?.join(' ') || '—'}</td>
                  <td className="table-cell font-mono" style={{ color: '#777', whiteSpace: 'nowrap' }}>{formatDate(d.firstSeen)}</td>
                  <td className="table-cell font-mono" style={{ color: '#777', whiteSpace: 'nowrap' }}>{formatDate(d.lastSeen)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex-row-between" style={{ marginTop: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="pagination-btn">← Prev</button>
          <span className="font-mono" style={{ fontSize: 9, color: '#555' }}>Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="pagination-btn">Next →</button>
        </div>
      )}
    </>
  );
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