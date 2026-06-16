import './DroneTables.css';
import { useState, useMemo } from 'react';
import { THREAT_COLOR, GA, GB } from '../shared/constants';
import { dirLabel, formatDate } from '../shared/helpers';
import { SignalSparkline } from "./charts/SignalSparkline";
import { DetectionTimeline } from "./charts/DetectionTimeline";

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

  // ── SVGs for field icons ──────────────────────────────────────────────────
  const icons = {
    detections: `<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    group: `<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    subgroup: `<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    reg: `<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    height: `<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`,
    speed: `<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    rssi: `<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h.01"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 13a10 10 0 0 1 14 0"/><path d="M1.5 9.5a15 15 0 0 1 21 0"/></svg>`,
    snr: `<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    proto: `<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    freq: `<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M10.3 16.1a6 6 0 0 1 3.4 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
    dir: `<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
    dist: `<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    gps: `<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    clock: `<svg style="width:11px;height:11px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    drone: `<svg style="width:15px;height:15px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a1 1 0 0 1 .894.553l3 6A1 1 0 0 1 15 10h-1v2h4a1 1 0 0 1 0 2h-4v2h1a1 1 0 0 1 .894 1.447l-3 6a1 1 0 0 1-1.788 0l-3-6A1 1 0 0 1 9 16h1v-2H6a1 1 0 0 1 0-2h4v-2H9a1 1 0 0 1-.894-1.447l3-6A1 1 0 0 1 12 2z"/></svg>`
  };

  // ── field component ─────────────────────────────────────────────────────────
  const F = ({ label, value, color, icon, span }) => {
    const themeStyles = color ? {
      '--theme-color': color,
      '--theme-glow': `${color}26`, // ~15% opacity in hex
      '--theme-bg': `${color}0f`,   // ~6% opacity in hex
      '--theme-border': `${color}33`, // ~20% opacity
      '--theme-bg-hover': `${color}22`, // ~13% opacity
      '--theme-border-hover': `${color}55`, // ~33% opacity
    } : {};

    return (
      <div className="drone-stat-card" style={{
        gridColumn: span ? 'span 2' : undefined,
        ...themeStyles
      }}>
        {icon && (
          <div className="drone-stat-icon-wrapper" dangerouslySetInnerHTML={{ __html: icon }} />
        )}
        <div className="dh-stat-col">
          <div className="drone-stat-label">{label}</div>
          <div className="drone-stat-value" style={{
            fontFamily: typeof value === 'number' || (typeof value === 'string' && /\d/.test(value)) ? 'monospace' : 'system-ui, -apple-system, sans-serif',
            color: color ?? '#eee',
          }}>{value}</div>
        </div>
      </div>
    );
  };

  const Divider = ({ label }) => (
    <div className="dh-header-row">
      <span className="dh-header-label">{label}</span>
      <div className="dh-header-line" />
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="drone-modal-content" className="drone-modal-content dh-modal-content">

        {/* ── Header ── */}
        <div style={{ background:'rgba(25, 25, 25, 0.6)', borderBottom:'1px solid rgba(255, 255, 255, 0.06)', padding:'10px 16px',
                      display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, borderRadius:'16px 16px 0 0' }}>
          <div className="dh-modal-title-row">
            <div className="dh-modal-icon-box" style={{ color: gc }}>
              <div dangerouslySetInnerHTML={{ __html: icons.drone }} />
            </div>
            <div>
              <div className="dh-modal-id-row">
                <span className="dh-modal-id-text">{droneId}</span>
                {latest?.threat && (
                  <span style={{ fontSize:7.5, fontWeight:800, padding:'2px 8px', borderRadius:4,
                                 background:`${tc}1e`, color:tc, border:`1px solid ${tc}40`, letterSpacing:'0.05em' }}>
                    {latest.threat} THREAT
                  </span>
                )}
              </div>
              <div className="dh-modal-subtitle">{latest?.model ?? 'Unknown Model'}</div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <svg className="dh-modal-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="no-scrollbar" className="no-scrollbar dh-modal-body-scroll">
          <div className="drone-modal-grid">
            
            {/* Left Column: Drone Profile Stats & Info */}
            <div className="flex-col-start gap-2">
              {/* Identity */}
              <Divider label="Identity" />
              <div className="dh-grid-2col">
                <F label="Detections"  value={n}              color="#ffffff" icon={icons.detections} />
                <F label="Group"       value={latest?.group}  color={gc}      icon={icons.group} />
                <F label="Subgroup"    value={latest?.subgroup}                icon={icons.subgroup} />
                <F label="Registered"  value={registered ? 'Registered' : 'Unregistered'}
                   color={registered ? '#34d399' : '#ef4444'}
                   icon={icons.reg} />
              </div>

              {/* Flight */}
              <Divider label="Flight Data" />
              <div className="dh-grid-2col">
                <F label="Max Height"   value={`${maxHeight} m`}  icon={icons.height} />
                <F label="Avg Height"   value={`${avgHeight} m`}  icon={icons.height} />
                <F label="Max Speed"    value={`${maxSpeed} m/s`} icon={icons.speed} />
                <F label="Avg Speed"    value={`${avgSpeed} m/s`} icon={icons.speed} />
              </div>

              {/* Signal */}
              <Divider label="Signal & Protocol" />
              <div className="dh-grid-2col">
                <F label="Avg RSSI"     value={`${avgRssi} dBm`} color="#a78bfa" icon={icons.rssi} />
                <F label="Avg SNR"      value={`${avgSnr} dB`}   color="#c084fc" icon={icons.snr} />
                <F label="Protocol"     value={protocols || '—'}                 icon={icons.proto} />
                <F label="Frequency"    value={uniqueFreqs ? `${uniqueFreqs} MHz` : '—'} icon={icons.freq} />
              </div>

              {/* Location & Direction */}
              <Divider label="Location & Direction" />
              <div className="dh-grid-2col">
                <F label="Direction"    value={topDir}                            icon={icons.dir} />
                <F label="Min Distance" value={minDist < 9999 ? `${minDist} m` : '—'} color="#f97316" icon={icons.dist} />
                <F label="Avg Distance" value={`${avgDist} m`}                    icon={icons.dist} />
                <F label="GPS State"    value={hasGps ? 'GPS Active' : 'No GPS'}
                   color={hasGps ? '#34d399' : '#ef4444'}
                   icon={icons.gps} />
              </div>
            </div>

            {/* Right Column: Timelines, Charts & Detectors */}
            <div className="flex-col-start gap-2">
              {/* Detectors */}
              {detectorIds.length > 0 && (
                <>
                  <Divider label="Associated Detectors" />
                  <div className="detector-tag-container">
                    {detectorIds.map(id => {
                      const cnt = detections.filter(d => d.detector_id === id).length;
                      return (
                        <div key={id} className="detector-tag-badge">
                          {id} <span className="dh-array-item-count">×{cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Detection sessions timeline */}
              <Divider label="Activity Timeline" />
              <div className="drone-chart-card">
                <DetectionTimeline detections={detections} />
              </div>

              {/* RSSI sparkline */}
              {detections.length >= 2 && (
                <>
                  <Divider label="RSSI Signal Strength" />
                  <div className="drone-chart-card">
                    <SignalSparkline detections={detections} width={320} height={40} />
                  </div>
                </>
              )}

              {/* Time Log */}
              <Divider label="Time Log" />
              <div className="dh-grid-1col">
                <F label="First Seen" value={firstSeen ? formatDate(firstSeen) : '—'} color="#999" icon={icons.clock} />
                <F label="Last Seen"  value={lastSeen  ? formatDate(lastSeen)  : '—'} color="#999" icon={icons.clock} />
              </div>
            </div>
            
          </div>
          <div className="dh-spacer-4" />
        </div>

        {/* ── Footer ── */}
        <div className="dh-modal-footer">
          <button onClick={onClose} className="drone-modal-action-btn">
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
