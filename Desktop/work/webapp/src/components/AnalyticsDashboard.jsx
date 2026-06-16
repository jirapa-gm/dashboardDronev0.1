import { useState, useMemo, useRef, useCallback } from 'react';
import {
   buildDailyMap, buildDistribution, buildHourlyMap,
   buildDirectionMap, buildKPIs, buildFreqBands,
} from '../utils/chartUtils';
import { GA, GB, DIR_LABELS, PROTO_COLORS, MODEL_COLORS } from '../shared/constants';
import { Card, Spinner, EmptyState, HBar, Toolbar } from '../shared/ui';
import { BarChartIcon, ClockIcon, CompassIcon, DroneIcon, SignalIcon, LogIcon, AlertIcon, SunIcon, MoonIcon } from '../shared/icons';
import { RadarChart } from './charts/RadarChart';
import { GroupBarChart } from './charts/GroupBarChart';
import { CombinedHourlyChart } from './charts/CombinedHourlyChart';
import { ModelDonutChart } from './charts/ModelDonutChart';
import { MiniDirRose } from './charts/MiniDirRose';
import { AltitudeGauge } from './charts/AltitudeGauge';
import { SignalSparkline } from './charts/SignalSparkline';
import { DetectionTimeline } from './charts/DetectionTimeline';
import { buildPdfHtml } from '../utils/pdfTemplate';
import { PdfExportModal } from './analytics/PdfExportModal';
import { KpiStripAll, KpiStripGroup } from './analytics/KpiStrips';

// ── KPI Strip router ──────────────────────────────────────────────────────────
function KpiStrip({ kpis, events, groupFilter }) {
  if (groupFilter === 'ALL') return <KpiStripAll kpis={kpis} />;
  return <KpiStripGroup events={events} groupFilter={groupFilter} />;
}

// ── Hourly bar chart (Combined GA & GB) ───────────────────────────────────────
function HourlyChart({ events, precomputedHourly, isFiltered }) {
  const dates   = useMemo(() => [...new Set(events.map(e => e.datetime.split('T')[0]))].sort(), [events]);
  const [selDate, setSelDate] = useState('ALL');

  const dayEvts = selDate === 'ALL' ? events : events.filter(e => e.datetime.startsWith(selDate));
  const hourly  = useMemo(() => {
    if (!isFiltered && selDate === 'ALL' && precomputedHourly?.length > 0) {
      return precomputedHourly;
    }
    return buildHourlyMap(dayEvts);
  }, [dayEvts, selDate, isFiltered, precomputedHourly]);

  const total = hourly.reduce((s, h) => s + h.GA + h.GB, 0);
  const night = [...hourly.slice(18), ...hourly.slice(0, 6)].reduce((s, h) => s + h.GA + h.GB, 0);
  const day   = hourly.slice(6, 18).reduce((s, h) => s + h.GA + h.GB, 0);

  return (
    <div className="flex-col-start gap-4">
      {/* Top Header Row within the Card */}
      <div className="flex-row-between w-full flex-wrap gap-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', paddingBottom: '12px' }}>
        {/* Legend */}
        <div className="flex-row-center gap-3">
          <div className="flex-row-center gap-1-5">
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: GA }}></span>
            <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600 }}>Group GA</span>
          </div>
          <div className="flex-row-center gap-1-5">
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: GB }}></span>
            <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600 }}>Group GB</span>
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex-row-center gap-2">
          <span style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold' }}>Filter Date</span>
          <select value={selDate} onChange={e => setSelDate(e.target.value)} className="select-styled" style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}>
            <option value="ALL">All Dates</option>
            {dates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Combined Single Dual-Bar Chart */}
      <div style={{ padding: '4px 0 8px 0', width: '100%' }}>
        <CombinedHourlyChart hourly={hourly} GA_color={GA} GB_color={GB} />
      </div>

      {/* Summary KPI widgets */}
      <div className="grid-kpis-3" style={{ width: '100%' }}>
        {[
          { label: 'Total Events', value: total, sub: '100% Volume', icon: <BarChartIcon style={{ color: '#fb923c' }} />, color: '#fff' },
          { label: 'Daytime (06:00–18:00)', value: day, sub: total > 0 ? `${((day/total)*100).toFixed(0)}% of total` : '—', icon: <SunIcon style={{ color: '#facc15' }} />, color: '#facc15' },
          { label: 'Nighttime (18:01–05:59)', value: night, sub: total > 0 ? `${((night/total)*100).toFixed(0)}% of total` : '—', icon: <MoonIcon style={{ color: '#818cf8' }} />, color: '#818cf8' },
        ].map(({ label, value, sub, icon }) => (
          <div key={label} className="kpi-card-small" style={{
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: '8px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
              flexShrink: 0
            }}>
              {icon}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '8px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</div>
              <div className="font-mono" style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', lineHeight: 1.2 }}>{value}</div>
              <div style={{ fontSize: '8px', color: '#444', fontWeight: 600 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AnalyticsDashboard({
  events, summary, daily, hourly, directions,
  freqBands: precomputedFreqBands,
  droneStats,
  modelCount:      precomputedModelCount,
  protocolSummary: precomputedProtocolSummary,
  isLoading, isMockMode,
}) {
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [showPdfModal,  setShowPdfModal]  = useState(false);
  const contentRef = useRef(null);

  const filtered   = events;
  const isFiltered = false;

  const kpis = useMemo(() => {
    if (!isFiltered && summary?.total > 0) {
      return {
        total:      summary.total,
        unique:     summary.unique_drones,
        ga:         summary.ga,
        gb:         summary.gb,
        avgSpeed:   summary.avg_speed,
        avgHeight:  summary.avg_height,
        maxSpeed:   summary.max_speed,
        highThreat: summary.high_threat,
      };
    }
    return buildKPIs(filtered);
  }, [filtered, isFiltered, summary]);

  const dirData = useMemo(() => {
    if (!isFiltered && directions?.length > 0) return directions;
    return buildDirectionMap(filtered);
  }, [filtered, isFiltered, directions]);

  const freqBands = useMemo(() => {
    if (!isFiltered && precomputedFreqBands?.length > 0) return precomputedFreqBands;
    return buildFreqBands(filtered);
  }, [filtered, isFiltered, precomputedFreqBands]);

  const models = useMemo(() => {
    if (!isFiltered && precomputedModelCount?.length > 0) return precomputedModelCount;
    return buildDistribution(filtered, 'model');
  }, [filtered, isFiltered, precomputedModelCount]);

  const protocols = useMemo(() => {
    if (!isFiltered && precomputedProtocolSummary?.length > 0) return precomputedProtocolSummary;
    return buildDistribution(filtered, 'protocol_name');
  }, [filtered, isFiltered, precomputedProtocolSummary]);

  const maxModel  = models[0]?.[1] ?? 1;

  // Build subgroup data for PDF (GA/GB only)
  const subgroups = useMemo(() => {
    const sgMap = {};
    filtered.forEach(e => {
      if (!e.subgroup) return;
      if (!sgMap[e.subgroup]) sgMap[e.subgroup] = {};
      const did = e.detector_id;
      if (did && !sgMap[e.subgroup][did]) {
        sgMap[e.subgroup][did] = { id: did, lat: e.detector_lat ?? null, lon: e.detector_lon ?? null };
      }
    });
    return Object.entries(sgMap)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([sg, dets]) => ({ sg, detectors: Object.values(dets).sort((a,b) => a.id.localeCompare(b.id)) }));
  }, [filtered]);

  const handleExportPdf = useCallback(async ({ scope, detailLevel, sections }) => {
    setPdfLoading(true);
    setShowPdfModal(false);
    try {
      const scopedEvents  = scope === 'ALL' ? events : events.filter(e => e.group === scope);
      const scopedKpis    = scope === 'ALL' && summary?.total > 0
        ? { total: summary.total, unique: summary.unique_drones, ga: summary.ga, gb: summary.gb,
            avgSpeed: summary.avg_speed, avgHeight: summary.avg_height, maxSpeed: summary.max_speed,
            highThreat: summary.high_threat }
        : buildKPIs(scopedEvents);

      const scopedSubgroups = scope === 'ALL' ? [] : (() => {
        const sgMap = {};
        scopedEvents.forEach(e => {
          if (!e.subgroup) return;
          if (!sgMap[e.subgroup]) sgMap[e.subgroup] = {};
          const did = e.detector_id;
          if (did && !sgMap[e.subgroup][did])
            sgMap[e.subgroup][did] = { id: did, lat: e.detector_lat ?? null, lon: e.detector_lon ?? null };
        });
        return Object.entries(sgMap).sort(([a],[b])=>a.localeCompare(b))
          .map(([sg,dets]) => ({ sg, detectors: Object.values(dets).sort((a,b)=>a.id.localeCompare(b.id)) }));
      })();

      const printWin = window.open('', '_blank');
      if (!printWin) { alert('Please allow pop-ups to export PDF'); return; }

      const titleDate = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
      printWin.document.write(buildPdfHtml({
        titleDate,
        groupFilter: scope,
        kpis:        scopedKpis,
        models:      scope === 'ALL' && precomputedModelCount?.length > 0 ? precomputedModelCount : buildDistribution(scopedEvents, 'model'),
        protocols:   scope === 'ALL' && precomputedProtocolSummary?.length > 0 ? precomputedProtocolSummary : buildDistribution(scopedEvents, 'protocol_name'),
        freqBands:   scope === 'ALL' && precomputedFreqBands?.length > 0 ? precomputedFreqBands : buildFreqBands(scopedEvents),
        dirData:     scope === 'ALL' && directions?.length > 0 ? directions : buildDirectionMap(scopedEvents),
        subgroups:   scopedSubgroups,
        options:     { sections, detailLevel },
      }));
      printWin.document.close();
    } finally {
      setPdfLoading(false);
    }
  }, [events, summary, directions, precomputedFreqBands, precomputedModelCount, precomputedProtocolSummary]);

  if (isLoading) return <Spinner label="Computing analytics…" />;
  if (!events.length && !(summary?.total > 0)) return <EmptyState message="No data to analyze" sub="Adjust filters and search" />;

  return (
    <div className="dashboard-main-pane">
      {/* PDF Export Modal */}
      {showPdfModal && (
        <PdfExportModal
          onClose={() => setShowPdfModal(false)}
          onExport={handleExportPdf}
          groupFilter="ALL"
          isLoading={pdfLoading}
        />
      )}

      <Toolbar>
        <div className="flex-row-center gap-2">
          <BarChartIcon style={{ width: '1rem', height: '1rem', color: '#f97316' }} />
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>Analytics</span>
          <span className="rounded font-bold"
                style={{ fontSize: '9px', padding: '2px 8px', background: '#1a1a1a', color: GA, border: '1px solid rgba(249,115,22,0.25)' }}>
            {filtered.length} events
          </span>
        </div>
        <div className="flex-row-center gap-2" style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => setShowPdfModal(true)}
            disabled={pdfLoading}
            className="btn btn-ghost flex-row-center gap-1-5"
            style={{ fontSize: '10px', padding: '0.375rem 0.75rem' }}
          >
            <LogIcon style={{ width: '0.875rem', height: '0.875rem' }} />
            <span className="hidden sm:inline">{pdfLoading ? 'Preparing…' : 'PDF'}</span>
          </button>
        </div>
      </Toolbar>

      <div ref={contentRef} className="flex-col-start gap-4" style={{ padding: '1rem' }}>
        <KpiStrip kpis={kpis} events={filtered} groupFilter="ALL" />

        <Card title="Hourly Distribution" icon={<ClockIcon />}>
          <HourlyChart events={filtered} precomputedHourly={hourly} isFiltered={isFiltered} />
        </Card>

        <div className="grid-cards-3">
          <Card title="Direction of Origin" icon={<CompassIcon />}>
            <RadarChart dirData={dirData} groupFilter="ALL" />
            <div className="flex-row-center gap-4" style={{ marginTop: 8, justifyContent: 'center' }}>
              <div className="flex-row-center gap-1-5"><div className="rounded" style={{ background: GA, width: 8, height: 8 }} /><span style={{ fontSize: 9, color: '#888' }}>GA</span></div>
              <div className="flex-row-center gap-1-5"><div className="rounded" style={{ background: GB, width: 8, height: 8 }} /><span style={{ fontSize: 9, color: '#888' }}>GB</span></div>
            </div>
            <div className="grid-cols-4 gap-1" style={{ marginTop: '0.75rem' }}>
              {[...dirData].sort((a,b)=>b.total-a.total).slice(0,4).map(({ dir, total }) => (
                <div key={dir} className="text-center bg-dark-11 rounded-lg" style={{ padding: '0.375rem 0' }}>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: '#fff' }}>{dir}</div>
                  <div className="text-label-dark-gray" style={{ fontSize: '8px' }}>{total}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Drone Model Distribution" icon={<DroneIcon />}>
            <HBar data={models} colors={MODEL_COLORS} maxCount={maxModel} total={filtered.length} />
          </Card>

          <Card title="Protocol & Frequency" icon={<SignalIcon />}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Protocol</div>
              <HBar data={protocols} colors={protocols.map(([p]) => PROTO_COLORS[p] ?? '#888')} maxCount={protocols[0]?.[1] ?? 1} total={filtered.length} />
            </div>
            <div>
              <div style={{ fontSize: 8, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Frequency Band</div>
              <HBar data={freqBands.map(({ band, count }) => [band, count])} colors={['#38bdf8','#a75bfa','#34d399']} maxCount={Math.max(...freqBands.map(f => f.count), 1)} total={filtered.length} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}