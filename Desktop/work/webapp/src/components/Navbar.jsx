import { SidebarOpenIcon, SidebarClosedIcon, DroneIcon } from '../shared/icons';

export default function Navbar({ isMockMode, setIsMockMode, sidebarVisible, setSidebarVisible }) {
  return (
    <nav className="h-14 flex-none border-b border-[#3a3a3a] flex items-center justify-between px-6 bg-[#1e1e1e]">
      <div className="flex items-center gap-3">
        <button onClick={() => setSidebarVisible(!sidebarVisible)} className="btn-icon"
                aria-label={sidebarVisible ? 'Collapse sidebar' : 'Expand sidebar'}>
          {sidebarVisible ? <SidebarOpenIcon /> : <SidebarClosedIcon />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-900/30">
            <DroneIcon className="w-4 h-4 text-white" stroke="white" />
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-tight">DroneSentinel</span>
            <span className="hidden sm:inline text-[9px] text-[#555] ml-2 uppercase tracking-widest">
              Detection Dashboard
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isMockMode ? 'bg-[#555]' : 'bg-green-500 animate-pulse'}`} />
          <span className="text-[9px] text-[#555] uppercase tracking-widest">
            {isMockMode ? 'Mock Data' : 'Live'}
          </span>
        </div>

        <div className="flex bg-[#141414] p-1 rounded-lg border border-[#3a3a3a] gap-1">
          {[['MOCK', isMockMode], ['LIVE', !isMockMode]].map(([label, active]) => (
            <button key={label} onClick={() => setIsMockMode(label === 'MOCK')}
              className={[
                'px-3 py-1 rounded text-[10px] font-bold transition-all',
                active
                  ? label === 'LIVE'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40'
                    : 'bg-[#2d2d2d] text-orange-400 shadow-inner'
                  : 'text-[#555] hover:text-[#888]',
              ].join(' ')}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}