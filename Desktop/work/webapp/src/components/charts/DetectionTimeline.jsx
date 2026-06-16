import { useState } from 'react';
import { AlertIcon } from '../../shared/icons';

// ── 7-day detection timeline ──────────────────────────────────────────────────
export function DetectionTimeline({ detections }) {
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

  const fmtTime = ms => {
    const min = Math.round(ms / 60000);
    if (min < 1) return '< 1 min';
    if (min < 60) return `${min} min`;
    return `${Math.floor(min/60)}h ${min%60}m`;
  };
  const fmtHHMM = ts => new Date(ts).toLocaleString('th-TH', { hour:'2-digit', minute:'2-digit' });
  const fmtDate = ts => new Date(ts).toLocaleString('th-TH', { month:'2-digit', day:'2-digit' });

  const totalMs = sessions.reduce((s, ss) => s + (ss.end - ss.start), 0);

  return (
    <div className="flex-col-start gap-1-5">
      <div className="text-label-dark-gray" style={{ fontSize: 9, fontWeight: 'bold' }}>7-Day Detection Timeline</div>

      {/* Timeline bar */}
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
          const dMs = s.end - s.start;
          return (
            <div style={{ position:'absolute', left:`${Math.min(x1,60)}%`, top:-52, background:'rgba(14,14,14,0.97)', border:'1px solid #333', borderRadius:7, padding:'5px 9px', zIndex:10, pointerEvents:'none', minWidth:150, boxShadow:'0 6px 20px rgba(0,0,0,0.7)' }}>
              <div style={{ fontSize:9, color:'#f97316', fontWeight:700, marginBottom:2, fontFamily:'monospace' }}>#{hover+1} · {fmtTime(dMs)}</div>
              <div style={{ fontSize:9, color:'#777', fontFamily:'monospace' }}>{fmtDate(s.start)} {fmtHHMM(s.start)} → {fmtHHMM(s.end)}</div>
              <div style={{ fontSize:9, color:'#666', marginTop:2 }}>Events: <b style={{ color:'#ccc' }}>{s.events.length}</b></div>
            </div>
          );
        })()}
      </div>

      <div style={{ height: 6 }} />

      <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight: '90px', overflowY: 'auto', paddingRight: '2px' }} className="no-scrollbar">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:9, color:'#555', textTransform:'uppercase', letterSpacing:'0.12em', fontFamily:'monospace', fontWeight:700 }}>Detection Sessions</span>
          <span style={{ fontSize:9, color:'#888', fontFamily:'monospace' }}>รวม {fmtTime(totalMs)}</span>
        </div>
        {sessions.map((s, i) => {
          const dMs   = s.end - s.start;
          const dMin  = Math.round(dMs / 60000);
          const isCrit = s.events.some(e => (e.estimated_distance_m ?? 999) < 100);
          const color  = isCrit ? '#ef4444' : '#f97316';
          const barW   = sessions.length > 1 ? Math.max((dMs / (sessions.reduce((a,b) => a + (b.end - b.start), 0) || 1)) * 100, 4) : 100;
          return (
            <div key={i} style={{ background:'#111', border:`1px solid ${color}22`, borderRadius:7, padding:'7px 10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }} />
                  <span style={{ fontSize:10, fontWeight:700, color:'#ccc', fontFamily:'monospace' }}>
                    {fmtDate(s.start)} {fmtHHMM(s.start)}
                    <span style={{ color:'#555', margin:'0 4px' }}>→</span>
                    {fmtHHMM(s.end)}
                  </span>
                </div>
                <span style={{ fontSize:13, fontWeight:800, color, fontFamily:'monospace' }}>
                  {dMin < 1 ? '< 1' : dMin} <span style={{ fontSize:9, fontWeight:500, color:'#666' }}>min</span>
                </span>
              </div>
              <div style={{ height:3, background:'#1e1e1e', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${barW}%`, background:color, borderRadius:2, opacity:0.7 }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                <span style={{ fontSize:8, color:'#555', fontFamily:'monospace' }}>{s.events.length} events · {[...s.detectors].length} detector{[...s.detectors].length>1?'s':''}</span>
                {isCrit && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: 8, color: '#ef4444', fontWeight: 700, padding: '2px 5px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px' }}>
                    <AlertIcon className="w-2.5 h-2.5" />
                    CLOSE RANGE
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
