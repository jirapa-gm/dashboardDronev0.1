import { useState, useMemo, useRef } from 'react';
import { THREAT_COLOR, GA, GB } from '../shared/constants';
import { distColor, dirLabel, getProtocolColor, formatDate } from '../shared/helpers';
import { SearchIcon, DownloadIcon, TableIcon } from '../shared/icons';
import { Spinner, Toolbar } from '../shared/ui';

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCSV(events) {
  const headers = ['id','datetime','group','subgroup','detector_id','detector_name',
    'drone_id','model','latitude','longitude','height','speed','freq','direction','bearing',
    'protocol','protocol_name','threat','registered','has_gps','aoa_degrees',
    'estimated_distance_m','rssi_dbm','snr_db','detector_lat','detector_lon'];
  const rows = events.map(e => headers.map(h => {
    const v = e[h];
    if (v == null) return '';
    return typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(','));
  const blob = new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: `drone_log_${new Date().toISOString().split('T')[0]}.csv` }).click();
  URL.revokeObjectURL(url);
}

// ── Build drone stats from raw events ────────────────────────────────────────
function buildDroneStats(events) {
  const map = {};
  events.forEach(e => {
    if (!map[e.drone_id]) map[e.drone_id] = {
      drone_id: e.drone_id, model: e.model ? String(e.model).trim() : 'Unknown',
      group: e.group, detections: 0, maxHeight: 0, maxSpeed: 0, totalSpeed: 0,
      freqs: new Set(), protocols: new Set(), directions: new Set(),
      firstSeen: e.datetime, lastSeen: e.datetime, threat: e.threat || 'LOW',
    };
    const d = map[e.drone_id];
    d.detections++; d.maxHeight = Math.max(d.maxHeight, e.height ?? 0);
    d.maxSpeed = Math.max(d.maxSpeed, e.speed ?? 0); d.totalSpeed += (e.speed ?? 0);
    if (e.freq)      d.freqs.add(e.freq);
    if (e.protocol)  d.protocols.add(e.protocol);
    if (e.direction) d.directions.add(e.direction);
    if (e.datetime < d.firstSeen) d.firstSeen = e.datetime;
    if (e.datetime > d.lastSeen)  d.lastSeen  = e.datetime;
    const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 };
    if ((rank[e.threat] ?? 0) > (rank[d.threat] ?? 0)) d.threat = e.threat;
  });
  return Object.values(map).map(d => ({
    ...d, avgSpeed: parseFloat((d.totalSpeed / d.detections).toFixed(2)),
    freqs: [...d.freqs].sort(), protocols: [...d.protocols], directions: [...d.directions],
  })).sort((a, b) => b.detections - a.detections);
}

// ── Altitude gauge ─────────────────────────────────────────────────────────────
function AltitudeGauge({ height, maxHeight = 500 }) {
  const pct   = Math.min((height ?? 0) / maxHeight, 1);
  const color = pct > 0.7 ? '#ef4444' : pct > 0.4 ? '#f97316' : '#22c55e';
  return (
    <div className="flex flex-col items-center gap-1" style={{ width: 52 }}>
      <span className="text-[9px] text-[#555] uppercase tracking-widest">Alt</span>
      <div className="relative flex flex-col-reverse" style={{ width: 28, height: 90, background: '#111', borderRadius: 6, border: '1px solid #2a2a2a', overflow: 'visible' }}>
        <div style={{ width: '100%', height: `${pct * 100}%`, background: `linear-gradient(to top, ${color}cc, ${color}44)`, borderRadius: 4, transition: 'height 0.5s ease' }} />
        {[0, 100, 200, 300, 400, 500].map(t => (
          <div key={t} style={{ position: 'absolute', bottom: `${(t / maxHeight) * 100}%`, left: 0, right: 0, borderTop: '1px solid #2a2a2a', pointerEvents: 'none' }}>
            <span style={{ position: 'absolute', right: -28, top: -5, fontSize: 7, color: '#444', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{t}m</span>
          </div>
        ))}
      </div>
      <span className="text-[11px] font-bold font-mono" style={{ color }}>{height ?? '—'}m</span>
    </div>
  );
}

// ── Signal sparkline ──────────────────────────────────────────────────────────
function SignalSparkline({ detections, width = 160, height = 36 }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);
  if (!detections || detections.length < 2) return null;

  const values = detections.map(d => d.rssi_dbm ?? -90);
  const times  = detections.map(d => new Date(d.datetime).getTime());
  const minV = Math.min(...values), maxV = Math.max(...values), range = maxV - minV || 1;
  const minT = Math.min(...times),  maxT = Math.max(...times),  timeRange = maxT - minT || 1;

  const px = t => ((t - minT) / timeRange) * (width - 8) + 4;
  const py = v => height - 4 - ((v - minV) / range) * (height - 8);
  const pts = detections.map((d, i) => `${px(times[i])},${py(values[i])}`).join(' ');

  return (
    <div className="relative" style={{ width, height: height + 16 }}>
      <div className="text-[8px] text-[#444] mb-0.5 uppercase tracking-widest">RSSI over time</div>
      <svg ref={svgRef} width={width} height={height} style={{ display: 'block', overflow: 'visible' }}
           onMouseMove={e => {
             const rect = svgRef.current.getBoundingClientRect();
             const t = minT + ((e.clientX - rect.left) / width) * timeRange;
             let ci = 0, minD = Infinity;
             times.forEach((tt, i) => { const d = Math.abs(tt - t); if (d < minD) { minD = d; ci = i; } });
             setTooltip({ x: px(times[ci]), y: py(values[ci]), val: values[ci], time: detections[ci].datetime?.slice(11,16) });
           }}
           onMouseLeave={() => setTooltip(null)}>
        <polyline points={pts} fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.8"/>
        {detections.map((d, i) => <circle key={i} cx={px(times[i])} cy={py(values[i])} r="2.5" fill="#22c55e" opacity="0.7"/>)}
        {tooltip && (
          <>
            <line x1={tooltip.x} y1={0} x2={tooltip.x} y2={height} stroke="#fff" strokeWidth="0.5" opacity="0.3"/>
            <circle cx={tooltip.x} cy={tooltip.y} r="4" fill="#22c55e" stroke="#fff" strokeWidth="1"/>
            <rect x={tooltip.x + 6} y={tooltip.y - 14} width={56} height={18} rx="3" fill="rgba(20,20,20,0.92)" stroke="#333"/>
            <text x={tooltip.x + 9} y={tooltip.y - 2} fill="#ccc" fontSize="8" fontFamily="monospace">{tooltip.val} dBm {tooltip.time}</text>
          </>
        )}
      </svg>
    </div>
  );
}

// ── 7-day detection timeline ──────────────────────────────────────────────────
function DetectionTimeline({ detections }) {
  const [hover, setHover] = useState(null);
  if (!detections?.length) return null;

  const sorted = [...detections].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const sessions = [];
  let cur = null;
  sorted.forEach(d => {
    const t = new Date(d.datetime).getTime();
    if (!cur || t - cur.end > 5 * 60 * 1000) {
      if (cur) sessions.push(cur);
      cur = { start: t, end: t, events: [d], detectors: new Set([d.detector_id]) };
    } else { cur.end = t; cur.events.push(d); cur.detectors.add(d.detector_id); }
  });
  if (cur) sessions.push(cur);

  const now = Date.now(), windowMs = 7 * 24 * 60 * 60 * 1000, minT = now - windowMs;
  const toX = t => Math.max(0, Math.min(100, ((t - minT) / windowMs) * 100));
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - i * 86400000); d.setHours(0,0,0,0);
    return { x: toX(d.getTime()), label: `${d.getMonth()+1}/${d.getDate()}` };
  }).reverse();

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[9px] text-[#555] uppercase tracking-widest font-bold">7-Day Detection Timeline</div>
      <div className="relative" style={{ height: 28, background: '#0d0d0d', borderRadius: 6, border: '1px solid #1e1e1e' }}>
        {dayLabels.map((dl, i) => (
          <div key={i} style={{ position: 'absolute', left: `${dl.x}%`, top: 0, bottom: 0, borderLeft: '1px solid #1e1e1e', pointerEvents: 'none' }}>
            <span style={{ position: 'absolute', bottom: -14, left: 2, fontSize: 8, color: '#333', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{dl.label}</span>
          </div>
        ))}
        {sessions.map((s, i) => (
          <div key={i} style={{ position: 'absolute', left: `${toX(s.start)}%`, width: `${Math.max(toX(s.end) - toX(s.start), 0.5)}%`, top: 4, bottom: 4, background: s.events.some(e => (e.estimated_distance_m ?? 999) < 100) ? '#ef4444' : '#f97316', borderRadius: 3, opacity: hover === i ? 1 : 0.75, cursor: 'pointer', transition: 'opacity 0.15s', zIndex: 2 }}
               onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
        {hover !== null && sessions[hover] && (() => {
          const s = sessions[hover];
          const x1 = toX(s.start);
          const dMin = Math.round((s.end - s.start) / 60000);
          const startStr = new Date(s.start).toLocaleString('th-TH', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
          const endStr   = s.end !== s.start ? new Date(s.end).toLocaleString('th-TH', { hour:'2-digit', minute:'2-digit' }) : '—';
          return (
            <div style={{ position:'absolute', left:`${Math.min(x1,65)}%`, top:-60, background:'rgba(14,14,14,0.97)', border:'1px solid #333', borderRadius:8, padding:'6px 10px', zIndex:10, pointerEvents:'none', minWidth:160, boxShadow:'0 8px 24px rgba(0,0,0,0.6)' }}>
              <div style={{ fontSize:10, color:'#f97316', fontWeight:700, marginBottom:3 }}>Session #{hover + 1}</div>
              <div style={{ fontSize:9, color:'#888', fontFamily:'monospace' }}>{startStr} → {endStr}</div>
              <div style={{ fontSize:9, color:'#aaa', marginTop:3 }}>Duration: <b style={{ color:'#fff' }}>{dMin || '< 1'} min</b></div>
              <div style={{ fontSize:9, color:'#aaa' }}>Events: <b style={{ color:'#fff' }}>{s.events.length}</b> · Detectors: <b style={{ color:'#3b82f6' }}>{[...s.detectors].join(', ')}</b></div>
            </div>
          );
        })()}
      </div>
      <div style={{ height: 14 }} />
    </div>
  );
}

// ── Drone detail modal ────────────────────────────────────────────────────────
function DroneHistoryPanel({ droneId, allEvents, onClose }) {
  const detections = useMemo(() => {
    if (!droneId) return [];
    return allEvents.filter(e => e.drone_id === droneId)
      .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
  }, [droneId, allEvents]);

  if (!droneId) return null;

  const latest    = detections[0];
  const gc        = latest?.group === 'GA' ? GA : GB;
  const tc        = THREAT_COLOR[latest?.threat] ?? '#888';

  // ── computed stats ──────────────────────────────────────────────────────────
  const n         = detections.length;
  const avgSpeed  = n ? parseFloat((detections.reduce((s,d) => s+(d.speed??0), 0)/n).toFixed(2)) : 0;
  const maxSpeed  = n ? Math.max(...detections.map(d => d.speed ?? 0)) : 0;
  const avgHeight = n ? Math.round(detections.reduce((s,d) => s+(d.height??0), 0)/n) : 0;
  const maxHeight = n ? Math.max(...detections.map(d => d.height ?? 0)) : 0;
  const avgDist   = n ? Math.round(detections.reduce((s,d) => s+(d.estimated_distance_m??0), 0)/n) : 0;
  const minDist   = n ? Math.min(...detections.map(d => d.estimated_distance_m ?? 9999)) : 0;
  const avgRssi   = n ? parseFloat((detections.reduce((s,d) => s+(d.rssi_dbm??0), 0)/n).toFixed(1)) : 0;
  const avgSnr    = n ? parseFloat((detections.reduce((s,d) => s+(d.snr_db??0), 0)/n).toFixed(1)) : 0;
  const sorted_t  = [...detections].sort((a,b) => new Date(a.datetime)-new Date(b.datetime));
  const firstSeen = sorted_t[0]?.datetime ?? null;
  const lastSeen  = latest?.datetime ?? null;
  const detectorIds = [...new Set(detections.map(d => d.detector_id))];
  const uniqueFreqs = [...new Set(detections.map(d => d.freq).filter(Boolean))].sort().join(', ');
  const protocols   = [...new Set(detections.map(d => d.protocol_name).filter(Boolean))].join(', ');
  const directions  = [...new Set(detections.map(d => d.direction).filter(Boolean))];
  const topDir      = directions.length === 1 ? directions[0] : (latest?.direction ?? dirLabel(latest?.aoa_degrees) ?? '—');
  const hasGps      = latest?.has_gps;
  const registered  = latest?.registered;

  // ── field component ─────────────────────────────────────────────────────────
  const F = ({ label, value, color, span }) => (
    <div style={{
      background:'#1a1a1a', border:'1px solid #262626', borderRadius:8,
      padding:'9px 13px', gridColumn: span ? 'span 2' : undefined,
    }}>
      <div style={{ fontSize:7.5, color:'#4a4a4a', textTransform:'uppercase', letterSpacing:'0.13em', marginBottom:5, fontFamily:'monospace' }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color: color ?? '#c8c8c8', lineHeight:1.2 }}>{value ?? '—'}</div>
    </div>
  );

  const Divider = ({ label }) => (
    <div style={{ display:'flex', alignItems:'center', gap:8, margin:'2px 0' }}>
      <div style={{ flex:1, height:1, background:'#222' }} />
      <span style={{ fontSize:8, color:'#3a3a3a', textTransform:'uppercase', letterSpacing:'0.12em', fontFamily:'monospace' }}>{label}</span>
      <div style={{ flex:1, height:1, background:'#222' }} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75"
         onClick={onClose} style={{ backdropFilter:'blur(3px)' }}>
      <div onClick={e => e.stopPropagation()}
           style={{ background:'#131313', border:'1px solid #252525', borderRadius:16,
                    width:420, maxWidth:'93vw', maxHeight:'92vh',
                    display:'flex', flexDirection:'column',
                    boxShadow:'0 40px 100px rgba(0,0,0,0.85)' }}>

        {/* ── Header ── */}
        <div style={{ background:'#191919', borderBottom:'1px solid #252525', padding:'15px 18px',
                      display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexShrink:0, borderRadius:'16px 16px 0 0' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:5 }}>
              <span style={{ fontSize:21, fontWeight:800, fontFamily:'monospace', letterSpacing:'0.04em', color: gc }}>{droneId}</span>
              {latest?.threat && (
                <span style={{ fontSize:7.5, fontWeight:800, padding:'3px 9px', borderRadius:4,
                               background:`${tc}1e`, color:tc, border:`1px solid ${tc}55`, letterSpacing:'0.1em' }}>
                  {latest.threat} THREAT
                </span>
              )}
            </div>
            <div style={{ fontSize:10, color:'#555', fontFamily:'monospace' }}>{latest?.model ?? '—'}</div>
          </div>
          <button onClick={onClose} className="hover:text-white transition-colors"
                  style={{ background:'none', border:'none', color:'#505050',
                           fontSize:18, cursor:'pointer', lineHeight:1, padding:'2px 4px', marginTop:2 }}>✕</button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding:'14px 18px 10px', overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>

          {/* Identity */}
          <Divider label="Identity" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            <F label="Detections"  value={n}              color="#ffffff" />
            <F label="Group"       value={latest?.group}  color={gc} />
            <F label="Subgroup"    value={latest?.subgroup} />
            <F label="Registered"  value={registered == null ? '—' : registered ? '✓ Yes' : '✗ No'}
               color={registered == null ? '#555' : registered ? '#34d399' : '#ef4444'} />
          </div>

          {/* Flight */}
          <Divider label="Flight Data" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            <F label="Max Height"   value={`${maxHeight} m`} />
            <F label="Avg Height"   value={`${avgHeight} m`} />
            <F label="Max Speed"    value={`${maxSpeed} m/s`} />
            <F label="Avg Speed"    value={`${avgSpeed} m/s`} />
          </div>

          {/* Signal */}
          <Divider label="Signal" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            <F label="Avg RSSI"     value={`${avgRssi} dBm`} color="#a78bfa" />
            <F label="Avg SNR"      value={`${avgSnr} dB`}   color="#a78bfa" />
            <F label="Protocol"     value={protocols || '—'} />
            <F label="Frequency"    value={uniqueFreqs ? `${uniqueFreqs} MHz` : '—'} />
          </div>

          {/* Detection */}
          <Divider label="Detection" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            <F label="Direction"    value={topDir} />
            <F label="Min Distance" value={minDist < 9999 ? `${minDist} m` : '—'} color="#f97316" />
            <F label="Avg Distance" value={`${avgDist} m`} />
            <F label="Has GPS"      value={hasGps == null ? '—' : hasGps ? '✓ Yes' : '✗ No'}
               color={hasGps == null ? '#555' : hasGps ? '#34d399' : '#ef4444'} />
          </div>

          {/* Detectors */}
          {detectorIds.length > 0 && <>
            <Divider label="Detectors" />
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {detectorIds.map(id => {
                const cnt = detections.filter(d => d.detector_id === id).length;
                return (
                  <div key={id} style={{ padding:'4px 10px', borderRadius:20, fontSize:10,
                                         fontWeight:700, fontFamily:'monospace',
                                         background:'rgba(59,130,246,0.10)', color:'#60a5fa',
                                         border:'1px solid rgba(59,130,246,0.28)' }}>
                    {id} <span style={{ opacity:0.6 }}>×{cnt}</span>
                  </div>
                );
              })}
            </div>
          </>}

          {/* Timestamps */}
          <Divider label="Timeline" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            <F label="First Seen" value={firstSeen ? formatDate(firstSeen) : '—'} color="#888" />
            <F label="Last Seen"  value={lastSeen  ? formatDate(lastSeen)  : '—'} color="#888" />
          </div>

          <div style={{ height:4 }} />
        </div>

        {/* ── Footer ── */}
        <div style={{ padding:'0 18px 16px', flexShrink:0 }}>
          <button onClick={onClose} className="hover:bg-[#2c2c2c] hover:text-white transition-colors"
                  style={{ width:'100%', padding:'11px', borderRadius:8,
                           background:'#1e1e1e', border:'1px solid #303030',
                           color:'#999', fontSize:12, fontWeight:700,
                           cursor:'pointer', letterSpacing:'0.05em', fontFamily:'monospace' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
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
    if (search)            arr = arr.filter(d => d.drone_id.toLowerCase().includes(search.toLowerCase()) || d.model.toLowerCase().includes(search.toLowerCase()));
    if (groupF  !== 'ALL') arr = arr.filter(d => d.group  === groupF);
    if (threatF !== 'ALL') arr = arr.filter(d => d.threat === threatF);
    return [...arr].sort((a, b) => sort.dir * (String(a[sort.key]) < String(b[sort.key]) ? -1 : 1));
  }, [droneStats, sort, search, groupF, threatF]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER));
  const slice = sorted.slice((page - 1) * PER, page * PER);

  const th = (key, label) => (
    <th key={key} className="px-3 py-2 text-left text-[9px] font-bold text-[#666] uppercase tracking-wider cursor-pointer hover:text-[#aaa] whitespace-nowrap select-none"
        onClick={() => { setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 })); setPage(1); }}>
      {label} {sort.key === key ? (sort.dir === -1 ? '↓' : '↑') : ''}
    </th>
  );

  return (
    <>
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <input type="text" placeholder="Search drone ID / model…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-[#141414] border border-[#3a3a3a] rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-white outline-none focus:border-orange-500" />
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#555]" />
        </div>
        {[['groupF', setGroupF, groupF, [['ALL','All Groups'],['GA','GA'],['GB','GB']]],
          ['threatF', setThreatF, threatF, [['ALL','All Threats'],['HIGH','HIGH'],['MEDIUM','MEDIUM'],['LOW','LOW']]]
        ].map(([, setter, val, opts]) => (
          <select key={val} value={val} onChange={e => { setter(e.target.value); setPage(1); }}
            className="bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-[10px] text-white outline-none">
            {opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <span className="text-[9px] text-[#555] font-mono ml-auto">{sorted.length} drones</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#222]">
        <table className="w-full text-left border-collapse" style={{ minWidth: '720px' }}>
          <thead className="bg-[#1a1a1a] border-b border-[#2a2a2a] sticky top-0 z-10">
            <tr>
              {th('drone_id','Drone ID')}{th('model','Model')}{th('group','Group')}{th('detections','Events')}
              {th('threat','Threat')}{th('maxHeight','Max H')}{th('maxSpeed','Max Spd')}{th('avgSpeed','Avg Spd')}
              {th('protocols','Protocol')}
              <th className="px-3 py-2 text-[9px] font-bold text-[#666] uppercase">Dirs</th>
              {th('firstSeen','First Seen')}{th('lastSeen','Last Seen')}
            </tr>
          </thead>
          <tbody>
            {slice.map(d => {
              const tc = THREAT_COLOR[d.threat] ?? '#888';
              const gc = d.group === 'GA' ? GA : GB;
              return (
                <tr key={d.drone_id} className="border-b border-[#1a1a1a] hover:bg-[#1c1c1c] cursor-pointer transition-colors" onClick={() => onDroneClick(d.drone_id)}>
                  <td className="px-3 py-2 text-[10px] font-mono font-bold" style={{ color: gc }}>{d.drone_id}</td>
                  <td className="px-3 py-2 text-[10px] text-[#ccc] whitespace-nowrap">{d.model}</td>
                  <td className="px-3 py-2"><span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background:`${gc}22`, color:gc, border:`1px solid ${gc}44` }}>{d.group}</span></td>
                  <td className="px-3 py-2 text-[10px] font-mono font-bold text-white">{d.detections}</td>
                  <td className="px-3 py-2"><span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ background:`${tc}22`, color:tc }}>{d.threat}</span></td>
                  <td className="px-3 py-2 text-[10px] font-mono text-[#888]">{d.maxHeight} m</td>
                  <td className="px-3 py-2 text-[10px] font-mono text-[#888]">{d.maxSpeed} m/s</td>
                  <td className="px-3 py-2 text-[10px] font-mono text-[#888]">{d.avgSpeed} m/s</td>
                  <td className="px-3 py-2 text-[9px] text-[#666]">{d.protocols.join(', ') || '—'}</td>
                  <td className="px-3 py-2 text-[9px] font-mono text-[#666]">{d.directions.join(' ') || '—'}</td>
                  <td className="px-3 py-2 text-[9px] font-mono text-[#555] whitespace-nowrap">{formatDate(d.firstSeen)}</td>
                  <td className="px-3 py-2 text-[9px] font-mono text-[#555] whitespace-nowrap">{formatDate(d.lastSeen)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-[10px] px-3 py-1 rounded border border-[#333] text-[#888] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">← Prev</button>
          <span className="text-[9px] text-[#555] font-mono">Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="text-[10px] px-3 py-1 rounded border border-[#333] text-[#888] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">Next →</button>
        </div>
      )}
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function EventLog({ events, isLoading, currentPage, setCurrentPage, onSearch, defaultStartDate, defaultEndDate }) {
  const [selectedDroneId, setSelectedDroneId] = useState(null);
  const [startDate, setStartDate] = useState(defaultStartDate ?? '');
  const [endDate,   setEndDate]   = useState(defaultEndDate   ?? '');
  const droneStats = useMemo(() => buildDroneStats(events), [events]);

  const handleSearch = () => {
    if (onSearch) onSearch({ startDate, endDate });
  };

  return (
    <>
      {selectedDroneId && (
        <DroneHistoryPanel droneId={selectedDroneId} allEvents={events} onClose={() => setSelectedDroneId(null)} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a]">
        {/* Date range search bar */}
        <div className="flex-none border-b border-[#2a2a2a] bg-[#111] px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <span className="text-[9px] text-[#555] uppercase tracking-widest font-bold whitespace-nowrap">Date Range</span>
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2.5 py-1 text-[11px] text-white outline-none focus:border-orange-500 transition-colors" />
            <span className="text-[10px] text-[#444]">—</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2.5 py-1 text-[11px] text-white outline-none focus:border-orange-500 transition-colors" />
            <button onClick={handleSearch} disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
              style={{ background: '#1a1a1a', border: '1px solid #3a3a3a', color: '#aaa' }}>
              {isLoading
                ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Searching…</>
                : <><SearchIcon className="w-3 h-3 text-orange-400" />Search</>}
            </button>
          </div>
        </div>
        <Toolbar>
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-white">Drone Intelligence</span>
            <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background:'#1e1e1e', color:GA, border:'1px solid rgba(249,115,22,0.3)' }}>
              {droneStats.length} drones
            </span>
          </div>
          <span className="text-[10px] text-[#444] ml-1">Click a row to see 7-day history</span>
          <button onClick={() => exportCSV(events)} disabled={!events.length}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-[#ccc] rounded-md transition-all disabled:opacity-30"
            style={{ background:'#1e1e1e', border:'1px solid #3a3a3a' }}>
            <DownloadIcon className="w-3 h-3" />
            Export CSV
          </button>
        </Toolbar>

        <div className="flex-1 overflow-auto p-4">
          {isLoading
            ? <Spinner />
            : droneStats.length === 0
            ? <div className="p-10 text-center text-[#555] text-sm">No drone data found</div>
            : <DroneIntelTable droneStats={droneStats} onDroneClick={setSelectedDroneId} />}
        </div>
      </div>
    </>
  );
}