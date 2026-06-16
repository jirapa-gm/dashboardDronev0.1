import { useMemo } from 'react';
import { GROUP_COLOR } from '../../shared/constants';
import { buildModelDist, buildDirDist } from '../../shared/helpers';
import { buildSummaryKpis, SummaryHeader, KpiStrip, ChartsRow, EmptyMsg, BreakdownTable } from './SummaryShared';

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
