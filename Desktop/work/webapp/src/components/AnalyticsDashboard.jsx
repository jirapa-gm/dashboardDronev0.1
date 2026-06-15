import { useState, useMemo, useRef, useCallback } from 'react';
import {
   buildDailyMap, buildDistribution, buildHourlyMap,
   buildDirectionMap, buildKPIs, buildFreqBands,
} from '../utils/chartUtils';
import { GA, GB, DIR_LABELS, PROTO_COLORS, MODEL_COLORS } from '../shared/constants';
import { Card, Spinner, EmptyState, GroupTabs, HBar, Toolbar } from '../shared/ui';
import { BarChartIcon, ClockIcon, CompassIcon, DroneIcon, SignalIcon, LogIcon, AlertIcon, SunIcon, MoonIcon } from '../shared/icons';
import { RadarChart, GroupBarChart, CombinedHourlyChart } from './Charts';
import { buildPdfHtml } from '../utils/pdfTemplate';

// ── PDF Export Modal ──────────────────────────────────────────────────────────
const ALL_SECTIONS = [
  { id: 'kpi',      label: 'KPI Summary',        sub: 'Total events, drones, speed…',  icon: '📊' },
  { id: 'subgroup', label: 'Subgroup / Detector', sub: 'Groups, detectors, lat/lon',    icon: '🗂' },
  { id: 'model',    label: 'Drone Models',        sub: 'Model distribution bars',       icon: '🚁' },
  { id: 'protocol', label: 'Protocol & Freq',     sub: 'Protocol & frequency bands',    icon: '📶' },
  { id: 'direction',label: 'Direction of Origin', sub: 'Top bearing sectors',           icon: '🧭' },
];

const DETAIL_LEVELS = [
  { id: 'group',    icon: '◉', label: 'Group',    sub: 'Totals only' },
  { id: 'subgroup', icon: '❖', label: 'Subgroup',  sub: 'Per-subgroup' },
  { id: 'detector', icon: '⊙', label: 'Detector',  sub: 'With lat/lon' },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PdfExportModal({ onClose, onExport, groupFilter, isLoading }) {
  const [scope,       setScope]       = useState(groupFilter);
  const [detailLevel, setDetailLevel] = useState('group');
  const [sections,    setSections]    = useState(new Set(['kpi','model','protocol','direction']));

  const toggle = (id) =>
    setSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allOn  = ALL_SECTIONS.every(s => sections.has(s.id));
  const toggleAll = () => setSections(allOn ? new Set() : new Set(ALL_SECTIONS.map(s => s.id)));

  return (
    <div className="pdf-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pdf-modal-card">
        {/* Header */}
        <div className="pdf-modal-header">
          <div className="pdf-modal-title">
            <span className="pdf-modal-title-icon">📄</span>
            Export PDF Report
          </div>
          <button className="pdf-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="pdf-modal-body">
          {/* Scope */}
          <div>
            <div className="pdf-section-label">Data Scope</div>
            <div className="pdf-scope-row">
              {['ALL','GA','GB'].map(g => (
                <button
                  key={g}
                  className={`pdf-scope-btn ${scope === g ? 'active' : ''}`}
                  onClick={() => setScope(g)}
                >
                  {g === 'ALL' ? '⬡ All Groups' : g === 'GA' ? '● Group GA' : '● Group GB'}
                </button>
              ))}
            </div>
          </div>

          {/* Detail Level */}
          <div>
            <div className="pdf-section-label">Detail Level</div>
            <div className="pdf-detail-row">
              {DETAIL_LEVELS.map(d => (
                <button
                  key={d.id}
                  className={`pdf-detail-btn ${detailLevel === d.id ? 'active' : ''}`}
                  onClick={() => setDetailLevel(d.id)}
                >
                  <span className="pdf-detail-btn-icon">{d.icon}</span>
                  <span className="pdf-detail-btn-label">{d.label}</span>
                  <span className="pdf-detail-btn-sub">{d.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section checkboxes */}
          <div>
            <div className="pdf-select-all-row">
              <div className="pdf-section-label" style={{ marginBottom: 0 }}>Report Sections</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="pdf-selected-count">
                  <strong>{sections.size}</strong> / {ALL_SECTIONS.length} selected
                </span>
                <button className="pdf-select-all-btn" onClick={toggleAll}>
                  {allOn ? 'Deselect all' : 'Select all'}
                </button>
              </div>
            </div>
            <div style={{ height: '0.5rem' }} />
            <div className="pdf-sections-grid">
              {ALL_SECTIONS.map(s => {
                const isChecked = sections.has(s.id);
                const disabled  = s.id === 'subgroup' && scope === 'ALL';
                return (
                  <div
                    key={s.id}
                    className={`pdf-check-item ${isChecked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
                    onClick={() => !disabled && toggle(s.id)}
                    style={disabled ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
                    title={disabled ? 'Subgroup data is not available in ALL scope' : undefined}
                  >
                    <div className="pdf-check-box">
                      {isChecked && <CheckIcon />}
                    </div>
                    <div className="pdf-check-text">
                      <span className="pdf-check-label">{s.icon} {s.label}</span>
                      <span className="pdf-check-sub">{s.sub}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pdf-modal-footer">
          <button className="pdf-cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="pdf-export-btn"
            disabled={sections.size === 0 || isLoading}
            onClick={() => onExport({ scope, detailLevel, sections })}
          >
            {isLoading
              ? <><span style={{ fontSize: 12 }}>⟳</span> Preparing…</>
              : <><span style={{ fontSize: 12 }}>↓</span> Export PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── KPI Strip — ALL mode ──────────────────────────────────────────────────────
function KpiStripAll({ kpis }) {
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
function KpiStripGroup({ events, groupFilter }) {
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
  const [groupFilter,   setGroupFilter]   = useState('ALL');
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [showPdfModal,  setShowPdfModal]  = useState(false);
  const contentRef = useRef(null);

  const filtered   = groupFilter === 'ALL' ? events : events.filter(e => e.group === groupFilter);
  const isFiltered = groupFilter !== 'ALL';

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
          groupFilter={groupFilter}
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
          <GroupTabs value={groupFilter} onChange={setGroupFilter} />
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
        <KpiStrip kpis={kpis} events={filtered} groupFilter={groupFilter} />

        <Card title="Hourly Distribution" icon={<ClockIcon />}>
          <HourlyChart events={filtered} precomputedHourly={hourly} isFiltered={isFiltered} />
        </Card>

        <div className="grid-cards-3">
          <Card title="Direction of Origin" icon={<CompassIcon />}>
            <RadarChart dirData={dirData} groupFilter={groupFilter} />
            <div className="flex-row-center gap-4" style={{ marginTop: 8, justifyContent: 'center' }}>
              {groupFilter !== 'GB' && <div className="flex-row-center gap-1-5"><div className="rounded" style={{ background: GA, width: 8, height: 8 }} /><span style={{ fontSize: 9, color: '#888' }}>GA</span></div>}
              {groupFilter !== 'GA' && <div className="flex-row-center gap-1-5"><div className="rounded" style={{ background: GB, width: 8, height: 8 }} /><span style={{ fontSize: 9, color: '#888' }}>GB</span></div>}
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