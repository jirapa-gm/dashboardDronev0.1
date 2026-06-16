import { useMemo } from 'react';
import { GROUP_COLOR } from '../../shared/constants';
import { buildModelDist, buildDirDist } from '../../shared/helpers';
import { buildSummaryKpis, SummaryHeader, KpiStrip, ChartsRow, EmptyMsg, BreakdownTable } from './SummaryShared';

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
