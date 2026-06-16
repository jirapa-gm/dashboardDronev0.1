const ic = (path, extra = '') =>
  ({ className = 'w-3.5 h-3.5', stroke = 'currentColor', ...rest }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24"
         fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {path}
    </svg>
  );

export const FilterIcon  = ic(<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>);
export const GridIcon    = ic(<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>);
export const LayersIcon  = ic(<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>);
export const SearchIcon  = ic(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>);
export const ChevronIcon = ic(<polyline points="6 9 12 15 18 9"/>);
export const ChevronLeftIcon = ic(<polyline points="15 18 9 12 15 6"/>);
export const DownloadIcon = ic(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>);
export const SignalIcon  = ic(<><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M10.3 16.1a6 6 0 0 1 3.4 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>);
export const AlertIcon   = ic(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>);
export const ClockIcon   = ic(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>);
export const CompassIcon = ic(<><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></>);
export const DroneIcon   = ic(<><path d="M12 2a1 1 0 0 1 .894.553l3 6A1 1 0 0 1 15 10h-1v2h4a1 1 0 0 1 0 2h-4v2h1a1 1 0 0 1 .894 1.447l-3 6a1 1 0 0 1-1.788 0l-3-6A1 1 0 0 1 9 16h1v-2H6a1 1 0 0 1 0-2h4v-2H9a1 1 0 0 1-.894-1.447l3-6A1 1 0 0 1 12 2z"/></>);
export const TableIcon   = ic(<><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></>);
export const LogIcon     = ic(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></>);
export const TargetIcon  = ic(<polygon points="3 11 22 2 13 21 11 13 3 11"/>);
export const BarChartIcon = ic(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>);
export const SunIcon      = ic(<><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="6.34" y1="17.66" x2="4.93" y2="19.07"/><line x1="19.07" y1="4.93" x2="17.66" y2="6.34"/></>);
export const MoonIcon     = ic(<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>);
export const CalendarIcon = ic(<><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>);
export const SimulationIcon = ic(<><polygon points="5 3 19 12 5 21 5 3"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="2" y1="12" x2="5" y2="12"/></>);
export const PlayIcon       = ic(<polygon points="5 3 19 12 5 21 5 3"/>);
export const PauseIcon      = ic(<><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>);
export const RestartIcon    = ic(<><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></>);
export const LoopIcon       = ic(<><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>);
export const CloseIcon      = ic(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>);
export const GamepadIcon    = ic(<><rect x="2" y="6" width="20" height="12" rx="2" ry="2"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/></>);
export const CheckIcon      = ic(<polyline points="20 6 9 17 4 12"/>);

// ── Sidebar-specific icons ─────────────────────────────────────────────────────
export const SidebarOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
    <path d="m14 9-3 3 3 3"/>
  </svg>
);

export const SidebarClosedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="9" y1="3" x2="9" y2="21"/>
    <path d="m12 9 3 3-3 3"/>
  </svg>
);