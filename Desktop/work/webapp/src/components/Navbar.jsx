const SidebarOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
    <path d="m14 9-3 3 3 3"/>
  </svg>
);

const SidebarClosedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
    <path d="m12 9 3 3-3 3"/>
  </svg>
);

export default function Navbar({ isMockMode, setIsMockMode, sidebarVisible, setSidebarVisible }) {
  return (
    <nav className="h-14 flex-none border-b border-[#3a3a3a] flex items-center justify-between px-6 bg-[#1e1e1e]">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarVisible(!sidebarVisible)}
          className="btn-icon"
          aria-label={sidebarVisible ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarVisible ? <SidebarOpenIcon /> : <SidebarClosedIcon />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-900/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a1 1 0 0 1 .894.553l3 6A1 1 0 0 1 15 10h-1v2h4a1 1 0 0 1 0 2h-4v2h1a1 1 0 0 1 .894 1.447l-3 6a1 1 0 0 1-1.788 0l-3-6A1 1 0 0 1 9 16h1v-2H6a1 1 0 0 1 0-2h4v-2H9a1 1 0 0 1-.894-1.447l3-6A1 1 0 0 1 12 2z" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-tight">DroneSentinel</span>
            <span className="hidden sm:inline text-[9px] text-[#555] ml-2 uppercase tracking-widest">
              Detection Dashboard
            </span>
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isMockMode ? 'bg-[#555]' : 'bg-green-500 animate-pulse'}`} />
          <span className="text-[9px] text-[#555] uppercase tracking-widest">
            {isMockMode ? 'Mock Data' : 'Live'}
          </span>
        </div>

        <div className="flex bg-[#141414] p-1 rounded-lg border border-[#3a3a3a] gap-1">
          {[
            { label: 'MOCK', active: isMockMode,  onClick: () => setIsMockMode(true)  },
            { label: 'LIVE', active: !isMockMode, onClick: () => setIsMockMode(false) },
          ].map(({ label, active, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className={[
                'px-3 py-1 rounded text-[10px] font-bold transition-all',
                active
                  ? label === 'LIVE'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40'
                    : 'bg-[#2d2d2d] text-orange-400 shadow-inner'
                  : 'text-[#555] hover:text-[#888]',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}