import { useState, useMemo } from 'react';
import { GA, GB, THREAT_COLOR } from '../shared/constants';
import { getProtocolThreat } from '../shared/helpers';
import { AlertIcon, SearchIcon } from '../shared/icons';
import { Spinner, EmptyState, GroupTabs, Toolbar } from '../shared/ui';

// ── helpers ───────────────────────────────────────────────────────────────────
const isCriticalProto = p => { const n = (p ?? '').toUpperCase(); return n.includes('DIY') || n.includes('FPV') || n === 'UNKNOWN'; };
const isCautionProto  = p => { const n = (p ?? '').toUpperCase(); return n.includes('OCUSYNC') || n.includes('DJI') || n.includes('LIGHTBRIDGE'); };

// ── Altitude gauge ────────────────────────────────────────────────────────────
function AltitudeGauge({ altitude, maxAlt = 200 }) {
  const pct        = Math.min(altitude / maxAlt, 1);
  const gaugeColor = pct <= 0.10 ? '#22c55e' : pct <= 0.35 ? '#eab308' : pct <= 0.65 ? '#f97316' : '#ef4444';
  const H=180, W=36, bX=10, bW=16, bH=148, bY=10;
  const fillH = bH*pct, fillY = bY+bH-fillH, needle = bY+bH-bH*pct;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[8px] text-[#555] uppercase tracking-widest mb-1">Altitude</div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="altFill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%"   stopColor="#22c55e"/>
            <stop offset="35%"  stopColor="#eab308"/>
            <stop offset="65%"  stopColor="#f97316"/>
            <stop offset="100%" stopColor="#ef4444"/>
          </linearGradient>
        </defs>
        <rect x={bX} y={bY} width={bW} height={bH} rx="3" fill="#1e1e1e" stroke="#2a2a2a" strokeWidth="1"/>
        <rect x={bX} y={fillY} width={bW} height={fillH} rx="2" fill="url(#altFill)" opacity="0.85"/>
        <polygon points={`${bX-4},${needle} ${bX},${needle-4} ${bX},${needle+4}`} fill={gaugeColor}/>
        {[0,50,100,150,200].map(v => {
          const y = bY+bH-bH*(v/maxAlt);
          return <g key={v}>
            <line x1={bX+bW} y1={y} x2={bX+bW+4} y2={y} stroke="#3a3a3a" strokeWidth="1"/>
            <text x={bX+bW+6} y={y+3} fontSize="6" fill="#444" fontFamily="monospace">{v}</text>
          </g>;
        })}
      </svg>
      <div className="text-base font-bold font-mono" style={{ color: gaugeColor }}>{altitude}m</div>
    </div>
  );
}

// ── Drone profile card ────────────────────────────────────────────────────────
function DroneProfileCard({ evt, isSelected, onSelect }) {
  const proto = getProtocolThreat(evt.protocol_name);
  const gc    = evt.group === 'GA' ? GA : GB;
  const tc    = THREAT_COLOR[evt.threat] ?? '#888';

  const details = [
    ['Height', `${evt.height} m`],          ['Speed',  `${evt.speed} m/s`],
    ['RSSI',   `${evt.rssi_dbm ?? '—'} dBm`], ['SNR',   `${evt.snr_db ?? '—'} dB`],
    ['Dist.',  `${evt.estimated_distance_m ?? '—'} m`],
    ['GPS',    evt.has_gps ? 'Yes' : `No · ${evt.aoa_degrees ?? '—'}°`],
    ['Det.',   evt.detector_id],             ['Time',   evt.datetime.slice(11,16)],
  ];

  return (
    <div onClick={onSelect} className="rounded-xl border cursor-pointer transition-all p-3"
         style={{ background: isSelected ? proto.bg : '#111', borderColor: isSelected ? proto.color : '#2a2a2a', boxShadow: isSelected ? `0 0 16px ${proto.color}33` : 'none' }}>

      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-[11px] font-mono font-bold text-white">{evt.drone_id}</div>
          <div className="text-[9px] text-[#555]">{evt.model}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background:`${gc}20`, color:gc, border:`1px solid ${gc}40` }}>{evt.group}</span>
          <span className="text-[7px] px-1.5 py-0.5 rounded font-bold"      style={{ background:`${tc}18`, color:tc }}>{evt.threat}</span>
        </div>
      </div>

      <div className="rounded-lg px-2.5 py-2 mb-2 flex items-center gap-2" style={{ background:proto.bg, border:`1px solid ${proto.color}40` }}>
        <div className="flex flex-col gap-0.5 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-bold" style={{ color:proto.color }}>
              {proto.level === 'CRITICAL' ? '🔴' : proto.level === 'CAUTION' ? '🟠' : '🟢'}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color:proto.color }}>{proto.level}</span>
            {proto.blink && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-none"/>}
          </div>
          <div className="text-[8px]" style={{ color:proto.color }}>{proto.label}</div>
        </div>
        <div className="text-[8px] font-mono font-bold" style={{ color:proto.color }}>{evt.protocol_name}</div>
      </div>

      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-[10px]">{evt.registered ? '🟢' : '🔴'}</span>
        <span className="text-[9px] font-bold" style={{ color: evt.registered ? '#22c55e' : '#ef4444' }}>
          {evt.registered ? 'พันธมิตร / ขึ้นทะเบียนแล้ว' : 'แปลกปลอม / ไม่ระบุตัวตน'}
        </span>
      </div>

      {isSelected && (
        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-[#1e1e1e] mt-1">
          {details.map(([k,v]) => (
            <div key={k} className="bg-[#0d0d0d] rounded-lg px-2 py-1.5">
              <div className="text-[7px] text-[#444] uppercase">{k}</div>
              <div className="text-[9px] font-mono text-[#888]">{v}</div>
            </div>
          ))}
          <div className="col-span-2 flex items-center justify-center">
            <AltitudeGauge altitude={evt.height} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Threat summary stacked bar ────────────────────────────────────────────────
function ThreatSummary({ events }) {
  const critical = events.filter(e => isCriticalProto(e.protocol_name)).length;
  const caution  = events.filter(e => isCautionProto(e.protocol_name)).length;
  const low      = events.length - critical - caution;
  const total    = events.length || 1;

  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
      <div className="text-[9px] font-bold text-[#555] uppercase tracking-widest mb-3">Overall Threat Level</div>
      <div className="h-3 rounded-full overflow-hidden flex mb-2">
        <div style={{ width:`${(critical/total)*100}%`, background:'#ef4444' }}/>
        <div style={{ width:`${(caution /total)*100}%`, background:'#f97316' }}/>
        <div style={{ width:`${(low     /total)*100}%`, background:'#22c55e' }}/>
      </div>
      <div className="flex gap-4">
        {[['🔴 Critical / DIY', critical,'#ef4444'],['🟠 Caution / Commercial', caution,'#f97316'],['🟢 Low', low,'#22c55e']].map(([l,v,c]) => (
          <div key={l} className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold font-mono" style={{ color:c }}>{v}</span>
            <span className="text-[8px] text-[#555]">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SituationPanel({ events, isLoading }) {
  const [selectedId,   setSelectedId]   = useState(null);
  const [groupFilter,  setGroupFilter]  = useState('ALL');
  const [search,       setSearch]       = useState('');

  const filtered = useMemo(() => {
    let evts = groupFilter === 'ALL' ? events : events.filter(e => e.group === groupFilter);
    if (search) evts = evts.filter(e =>
      e.drone_id.toLowerCase().includes(search.toLowerCase()) ||
      (e.protocol_name ?? '').toLowerCase().includes(search.toLowerCase())
    );
    return [...evts].sort((a,b) => (isCriticalProto(a.protocol_name) ? 0 : 1) - (isCriticalProto(b.protocol_name) ? 0 : 1));
  }, [events, groupFilter, search]);

  const criticalCount = events.filter(e => isCriticalProto(e.protocol_name)).length;

  if (isLoading) return <Spinner label="Loading situation…" />;
  if (!events.length) return <EmptyState icon="🛡️" message="ไม่มีข้อมูลสถานการณ์" />;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
      <Toolbar>
        <div className="flex items-center gap-2">
          <AlertIcon className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-bold text-white">Situation</span>
          {criticalCount > 0 && (
            <span className="text-[9px] px-2 py-0.5 rounded font-bold animate-pulse" style={{ background:'rgba(239,68,68,0.2)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.4)' }}>
              🔴 {criticalCount} CRITICAL
            </span>
          )}
        </div>
        <div className="ml-auto"><GroupTabs value={groupFilter} onChange={setGroupFilter} /></div>
      </Toolbar>

      <div className="p-4 flex flex-col gap-4">
        <ThreatSummary events={events} />

        <div className="relative">
          <input type="text" placeholder="Search drone ID / protocol…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg pl-8 pr-8 py-2 text-[11px] text-white outline-none focus:border-orange-500 transition-colors"/>
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#555]" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-[#444]">{filtered.length}</span>
        </div>

        <div className="flex flex-col gap-3">
          {filtered.map((evt, i) => {
            const key = evt.id ?? i;
            return (
              <DroneProfileCard key={key} evt={evt}
                isSelected={selectedId === key}
                onSelect={() => setSelectedId(selectedId === key ? null : key)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}