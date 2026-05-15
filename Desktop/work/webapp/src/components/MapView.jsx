import { useEffect, useRef, useState } from 'react';

const GROUP_COLORS = { GA: '#f97316', GB: '#eab308' };
const GROUPS       = ['ALL', 'GA', 'GB'];

let leafletReady = null;

function loadLeaflet() {
  if (leafletReady) return leafletReady;

  leafletReady = new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css')) {
      const link  = document.createElement('link');
      link.id     = 'leaflet-css';
      link.rel    = 'stylesheet';
      link.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (window.L) { resolve(); return; }

    const script   = document.createElement('script');
    script.src     = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload  = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return leafletReady;
}

// ── Marker factory ─────────────────────────────────────────────────────────────
function makeMarkerIcon(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00000055"/></filter>
      <path d="M14 2C8.477 2 4 6.477 4 12c0 8 10 22 10 22s10-14 10-22c0-5.523-4.477-10-10-10z"
            fill="${color}" filter="url(#s)" stroke="#fff" stroke-width="1.5"/>
      <circle cx="14" cy="12" r="4.5" fill="#fff" opacity="0.9"/>
      <circle cx="14" cy="12" r="2.5"  fill="${color}"/>
    </svg>`;
  return window.L.divIcon({
    html:        `<div style="line-height:0">${svg}</div>`,
    iconSize:    [28, 36],
    iconAnchor:  [14, 36],
    popupAnchor: [0, -38],
    className:   '',
  });
}

// ── Popup HTML ─────────────────────────────────────────────────────────────────
function buildPopupHtml(evt, color) {
  const fields = [
    ['GROUP',    evt.group,                             color],
    ['DETECTOR', evt.detector_id,                       '#222'],
    ['HEIGHT',   `${evt.height} m`,                    '#222'],
    ['SPEED',    `${evt.speed} m/s`,                   '#222'],
    ['FREQ',     `${evt.freq} MHz`,                    '#222'],
    ['TIME',     evt.datetime.replace('T', ' '),        '#555'],
  ];
  return `
    <div style="font-family:monospace;font-size:11px;line-height:1.6;padding:2px 0">
      <div style="font-size:13px;font-weight:700;color:${color};margin-bottom:4px">${evt.drone_id}</div>
      <div style="color:#555">${evt.model}</div>
      <hr style="border-color:#e5e7eb;margin:6px 0"/>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        ${fields.map(([k, v, c]) => `
          <div>
            <span style="color:#aaa;font-size:9px">${k}</span><br/>
            <span style="color:${c};font-size:${k === 'TIME' ? '9px' : 'inherit'}">${v}</span>
          </div>`).join('')}
      </div>
      <div style="margin-top:6px;color:#aaa;font-size:9px">
        ${evt.latitude.toFixed(5)}, ${evt.longitude.toFixed(5)}
      </div>
    </div>`;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MapView({ events, isLoading }) {
  const [filterGroup,  setFilterGroup]  = useState('ALL');
  const [selectedEvt,  setSelectedEvt]  = useState(null);
  const [mapReady,     setMapReady]     = useState(false);
  const [panelVisible, setPanelVisible] = useState(true);

  const mapRef     = useRef(null);
  const leafletMap = useRef(null);
  const markers    = useRef([]);

  const filtered = filterGroup === 'ALL' ? events : events.filter((e) => e.group === filterGroup);
  const center   = filtered.length > 0
    ? {
        lat: filtered.reduce((s, e) => s + e.latitude,  0) / filtered.length,
        lng: filtered.reduce((s, e) => s + e.longitude, 0) / filtered.length,
      }
    : { lat: 13.7563, lng: 100.5018 };

  // Init Leaflet once
  useEffect(() => {
    loadLeaflet().then(() => {
      if (!mapRef.current || leafletMap.current) return;

      const map = window.L.map(mapRef.current, { center: [center.lat, center.lng], zoom: 12 });
      window.L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom:    19,
        },
      ).addTo(map);

      leafletMap.current = map;
      setMapReady(true);
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Sync markers
  useEffect(() => {
    if (!mapReady || !leafletMap.current) return;
    const { L } = window;
    const map   = leafletMap.current;

    markers.current.forEach((m) => m.remove());
    markers.current = [];

    filtered.forEach((evt) => {
      const color  = GROUP_COLORS[evt.group] ?? '#888';
      const marker = L.marker([evt.latitude, evt.longitude], { icon: makeMarkerIcon(color) })
        .bindPopup(L.popup({ maxWidth: 220, closeButton: false }).setContent(buildPopupHtml(evt, color)))
        .addTo(map);

      marker.on('click', () => setSelectedEvt(evt));
      markers.current.push(marker);
    });

    if (filtered.length > 0) {
      map.fitBounds(
        L.latLngBounds(filtered.map((e) => [e.latitude, e.longitude])),
        { padding: [40, 40], maxZoom: 15 },
      );
    } else {
      map.setView([center.lat, center.lng], 12);
    }
  }, [mapReady, filtered.length, filterGroup, events]);

  // Relayout on panel toggle
  useEffect(() => {
    if (leafletMap.current) setTimeout(() => leafletMap.current?.invalidateSize(), 260);
  }, [panelVisible]);

  return (
    <div className="flex flex-col h-full" style={{ background: '#f0f0f0' }}>
      {/* Leaflet popup overrides */}
      <style>{`
        .leaflet-popup-content-wrapper {
          background:#fff!important; border:1px solid #e5e7eb!important;
          border-radius:12px!important; box-shadow:0 8px 32px rgba(0,0,0,.12)!important; color:#222!important;
        }
        .leaflet-popup-tip { background:#fff!important; }
        .leaflet-control-zoom a {
          background:#fff!important; border-color:#e5e7eb!important; color:#555!important;
        }
        .leaflet-control-zoom a:hover { background:#f9fafb!important; color:#111!important; }
      `}</style>

      {/* Toolbar */}
      <div className="px-4 py-2.5 border-b border-[#3a3a3a] bg-[#1a1a1a] flex items-center gap-3 flex-wrap flex-none">
        <div className="flex items-center gap-2">
          <MapPinIcon />
          <span className="text-sm font-bold text-white">Detection Map</span>
          <span className="text-[9px] px-2 py-0.5 rounded font-bold"
                style={{ background: '#222', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>
            {filtered.length}
          </span>
        </div>

        <div className="flex gap-1.5 ml-auto flex-wrap items-center">
          {GROUPS.map((g) => {
            const isActive = filterGroup === g;
            const color    = g === 'GA' ? '#f97316' : g === 'GB' ? '#eab308' : '#aaa';
            const count    = g === 'ALL' ? events.length : events.filter((e) => e.group === g).length;
            return (
              <button
                key={g}
                onClick={() => setFilterGroup(g)}
                className="btn text-[10px] px-3 py-1 rounded-full transition-all"
                style={{
                  background: isActive ? `${color}22` : '#1e1e1e',
                  border:     `1px solid ${isActive ? color : '#3a3a3a'}`,
                  color:      isActive ? color : '#777',
                  fontWeight: 700,
                  boxShadow:  isActive ? `0 0 10px ${color}44` : 'none',
                }}
              >
                {g === 'ALL' ? `All (${count})` : `${g} (${count})`}
              </button>
            );
          })}

          {filtered.length > 0 && (
            <button
              onClick={() => setPanelVisible((v) => !v)}
              title={panelVisible ? 'Hide event list' : 'Show event list'}
              className="btn text-[10px] px-2.5 py-1 rounded-lg"
              style={{ background: '#1e1e1e', border: '1px solid #3a3a3a', color: panelVisible ? '#f97316' : '#666', marginLeft: '4px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {panelVisible
                  ? <><rect x="14" y="3" width="7" height="18" rx="1"/><rect x="3" y="3" width="7" height="18" rx="1"/></>
                  : <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></>}
              </svg>
              <span className="hidden sm:inline ml-1">{panelVisible ? 'Hide List' : 'Show List'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Map + side panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-[1000]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
                <span className="text-[10px] text-gray-400 uppercase tracking-widest">Loading…</span>
              </div>
            </div>
          )}
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

          {/* Legend overlay */}
          <div
            className="absolute bottom-8 left-3 z-[999] backdrop-blur-sm rounded-xl px-3 py-2.5 flex flex-col gap-1.5 shadow-lg pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid #e5e7eb' }}
          >
            <span className="text-[8px] text-gray-400 uppercase tracking-widest font-bold mb-0.5">Legend</span>
            {Object.entries(GROUP_COLORS).map(([g, c]) => (
              <div key={g} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: c }} />
                <span className="text-[9px] text-gray-500">Group {g}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Event list panel */}
        <div
          style={{
            width:      panelVisible ? '256px' : '0',
            minWidth:   panelVisible ? '256px' : '0',
            overflow:   'hidden',
            transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)',
            flexShrink: 0,
          }}
          className="border-l border-[#2a2a2a] bg-[#111] flex flex-col"
        >
          <div style={{ width: '256px' }} className="flex flex-col h-full overflow-hidden">
            <div className="px-3 py-2 border-b border-[#2a2a2a] flex items-center justify-between flex-none">
              <span className="text-[9px] font-bold text-[#555] uppercase tracking-widest">Events</span>
              <span className="text-[9px] text-[#444]">{filtered.length} records</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.map((evt, i) => {
                const color      = GROUP_COLORS[evt.group] ?? '#888';
                const isSelected = selectedEvt?.drone_id === evt.drone_id && selectedEvt?.datetime === evt.datetime;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedEvt(isSelected ? null : evt);
                      if (leafletMap.current && !isSelected) {
                        leafletMap.current.setView([evt.latitude, evt.longitude], 15, { animate: true });
                        markers.current[i]?.openPopup();
                      }
                    }}
                    className="w-full text-left px-3 py-2.5 border-b border-[#1a1a1a] transition-all"
                    style={{
                      background:  isSelected ? `${color}12` : 'transparent',
                      borderLeft: `2px solid ${isSelected ? color : 'transparent'}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-mono font-bold" style={{ color }}>{evt.drone_id}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
                        {evt.group}
                      </span>
                    </div>
                    <div className="text-[9px] text-[#555]">{evt.model}</div>
                    <div className="text-[9px] text-[#444] mt-0.5 font-mono">
                      {evt.latitude.toFixed(4)}, {evt.longitude.toFixed(4)}
                    </div>
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-[#2a2a2a] grid grid-cols-2 gap-1">
                        {[['Height', `${evt.height} m`], ['Speed', `${evt.speed} m/s`],
                          ['Freq',   `${evt.freq} MHz`], ['Det.',  evt.detector_id]].map(([k, v]) => (
                          <div key={k}>
                            <div className="text-[8px] text-[#444] uppercase">{k}</div>
                            <div className="text-[9px] text-[#888] font-mono">{v}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const MapPinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-orange-500" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);