import { GROUP_COLOR, MODEL_COLORS } from '../../shared/constants';
import { CompassIcon, SignalIcon, DroneIcon } from '../../shared/icons';
import { ModelDonutChart } from '../charts/ModelDonutChart';
import { MiniDirRose } from '../charts/MiniDirRose';
import './Summaries.css';

// ── Summary shared helpers ────────────────────────────────────────────────────
export function buildSummaryKpis(evts) {
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
    { label:'Critical Proto', value:critical,         color:'#ef4444' },
    { label:'Unregistered',  value:unregistered,      color:'#f97316' },
  ];
}

export function SummaryHeader({ icon, title, badge, badgeColor, subtitle }) {
  return (
    <div className="summary-header">
      {icon}
      <span className="summary-header-title">{title}</span>
      <span className="rounded-full font-bold summary-header-badge rounded font-bold" style={{ background:`${badgeColor}22`, color:badgeColor, border:`1px solid ${badgeColor}40` }}>{badge}</span>
      {subtitle && <span className="summary-header-subtitle">{subtitle}</span>}
    </div>
  );
}

export function KpiStrip({ kpis }) {
  return (
    <div className="grid-kpis-sidebar">
      {kpis.map(({ label, value, color }) => (
        <div key={label} className="kpi-sidebar-card">
          <div className="kpi-sidebar-label">{label}</div>
          <div className="kpi-sidebar-value summary-kpi-val" style={{ color }}>{value ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}

export function ChartsRow({ modelDist, dirDist, color }) {
  return (
    <div className="grid-charts-row">
      <div className="chart-card-styled">
        <div className="chart-card-title summary-chart-title">
          <DroneIcon className="w-3.5 h-3.5 w-3.5 h-3.5 text-sky-400" /> Drone Models Detected
        </div>
        <ModelDonutChart data={modelDist} colors={MODEL_COLORS} />
      </div>
      <div className="chart-card-styled flex-col-center">
        <div className="chart-card-title summary-chart-title-start">
          <CompassIcon className="w-3.5 h-3.5 summary-kpi-val" style={{ color }} /> Most Detected Direction
        </div>
        <MiniDirRose dirData={dirDist} color={color} />
      </div>
    </div>
  );
}

export function EmptyMsg({ label }) {
  return (
    <div className="flex-1 flex-center-all bg-dark-0a">
      <div className="text-center">
        <div className="summary-empty-state">
          <SignalIcon className="w-10 h-10 w-10 h-10 text-neutral-800" />
        </div>
        <div className="summary-empty-label">{label}</div>
      </div>
    </div>
  );
}

// ── Breakdown table (shared by Group & Subgroup summaries) ────────────────────
export function BreakdownTable({ headers, rows, color }) {
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
                <td className="table-cell"><span className="summary-td-id" style={{ color }}>{row.id}</span></td>
                {/* Name (subgroup view has no name col) */}
                {row.name !== undefined && <td className="table-cell summary-td-name">{row.name}</td>}
                {/* Events */}
                <td className="table-cell summary-td-count">{row.count}</td>
                {/* Unique Drones */}
                <td className="table-cell summary-td-drones">{row.drones}</td>

                {/* GroupSummary: Detectors count */}
                {hasDetCount && (
                  <td className="table-cell">
                    <span className="summary-td-det-count">{row.detectors}</span>
                  </td>
                )}

                {/* SubgroupSummary: Latitude */}
                {hasLatLon && (
                  <td className="table-cell summary-td-green">
                    {row.lat != null ? Number(row.lat).toFixed(6) : '—'}
                  </td>
                )}
                {/* SubgroupSummary: Longitude */}
                {hasLatLon && (
                  <td className="table-cell summary-td-green">
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
