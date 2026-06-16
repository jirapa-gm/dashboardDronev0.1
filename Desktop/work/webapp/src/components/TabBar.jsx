import './Minors.css';
import { BarChartIcon, TargetIcon, LogIcon } from '../shared/icons';

const TABS = [
  { id: 'analytics', label: 'Analytics',    Icon: ({ active }) => <BarChartIcon className="w-3 h-3" stroke={active ? '#f97316' : 'currentColor'} /> },
  { id: 'tactical',  label: 'Tactical Map', Icon: ({ active }) => <TargetIcon   className="w-3 h-3" stroke={active ? '#f97316' : 'currentColor'} /> },
  { id: 'log',       label: 'Event Log',    Icon: ({ active }) => <LogIcon      className="w-3 h-3" stroke={active ? '#f97316' : 'currentColor'} /> },
];

export default function TabBar({ activeTab, setActiveTab, eventCount }) {
  const BADGE_COLOR = '#dd8511';
  return (
    <div className="tabbar-styled">
      {TABS.map(({ id, label, Icon }) => {
        const active = activeTab === id;
        const badge  = id === 'log' ? eventCount : null;
        return (
          <button key={id} onClick={() => setActiveTab(id)} className="tabbar-btn-base"
            className={`tabbar-btn ${active ? 'active' : 'inactive'}`}>
            <Icon active={active} />
            <span className="hidden sm:inline">{label}</span>
            {badge !== null && (
              <span className="rounded font-semibold"
                    className="rounded-full font-bold tabbar-badge" style={{ background: active ? `${BADGE_COLOR}20` : '#1a1a1a', color: active ? BADGE_COLOR : '#555', border: `1px solid ${active ? `${BADGE_COLOR}40` : '#2a2a2a'}` }}>
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
