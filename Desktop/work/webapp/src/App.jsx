import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar      from './components/Navbar';
import Sidebar     from './components/Sidebar';
import EventsTable from './components/EventsTable';
import MapView     from './components/MapView';
import { useEvents } from './hooks/useEvents';

// ── Helpers ────────────────────────────────────────────────────────────────────
const toDateStr = (d) => d.toISOString().split('T')[0];

function getDefaultDates(isMockMode) {
  if (isMockMode) return { startDate: '2026-04-14', endDate: '2026-04-20' };
  const today = new Date();
  const week  = new Date(today);
  week.setDate(today.getDate() - 7);
  return { startDate: toDateStr(week), endDate: toDateStr(today) };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// ── Tab config ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'table', label: 'Events Table',  Icon: TableIcon  },
  { id: 'map',   label: 'Detection Map', Icon: MapIcon    },
];

// ── Root component ─────────────────────────────────────────────────────────────
export default function App() {
  const isMobile = useIsMobile();

  const [isMockMode,     setIsMockMode]     = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(!isMobile);
  const [activeTab,      setActiveTab]      = useState('table');

  // Swipe gesture
  const touchStartX     = useRef(null);
  const touchStartY     = useRef(null);
  const SWIPE_THRESHOLD = 60;

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < Math.abs(dy)) return; // vertical scroll — ignore
    if (dx >  SWIPE_THRESHOLD && !sidebarVisible) setSidebarVisible(true);
    if (dx < -SWIPE_THRESHOLD &&  sidebarVisible) setSidebarVisible(false);
  }, [sidebarVisible]);

  // Keep sidebar default in sync with viewport
  useEffect(() => {
    setSidebarVisible(!isMobile);
  }, [isMobile]);

  const { events, isLoading, currentPage, setCurrentPage, search } = useEvents(isMockMode);
  const defaultDates = getDefaultDates(isMockMode);

  // Auto-search on mode switch
  useEffect(() => {
    const { startDate, endDate } = getDefaultDates(isMockMode);
    search({ startDate, endDate, group: 'ALL' });
  }, [isMockMode, search]);

  return (
    <div
      className="min-h-screen w-full bg-[#141414] text-[#ccc] font-sans flex flex-col"
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchEnd={isMobile   ? handleTouchEnd   : undefined}
    >
      <Navbar
        isMockMode={isMockMode}
        setIsMockMode={setIsMockMode}
        sidebarVisible={sidebarVisible}
        setSidebarVisible={setSidebarVisible}
      />

      {/* Tab bar */}
      <div className="flex-none border-b border-[#3a3a3a] bg-[#1a1a1a] flex items-center px-4 gap-1 overflow-x-auto">
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{ marginBottom: '-1px' }}
              className={[
                'flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider',
                'border-b-2 transition-all whitespace-nowrap',
                active
                  ? 'text-orange-400 border-orange-500'
                  : 'text-[#555] border-transparent hover:text-[#888] hover:border-[#3a3a3a]',
              ].join(' ')}
            >
              <Icon active={active} />
              {label}
              {id === 'table' && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                  style={{
                    background: active ? 'rgba(249,115,22,0.15)' : '#222',
                    color:      active ? '#f97316' : '#555',
                    border:     `1px solid ${active ? 'rgba(249,115,22,0.3)' : '#3a3a3a'}`,
                  }}
                >
                  {events.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main layout */}
      <main className="flex-1 flex flex-row overflow-hidden relative">
        <Sidebar
          events={events}
          isLoading={isLoading}
          onSearch={search}
          defaultStartDate={defaultDates.startDate}
          defaultEndDate={defaultDates.endDate}
          visible={sidebarVisible}
        />

        {/* Mobile backdrop */}
        {isMobile && sidebarVisible && (
          <div className="absolute inset-0 bg-black/50 z-30" onClick={() => setSidebarVisible(false)} />
        )}

        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          {activeTab === 'table' && (
            <EventsTable
              events={events}
              isLoading={isLoading}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          )}
          {activeTab === 'map' && <MapView events={events} isLoading={isLoading} />}
        </div>
      </main>

      {isMobile && !sidebarVisible && <SwipeHint />}
    </div>
  );
}

// ── Minor components ───────────────────────────────────────────────────────────
function SwipeHint() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#1e1e1e] border border-[#3a3a3a] rounded-full px-4 py-2 text-[10px] text-[#888] flex items-center gap-2 z-50 shadow-xl pointer-events-none"
      style={{ animation: 'fadeInOut 3s ease forwards' }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-orange-400" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
      Swipe right to open filters
    </div>
  );
}

function TableIcon({ active }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24"
         fill="none" stroke={active ? '#f97316' : 'currentColor'} strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
      <line x1="9" y1="9" x2="9" y2="21"/>
    </svg>
  );
}

function MapIcon({ active }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24"
         fill="none" stroke={active ? '#f97316' : 'currentColor'} strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/>
      <line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  );
}