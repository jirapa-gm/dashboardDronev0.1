import { useState, useMemo } from 'react';
import { THREAT_COLOR, GA, GB } from '../shared/constants';
import { dirLabel, formatDate } from '../shared/helpers';
import { SignalSparkline, DetectionTimeline } from './Charts';

export default function DroneHistoryPanel({ droneId, allEvents, onClose }) {
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
      <div style={{ fontSize:9, color:'#555', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:5, fontFamily:'monospace' }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:700, fontFamily:'monospace', color: color ?? '#c8c8c8', lineHeight:1.2 }}>{value ?? '—'}</div>
    </div>
  );

  const Divider = ({ label }) => (
    <div style={{ display:'flex', alignItems:'center', gap:8, margin:'4px 0' }}>
      <div style={{ flex:1, height:1, background:'#2a2a2a' }} />
      <span style={{ fontSize:9, color:'#666', textTransform:'uppercase', letterSpacing:'0.14em', fontFamily:'monospace', fontWeight:700 }}>{label}</span>
      <div style={{ flex:1, height:1, background:'#2a2a2a' }} />
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
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
          <button onClick={onClose} className="modal-close-btn">✕</button>
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

          {/* Detection sessions timeline */}
          <div style={{ marginTop:4 }}>
            <DetectionTimeline detections={detections} />
          </div>

          {/* RSSI sparkline */}
          {detections.length >= 2 && (
            <div style={{ marginTop:2 }}>
              <SignalSparkline detections={detections} width={360} height={40} />
            </div>
          )}

          <div style={{ height:4 }} />
        </div>

        {/* ── Footer ── */}
        <div style={{ padding:'0 18px 16px', flexShrink:0 }}>
          <button onClick={onClose} className="modal-action-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
