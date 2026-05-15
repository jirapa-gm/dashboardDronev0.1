import { useState } from 'react';
import StatsPanel from './StatsPanel';

// ── Group  ─────────────────────────────────────────────────
const GROUP_ACTIVE_STYLE = {
  ALL: {
    background: 'rgba(249,115,22,0.15)',
    border:     '1px solid rgba(249,115,22,0.45)',
    color:      '#f97316',
    boxShadow:  '0 0 8px rgba(249,115,22,0.2)',
  },
  GA: {
    background: 'linear-gradient(135deg,#ea580c,#f97316)',
    border:     '1px solid #c2410c',
    color:      '#fff',
    boxShadow:  '0 2px 8px rgba(234,88,12,0.4)',
  },
  GB: {
    background: 'rgba(234,179,8,0.20)',
    border:     '1px solid rgba(234,179,8,0.60)',
    color:      '#eab308',
    boxShadow:  '0 0 8px rgba(234,179,8,0.25)',
  },
};

const GROUP_INACTIVE_STYLE = {
  background: '#202020',
  border:     '1px solid #404040',
  color:      '#888',
  boxShadow:  'none',
};

const groupBtnStyle = (group, active) =>
  active
    ? { ...GROUP_ACTIVE_STYLE[group], fontWeight: 700, transform: 'scale(1.05)' }
    : { ...GROUP_INACTIVE_STYLE,     fontWeight: 600, transform: 'scale(1)'    };

// ── Sub-components ────────────────────────────────────────────────────────────
function Collapsible({ isOpen, maxH = '400px', children }) {
  return (
    <div
      style={{
        maxHeight:  isOpen ? maxH : '0',
        opacity:    isOpen ? 1 : 0,
        overflow:   'hidden',
        transition: 'max-height 0.22s ease, opacity 0.18s ease',
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ label, icon, isOpen, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#202020] transition-colors group"
    >
      <div className="flex items-center gap-2 text-[9px] font-bold text-[#666] uppercase tracking-widest">
        <span className="text-[#444] group-hover:text-[#666] transition-colors">{icon}</span>
        {label}
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`w-3 h-3 text-[#444] transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-[#888] uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);

const GridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);

// ── Main component ────────────────────────────────────────────────────────────
export default function Sidebar({ events, isLoading, onSearch, defaultStartDate, defaultEndDate, visible }) {
  const [startDate,   setStartDate]   = useState(defaultStartDate);
  const [endDate,     setEndDate]     = useState(defaultEndDate);
  const [group,       setGroup]       = useState('ALL');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(true);

  const handleSearch = () => onSearch({ startDate, endDate, group });

  return (
    <aside
      style={{
        width:      visible ? '18rem' : '0',
        minWidth:   visible ? '18rem' : '0',
        overflow:   'hidden',
        transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1), min-width 0.28s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
        zIndex:     40,
      }}
      className="flex flex-col border-r border-[#3a3a3a] bg-[#1a1a1a]"
    >
      <div style={{ width: '18rem' }} className="flex flex-col flex-1 overflow-y-auto">

        {/* Filters */}
        <section className="border-b border-[#3a3a3a]">
          <SectionHeader
            label="Search Filters" icon={<FilterIcon />}
            isOpen={filtersOpen} onToggle={() => setFiltersOpen((v) => !v)}
          />
          <Collapsible isOpen={filtersOpen} maxH="460px">
            <div className="p-4 grid grid-cols-1 gap-2.5">
              <Field label="Start Date">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
              </Field>
              <Field label="End Date">
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
              </Field>
              <Field label="Group">
                <div className="flex gap-1.5 flex-wrap">
                  {['ALL', 'GA', 'GB'].map((g) => (
                    <button
                      key={g}
                      onClick={() => setGroup(g)}
                      className="btn text-[10px] px-3 py-1 rounded-full transition-all"
                      style={groupBtnStyle(g, group === g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </Field>
              <button onClick={handleSearch} disabled={isLoading} className="btn btn-primary w-full">
                {isLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    Search
                  </>
                )}
              </button>
            </div>
          </Collapsible>
        </section>

        {/* Summary */}
        <section className="border-b border-[#3a3a3a]">
          <SectionHeader
            label="Summary" icon={<GridIcon />}
            isOpen={summaryOpen} onToggle={() => setSummaryOpen((v) => !v)}
          />
          <Collapsible isOpen={summaryOpen} maxH="300px">
            <div className="p-4">
              <StatsPanel events={events} />
            </div>
          </Collapsible>
        </section>

      </div>
    </aside>
  );
}