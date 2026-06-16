import { distColor } from '../../shared/helpers';

export function makeDetectorIcon(color) {
  const id = color.replace('#', '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <defs><filter id="df${id}"><feDropShadow dx="0" dy="1" stdDeviation="3" flood-color="${color}" flood-opacity="0.5"/></filter></defs>
    <circle cx="18" cy="18" r="14" fill="rgba(20,20,20,0.88)" stroke="${color}" stroke-width="2" filter="url(#df${id})"/>
    <circle cx="18" cy="18" r="8" fill="none" stroke="${color}" stroke-width="1" opacity="0.5" stroke-dasharray="3 3"/>
    <circle cx="18" cy="18" r="3" fill="${color}" opacity="0.95"/>
    <circle cx="18" cy="18" r="1.5" fill="#fff" opacity="0.9"/>
    <line x1="18" y1="4" x2="18" y2="9" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="18" y1="27" x2="18" y2="32" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="4" y1="18" x2="9" y2="18" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="27" y1="18" x2="32" y2="18" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;
  return window.L.divIcon({ html: `<div style="line-height:0">${svg}</div>`, iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -22], className: '' });
}

export function makeDroneDotIcon(color, isAlert) {
  const s = isAlert ? 22 : 18, t = s * 2;
  const pulse = isAlert
    ? `<circle cx="${s}" cy="${s}" r="${s - 2}" fill="${color}" opacity="0.18">
         <animate attributeName="r" values="${s - 2};${s + 10};${s - 2}" dur="1.4s" repeatCount="indefinite"/>
         <animate attributeName="opacity" values="0.18;0;0.18" dur="1.4s" repeatCount="indefinite"/>
       </circle>`
    : '';
  const glow = `<circle cx="${s}" cy="${s}" r="${s - 3}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.35"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 ${t} ${t}">
    ${pulse}
    ${glow}
    <circle cx="${s}" cy="${s}" r="5" fill="${color}"/>
    <circle cx="${s}" cy="${s}" r="2" fill="#fff"/>
  </svg>`;
  return window.L.divIcon({ html: `<div style="line-height:0">${svg}</div>`, iconSize: [t, t], iconAnchor: [s, s], popupAnchor: [0, -14], className: 'tac-smooth' });
}

export function buildDronePopup(evt, color) {
  const dist = evt.estimated_distance_m ?? null;
  const dc = distColor(dist);
  const crit = dist != null && dist < 100;
  const dirLabel = evt.direction ?? '—';

  // Premium row layout with inline SVG icon, label, and formatted value
  const row = (label, val, iconSvg, vc = '#fff') => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:6px">
      <div style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;background:rgba(255,255,255,0.04);border-radius:4px;color:#888;flex-shrink:0">
        ${iconSvg}
      </div>
      <div style="display:flex;flex-direction:column;gap:1px;overflow:hidden">
        <span style="color:#666;font-size:7.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:600">${label}</span>
        <span style="color:${vc};font-weight:700;font-size:10.5px;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${val}</span>
      </div>
    </div>`;

  // SVGs for rows
  const idIcon = `<svg style="width:10px;height:10px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const dirIcon = `<svg style="width:10px;height:10px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`;
  const protoIcon = `<svg style="width:10px;height:10px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
  const freqIcon = `<svg style="width:10px;height:10px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M10.3 16.1a6 6 0 0 1 3.4 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`;
  const distIcon = `<svg style="width:10px;height:10px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
  const heightIcon = `<svg style="width:10px;height:10px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;
  const clockIcon = `<svg style="width:10px;height:10px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

  const threatColor = evt.threat === 'HIGH' ? '#f43f5e' : evt.threat === 'MEDIUM' ? '#fb923c' : '#34d399';

  return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:11px;line-height:1.5;padding:4px 0;min-width:230px;color:#ddd">
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:6px">
      <div style="display:flex;align-items:center;gap:6px">
        <!-- Pulse dot -->
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color};animation:pulse 1.5s infinite"></span>
        <div style="font-size:13px;font-weight:800;color:#fff;font-family:monospace">${evt.drone_id}</div>
      </div>
      <div style="display:flex;gap:4px">
        <span style="font-size:8px;padding:2px 6px;border-radius:4px;font-weight:700;background:${threatColor}18;color:${threatColor};border:1px solid ${threatColor}30">${evt.threat} THREAT</span>
        ${crit ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:8px;padding:2px 6px;border-radius:4px;font-weight:700;background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.35)">
          <svg style="width:9px;height:9px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          CRITICAL
        </span>` : ''}
      </div>
    </div>
    
    <!-- Subtitle -->
    <div style="color:#888;font-size:10px;margin-bottom:8px;display:flex;justify-content:space-between">
      <span>${evt.model ?? 'Unknown Model'}</span>
      <span style="font-weight:700;color:${color}">${evt.group}</span>
    </div>
    
    <!-- Info Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
      ${row('Drone ID', evt.drone_id, idIcon, color)}
      ${row('Direction', dirLabel, dirIcon, '#60a5fa')}
      ${row('Protocol', evt.protocol_name ?? 'Unknown', protoIcon, (evt.protocol_name === 'DIY/FPV' || evt.protocol_name === 'Unknown') ? '#f43f5e' : '#34d399')}
      ${row('Frequency', evt.freq ? `${evt.freq} MHz` : '—', freqIcon, '#c084fc')}
      ${row('Distance', `${dist ?? '—'} m`, distIcon, dc)}
      ${row('Height', `${evt.height} m`, heightIcon, '#fb7185')}
    </div>
    
    <!-- Footer -->
    <div style="display:flex;align-items:center;gap:4px;color:#555;font-size:8.5px;font-family:monospace">
      ${clockIcon}
      <span>${evt.datetime?.replace('T', ' ').slice(0, 16) ?? ''}</span>
    </div>
  </div>`;
}

export function buildDetectorPopup(det, color) {
  const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dirCount = Object.fromEntries(DIRS.map(d => [d, 0]));
  det.events.forEach(e => { if (e.direction && dirCount[e.direction] !== undefined) dirCount[e.direction]++; });
  
  const maxCount = Math.max(...Object.values(dirCount), 1);
  
  // Render directions as a clean, compact progress bar list
  const dirRows = DIRS.filter(d => dirCount[d] > 0)
    .map(d => {
      const pct = (dirCount[d] / maxCount) * 100;
      return `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="color:#aaa;font-size:9.5px;font-weight:700;width:22px;font-family:monospace">${d}</span>
          <div style="flex:1;height:5px;background:rgba(255,255,255,0.05);border-radius:2.5px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${color};border-radius:2.5px;opacity:0.85"></div>
          </div>
          <span style="color:#fff;font-weight:700;font-size:9.5px;width:20px;text-align:right;font-family:monospace">${dirCount[d]}</span>
        </div>`;
    }).join('');

  const radarIcon = `<svg style="width:12px;height:12px;color:${color}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M10.3 16.1a6 6 0 0 1 3.4 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`;

  return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:11px;min-width:210px;color:#ddd">
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:6px">
      <div style="display:flex;align-items:center;gap:6px">
        ${radarIcon}
        <div style="font-size:13px;font-weight:800;color:#fff;font-family:monospace">${det.id}</div>
      </div>
      <!-- Status Badge -->
      <span style="display:inline-flex;align-items:center;gap:3.5px;font-size:8px;padding:2px 6px;border-radius:4px;font-weight:700;background:rgba(52,211,153,0.12);color:#34d399;border:1px solid rgba(52,211,153,0.25)">
        <span style="width:4.5px;height:4.5px;border-radius:50%;background:#34d399;display:inline-block;box-shadow:0 0 4px #34d399"></span>
        ACTIVE
      </span>
    </div>
    
    <!-- Subtitle -->
    <div style="color:#888;font-size:10px;margin-bottom:10px">${det.name ?? 'Operational Radar'}</div>
    
    <!-- Direction Stats -->
    <div style="color:#666;font-size:7.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:6px">Detections by Direction</div>
    <div style="margin-bottom:10px;background:rgba(255,255,255,0.01);border:1px solid rgba(255,255,255,0.03);border-radius:8px;padding:8px">
      ${dirRows || '<div style="color:#555;font-size:9.5px;padding:4px 0">No directional events recorded</div>'}
    </div>
    
    <!-- Summary Row -->
    <div style="padding:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;display:flex;align-items:center;justify-content:space-between">
      <span style="color:#777;font-size:8px;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Total Detections</span>
      <span style="color:${color};font-weight:800;font-size:13px;font-family:monospace">${det.events.length}</span>
    </div>
  </div>`;
}
