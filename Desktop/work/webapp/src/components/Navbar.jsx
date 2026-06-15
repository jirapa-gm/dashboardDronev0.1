import { SidebarOpenIcon, SidebarClosedIcon, DroneIcon } from '../shared/icons';

export default function Navbar({ isMockMode, setIsMockMode, sidebarVisible, setSidebarVisible, activeTab }) {
  return (
    <nav className="nav-bar">
      <div className="flex-row-center gap-3">
        <button onClick={() => setSidebarVisible(!sidebarVisible)} className="btn-icon"
                aria-label={sidebarVisible ? 'Collapse sidebar' : 'Expand sidebar'}>
          {sidebarVisible ? <SidebarOpenIcon /> : <SidebarClosedIcon />}
        </button>

        <div className="nav-brand">
          <div className="nav-logo-box">
            <DroneIcon style={{ width: '1rem', height: '1rem', color: '#fff' }} stroke="white" />
          </div>
          <div>
            <span className="nav-title">DroneSentinel</span>
            <span className="nav-subtitle">Detection Dashboard</span>
          </div>
        </div>
      </div>

      <div className="flex-row-center gap-3">
        <div className="nav-status">
          <div className={`nav-status-dot ${isMockMode ? 'mock' : 'live'}`} />
          <span className="nav-status-text">
            {isMockMode ? 'Mock Data' : 'Live'}
          </span>
        </div>

        <div className="nav-mode-switch">
          {[['MOCK', isMockMode], ['LIVE', !isMockMode]].map(([label, active]) => {
            const btnClass = active
              ? (label === 'LIVE' ? 'mode-switch-btn active-live' : 'mode-switch-btn active-mock')
              : 'mode-switch-btn inactive';
            return (
              <button key={label} onClick={() => setIsMockMode(label === 'MOCK')} className={btnClass}>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}