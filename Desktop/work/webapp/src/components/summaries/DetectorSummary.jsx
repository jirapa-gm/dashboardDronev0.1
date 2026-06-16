import { useState, useMemo } from 'react';
import { GROUP_COLOR, THREAT_COLOR, MODEL_COLORS } from '../../shared/constants';
import { buildModelDist, buildDirDist } from '../../shared/helpers';
import { CompassIcon, DroneIcon, CheckIcon, CloseIcon } from '../../shared/icons';
import { ModelDonutChart } from '../charts/ModelDonutChart';
import { MiniDirRose } from '../charts/MiniDirRose';
import { buildSummaryKpis, SummaryHeader, KpiStrip, EmptyMsg } from './SummaryShared';

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
            <div className="chart-card-title summary-chart-title">
              <DroneIcon className="w-3.5 h-3.5 w-3.5 h-3.5 text-sky-400" /> Drone Models
            </div>
            <ModelDonutChart data={modelDist} colors={MODEL_COLORS}/>
          </div>
          <div className="chart-card-styled flex-col-center">
            <div className="chart-card-title summary-chart-title-start">
              <CompassIcon className="w-3.5 h-3.5 w-3.5 h-3.5" style={{ color: groupColor }} /> Direction
            </div>
            <MiniDirRose dirData={dirDist} color={groupColor}/>
          </div>
        </div>

        {/* Events table */}
        <div className="table-container">
          <div className="card-header summary-table-header">All Drone Events ({detEvents.length})</div>
          <div className="table-wrapper">
            <table className="table-main summary-table-main table-main">
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
                        <td className="table-cell font-mono summary-td-date font-mono">{e.datetime.replace('T',' ').slice(0,16)}</td>
                        <td className="table-cell font-mono summary-td-drone-id font-mono" style={{ color:gc }}>{e.drone_id}</td>
                        <td className="table-cell summary-td-model">{e.model}</td>
                        <td className="table-cell"><span className="rounded font-bold summary-threat-badge rounded font-bold" style={{ background:`${tc}18`, color:tc }}>{e.threat}</span></td>
                        <td className="table-cell font-mono summary-td-measure font-mono">{e.height} m</td>
                        <td className="table-cell font-mono summary-td-measure font-mono">{e.speed} m/s</td>
                        <td className="table-cell font-mono summary-td-dynamic font-mono" style={{ color:(e.estimated_distance_m??999)<100?'#ef4444':'#777' }}>{e.estimated_distance_m??'—'} m</td>
                        <td className="table-cell font-mono summary-td-dynamic font-mono" style={{ color:(e.rssi_dbm??0)>-65?'#22c55e':(e.rssi_dbm??0)>-75?'#f97316':'#ef4444' }}>{e.rssi_dbm??'—'}</td>
                        <td className="table-cell font-mono summary-td-measure font-mono">{e.snr_db??'—'}</td>
                        <td className="table-cell font-mono summary-td-status font-mono" style={{ color: e.has_gps?'#22c55e':'#ef4444' }}>{e.has_gps?<><CheckIcon className="w-3 h-3 inline mr-1" /> Yes</>:<><CloseIcon className="w-3 h-3 inline mr-1" /> No</>}</td>
                        <td className="table-cell font-mono summary-td-status font-mono" style={{ color: e.registered?'#22c55e':'#ef4444' }}>{e.registered?<><CheckIcon className="w-3 h-3 inline mr-1" /> Yes</>:<><CloseIcon className="w-3 h-3 inline mr-1" /> No</>}</td>
                        <td className="table-cell font-mono summary-td-date font-mono">{e.aoa_degrees!=null?`${e.aoa_degrees}°`:'—'}</td>
                        <td className="table-cell font-mono summary-td-dir font-mono" style={{ color:groupColor }}>{e.direction??'—'}</td>
                      </tr>
                      {isSel && (
                        <tr key={`d${i}`}>
                          <td colSpan={13} className="summary-expanded-row">
                            <div className="grid-event-details">
                              {[['Event ID',e.id],['Lat/Lon',`${e.latitude?.toFixed(5)}, ${e.longitude?.toFixed(5)}`],['Bearing',e.bearing!=null?`${e.bearing}°`:'—'],['Freq',`${e.freq} MHz`],['Pilot Lat',e.pilot_lat?.toFixed(5)??'—'],['Pilot Lon',e.pilot_lng?.toFixed(5)??'—'],['P→D Dist',e.pilot_drone_distance_m!=null?`${e.pilot_drone_distance_m} m`:'—'],['Det. Lat',e.detector_lat?.toFixed(5)],['Det. Lon',e.detector_lon?.toFixed(5)],['Det. Name',e.detector_name],['Subgroup',e.subgroup]].map(([k,v]) => (
                                <div key={k} className="rounded-lg bg-dark-11 summary-expanded-item rounded-lg bg-dark-11">
                                  <div className="text-label-dark-gray summary-expanded-label text-label-dark-gray">{k}</div>
                                  <div className="font-mono summary-expanded-val font-mono">{v??'—'}</div>
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
