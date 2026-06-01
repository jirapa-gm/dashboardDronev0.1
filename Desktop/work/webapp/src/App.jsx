import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar             from './components/Navbar';
import Sidebar            from './components/Sidebar';
import { DetectorSummary, GroupSummary, SubgroupSummary } from './components/Sidebar';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import TacticalMapView    from './components/TacticalMapView';
import EventLog           from './components/EventLog';
import { useEvents }      from './hooks/useEvents';
import { BarChartIcon, TargetIcon, LogIcon } from './shared/icons';
import { toDateStr }      from './shared/helpers';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDefaultDates(isMockMode) {
  if (isMockMode) return { startDate: '2026-04-01', endDate: '2026-04-10' };
  const today = new Date(), week = new Date(today);
  week.setDate(today.getDate() - 7);
  return { startDate: toDateStr(week), endDate: toDateStr(today) };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return isMobile;
}

function useSwipe(sidebarVisible, setSidebarVisible) {
  const startX = useRef(null), startY = useRef(null);
  const THRESHOLD = 60;
  const onStart = useCallback(e => { startX.current = e.touches[0].clientX; startY.current = e.touches[0].clientY; }, []);
  const onEnd   = useCallback(e => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    startX.current = null; startY.current = null;
    if (Math.abs(dx) < Math.abs(dy)) return;
    if (dx >  THRESHOLD && !sidebarVisible) setSidebarVisible(true);
    if (dx < -THRESHOLD &&  sidebarVisible) setSidebarVisible(false);
  }, [sidebarVisible, setSidebarVisible]);
  return { onStart, onEnd };
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
    <div className="flex-none border-b border-[#3a3a3a] bg-[#1a1a1a] flex items-center px-4 gap-0.5 overflow-x-auto">
      {TABS.map(({ id, label, Icon }) => {
        const active = activeTab === id;
        const badge  = id === 'log' ? eventCount : null;
        return (
          <button key={id} onClick={() => setActiveTab(id)} style={{ marginBottom: '-1px' }}
            className={['flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap',
              active ? 'text-orange-400 border-orange-500' : 'text-[#555] border-transparent hover:text-[#888] hover:border-[#3a3a3a]',
            ].join(' ')}>
            <Icon active={active} />
            <span className="hidden sm:inline">{label}</span>
            {badge !== null && (
              <span className="text-[8px] px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: active ? `${BADGE_COLOR}20` : '#1a1a1a', color: active ? BADGE_COLOR : '#555', border: `1px solid ${active ? `${BADGE_COLOR}40` : '#2a2a2a'}` }}>
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
  const Sep = () => <span className="text-[#3a3a3a]">/</span>;
  const Crumb = ({ label, onClick }) => (
    <button onClick={onClick} className="text-[10px] text-[#666] hover:text-orange-400 transition-colors font-bold uppercase tracking-widest">{label}</button>
  );
  const Active = ({ label }) => <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">{label}</span>;
  const Sub    = ({ label }) => <span className="text-[9px] text-[#555] ml-1">{label}</span>;

  return (
    <div className="flex-none border-b border-[#3a3a3a] bg-[#1a1a1a] flex items-center px-4 py-2 gap-3">
      <button onClick={onReset} className="flex items-center gap-1.5 text-[10px] text-[#666] hover:text-orange-400 transition-colors">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>

      {showGroup    && <><Sep/><Active label={activeGroup}    /><Sub label="Group Summary"    /></>}
      {showSubgroup && <><Sep/><Active label={activeGroup}    /><Sep/><Active label={activeSubgroup} /><Sub label="Subgroup Summary" /></>}
      {showDetector && <>
        <Sep/><Crumb label={activeGroup}    onClick={onReset} />
        <Sep/><Crumb label={activeSubgroup} onClick={onResetToGroup} />
        <Sep/><Active label={activeDetector} /><Sub label="Detector Summary" />
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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#1e1e1e] border border-[#3a3a3a] rounded-full px-4 py-2 text-[10px] text-[#888] flex items-center gap-2 z-50 shadow-xl pointer-events-none"
         style={{ animation: 'fadeInOut 3s ease forwards' }}>
      <svg className="w-3 h-3 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

  useEffect(() => {
    const { startDate, endDate } = getDefaultDates(isMockMode);
    search({ startDate, endDate, group: 'ALL', subgroup: 'ALL', detector: 'ALL' });
  }, [isMockMode, search]);

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
    <div className="min-h-screen w-full bg-[#141414] text-[#ccc] font-sans flex flex-col"
         onTouchStart={isMobile ? onStart : undefined}
         onTouchEnd={isMobile   ? onEnd   : undefined}>

      <Navbar isMockMode={isMockMode} setIsMockMode={setIsMockMode}
              sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible} />

      {/* TabBar is always visible — no longer replaced by Breadcrumb */}
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} eventCount={events.length} />

      <main className="flex-1 flex flex-row overflow-hidden relative">

        {/* Sidebar — always present on Analytics tab */}
        <Sidebar events={events} isLoading={isLoading} onSearch={handleSearch}
                 defaultStartDate={defaultDates.startDate} defaultEndDate={defaultDates.endDate}
                 visible={sidebarVisible && activeTab === 'analytics'} activeDetector={activeDetector} />

        {isMobile && sidebarVisible && activeTab === 'analytics' && (
          <div className="absolute inset-0 bg-black/50 z-30" onClick={() => setSidebarVisible(false)} />
        )}

        <div className="flex-1 overflow-hidden flex flex-col min-w-0">

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