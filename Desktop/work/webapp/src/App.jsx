import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar             from './components/Navbar';
import Sidebar            from './components/Sidebar';
import { DetectorSummary, GroupSummary, SubgroupSummary } from './components/Sidebar';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import TacticalMapView    from './components/TacticalMapView';
import EventLog           from './components/EventLog';
import { useEvents }      from './hooks/useEvents';
import { useIsMobile }    from './hooks/useIsMobile';
import { useSwipe }       from './hooks/useSwipe';
import { BarChartIcon, TargetIcon, LogIcon } from './shared/icons';
import { toDateStr }      from './shared/helpers';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDefaultDates(isMockMode) {
  if (isMockMode) return { startDate: '2026-04-01', endDate: '2026-04-10' };
  const today = new Date(), week = new Date(today);
  week.setDate(today.getDate() - 7);
  return { startDate: toDateStr(week), endDate: toDateStr(today) };
}

// ── เมนู ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'analytics', label: 'Analytics',    Icon: ({ active }) => <BarChartIcon className="w-3 h-3" stroke={active ? '#f97316' : 'currentColor'} /> },
  { id: 'tactical',  label: 'Tactical Map', Icon: ({ active }) => <TargetIcon   className="w-3 h-3" stroke={active ? '#f97316' : 'currentColor'} /> },
  { id: 'log',       label: 'Event Log',    Icon: ({ active }) => <LogIcon      className="w-3 h-3" stroke={active ? '#f97316' : 'currentColor'} /> },
];

// ── Tab bar ───────────────────────────────────────────────────────────────────
function TabBar({ activeTab, setActiveTab, eventCount }) {
  const BADGE_COLOR = '#dd8511';
  return (
    <div className="tabbar-styled">
      {TABS.map(({ id, label, Icon }) => {
        const active = activeTab === id;
        const badge  = id === 'log' ? eventCount : null;
        return (
          <button key={id} onClick={() => setActiveTab(id)} style={{ marginBottom: '-1px' }}
            className={`tabbar-btn ${active ? 'active' : 'inactive'}`}>
            <Icon active={active} />
            <span className="hidden sm:inline">{label}</span>
            {badge !== null && (
              <span className="rounded font-semibold"
                    style={{ fontSize: '8px', padding: '2px 6px', background: active ? `${BADGE_COLOR}20` : '#1a1a1a', color: active ? BADGE_COLOR : '#555', border: `1px solid ${active ? `${BADGE_COLOR}40` : '#2a2a2a'}` }}>
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── แถบนำทาง ───
function Breadcrumb({ activeGroup, activeSubgroup, activeDetector, onReset, onResetToGroup }) {
  const showDetector = activeDetector !== 'ALL';
  const showSubgroup = !showDetector && activeSubgroup !== 'ALL';
  const showGroup    = !showDetector && !showSubgroup && activeGroup !== 'ALL';
  const Sep = () => <span style={{ color: '#3a3a3a' }}>/</span>;

  return (
    <div className="breadcrumb-container">
      <button onClick={onReset} className="breadcrumb-back">
        <svg style={{ width: '0.75rem', height: '0.75rem' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>

      {showGroup    && <><Sep/><span className="breadcrumb-active">{activeGroup}</span><span style={{ fontSize: '9px', color: '#555', marginLeft: '0.25rem' }}>Group Summary</span></>}
      {showSubgroup && <><Sep/><span className="breadcrumb-active">{activeGroup}</span><Sep/><span className="breadcrumb-active">{activeSubgroup}</span><span style={{ fontSize: '9px', color: '#555', marginLeft: '0.25rem' }}>Subgroup Summary</span></>}
      {showDetector && <>
        <Sep/><button onClick={onReset} className="breadcrumb-crumb">{activeGroup}</button>
        <Sep/><button onClick={onResetToGroup} className="breadcrumb-crumb">{activeSubgroup}</button>
        <Sep/><span className="breadcrumb-active">{activeDetector}</span><span style={{ fontSize: '9px', color: '#555', marginLeft: '0.25rem' }}>Detector Summary</span>
      </>}
    </div>
  );
}

// ── pop-up  ──────────────────────────────────────────────────────────
function SwipeHint() {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const t = setTimeout(() => setVisible(false), 3000); return () => clearTimeout(t); }, []);
  if (!visible) return null;
  return (
    <div className="swipe-hint-container" style={{ animation: 'fadeInOut 3s ease forwards' }}>
      <svg style={{ width: '0.75rem', height: '0.75rem', color: '#fb923c' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
      Swipe right to open filters
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();

  const [isMockMode,     setIsMockMode]     = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(!isMobile);
  const [activeTab,      setActiveTab]      = useState('analytics');
  const [activeDetector, setActiveDetector] = useState('ALL');
  const [activeGroup,    setActiveGroup]    = useState('ALL');
  const [activeSubgroup, setActiveSubgroup] = useState('ALL');

  const { onStart, onEnd } = useSwipe(sidebarVisible, setSidebarVisible);
  useEffect(() => { setSidebarVisible(!isMobile); }, [isMobile]);

  const {
    events, summary, daily, hourly, directions, freqBands, droneStats,
    modelCount, protocolSummary,
    isLoading, currentPage, setCurrentPage, search
  } = useEvents(isMockMode);
  const defaultDates = getDefaultDates(isMockMode);

  const handleSearch = useCallback((params) => {
    const det = params.detector ?? 'ALL';
    const sg  = params.subgroup ?? 'ALL';
    const g   = params.group    ?? 'ALL';
    setActiveDetector(det); setActiveSubgroup(sg); setActiveGroup(g);
    search({ startDate: params.startDate, endDate: params.endDate, group: g, subgroup: sg, detector: det });
  }, [search]);

  const resetAll     = () => { setActiveDetector('ALL'); setActiveSubgroup('ALL'); setActiveGroup('ALL'); };
  const resetToGroup = () => { setActiveDetector('ALL'); setActiveSubgroup('ALL'); };

  const showDetector = activeDetector !== 'ALL';
  const showSubgroup = !showDetector && activeSubgroup !== 'ALL';
  const showGroup    = !showDetector && !showSubgroup && activeGroup !== 'ALL';
  const showSummary  = showDetector || showSubgroup || showGroup;

  return (
    <div className="app-container"
         onTouchStart={isMobile ? onStart : undefined}
         onTouchEnd={isMobile   ? onEnd   : undefined}>

      <Navbar isMockMode={isMockMode} setIsMockMode={setIsMockMode}
              sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible} />

      {/* TabBar is always visible — no longer replaced by Breadcrumb */}
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} eventCount={events.length} />

      <main className="main-content">

        {/* Sidebar — always present on Analytics tab */}
        <Sidebar events={events} isLoading={isLoading} onSearch={handleSearch}
                 defaultStartDate={defaultDates.startDate} defaultEndDate={defaultDates.endDate}
                 visible={sidebarVisible && activeTab === 'analytics'} activeDetector={activeDetector} />

        {isMobile && sidebarVisible && activeTab === 'analytics' && (
          <div className="backdrop-overlay" onClick={() => setSidebarVisible(false)} />
        )}

        <div className="content-pane">

          {/* ── Analytics tab ── sidebar stays, breadcrumb lives inside content */}
          {activeTab === 'analytics' && <>
            {showSummary && (
              <Breadcrumb
                activeGroup={activeGroup} activeSubgroup={activeSubgroup} activeDetector={activeDetector}
                onReset={resetAll} onResetToGroup={resetToGroup}
              />
            )}
            {showGroup    && <GroupSummary    groupId={activeGroup} events={events} />}
            {showSubgroup && <SubgroupSummary groupId={activeGroup} subgroupId={activeSubgroup} events={events} />}
            {showDetector && <DetectorSummary detectorId={activeDetector} events={events} />}
            {!showSummary && (
              <AnalyticsDashboard
                events={events}
                summary={summary}
                daily={daily}
                hourly={hourly}
                directions={directions}
                freqBands={freqBands}
                droneStats={droneStats}
                modelCount={modelCount}
                protocolSummary={protocolSummary}
                isLoading={isLoading}
                isMockMode={isMockMode}
              />
            )}
          </>}

          {activeTab === 'tactical' && <TacticalMapView events={events} isLoading={isLoading} />}
          {activeTab === 'log'      && (
            <EventLog
              events={events} droneStats={droneStats} isLoading={isLoading}
              currentPage={currentPage} setCurrentPage={setCurrentPage}
              onSearch={handleSearch}
              defaultStartDate={defaultDates.startDate} defaultEndDate={defaultDates.endDate}
            />
          )}
        </div>
      </main>

      {isMobile && !sidebarVisible && activeTab === 'analytics' && <SwipeHint />}
    </div>
  );
}