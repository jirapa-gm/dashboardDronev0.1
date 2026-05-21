import { useState, useMemo, useEffect, useRef } from 'react';
import { GA, GB } from '../shared/constants';
import { distColor } from '../shared/helpers';
import { SignalIcon } from '../shared/icons';
import { Spinner, GroupTabs, Toolbar } from '../shared/ui';

// ── Signal stat cell ──────────────────────────────────────────────────────────
function Stat({ label, value, color }) {
  return (
    <div>
      <div className="text-[7px] text-[#444] uppercase">{label}</div>
      <div className="text-[9px] font-mono font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

// ── Proximity bar card ─────────────────────────────────────────────────────────
function ProximityBar({ evt }) {
  const dist       = evt.estimated_distance_m ?? 999;
  const pct        = Math.max(0, Math.min(100, ((1000 - dist) / 1000) * 100));
  const isCritical = dist < 100;
  const gc         = evt.group === 'GA' ? GA : GB;
  const zc         = distColor(dist);

  const rssiColor = (v) => (v ?? 0) > -65 ? '#22c55e' : (v ?? 0) > -75 ? '#f97316' : '#ef4444';
  const snrColor  = (v) => (v ?? 0) > 20  ? '#22c55e' : (v ?? 0) > 12  ? '#f97316' : '#ef4444';

  return (
    <div className="bg-[#111] rounded-xl p-3 transition-all"
         style={{ border: `1px solid ${isCritical ? 'rgba(239,68,68,0.5)' : '#2a2a2a'}`, boxShadow: isCritical ? '0 0 20px rgba(239,68,68,0.15)' : 'none' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold" style={{ color: gc }}>{evt.drone_id}</span>
          {isCritical && <span className="text-[8px] px-1.5 py-0.5 rounded font-bold animate-pulse" style={{ background:'rgba(239,68,68,0.2)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.4)' }}>⚠ TOO CLOSE!</span>}
        </div>
        <span className="text-[11px] font-bold font-mono" style={{ color: zc }}>{dist} m</span>
      </div>

      <div className="h-2.5 rounded-full overflow-hidden relative" style={{ background: '#1a1a1a' }}>
        {[100, 300, 600].map(v => (
          <div key={v} className="absolute top-0 h-full w-px z-10" style={{ left: `${((1000 - v) / 1000) * 100}%`, background: '#2a2a2a' }} />
        ))}
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: zc }} />
        {isCritical && <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: 'rgba(239,68,68,0.25)' }} />}
      </div>

      <div className="flex justify-between mt-1 px-0.5">
        {[['FAR','#22c55e'],['OK','#eab308'],['NEAR','#f97316'],['CRITICAL','#ef4444']].map(([l,c]) => (
          <span key={l} className="text-[7px] font-bold" style={{ color: c }}>{l}</span>
        ))}
      </div>

      <div className="flex gap-3 mt-2 pt-2 border-t border-[#1a1a1a]">
        <Stat label="RSSI"     value={`${evt.rssi_dbm ?? '—'} dBm`} color={rssiColor(evt.rssi_dbm)} />
        <Stat label="SNR"      value={`${evt.snr_db ?? '—'} dB`}    color={snrColor(evt.snr_db)} />
        <Stat label="Alt"      value={`${evt.height} m`}             color="#888" />
        <Stat label="Protocol" value={evt.protocol_name ?? '—'}      color="#888" />
      </div>
    </div>
  );
}

// ── Signal quality line chart ─────────────────────────────────────────────────
function SignalChart({ droneId, dataPoints, color }) {
  if (!dataPoints?.length) return null;

  const rssiVals = dataPoints.map(d => d.rssi_dbm ?? -90);
  const snrVals  = dataPoints.map(d => d.snr_db ?? 0);
  const n        = dataPoints.length;

  const W=500, H=120, PL=36, PR=8, PT=12, PB=28;
  const cW = W-PL-PR, cH = H-PT-PB;
  const rssiMin=-100, rssiMax=-40, snrMin=0, snrMax=35;

  const xOf   = i => PL + (n <= 1 ? cW/2 : (i/(n-1))*cW);
  const yRssi = v => PT + cH - ((v-rssiMin)/(rssiMax-rssiMin))*cH;

  const mkPath = (vals, yFn) => vals.map((v,i) => `${i===0?'M':'L'}${xOf(i).toFixed(1)},${yFn(v).toFixed(1)}`).join(' ');
  const mkArea = (vals, yFn) => {
    const pts = vals.map((v,i) => `${xOf(i).toFixed(1)},${yFn(v).toFixed(1)}`).join(' L');
    return `M${xOf(0).toFixed(1)},${(PT+cH).toFixed(1)} L${pts} L${xOf(n-1).toFixed(1)},${(PT+cH).toFixed(1)} Z`;
  };

  const latestRssi = rssiVals[n-1];
  const trend      = n > 1 ? (latestRssi > rssiVals[n-2] ? '↑ Approaching' : '↓ Retreating') : '—';
  const trendColor = trend.startsWith('↑') ? '#ef4444' : '#22c55e';

  // Map SNR onto RSSI axis scale for overlay
  const snrMapped = snrVals.map(v => snrMin + v * ((rssiMax-rssiMin)/snrMax) + rssiMin);

  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span className="text-[10px] font-mono font-bold" style={{ color }}>{droneId}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold" style={{ color: trendColor }}>{trend}</span>
          <span className="text-[8px] text-[#444] font-mono">{n} samples</span>
        </div>
      </div>

      <div className="flex items-center gap-4 px-3 pt-2">
        {[[color,'RSSI (dBm)',false],['#38bdf8','SNR (dB)',true]].map(([c,l,dash]) => (
          <div key={l} className="flex items-center gap-1.5">
            <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke={c} strokeWidth="2" strokeDasharray={dash?'4 2':'0'} strokeLinecap="round"/></svg>
            <span className="text-[8px] text-[#666]">{l}</span>
          </div>
        ))}
        <span className="text-[8px] text-[#444] ml-auto font-mono">RSSI: {latestRssi} dBm</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:`${H}px` }}>
        <defs>
          <linearGradient id={`rg_${droneId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.2"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>

        {[-40,-60,-80,-100].map(v => (
          <g key={v}>
            <line x1={PL} y1={yRssi(v)} x2={W-PR} y2={yRssi(v)} stroke="#1a1a1a" strokeWidth="1"/>
            <text x={PL-3} y={yRssi(v)+3} textAnchor="end" fill="#333" fontSize="7" fontFamily="monospace">{v}</text>
          </g>
        ))}

        <rect x={PL} y={yRssi(-100)} width={cW} height={yRssi(-80)-yRssi(-100)} fill="rgba(239,68,68,0.05)"/>
        <line x1={PL} y1={yRssi(-80)} x2={W-PR} y2={yRssi(-80)} stroke="rgba(239,68,68,0.2)" strokeWidth="1" strokeDasharray="4 3"/>

        <path d={mkArea(rssiVals, yRssi)} fill={`url(#rg_${droneId})`}/>
        <path d={mkPath(snrMapped, yRssi)} fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="5 3" strokeLinecap="round"/>
        <path d={mkPath(rssiVals, yRssi)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {n > 0 && <circle cx={xOf(n-1).toFixed(1)} cy={yRssi(rssiVals[n-1]).toFixed(1)} r="4" fill={color} stroke="#111" strokeWidth="1.5"/>}

        {dataPoints.map((d,i) => {
          if (i % Math.max(1, Math.floor(n/6)) !== 0 && i !== n-1) return null;
          return <text key={i} x={xOf(i).toFixed(1)} y={H-8} textAnchor="middle" fill="#333" fontSize="7" fontFamily="monospace">{d.datetime.slice(11,16)}</text>;
        })}

        <line x1={PL} y1={PT}    x2={PL}    y2={PT+cH} stroke="#2a2a2a" strokeWidth="1"/>
        <line x1={PL} y1={PT+cH} x2={W-PR}  y2={PT+cH} stroke="#2a2a2a" strokeWidth="1"/>
      </svg>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SignalAnalysis({ events, isLoading }) {
  const [groupFilter, setGroupFilter] = useState('ALL');
  const prevCloseRef = useRef(0);

  const filtered = groupFilter === 'ALL' ? events : events.filter(e => e.group === groupFilter);
  const closeCount = filtered.filter(e => (e.estimated_distance_m ?? 999) < 100).length;

  const byDrone = useMemo(() => {
    const map = {};
    [...filtered].sort((a,b) => a.datetime.localeCompare(b.datetime)).forEach(e => {
      if (!map[e.drone_id]) map[e.drone_id] = { color: e.group === 'GA' ? GA : GB, events: [] };
      map[e.drone_id].events.push(e);
    });
    return map;
  }, [filtered]);

  const sortedByDist = useMemo(() =>
    [...filtered].sort((a,b) => (a.estimated_distance_m ?? 9999) - (b.estimated_distance_m ?? 9999)),
  [filtered]);

  useEffect(() => { prevCloseRef.current = closeCount; }, [closeCount]);

  if (isLoading) return <Spinner />;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
      <Toolbar>
        <div className="flex items-center gap-2">
          <SignalIcon className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-bold text-white">Signal Analysis</span>
          {closeCount > 0 && (
            <span className="text-[9px] px-2 py-0.5 rounded font-bold animate-pulse" style={{ background:'rgba(239,68,68,0.2)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.4)' }}>
              🚨 Drone is too close! ({closeCount})
            </span>
          )}
        </div>
        <div className="ml-auto"><GroupTabs value={groupFilter} onChange={setGroupFilter} /></div>
      </Toolbar>

      <div className="p-4 flex flex-col gap-4">
        {closeCount > 0 && (
          <div className="rounded-xl p-4 flex items-center gap-3 animate-pulse" style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.4)' }}>
            <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center text-xl flex-none">🚨</div>
            <div>
              <div className="text-[11px] font-bold text-red-400">PROXIMITY ALERT — Drone is too close!</div>
              <div className="text-[9px] text-red-600 mt-0.5">{closeCount} โดรนบินเข้ามาภายใน 100 เมตร — ขอให้เจ้าหน้าที่ดำเนินการทันที</div>
            </div>
          </div>
        )}

        <section>
          <div className="text-[9px] font-bold text-[#555] uppercase tracking-widest mb-3">🎯 Proximity Monitor</div>
          <div className="flex flex-col gap-2">
            {sortedByDist.map((evt, i) => <ProximityBar key={evt.id ?? i} evt={evt} />)}
          </div>
        </section>

        <section>
          <div className="text-[9px] font-bold text-[#555] uppercase tracking-widest mb-3">📶 Signal Quality — RSSI / SNR</div>
          <div className="flex flex-col gap-3">
            {Object.entries(byDrone).map(([droneId, { color, events: evts }]) => (
              <SignalChart key={droneId} droneId={droneId} dataPoints={evts} color={color} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}