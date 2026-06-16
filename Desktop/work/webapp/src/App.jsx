import { useState, useEffect, useCallback } from 'react';
import Navbar             from './components/Navbar';
import Sidebar            from './components/Sidebar';
import { DetectorSummary, GroupSummary, SubgroupSummary } from './components/summaries';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import TacticalMapView    from './components/TacticalMapView';
import EventLog           from './components/EventLog';
import TabBar             from './components/TabBar';
import Breadcrumb         from './components/Breadcrumb';
import SwipeHint          from './components/SwipeHint';
import { useEvents }      from './hooks/useEvents';
import { useSimulation }  from './simulation/useSimulation';
import { useIsMobile }    from './hooks/useIsMobile';
import { useSwipe }       from './hooks/useSwipe';
import { toDateStr }      from './shared/helpers';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDefaultDates(isMockMode) {
  if (isMockMode) return { startDate: '2026-04-01', endDate: '2026-04-10' };
  const today = new Date(), week = new Date(today);
  week.setDate(today.getDate() - 7);
  return { startDate: toDateStr(week), endDate: toDateStr(today) };
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

  const simContext = useSimulation();

  const {
    events, summary, daily, hourly, directions, freqBands, droneStats,
    modelCount, protocolSummary,
    isLoading, currentPage, setCurrentPage, search
  } = useEvents(isMockMode, activeTab, simContext.simMode, simContext.simulatedEvents);
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
              sidebarVisible={sidebarVisible} setSidebarVisible={setSidebarVisible}
              activeTab={activeTab} />

      {/* TabBar is always visible — no longer replaced by Breadcrumb */}
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} eventCount={events.length} />

      <main className="main-content">

        {/* Sidebar — always present */}
        <Sidebar events={events} isLoading={isLoading} onSearch={handleSearch}
                 defaultStartDate={defaultDates.startDate} defaultEndDate={defaultDates.endDate}
                 visible={sidebarVisible} activeDetector={activeDetector}
                 activeGroup={activeGroup} activeSubgroup={activeSubgroup} />

        {isMobile && sidebarVisible && (
          <div className="backdrop-overlay" onClick={() => setSidebarVisible(false)} />
        )}

        <div className="content-pane">

          {/* Breadcrumb is now global to show active filters on all tabs */}
          {showSummary && activeTab !== 'log' && (
            <div className="shrink-0">
              <Breadcrumb
                activeGroup={activeGroup} activeSubgroup={activeSubgroup} activeDetector={activeDetector}
                onReset={resetAll} onResetToGroup={resetToGroup}
              />
            </div>
          )}

          {/* ── Analytics tab ── */}
          {activeTab === 'analytics' && <>
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

          {activeTab === 'tactical' && <TacticalMapView events={events} summary={summary} isLoading={isLoading} simContext={simContext} />}
          {activeTab === 'log'      && (
            <EventLog
              events={events} droneStats={droneStats} isLoading={isLoading}
              currentPage={currentPage} setCurrentPage={setCurrentPage}
            />
          )}
        </div>
      </main>

      {isMobile && !sidebarVisible && <SwipeHint />}
    </div>
  );
}