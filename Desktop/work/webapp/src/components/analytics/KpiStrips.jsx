import { useMemo, useState } from 'react';
import { GA, GB } from '../../shared/constants';
import { LogIcon, DroneIcon, CompassIcon, AlertIcon } from '../../shared/icons';

// ── KPI Strip — ALL mode ──────────────────────────────────────────────────────
export function KpiStripAll({ kpis }) {
  const items = [
    { label: 'Total Events',  value: kpis.total,               color: '#fff',    icon: <LogIcon className="w-3.5 h-3.5" /> },
    { label: 'Unique Drones', value: kpis.unique,              color: '#38bdf8', icon: <DroneIcon className="w-3.5 h-3.5" /> },
    { label: 'Group GA',      value: kpis.ga,                  color: GA,        icon: <span>●</span> },
    { label: 'Group GB',      value: kpis.gb,                  color: GB,        icon: <span>●</span> },
    { label: 'Avg Speed',     value: `${kpis.avgSpeed} m/s`,   color: '#a78bfa', icon: <CompassIcon className="w-3.5 h-3.5" /> },
    { label: 'Avg Height',    value: `${kpis.avgHeight} m`,    color: '#34d399', icon: <span style={{ fontSize: '12px', fontWeight: 'bold', lineHeight: 1 }}>↑</span> },
    { label: 'Max Speed',     value: `${kpis.maxSpeed} m/s`,   color: '#f43f5e', icon: <AlertIcon className="w-3.5 h-3.5" /> },
  ];
  return (
    <div className="grid-kpis-all">
      {items.map(({ label, value, color, icon }) => (
        <div key={label} className="kpi-card-dashboard">
          <div className="flex-row-center gap-1-5">
            <span className="flex-row-center" style={{ color, display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
            <span className="text-label-medium-gray" style={{ fontSize: '8px', fontWeight: 'bold' }}>{label}</span>
          </div>
          <div className="font-mono" style={{ fontSize: '18px', fontWeight: 'bold', color, lineHeight: 1 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// ── KPI Strip — GA/GB mode: subgroup cards → detector lat/lon ─────────────────
export function KpiStripGroup({ events, groupFilter }) {
  const [expandedSg, setExpandedSg] = useState(null);
  const groupColor = groupFilter === 'GA' ? GA : GB;

  const subgroups = useMemo(() => {
    const sgMap = {};
    events.forEach(e => {
      if (!e.subgroup) return;
      if (!sgMap[e.subgroup]) sgMap[e.subgroup] = {};
      const did = e.detector_id;
      if (did && !sgMap[e.subgroup][did]) {
        sgMap[e.subgroup][did] = {
          id:  did,
          lat: e.detector_lat ?? null,
          lon: e.detector_lon ?? null,
        };
      }
    });
    return Object.entries(sgMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([sg, dets]) => ({ sg, detectors: Object.values(dets).sort((a,b) => a.id.localeCompare(b.id)) }));
  }, [events]);

  const totalEvents  = events.length;
  const uniqueDrones = new Set(events.map(e => e.drone_id)).size;
  const totalDets    = new Set(events.map(e => e.detector_id).filter(Boolean)).size;
  const avgSpeed     = events.length ? (events.reduce((s,e) => s+(e.speed??0),0)/events.length).toFixed(1) : '—';

  const summaryItems = [
    { label: 'Events',        value: totalEvents,      color: '#fff'    },
    { label: 'Unique Drones', value: uniqueDrones,     color: '#38bdf8' },
    { label: 'Detectors',     value: totalDets,        color: '#fb923c' },
    { label: 'Avg Speed',     value: `${avgSpeed} m/s`, color: '#a78bfa' },
  ];

  return (
    <div className="flex-col-start gap-3">
      <div className="grid-kpis-group">
        {summaryItems.map(({ label, value, color }) => (
          <div key={label} className="kpi-card-dashboard">
            <span className="text-label-medium-gray" style={{ fontSize: '8px', fontWeight: 'bold' }}>{label}</span>
            <div className="font-mono" style={{ fontSize: '18px', fontWeight: 'bold', color, lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="flex-col-start gap-2">
        <div className="text-label-dark-gray px-1" style={{ fontSize: '8px', fontWeight: 'bold' }}>
          Subgroups — {groupFilter} · click to expand detectors
        </div>
        <div className="grid-subgroups">
          {subgroups.map(({ sg, detectors }) => {
            const isOpen = expandedSg === sg;
            return (
              <div key={sg} style={{ gridColumn: isOpen ? '1 / -1' : undefined }} className="flex-col-start">
                <button
                  onClick={() => setExpandedSg(isOpen ? null : sg)}
                  className={`subgroup-header-btn ${isOpen ? 'open' : 'closed'}`}
                  style={{
                    background: isOpen ? `${groupColor}12` : '#141414',
                    borderColor: isOpen ? `${groupColor}55` : '#2a2a2a',
                  }}>
                  <div className="flex-row-center gap-2">
                    <div className="rounded-full flex-none" style={{ background: groupColor, width: 8, height: 8 }} />
                    <span className="font-mono" style={{ fontSize: '12px', fontWeight: 'bold', color: groupColor }}>{sg}</span>
                  </div>
                  <div className="flex-row-center gap-2">
                    <span className="font-mono text-white" style={{ fontSize: '11px', fontWeight: 'bold' }}>{detectors.length}</span>
                    <span style={{ fontSize: '8px', color: '#555' }}>det</span>
                    <svg className="transition-transform"
                         style={{ width: '0.75rem', height: '0.75rem', color: '#555', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                         viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </button>
                {isOpen && (
                  <div className="border border-t-0 rounded-b-xl overflow-hidden"
                       style={{ borderColor: `${groupColor}55`, background: '#0d0d0d', borderTop: 0 }}>
                    <div className="detector-table-header">
                      {['Detector ID', 'Latitude', 'Longitude'].map(h => (
                        <span key={h} className="text-label-dark-gray" style={{ fontSize: '8px', fontWeight: 'bold' }}>{h}</span>
                      ))}
                    </div>
                    {detectors.map(det => (
                      <div key={det.id} className="detector-table-row">
                        <span className="font-mono" style={{ fontSize: '11px', fontWeight: 'bold', color: groupColor }}>{det.id}</span>
                        <span className="font-mono" style={{ fontSize: '11px', color: '#aaa' }}>
                          {det.lat != null ? Number(det.lat).toFixed(5) : '—'}
                        </span>
                        <span className="font-mono" style={{ fontSize: '11px', color: '#aaa' }}>
                          {det.lon != null ? Number(det.lon).toFixed(5) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
