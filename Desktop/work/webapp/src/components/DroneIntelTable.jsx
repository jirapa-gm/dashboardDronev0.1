import { useState, useMemo } from 'react';
import { THREAT_COLOR, GA, GB } from '../shared/constants';
import { formatDate } from '../shared/helpers';
import { SearchIcon } from '../shared/icons';

export default function DroneIntelTable({ droneStats, onDroneClick }) {
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
    return [...arr].sort((a, b) => {
      const valA = a[sort.key];
      const valB = b[sort.key];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sort.dir * (valA - valB);
      }
      return sort.dir * String(valA).localeCompare(String(valB));
    });
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
