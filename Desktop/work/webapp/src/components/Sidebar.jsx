import { useState, useMemo } from 'react';
import StatsPanel from './StatsPanel';
import { Collapsible, SectionHeader, Field } from '../shared/ui';
import { FilterIcon, GridIcon, LayersIcon, SearchIcon } from '../shared/icons';
import { GROUP_COLOR, MODEL_COLORS, THREAT_COLOR, DIR_LABELS } from '../shared/constants';
import { getProtocolColor, buildModelDist, buildDirDist } from '../shared/helpers';
import { mockGroupTree } from '../data/Mockdata';

// ── Summary shared helpers ────────────────────────────────────────────────────
function buildSummaryKpis(evts) {
  if (!evts.length) return [];
  const total        = evts.length;
  const uniq         = new Set(evts.map(e => e.drone_id)).size;
  const avgRssi      = (evts.reduce((s,e) => s+(e.rssi_dbm??0),0)/total).toFixed(1);
  const avgDist      = Math.round(evts.reduce((s,e) => s+(e.estimated_distance_m??0),0)/total);
  const critical     = evts.filter(e => { const p=(e.protocol_name??'').toUpperCase(); return p.includes('DIY')||p.includes('FPV')||p==='UNKNOWN'; }).length;
  const unregistered = evts.filter(e => !e.registered).length;
  return [
    { label:'Total Events',   value:total,            color:'#fff'    },
    { label:'Unique Drones',  value:uniq,             color:'#38bdf8' },
    { label:'Avg RSSI',       value:`${avgRssi} dBm`, color:'#a78bfa' },
    { label:'Avg Distance',   value:`${avgDist} m`,   color:'#34d399' },
    { label:'Critical Proto', value:critical,          color:'#ef4444' },
    { label:'Unregistered',  value:unregistered,      color:'#f97316' },
  ];
}

function SummaryHeader({ icon, title, badge, badgeColor, subtitle }) {
  return (
    <div className="px-5 py-3 border-b border-[#2a2a2a] bg-[#111] flex items-center gap-3 flex-none sticky top-0 z-10">
      {icon}
      <span className="text-base font-bold text-white">{title}</span>
      <span className="text-[11px] px-3 py-1 rounded-full font-bold"
            style={{ background:`${badgeColor}22`, color:badgeColor, border:`1px solid ${badgeColor}40` }}>{badge}</span>
      {subtitle && <span className="text-[11px] text-[#555] ml-auto">{subtitle}</span>}
    </div>
  );
}

function KpiStrip({ kpis }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {kpis.map(({ label, value, color }) => (
        <div key={label} className="bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3">
          <div className="text-[10px] text-[#555] uppercase tracking-widest mb-1">{label}</div>
          <div className="text-xl font-bold font-mono" style={{ color }}>{value ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}

// ── Donut chart (model distribution) ─────────────────────────────────────────
function ModelDonutChart({ data, colors }) {
  const [hovered, setHovered] = useState(null);
  if (!data.length) return null;
  const total = data.reduce((s,[,v]) => s+v, 0);
  const CX=80, CY=80, RO=68, RI=42;
  let cum = -Math.PI/2;
  const slices = data.slice(0,6).map(([label,count],i) => {
    const frac=count/total, angle=frac*2*Math.PI, start=cum; cum+=angle;
    const x1=CX+RO*Math.cos(start), y1=CY+RO*Math.sin(start);
    const x2=CX+RO*Math.cos(cum),   y2=CY+RO*Math.sin(cum);
    const xi1=CX+RI*Math.cos(cum),  yi1=CY+RI*Math.sin(cum);
    const xi2=CX+RI*Math.cos(start),yi2=CY+RI*Math.sin(start);
    const large=angle>Math.PI?1:0;
    const d=[`M ${x1.toFixed(2)} ${y1.toFixed(2)}`,`A ${RO} ${RO} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
             `L ${xi1.toFixed(2)} ${yi1.toFixed(2)}`,`A ${RI} ${RI} 0 ${large} 0 ${xi2.toFixed(2)} ${yi2.toFixed(2)}`,'Z'].join(' ');
    return { d, label, count, frac, color:colors[i%colors.length] };
  });
  const active = hovered!==null ? slices[hovered] : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 160 160" style={{ width:'160px', height:'160px', flexShrink:0 }}>
          {slices.map((s,i) => (
            <path key={s.label} d={s.d} fill={s.color} stroke="#0a0a0a" strokeWidth="2" opacity={hovered===null||hovered===i?1:0.35}
              style={{ transform:hovered===i?'scale(1.04)':'scale(1)', transformOrigin:'80px 80px', transition:'transform 0.15s ease', cursor:'pointer' }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
          ))}
          <text x="80" y="75" textAnchor="middle" fill={active?active.color:'#ccc'} fontSize="22" fontWeight="800" fontFamily="monospace">{active?active.count:total}</text>
          <text x="80" y="92" textAnchor="middle" fill="#555" fontSize="9" fontFamily="monospace">{active?'detections':'total'}</text>
        </svg>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {slices.map((s,i) => (
            <div key={s.label} className="flex items-center gap-2 cursor-pointer"
                 onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}
                 style={{ opacity:hovered===null||hovered===i?1:0.4, transition:'opacity 0.15s' }}>
              <div className="w-2.5 h-2.5 rounded-sm flex-none" style={{ background:s.color }}/>
              <span className="text-[11px] text-[#bbb] truncate flex-1">{s.label}</span>
              <span className="text-[11px] font-bold font-mono flex-none" style={{ color:s.color }}>{s.count}</span>
              <span className="text-[10px] text-[#555] flex-none">{(s.frac*100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex gap-px">
        {slices.map(s => <div key={s.label} style={{ width:`${s.frac*100}%`, background:s.color }}/>)}
      </div>
      <div className="flex justify-between text-[10px] text-[#444]">
        <span>Model spread</span><span>{data.length} models</span>
      </div>
    </div>
  );
}

// ── Direction rose ─────────────────────────────────────────────────────────────
function MiniDirRose({ dirData, color }) {
  const maxVal=Math.max(...dirData.map(d=>d.count),1), R=55, CX=68, CY=68, n=8;
  const pts=dirData.map((d,i) => { const a=(i/n)*2*Math.PI-Math.PI/2, r=(d.count/maxVal)*R; return `${(CX+r*Math.cos(a)).toFixed(1)},${(CY+r*Math.sin(a)).toFixed(1)}`; });
  const topDir=[...dirData].sort((a,b)=>b.count-a.count)[0];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[11px] font-bold text-[#666] uppercase tracking-widest">Direction of Origin</div>
      <svg viewBox="0 0 136 136" style={{ width:'140px', height:'140px' }}>
        {[.33,.67,1.0].map(p => <circle key={p} cx={CX} cy={CY} r={R*p} fill="none" stroke="#2a2a2a" strokeWidth="1" strokeDasharray="3 3"/>)}
        {dirData.map((_,i) => { const a=(i/n)*2*Math.PI-Math.PI/2; return <line key={i} x1={CX} y1={CY} x2={(CX+R*Math.cos(a)).toFixed(1)} y2={(CY+R*Math.sin(a)).toFixed(1)} stroke="#2a2a2a" strokeWidth="1"/>; })}
        <polygon points={pts.join(' ')} fill={`${color}22`} stroke={color} strokeWidth="2" strokeLinejoin="round"/>
        {dirData.map((d,i) => { if(!d.count) return null; const a=(i/n)*2*Math.PI-Math.PI/2, r=(d.count/maxVal)*R; return <circle key={i} cx={(CX+r*Math.cos(a)).toFixed(1)} cy={(CY+r*Math.sin(a)).toFixed(1)} r="4" fill={color} stroke="#0a0a0a" strokeWidth="1.5"/>; })}
        {DIR_LABELS.map((dir,i) => { const a=(i/n)*2*Math.PI-Math.PI/2, lr=R+12, isTop=dir===topDir?.dir&&topDir.count>0; return <text key={dir} x={(CX+lr*Math.cos(a)).toFixed(1)} y={(CY+lr*Math.sin(a)+4).toFixed(1)} textAnchor="middle" fill={isTop?color:'#555'} fontSize={isTop?'10':'9'} fontWeight={isTop?'800':'400'} fontFamily="monospace">{dir}</text>; })}
        <text x={CX} y={CY+4} textAnchor="middle" fill="#333" fontSize="8" fontFamily="monospace">ORIGIN</text>
      </svg>
      {topDir?.count>0 && <div className="text-center bg-[#111] rounded-lg px-3 py-1.5 border border-[#2a2a2a]"><span className="text-[11px] text-[#666]">Top: </span><span className="text-[13px] font-bold" style={{ color }}>{topDir.dir}</span><span className="text-[11px] text-[#555]"> ({topDir.count})</span></div>}
    </div>
  );
}

function ChartsRow({ modelDist, dirDist, color }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
        <div className="text-[12px] font-bold text-[#999] uppercase tracking-widest mb-4">🔵 Drone Models Detected</div>
        <ModelDonutChart data={modelDist} colors={MODEL_COLORS} />
      </div>
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5 flex flex-col items-center">
        <div className="text-[12px] font-bold text-[#999] uppercase tracking-widest mb-4 self-start">🧭 Most Detected Direction</div>
        <MiniDirRose dirData={dirDist} color={color} />
      </div>
    </div>
  );
}

function EmptyMsg({ label }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center"><div className="text-5xl mb-4">📡</div><div className="text-[#555] text-base">{label}</div></div>
    </div>
  );
}

// ── Breakdown table (shared by Group & Subgroup summaries) ────────────────────
function BreakdownTable({ headers, rows, color }) {
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#111] border-b border-[#1e1e1e]">
            <tr>{headers.map(h => <th key={h} className="px-4 py-2.5 text-[11px] font-bold text-[#666] uppercase whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const share = row.share;
              return (
                <tr key={i} className="border-b border-[#111] hover:bg-[#0e0e0e] transition-colors">
                  <td className="px-4 py-2.5"><span className="text-[12px] font-bold font-mono" style={{ color }}>{row.id}</span></td>
                  {row.name !== undefined && <td className="px-4 py-2.5 text-[11px] text-[#666]">{row.name}</td>}
                  <td className="px-4 py-2.5 text-[12px] font-mono text-[#bbb]">{row.count}</td>
                  <td className="px-4 py-2.5 text-[12px] font-mono text-[#38bdf8]">{row.drones}</td>
                  <td className="px-4 py-2.5">{row.highThreat>0?<span className="text-[11px] px-2 py-0.5 rounded font-bold" style={{ background:'#ef444418', color:'#ef4444' }}>{row.highThreat}</span>:<span className="text-[11px] text-[#444]">—</span>}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#222] rounded-full overflow-hidden" style={{ minWidth:60 }}>
                        <div style={{ width:`${share}%`, background:color, height:'100%', borderRadius:4 }}/>
                      </div>
                      <span className="text-[11px] font-mono text-[#555]">{share}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Group Summary ─────────────────────────────────────────────────────────────
export function GroupSummary({ groupId, events }) {
  const grpEvents = useMemo(() => events.filter(e => e.group === groupId), [events, groupId]);
  const modelDist = useMemo(() => buildModelDist(grpEvents), [grpEvents]);
  const dirDist   = useMemo(() => buildDirDist(grpEvents),   [grpEvents]);
  const color     = GROUP_COLOR[groupId] ?? '#f97316';
  const kpis      = useMemo(() => buildSummaryKpis(grpEvents), [grpEvents]);

  const breakdown = useMemo(() => {
    const map = {};
    grpEvents.forEach(e => {
      const k = e.subgroup ?? 'Unknown';
      if (!map[k]) map[k] = { subgroup:k, count:0, drones:new Set(), highThreat:0 };
      map[k].count++; map[k].drones.add(e.drone_id);
      if (e.threat==='HIGH') map[k].highThreat++;
    });
    return Object.values(map).map(d => ({ ...d, drones:d.drones.size })).sort((a,b) => b.count-a.count);
  }, [grpEvents]);

  if (!grpEvents.length) return <EmptyMsg label={`No events for group ${groupId}`}/>;

  const rows = breakdown.map(sg => ({ id:sg.subgroup, count:sg.count, drones:sg.drones, highThreat:sg.highThreat, share:grpEvents.length?((sg.count/grpEvents.length)*100).toFixed(1):'0' }));

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
      <SummaryHeader icon={<div className="w-5 h-5 rounded-full flex-none" style={{ background:color }}/>} title={`Group ${groupId}`} badge={`${grpEvents.length} events`} badgeColor={color} subtitle={`${breakdown.length} subgroups`}/>
      <div className="p-5 flex flex-col gap-5">
        <KpiStrip kpis={kpis}/>
        <BreakdownTable headers={['Subgroup','Events','Unique Drones','High Threat','Share']} rows={rows} color={color}/>
        <ChartsRow modelDist={modelDist} dirDist={dirDist} color={color}/>
      </div>
    </div>
  );
}

// ── Subgroup Summary ──────────────────────────────────────────────────────────
export function SubgroupSummary({ groupId, subgroupId, events }) {
  const sgEvents  = useMemo(() => events.filter(e => e.group===groupId && e.subgroup===subgroupId), [events, groupId, subgroupId]);
  const modelDist = useMemo(() => buildModelDist(sgEvents), [sgEvents]);
  const dirDist   = useMemo(() => buildDirDist(sgEvents),   [sgEvents]);
  const color     = GROUP_COLOR[groupId] ?? '#f97316';
  const kpis      = useMemo(() => buildSummaryKpis(sgEvents), [sgEvents]);

  const breakdown = useMemo(() => {
    const map = {};
    sgEvents.forEach(e => {
      const k = e.detector_id ?? 'Unknown';
      if (!map[k]) map[k] = { detector_id:k, detector_name:e.detector_name??'', count:0, drones:new Set(), highThreat:0 };
      map[k].count++; map[k].drones.add(e.drone_id);
      if (e.threat==='HIGH') map[k].highThreat++;
    });
    return Object.values(map).map(d => ({ ...d, drones:d.drones.size })).sort((a,b) => b.count-a.count);
  }, [sgEvents]);

  if (!sgEvents.length) return <EmptyMsg label={`No events for subgroup ${subgroupId}`}/>;

  const rows = breakdown.map(d => ({ id:d.detector_id, name:d.detector_name, count:d.count, drones:d.drones, highThreat:d.highThreat, share:sgEvents.length?((d.count/sgEvents.length)*100).toFixed(1):'0' }));

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
      <SummaryHeader icon={<svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>} title={subgroupId} badge={`${sgEvents.length} events`} badgeColor={color} subtitle={`${breakdown.length} detectors`}/>
      <div className="p-5 flex flex-col gap-5">
        <KpiStrip kpis={kpis}/>
        <BreakdownTable headers={['Detector ID','Name','Events','Unique Drones','High Threat','Share']} rows={rows} color={color}/>
        <ChartsRow modelDist={modelDist} dirDist={dirDist} color={color}/>
      </div>
    </div>
  );
}

// ── Detector Summary ──────────────────────────────────────────────────────────
export function DetectorSummary({ detectorId, events }) {
  const [selectedEvt, setSelectedEvt] = useState(null);
  const detEvents  = useMemo(() => events.filter(e => e.detector_id===detectorId), [events, detectorId]);
  const modelDist  = useMemo(() => buildModelDist(detEvents), [detEvents]);
  const dirDist    = useMemo(() => buildDirDist(detEvents),   [detEvents]);
  const groupColor = detEvents[0]?.group ? (GROUP_COLOR[detEvents[0].group]??'#f97316') : '#f97316';

  const kpis = useMemo(() => {
    if (!detEvents.length) return [];
    const total=detEvents.length, uniq=new Set(detEvents.map(e=>e.drone_id)).size;
    const avgRssi=(detEvents.reduce((s,e)=>s+(e.rssi_dbm??0),0)/total).toFixed(1);
    const avgDist=Math.round(detEvents.reduce((s,e)=>s+(e.estimated_distance_m??0),0)/total);
    const critical=detEvents.filter(e=>{const p=(e.protocol_name??'').toUpperCase();return p.includes('DIY')||p.includes('FPV')||p==='UNKNOWN';}).length;
    const unregistered=detEvents.filter(e=>!e.registered).length;
    return [
      {label:'Total Events',value:total,color:'#fff'},{label:'Unique Drones',value:uniq,color:'#38bdf8'},
      {label:'Avg RSSI',value:`${avgRssi} dBm`,color:'#a78bfa'},{label:'Avg Distance',value:`${avgDist} m`,color:'#34d399'},
      {label:'Critical Proto',value:critical,color:'#ef4444'},{label:'Unregistered',value:unregistered,color:'#f97316'},
    ];
  }, [detEvents]);

  if (!detEvents.length) return <EmptyMsg label={`No events for ${detectorId}`}/>;

  const HEADERS = ['Datetime','Drone ID','Model','Threat','Protocol','Alt','Speed','Dist','RSSI','SNR','GPS','Reg.','AoA','Dir'];

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
      <SummaryHeader icon={<svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M10.3 16.1a6 6 0 0 1 3.4 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>} title={detectorId} badge={`${detEvents.length} events`} badgeColor={groupColor} subtitle={detEvents[0]?.detector_name}/>
      <div className="p-5 flex flex-col gap-5">
        <KpiStrip kpis={kpis}/>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <div className="text-[12px] font-bold text-[#999] uppercase tracking-widest mb-4">🔵 Drone Models</div>
            <ModelDonutChart data={modelDist} colors={MODEL_COLORS}/>
          </div>
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5 flex flex-col items-center">
            <div className="text-[12px] font-bold text-[#999] uppercase tracking-widest mb-4 self-start">🧭 Direction</div>
            <MiniDirRose dirData={dirDist} color={groupColor}/>
          </div>
        </div>

        {/* Events table */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#222] text-[12px] font-bold text-[#888] uppercase tracking-widest">All Drone Events ({detEvents.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ minWidth:'900px' }}>
              <thead className="bg-[#111] border-b border-[#1e1e1e]">
                <tr>{HEADERS.map(h => <th key={h} className="px-3 py-2.5 text-[11px] font-bold text-[#666] uppercase whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {detEvents.map((e, i) => {
                  const gc=e.group==='GA'?'#f97316':'#eab308';
                  const tc=THREAT_COLOR[e.threat]??'#888';
                  const pc=getProtocolColor(e.protocol_name);
                  const isCrit=!e.has_gps||e.protocol_name==='DIY/FPV'||e.protocol_name==='Unknown';
                  const isSel=selectedEvt?.id===e.id;
                  return (
                    <>
                      <tr key={`r${i}`} className="border-b border-[#111] hover:bg-[#0e0e0e] cursor-pointer transition-colors"
                          style={{ background:isSel?'#111':isCrit?'rgba(239,68,68,0.04)':'transparent' }}
                          onClick={() => setSelectedEvt(isSel?null:e)}>
                        <td className="px-3 py-2.5 text-[11px] font-mono text-[#666] whitespace-nowrap">{e.datetime.replace('T',' ').slice(0,16)}</td>
                        <td className="px-3 py-2.5 text-[12px] font-mono font-bold whitespace-nowrap" style={{ color:gc }}>{e.drone_id}</td>
                        <td className="px-3 py-2.5 text-[12px] text-[#bbb] whitespace-nowrap">{e.model}</td>
                        <td className="px-3 py-2.5"><span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background:`${tc}18`, color:tc }}>{e.threat}</span></td>
                        <td className="px-3 py-2.5 text-[11px] font-bold whitespace-nowrap" style={{ color:pc }}>{e.protocol_name??'—'}</td>
                        <td className="px-3 py-2.5 text-[12px] font-mono text-[#777]">{e.height} m</td>
                        <td className="px-3 py-2.5 text-[12px] font-mono text-[#777]">{e.speed} m/s</td>
                        <td className="px-3 py-2.5 text-[12px] font-mono" style={{ color:(e.estimated_distance_m??999)<100?'#ef4444':'#777' }}>{e.estimated_distance_m??'—'} m</td>
                        <td className="px-3 py-2.5 text-[12px] font-mono" style={{ color:(e.rssi_dbm??0)>-65?'#22c55e':(e.rssi_dbm??0)>-75?'#f97316':'#ef4444' }}>{e.rssi_dbm??'—'}</td>
                        <td className="px-3 py-2.5 text-[12px] font-mono text-[#777]">{e.snr_db??'—'}</td>
                        <td className="px-3 py-2.5 text-[11px]" style={{ color:e.has_gps?'#22c55e':'#ef4444' }}>{e.has_gps?'✅':'❌'}</td>
                        <td className="px-3 py-2.5 text-[11px]">{e.registered?'🟢':'🔴'}</td>
                        <td className="px-3 py-2.5 text-[11px] font-mono text-[#666]">{e.aoa_degrees!=null?`${e.aoa_degrees}°`:'—'}</td>
                        <td className="px-3 py-2.5 text-[12px] font-mono font-bold" style={{ color:groupColor }}>{e.direction??'—'}</td>
                      </tr>
                      {isSel && (
                        <tr key={`d${i}`}>
                          <td colSpan={14} className="px-5 py-4 bg-[#0d0d0d] border-b border-[#1a1a1a]">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[['Event ID',e.id],['Lat/Lon',`${e.latitude?.toFixed(5)}, ${e.longitude?.toFixed(5)}`],['Bearing',e.bearing!=null?`${e.bearing}°`:'—'],['Freq',`${e.freq} MHz`],['Protocol',e.protocol],['Pilot Lat',e.pilot_lat?.toFixed(5)??'—'],['Pilot Lon',e.pilot_lng?.toFixed(5)??'—'],['P→D Dist',e.pilot_drone_distance_m!=null?`${e.pilot_drone_distance_m} m`:'—'],['Det. Lat',e.detector_lat?.toFixed(5)],['Det. Lon',e.detector_lon?.toFixed(5)],['Det. Name',e.detector_name],['Subgroup',e.subgroup]].map(([k,v]) => (
                                <div key={k} className="bg-[#111] rounded-lg px-3 py-2.5">
                                  <div className="text-[10px] text-[#444] uppercase mb-1">{k}</div>
                                  <div className="text-[12px] font-mono text-[#999]">{v??'—'}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Detector tree ─────────────────────────────────────────────────────────────
function DetectorTree({ selectedGroup, selectedSubgroup, selectedDetector, onChange }) {
  const [openGroups,    setOpenGroups]    = useState({});
  const [openSubgroups, setOpenSubgroups] = useState({});

  const toggle = (map, setMap, key) => setMap(m => ({ ...m, [key]: !m[key] }));

  return (
    <div className="flex flex-col">
      {/* ALL */}
      <button
        onClick={() => onChange({ group: 'ALL', subgroup: 'ALL', detector: 'ALL' })}
        className="w-full flex items-center gap-2 px-3 py-2.5 transition-colors text-left"
        style={{ background: selectedGroup === 'ALL' ? '#f9731612' : 'transparent', borderLeft: `2px solid ${selectedGroup === 'ALL' ? '#f97316' : 'transparent'}` }}>
        <span className="text-[12px] font-bold text-[#888]">All Detectors</span>
      </button>

      {mockGroupTree.map(g => {
        const gColor  = GROUP_COLOR[g.group] ?? '#888';
        const isGSel  = selectedGroup === g.group && selectedSubgroup === 'ALL';
        const isGOpen = openGroups[g.group];
        const detCount = g.subgroups.reduce((s, sg) => s + sg.detectors.length, 0);

        return (
          <div key={g.group}>
            <div className="flex items-center">
              <button
                onClick={() => { onChange({ group: g.group, subgroup: 'ALL', detector: 'ALL' }); toggle(openGroups, setOpenGroups, g.group); }}
                className="flex-1 flex items-center gap-2 px-3 py-2.5 transition-colors text-left"
                style={{ background: isGSel ? `${gColor}12` : 'transparent', borderLeft: `2px solid ${isGSel ? gColor : 'transparent'}` }}>
                <div className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: gColor }} />
                <span className="text-[12px] font-bold" style={{ color: gColor }}>{g.group}</span>
                <span className="text-[11px] text-[#555] ml-auto">{detCount}</span>
              </button>
              <button onClick={() => toggle(openGroups, setOpenGroups, g.group)} className="px-2 py-2.5 text-[#444] hover:text-[#888]">
                <svg className={`w-3 h-3 transition-transform ${isGOpen ? '' : '-rotate-90'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>

            <Collapsible isOpen={isGOpen} maxH="600px">
              {g.subgroups.map(sg => {
                const isSgOpen = openSubgroups[sg.subgroup];
                const isSgSel  = selectedGroup === g.group && selectedSubgroup === sg.subgroup && selectedDetector === 'ALL';
                return (
                  <div key={sg.subgroup}>
                    <div className="flex items-center pl-4">
                      <button
                        onClick={() => { onChange({ group: g.group, subgroup: sg.subgroup, detector: 'ALL' }); toggle(openSubgroups, setOpenSubgroups, sg.subgroup); }}
                        className="flex-1 flex items-center gap-2 px-2 py-2 transition-colors text-left"
                        style={{ background: isSgSel ? `${gColor}0a` : 'transparent', borderLeft: `2px solid ${isSgSel ? gColor : '#2a2a2a'}` }}>
                        <span className="text-[11px] font-semibold" style={{ color: isSgSel ? gColor : '#777' }}>{sg.subgroup}</span>
                        <span className="text-[11px] text-[#555] ml-auto">{sg.detectors.length}</span>
                      </button>
                      <button onClick={() => toggle(openSubgroups, setOpenSubgroups, sg.subgroup)} className="px-2 py-2 text-[#444] hover:text-[#777]">
                        <svg className={`w-2.5 h-2.5 transition-transform ${isSgOpen ? '' : '-rotate-90'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                    </div>

                    <Collapsible isOpen={isSgOpen} maxH="400px">
                      {sg.detectors.map(det => {
                        const isDetSel = selectedGroup === g.group && selectedSubgroup === sg.subgroup && selectedDetector === det.id;
                        return (
                          <button key={det.id}
                            onClick={() => onChange({ group: g.group, subgroup: sg.subgroup, detector: det.id })}
                            className="w-full flex items-center gap-2 pl-10 pr-3 py-2 transition-colors text-left"
                            style={{ background: isDetSel ? `${gColor}15` : 'transparent', borderLeft: `2px solid ${isDetSel ? gColor : 'transparent'}` }}>
                            <div className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: isDetSel ? gColor : '#444' }} />
                            <span className="text-[11px] font-mono" style={{ color: isDetSel ? gColor : '#666' }}>{det.id}</span>
                          </button>
                        );
                      })}
                    </Collapsible>
                  </div>
                );
              })}
            </Collapsible>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Sidebar({ events, isLoading, onSearch, defaultStartDate, defaultEndDate, visible }) {
  const [startDate,     setStartDate]   = useState(defaultStartDate);
  const [endDate,       setEndDate]     = useState(defaultEndDate);
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedSG,    setSelectedSG]  = useState('ALL');
  const [selectedDet,   setSelectedDet] = useState('ALL');
  const [filtersOpen,   setFiltersOpen] = useState(true);
  const [treeOpen,      setTreeOpen]    = useState(true);
  const [summaryOpen,   setSummaryOpen] = useState(true);

  const handleTreeChange = ({ group, subgroup, detector }) => {
    const g   = group;
    const sg  = group === 'ALL' ? 'ALL' : subgroup;
    const det = sg    === 'ALL' ? 'ALL' : detector;
    setSelectedGroup(g); setSelectedSG(sg); setSelectedDet(det);
    onSearch({ startDate, endDate, group: g, subgroup: sg, detector: det });
  };

  const handleSearch = () =>
    onSearch({ startDate, endDate, group: selectedGroup, subgroup: selectedSG, detector: selectedDet });

  return (
    <aside style={{ width: visible ? '19rem' : '0', minWidth: visible ? '19rem' : '0', overflow: 'hidden', transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1), min-width 0.28s cubic-bezier(0.4,0,0.2,1)', flexShrink: 0, zIndex: 40 }}
           className="flex flex-col border-r border-[#3a3a3a] bg-[#1a1a1a]">
      <div style={{ width: '19rem' }} className="flex flex-col flex-1 overflow-y-auto">

        <section className="border-b border-[#3a3a3a]">
          <SectionHeader label="Search Filters" icon={<FilterIcon />} isOpen={filtersOpen} onToggle={() => setFiltersOpen(v => !v)} />
          <Collapsible isOpen={filtersOpen} maxH="240px">
            <div className="p-4 grid grid-cols-1 gap-3">
              <Field label="Start Date"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" /></Field>
              <Field label="End Date"><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" /></Field>
              <button onClick={handleSearch} disabled={isLoading} className="btn btn-primary w-full">
                {isLoading
                  ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Searching…</>
                  : <><SearchIcon className="w-3.5 h-3.5" />Search</>}
              </button>
            </div>
          </Collapsible>
        </section>

        <section className="border-b border-[#3a3a3a]">
          <SectionHeader label="Scope" icon={<LayersIcon />} isOpen={treeOpen} onToggle={() => setTreeOpen(v => !v)}
            count={selectedDet !== 'ALL' ? `Det: ${selectedDet}` : selectedSG !== 'ALL' ? selectedSG : selectedGroup} />
          <Collapsible isOpen={treeOpen} maxH="500px">
            <div className="py-1">
              <DetectorTree selectedGroup={selectedGroup} selectedSubgroup={selectedSG} selectedDetector={selectedDet} onChange={handleTreeChange} />
            </div>
          </Collapsible>
        </section>

        <section className="border-b border-[#3a3a3a]">
          <SectionHeader label="Summary" icon={<GridIcon />} isOpen={summaryOpen} onToggle={() => setSummaryOpen(v => !v)} />
          <Collapsible isOpen={summaryOpen} maxH="300px">
            <div className="p-4"><StatsPanel events={events} /></div>
          </Collapsible>
        </section>

      </div>
    </aside>
  );
}