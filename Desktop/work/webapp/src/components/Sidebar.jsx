import { useState, useMemo } from 'react';
import { Collapsible, SectionHeader, Field } from '../shared/ui';
import { FilterIcon, LayersIcon, SearchIcon } from '../shared/icons';
import { GROUP_COLOR, MODEL_COLORS, THREAT_COLOR, DIR_LABELS } from '../shared/constants';
import { getProtocolColor, buildModelDist, buildDirDist } from '../shared/helpers';
import { mockGroupTree } from '../data/Mockdata';
import { ModelDonutChart, MiniDirRose } from './Charts';

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
    <div className="summary-header">
      {icon}
      <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>{title}</span>
      <span className="rounded-full font-bold"
            style={{ fontSize: '11px', padding: '0.25rem 0.75rem', background:`${badgeColor}22`, color:badgeColor, border:`1px solid ${badgeColor}40` }}>{badge}</span>
      {subtitle && <span style={{ fontSize: '11px', color: '#555', marginLeft: 'auto' }}>{subtitle}</span>}
    </div>
  );
}

function KpiStrip({ kpis }) {
  return (
    <div className="grid-kpis-sidebar">
      {kpis.map(({ label, value, color }) => (
        <div key={label} className="kpi-sidebar-card">
          <div className="kpi-sidebar-label">{label}</div>
          <div className="kpi-sidebar-value" style={{ color }}>{value ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}

function ChartsRow({ modelDist, dirDist, color }) {
  return (
    <div className="grid-charts-row">
      <div className="chart-card-styled">
        <div className="chart-card-title">🔵 Drone Models Detected</div>
        <ModelDonutChart data={modelDist} colors={MODEL_COLORS} />
      </div>
      <div className="chart-card-styled flex-col-center">
        <div className="chart-card-title" style={{ alignSelf: 'flex-start' }}>🧭 Most Detected Direction</div>
        <MiniDirRose dirData={dirDist} color={color} />
      </div>
    </div>
  );
}

function EmptyMsg({ label }) {
  return (
    <div className="flex-1 flex-center-all bg-dark-0a">
      <div className="text-center"><div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div><div style={{ color: '#555', fontSize: '1rem' }}>{label}</div></div>
    </div>
  );
}

// ── Breakdown table (shared by Group & Subgroup summaries) ────────────────────
function BreakdownTable({ headers, rows, color }) {
  const hasLatLon   = rows.length > 0 && rows[0].lat  !== undefined;
  const hasDetCount = rows.length > 0 && rows[0].detectors !== undefined;

  return (
    <div className="table-container">
      <div className="table-wrapper">
        <table className="table-main">
          <thead className="table-header">
            <tr>{headers.map(h => <th key={h} className="table-header-cell">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="table-body-row">
                {/* ID */}
                <td className="table-cell"><span style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', color }}>{row.id}</span></td>
                {/* Name (subgroup view has no name col) */}
                {row.name !== undefined && <td className="table-cell" style={{ fontSize: '11px', color: '#666' }}>{row.name}</td>}
                {/* Events */}
                <td className="table-cell" style={{ fontSize: '12px', fontFamily: 'monospace', color: '#bbb' }}>{row.count}</td>
                {/* Unique Drones */}
                <td className="table-cell" style={{ fontSize: '12px', fontFamily: 'monospace', color: '#38bdf8' }}>{row.drones}</td>

                {/* GroupSummary: Detectors count */}
                {hasDetCount && (
                  <td className="table-cell">
                    <span style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', color:'#fb923c' }}>{row.detectors}</span>
                  </td>
                )}

                {/* SubgroupSummary: Latitude */}
                {hasLatLon && (
                  <td className="table-cell" style={{ fontSize: '12px', fontFamily: 'monospace', color:'#34d399' }}>
                    {row.lat != null ? Number(row.lat).toFixed(6) : '—'}
                  </td>
                )}
                {/* SubgroupSummary: Longitude */}
                {hasLatLon && (
                  <td className="table-cell" style={{ fontSize: '12px', fontFamily: 'monospace', color:'#34d399' }}>
                    {row.lon != null ? Number(row.lon).toFixed(6) : '—'}
                  </td>
                )}
              </tr>
            ))}
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
      if (!map[k]) map[k] = { subgroup:k, count:0, drones:new Set(), detectors:new Set() };
      map[k].count++; map[k].drones.add(e.drone_id);
      if (e.detector_id) map[k].detectors.add(e.detector_id);
    });
    return Object.values(map).map(d => ({ ...d, drones:d.drones.size, detectors:d.detectors.size })).sort((a,b) => b.count-a.count);
  }, [grpEvents]);

  if (!grpEvents.length) return <EmptyMsg label={`No events for group ${groupId}`}/>;

  const rows = breakdown.map(sg => ({ id:sg.subgroup, count:sg.count, drones:sg.drones, detectors:sg.detectors, share:grpEvents.length?((sg.count/grpEvents.length)*100).toFixed(1):'0' }));

  return (
    <div className="flex-1 overflow-y-auto bg-dark-0a">
      <SummaryHeader icon={<div className="rounded-full flex-none" style={{ background:color, width: '1.25rem', height: '1.25rem' }}/>} title={`Group ${groupId}`} badge={`${grpEvents.length} events`} badgeColor={color} subtitle={`${breakdown.length} subgroups`}/>
      <div className="p-5 flex-col-start gap-5">
        <KpiStrip kpis={kpis}/>
        <BreakdownTable headers={['Subgroup','Events','Unique Drones','Detectors']} rows={rows} color={color}/>
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
      if (!map[k]) map[k] = { detector_id:k, detector_name:e.detector_name??'', count:0, drones:new Set(), lat:e.detector_lat??null, lon:e.detector_lon??null };
      map[k].count++; map[k].drones.add(e.drone_id);
      // keep first non-null lat/lon found
      if (map[k].lat == null && e.detector_lat != null) map[k].lat = e.detector_lat;
      if (map[k].lon == null && e.detector_lon != null) map[k].lon = e.detector_lon;
    });
    return Object.values(map).map(d => ({ ...d, drones:d.drones.size })).sort((a,b) => b.count-a.count);
  }, [sgEvents]);

  if (!sgEvents.length) return <EmptyMsg label={`No events for subgroup ${subgroupId}`}/>;

  const rows = breakdown.map(d => ({ id:d.detector_id, name:d.detector_name, count:d.count, drones:d.drones, lat:d.lat, lon:d.lon, share:sgEvents.length?((d.count/sgEvents.length)*100).toFixed(1):'0' }));

  return (
    <div className="flex-1 overflow-y-auto bg-dark-0a">
      <SummaryHeader icon={<svg style={{ width: '1.25rem', height: '1.25rem', color: '#f97316' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>} title={subgroupId} badge={`${sgEvents.length} events`} badgeColor={color} subtitle={`${breakdown.length} detectors`}/>
      <div className="p-5 flex-col-start gap-5">
        <KpiStrip kpis={kpis}/>
        <BreakdownTable headers={['Detector ID','Name','Events','Unique Drones','Latitude','Longitude']} rows={rows} color={color}/>
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

  const HEADERS = ['Datetime','Drone ID','Model','Threat','Alt','Speed','Dist','RSSI','SNR','GPS','Reg.','AoA','Dir'];

  return (
    <div className="flex-1 overflow-y-auto bg-dark-0a">
      <SummaryHeader icon={<svg style={{ width: '1.25rem', height: '1.25rem', color: '#f97316' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M10.3 16.1a6 6 0 0 1 3.4 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>} title={detectorId} badge={`${detEvents.length} events`} badgeColor={groupColor} subtitle={detEvents[0]?.detector_name}/>
      <div className="p-5 flex-col-start gap-5">
        <KpiStrip kpis={kpis}/>
        <div className="grid-charts-row">
          <div className="chart-card-styled">
            <div className="chart-card-title">🔵 Drone Models</div>
            <ModelDonutChart data={modelDist} colors={MODEL_COLORS}/>
          </div>
          <div className="chart-card-styled flex-col-center">
            <div className="chart-card-title" style={{ alignSelf: 'flex-start' }}>🧭 Direction</div>
            <MiniDirRose dirData={dirDist} color={groupColor}/>
          </div>
        </div>

        {/* Events table */}
        <div className="table-container">
          <div className="card-header" style={{ color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '12px' }}>All Drone Events ({detEvents.length})</div>
          <div className="table-wrapper">
            <table className="table-main" style={{ minWidth:'900px' }}>
              <thead className="table-header">
                <tr>{HEADERS.map(h => <th key={h} className="table-header-cell">{h}</th>)}</tr>
              </thead>
              <tbody>
                {detEvents.map((e, i) => {
                  const gc=e.group==='GA'?'#f97316':'#eab308';
                  const tc=THREAT_COLOR[e.threat]??'#888';
                  const isCrit=!e.has_gps||e.protocol_name==='DIY/FPV'||e.protocol_name==='Unknown';
                  const isSel=selectedEvt?.id===e.id;
                  return (
                    <>
                      <tr key={`r${i}`} className="table-body-row"
                          style={{ background:isSel?'#111':isCrit?'rgba(239,68,68,0.04)':'transparent', cursor: 'pointer' }}
                          onClick={() => setSelectedEvt(isSel?null:e)}>
                        <td className="table-cell font-mono" style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap' }}>{e.datetime.replace('T',' ').slice(0,16)}</td>
                        <td className="table-cell font-mono" style={{ fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', color:gc }}>{e.drone_id}</td>
                        <td className="table-cell" style={{ fontSize: '12px', color: '#bbb', whiteSpace: 'nowrap' }}>{e.model}</td>
                        <td className="table-cell"><span className="rounded font-bold" style={{ fontSize: '10px', padding: '2px 8px', background:`${tc}18`, color:tc }}>{e.threat}</span></td>
                        <td className="table-cell font-mono" style={{ fontSize: '12px', color: '#777' }}>{e.height} m</td>
                        <td className="table-cell font-mono" style={{ fontSize: '12px', color: '#777' }}>{e.speed} m/s</td>
                        <td className="table-cell font-mono" style={{ fontSize: '12px', color:(e.estimated_distance_m??999)<100?'#ef4444':'#777' }}>{e.estimated_distance_m??'—'} m</td>
                        <td className="table-cell font-mono" style={{ fontSize: '12px', color:(e.rssi_dbm??0)>-65?'#22c55e':(e.rssi_dbm??0)>-75?'#f97316':'#ef4444' }}>{e.rssi_dbm??'—'}</td>
                        <td className="table-cell font-mono" style={{ fontSize: '12px', color: '#777' }}>{e.snr_db??'—'}</td>
                        <td className="table-cell" style={{ fontSize: '11px', color: e.has_gps?'#22c55e':'#ef4444' }}>{e.has_gps?'✅':'❌'}</td>
                        <td className="table-cell" style={{ fontSize: '11px' }}>{e.registered?'🟢':'🔴'}</td>
                        <td className="table-cell font-mono" style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap' }}>{e.aoa_degrees!=null?`${e.aoa_degrees}°`:'—'}</td>
                        <td className="table-cell font-mono" style={{ fontSize: '12px', fontWeight: 'bold', color:groupColor }}>{e.direction??'—'}</td>
                      </tr>
                      {isSel && (
                        <tr key={`d${i}`}>
                          <td colSpan={13} style={{ padding: '1rem 1.25rem', backgroundColor: '#0d0d0d', borderBottom: '1px solid #1a1a1a' }}>
                            <div className="grid-event-details">
                              {[['Event ID',e.id],['Lat/Lon',`${e.latitude?.toFixed(5)}, ${e.longitude?.toFixed(5)}`],['Bearing',e.bearing!=null?`${e.bearing}°`:'—'],['Freq',`${e.freq} MHz`],['Pilot Lat',e.pilot_lat?.toFixed(5)??'—'],['Pilot Lon',e.pilot_lng?.toFixed(5)??'—'],['P→D Dist',e.pilot_drone_distance_m!=null?`${e.pilot_drone_distance_m} m`:'—'],['Det. Lat',e.detector_lat?.toFixed(5)],['Det. Lon',e.detector_lon?.toFixed(5)],['Det. Name',e.detector_name],['Subgroup',e.subgroup]].map(([k,v]) => (
                                <div key={k} className="rounded-lg bg-dark-11" style={{ padding: '0.625rem 0.75rem' }}>
                                  <div className="text-label-dark-gray" style={{ marginBottom: '4px' }}>{k}</div>
                                  <div className="font-mono" style={{ fontSize: '12px', color: '#999' }}>{v??'—'}</div>
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
    <div className="flex-col-start">
      {/* ALL */}
      <button
        onClick={() => onChange({ group: 'ALL', subgroup: 'ALL', detector: 'ALL' })}
        className="tree-node-btn"
        style={{
          background: selectedGroup === 'ALL' ? '#f9731612' : 'transparent',
          borderLeft: `2px solid ${selectedGroup === 'ALL' ? '#f97316' : 'transparent'}`,
        }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#888' }}>All Detectors</span>
      </button>

      {mockGroupTree.map(g => {
        const gColor  = GROUP_COLOR[g.group] ?? '#888';
        const isGSel  = selectedGroup === g.group && selectedSubgroup === 'ALL';
        const isGOpen = openGroups[g.group];
        const detCount = g.subgroups.reduce((s, sg) => s + sg.detectors.length, 0);

        return (
          <div key={g.group}>
            <div className="flex-row-center">
              <button
                onClick={() => { onChange({ group: g.group, subgroup: 'ALL', detector: 'ALL' }); toggle(openGroups, setOpenGroups, g.group); }}
                className="tree-node-btn"
                style={{
                  flex: 1,
                  background: isGSel ? `${gColor}12` : 'transparent',
                  borderLeft: `2px solid ${isGSel ? gColor : 'transparent'}`,
                }}>
                <div className="rounded-full flex-none" style={{ background: gColor, width: '0.625rem', height: '0.625rem' }} />
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: gColor }}>{g.group}</span>
                <span style={{ fontSize: '11px', color: '#555', marginLeft: 'auto' }}>{detCount}</span>
              </button>
              <button onClick={() => toggle(openGroups, setOpenGroups, g.group)} className="tree-arrow-btn">
                <svg style={{ width: '0.75rem', height: '0.75rem', transform: isGOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>

            <Collapsible isOpen={isGOpen} maxH="600px">
              {g.subgroups.map(sg => {
                const isSgOpen = openSubgroups[sg.subgroup];
                const isSgSel  = selectedGroup === g.group && selectedSubgroup === sg.subgroup && selectedDetector === 'ALL';
                return (
                  <div key={sg.subgroup}>
                    <div className="flex-row-center" style={{ paddingLeft: '1rem' }}>
                      <button
                        onClick={() => { onChange({ group: g.group, subgroup: sg.subgroup, detector: 'ALL' }); toggle(openSubgroups, setOpenSubgroups, sg.subgroup); }}
                        className="tree-node-btn"
                        style={{
                          flex: 1,
                          background: isSgSel ? `${gColor}0a` : 'transparent',
                          borderLeft: `2px solid ${isSgSel ? gColor : '#2a2a2a'}`,
                        }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: isSgSel ? gColor : '#777' }}>{sg.subgroup}</span>
                        <span style={{ fontSize: '11px', color: '#555', marginLeft: 'auto' }}>{sg.detectors.length}</span>
                      </button>
                      <button onClick={() => toggle(openSubgroups, setOpenSubgroups, sg.subgroup)} className="tree-arrow-btn" style={{ padding: '0.5rem' }}>
                        <svg style={{ width: '0.625rem', height: '0.625rem', transform: isSgOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                    </div>

                    <Collapsible isOpen={isSgOpen} maxH="400px">
                      {sg.detectors.map(det => {
                        const isDetSel = selectedGroup === g.group && selectedSubgroup === sg.subgroup && selectedDetector === det.id;
                        return (
                          <button key={det.id}
                            onClick={() => onChange({ group: g.group, subgroup: sg.subgroup, detector: det.id })}
                            className="tree-node-btn"
                            style={{
                              paddingLeft: '2.5rem',
                              background: isDetSel ? `${gColor}15` : 'transparent',
                              borderLeft: `2px solid ${isDetSel ? gColor : 'transparent'}`,
                            }}>
                            <div className="rounded-full flex-none" style={{ background: isDetSel ? gColor : '#444', width: '0.375rem', height: '0.375rem' }} />
                            <span className="font-mono" style={{ fontSize: '11px', color: isDetSel ? gColor : '#666' }}>{det.id}</span>
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
           className="sidebar-container">
      <div style={{ width: '19rem' }} className="flex-col-start flex-1 overflow-y-auto">

        <section className="sidebar-section">
          <SectionHeader label="Search Filters" icon={<FilterIcon />} isOpen={filtersOpen} onToggle={() => setFiltersOpen(v => !v)} />
          <Collapsible isOpen={filtersOpen} maxH="240px">
            <div className="flex-col-start gap-3" style={{ padding: '1rem' }}>
              <Field label="Start Date"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" /></Field>
              <Field label="End Date"><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" /></Field>
              <button onClick={handleSearch} disabled={isLoading} className="btn btn-primary w-full">
                {isLoading
                  ? <><div className="spinner-small-white animate-spin" />Searching…</>
                  : <><SearchIcon style={{ width: '0.875rem', height: '0.875rem' }} />Search</>}
              </button>
            </div>
          </Collapsible>
        </section>

        <section className="sidebar-section">
          <SectionHeader label="Scope" icon={<LayersIcon />} isOpen={treeOpen} onToggle={() => setTreeOpen(v => !v)}
            count={selectedDet !== 'ALL' ? `Det: ${selectedDet}` : selectedSG !== 'ALL' ? selectedSG : selectedGroup} />
          <Collapsible isOpen={treeOpen} maxH="500px">
            <div style={{ padding: '0.25rem 0' }}>
              <DetectorTree selectedGroup={selectedGroup} selectedSubgroup={selectedSG} selectedDetector={selectedDet} onChange={handleTreeChange} />
            </div>
          </Collapsible>
        </section>

      </div>
    </aside>
  );
}