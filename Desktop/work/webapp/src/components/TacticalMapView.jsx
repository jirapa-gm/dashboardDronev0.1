import { useEffect, useRef, useState, useMemo } from 'react';
import { GA, GB } from '../shared/constants';
import { distColor } from '../shared/helpers';
import { TargetIcon, AlertIcon, LayersIcon, SignalIcon, PlayIcon, PauseIcon, RestartIcon, LoopIcon, CloseIcon, GamepadIcon } from '../shared/icons';
import { Toolbar } from '../shared/ui';
import { loadLeaflet, haversine, destPoint, buildDetectors, computeRadarBounds } from '../utils/mapUtils';
import { getDronePosition } from '../utils/simulationEngine';

import SimConfigPanel from './SimConfigPanel';

// ── Constants ─────────────────────────────────────────────────────────────────
const GROUP_COLORS = { GA, GB };

// ── Leaflet icon builders ─────────────────────────────────────────────────────
function makeDetectorIcon(color) {
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

function makeDroneDotIcon(color, isAlert) {
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
    <circle cx="${s}" cy="${s}" r="${s - 6}" fill="${color}" opacity="0.92" stroke="#111" stroke-width="2"/>
    <circle cx="${s}" cy="${s}" r="${Math.round((s - 6) * 0.38)}" fill="#fff" opacity="0.75"/>
  </svg>`;
  return window.L.divIcon({ html: `<div style="line-height:0">${svg}</div>`, iconSize: [t, t], iconAnchor: [s, s], popupAnchor: [0, -s - 6], className: '' });
}

// ── Drone popup HTML ──────────────────────────────────────────────────────────
function buildDronePopup(evt, color) {
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

// ── Detector popup HTML ───────────────────────────────────────────────────────
function buildDetectorPopup(det, color) {
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

// ── Animated radar sweep (Canvas layer) — stays anchored to detector positions ──
let globalSweepAngleDeg = 0;

class SweepLayer {
  constructor(detectors) {
    // detectors: Array of { lat, lon, radiusM }
    this._detectors = detectors; 
    this._lastTime = null;
    this._raf = null; this._canvas = null; this._map = null;
    this._SPEED = 45;
    this._onViewChange = this._onViewChange.bind(this);
  }
  onAdd(map) {
    this._map = map;
    this._canvas = document.createElement('canvas');
    this._canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:400;';
    map.getPanes().overlayPane.appendChild(this._canvas);
    map.on('move zoom viewreset resize moveend zoomend', this._onViewChange, this);
    this._resize(); this._lastTime = performance.now();
    this._raf = requestAnimationFrame(t => this._tick(t));
  }
  onRemove(map) {
    cancelAnimationFrame(this._raf); this._raf = null;
    if (this._canvas?.parentNode) this._canvas.parentNode.removeChild(this._canvas);
    map.off('move zoom viewreset resize moveend zoomend', this._onViewChange, this);
    this._canvas = null; this._map = null;
  }
  _onViewChange() {
    this._resize();
  }
  _resize() {
    if (!this._map || !this._canvas) return;
    const s = this._map.getSize();
    this._canvas.width = s.x; this._canvas.height = s.y;
    const origin = this._map.containerPointToLayerPoint([0, 0]);
    window.L.DomUtil.setPosition(this._canvas, origin);
  }
  _tick(now) {
    if (!this._map || !this._canvas) return;
    const dt = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now; globalSweepAngleDeg = (globalSweepAngleDeg + this._SPEED * dt) % 360;
    this._draw(); this._raf = requestAnimationFrame(t => this._tick(t));
  }
  _draw() {
    if (!this._map || !this._canvas) return;
    const cv = this._canvas, ctx = cv.getContext('2d');
    const s = this._map.getSize(); ctx.clearRect(0, 0, s.x, s.y);
    
    this._detectors.forEach(det => {
      const cp = this._map.latLngToContainerPoint([det.lat, det.lon]);
      const ep = this._map.latLngToContainerPoint([det.lat + det.radiusM / 111320, det.lon]);
      const rPx = Math.abs(cp.y - ep.y);
      const sweepRad = (globalSweepAngleDeg - 90) * Math.PI / 180, fanRad = 80 * Math.PI / 180;
      ctx.save();
      const grd = ctx.createRadialGradient(cp.x, cp.y, 0, cp.x, cp.y, rPx);
      grd.addColorStop(0, 'rgba(34,197,94,0.0)'); grd.addColorStop(0.15, 'rgba(34,197,94,0.10)');
      grd.addColorStop(0.65, 'rgba(34,197,94,0.06)'); grd.addColorStop(1.0, 'rgba(34,197,94,0.0)');
      ctx.beginPath(); ctx.moveTo(cp.x, cp.y);
      ctx.arc(cp.x, cp.y, rPx, sweepRad - fanRad, sweepRad, false); ctx.closePath();
      ctx.fillStyle = grd; ctx.fill();
      ctx.beginPath(); ctx.moveTo(cp.x, cp.y);
      ctx.lineTo(cp.x + rPx * Math.cos(sweepRad), cp.y + rPx * Math.sin(sweepRad));
      ctx.strokeStyle = 'rgba(34,197,94,0.75)'; ctx.lineWidth = 2;
      ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(34,197,94,0.7)'; ctx.stroke();
      ctx.restore();
    });
  }
}

// ── Per-detector radar overlay ────────────────────────────────────────────────
function drawDetectorRadar(map, L, det) {
  const { lat, lon } = det;
  const events = det.events;
  const layers = [];
  const DIRS = [
    { label: 'N', deg: 0 }, { label: 'NE', deg: 45 }, { label: 'E', deg: 90 }, { label: 'SE', deg: 135 },
    { label: 'S', deg: 180 }, { label: 'SW', deg: 225 }, { label: 'W', deg: 270 }, { label: 'NW', deg: 315 }
  ];
  const dirCount = Object.fromEntries(DIRS.map(d => [d.label, 0]));
  events.forEach(e => { if (e.direction && dirCount[e.direction] !== undefined) dirCount[e.direction]++; });

  const maxDist = Math.max(...events.map(e => e.estimated_distance_m ?? 800), 800);
  const radiusM = Math.min(maxDist * 1.3 + 200, 2000);

  // Zone rings
  [
    { frac: .20, fill: '#ef4444', fOp: .06, stroke: '#ef4444', sOp: .60, w: 1.5 },
    { frac: .40, fill: '#f97316', fOp: .04, stroke: '#f97316', sOp: .40, w: 1.2, dash: '6 4' },
    { frac: .60, fill: '#eab308', fOp: .03, stroke: '#eab308', sOp: .35, w: 1, dash: '6 4' },
    { frac: .80, fill: '#22c55e', fOp: .02, stroke: '#22c55e', sOp: .25, w: 1, dash: '8 6' },
    { frac: 1.0, fill: '#3b82f6', fOp: .01, stroke: '#3b82f6', sOp: .55, w: 2 }
  ].forEach(z => {
    layers.push(L.circle([lat, lon], { radius: radiusM * z.frac, color: z.stroke, weight: z.w, opacity: z.sOp, fillColor: z.fill, fillOpacity: z.fOp, dashArray: z.dash, interactive: false }).addTo(map));
  });

  // Threat sectors
  DIRS.forEach(({ label, deg }) => {
    const count = dirCount[label]; if (!count) return;
    const startR = (deg - 22.5) * Math.PI / 180, endR = (deg + 22.5) * Math.PI / 180;
    const dirEvts = events.filter(e => e.direction === label);
    const minDist = Math.min(...dirEvts.map(e => e.estimated_distance_m ?? 999));
    const arcColor = distColor(minDist), intensity = Math.min(.10 + count * .05, .38);
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const a = startR + (endR - startR) * (i / 14);
      const dlat = (radiusM * .9 * Math.cos(a)) / 111320;
      const dlon = (radiusM * .9 * Math.sin(a)) / (111320 * Math.cos(lat * Math.PI / 180));
      pts.push([lat + dlat, lon + dlon]);
    }
    pts.push([lat, lon]);
    layers.push(L.polygon(pts, { color: arcColor, weight: 1.2, opacity: .6, fillColor: arcColor, fillOpacity: intensity, interactive: false }).addTo(map));
  });

  // Spoke lines + direction labels
  DIRS.forEach(({ label, deg }) => {
    const count = dirCount[label], rad = deg * Math.PI / 180;
    const dlat = (radiusM * Math.cos(rad)) / 111320;
    const dlon = (radiusM * Math.sin(rad)) / (111320 * Math.cos(lat * Math.PI / 180));
    layers.push(L.polyline([[lat, lon], [lat + dlat, lon + dlon]], {
      color: count > 0 ? '#60a5fa' : '#94a3b840', weight: count > 0 ? 1.5 : .7,
      opacity: count > 0 ? .28 : .12, dashArray: '3 9', interactive: false
    }).addTo(map));
    const lf = 1.11;
    const llat = lat + (radiusM * lf * Math.cos(rad)) / 111320;
    const llon = lon + (radiusM * lf * Math.sin(rad)) / (111320 * Math.cos(lat * Math.PI / 180));
    const lc = count > 0 ? '#ea580c' : '#94a3b8aa';
    layers.push(L.marker([llat, llon], {
      icon: L.divIcon({
        html: `<div style="font-family:monospace;font-size:10px;font-weight:800;color:${lc};white-space:nowrap;${count > 0 ? `background:rgba(234,88,12,0.1);border:1px solid rgba(234,88,12,0.3);border-radius:5px;padding:1px 5px;` : ''}">${label}${count > 0 ? ` <span style="color:#ef4444">${count}</span>` : ''}</div>`,
        iconSize: [52, 20], iconAnchor: [26, 10], className: ''
      }), interactive: false
    }).addTo(map));
  });

  // Center label for this detector
  const color = GROUP_COLORS[det.group] ?? '#f97316';
  layers.push(L.marker([lat, lon], {
    icon: L.divIcon({
      html: `<div style="font-family:monospace;font-size:9px;font-weight:700;color:${color};background:rgba(14,14,14,0.85);border:1px solid ${color}55;border-radius:6px;padding:2px 6px;white-space:nowrap;margin-top:22px">${det.id} · ${events.length} det.</div>`,
      iconSize: [120, 20], iconAnchor: [60, 0], className: ''
    }), interactive: false, zIndexOffset: 1000
  }).addTo(map));

  return layers;
}

// ── Global overview radar ─────────────────────────────────────────────────────
function drawGlobalRadar(map, L, center, radiusM, events) {
  const { lat, lon } = center;
  const layers = [];
  const DIRS = [
    { label: 'N', deg: 0 }, { label: 'NE', deg: 45 }, { label: 'E', deg: 90 }, { label: 'SE', deg: 135 },
    { label: 'S', deg: 180 }, { label: 'SW', deg: 225 }, { label: 'W', deg: 270 }, { label: 'NW', deg: 315 }
  ];
  const dirCount = Object.fromEntries(DIRS.map(d => [d.label, 0]));
  events.forEach(e => { if (e.direction && dirCount[e.direction] !== undefined) dirCount[e.direction]++; });

  // Zone rings
  [
    { frac: .20, fill: '#ef4444', fOp: .06, stroke: '#ef4444', sOp: .60, w: 1.5 },
    { frac: .40, fill: '#f97316', fOp: .04, stroke: '#f97316', sOp: .40, w: 1.2, dash: '6 4' },
    { frac: .60, fill: '#eab308', fOp: .03, stroke: '#eab308', sOp: .35, w: 1, dash: '6 4' },
    { frac: .80, fill: '#22c55e', fOp: .02, stroke: '#22c55e', sOp: .25, w: 1, dash: '8 6' },
    { frac: 1.0, fill: '#3b82f6', fOp: .01, stroke: '#3b82f6', sOp: .55, w: 2 }
  ].forEach(z => {
    layers.push(L.circle([lat, lon], { radius: radiusM * z.frac, color: z.stroke, weight: z.w, opacity: z.sOp, fillColor: z.fill, fillOpacity: z.fOp, dashArray: z.dash, interactive: false }).addTo(map));
  });

  // Threat sectors
  DIRS.forEach(({ label, deg }) => {
    const count = dirCount[label]; if (!count) return;
    const startR = (deg - 22.5) * Math.PI / 180, endR = (deg + 22.5) * Math.PI / 180;
    const dirEvts = events.filter(e => e.direction === label);
    const minDist = Math.min(...dirEvts.map(e => e.estimated_distance_m ?? 999));
    const arcColor = distColor(minDist), intensity = Math.min(.10 + count * .05, .38);
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const a = startR + (endR - startR) * (i / 14);
      const dlat = (radiusM * .9 * Math.cos(a)) / 111320;
      const dlon = (radiusM * .9 * Math.sin(a)) / (111320 * Math.cos(lat * Math.PI / 180));
      pts.push([lat + dlat, lon + dlon]);
    }
    pts.push([lat, lon]);
    layers.push(L.polygon(pts, { color: arcColor, weight: 1.2, opacity: .6, fillColor: arcColor, fillOpacity: intensity, interactive: false }).addTo(map));
  });

  // Spoke lines + direction labels
  DIRS.forEach(({ label, deg }) => {
    const count = dirCount[label], rad = deg * Math.PI / 180;
    const dlat = (radiusM * Math.cos(rad)) / 111320;
    const dlon = (radiusM * Math.sin(rad)) / (111320 * Math.cos(lat * Math.PI / 180));
    layers.push(L.polyline([[lat, lon], [lat + dlat, lon + dlon]], {
      color: count > 0 ? '#60a5fa' : '#94a3b840', weight: count > 0 ? 1.5 : .7,
      opacity: count > 0 ? .28 : .12, dashArray: '3 9', interactive: false
    }).addTo(map));
    const lf = 1.11;
    const llat = lat + (radiusM * lf * Math.cos(rad)) / 111320;
    const llon = lon + (radiusM * lf * Math.sin(rad)) / (111320 * Math.cos(lat * Math.PI / 180));
    const lc = count > 0 ? '#ea580c' : '#94a3b8aa';
    layers.push(L.marker([llat, llon], {
      icon: L.divIcon({
        html: `<div style="font-family:monospace;font-size:11px;font-weight:800;color:${lc};white-space:nowrap;${count > 0 ? `background:rgba(234,88,12,0.1);border:1px solid rgba(234,88,12,0.3);border-radius:5px;padding:1px 6px;` : ''}">${label}${count > 0 ? ` <span style="color:#ef4444">${count}</span>` : ''}</div>`,
        iconSize: [52, 20], iconAnchor: [26, 10], className: ''
      }), interactive: false
    }).addTo(map));
  });

  // Zone range labels
  [
    { frac: .20, label: 'CRITICAL', color: '#ef4444' }, { frac: .40, label: 'DANGER', color: '#f97316' },
    { frac: .60, label: 'WARNING', color: '#eab308' }, { frac: .80, label: 'CAUTION', color: '#22c55e' }
  ].forEach(({ frac, label, color }) => {
    const rM = radiusM * frac, dlon = rM / (111320 * Math.cos(lat * Math.PI / 180));
    layers.push(L.marker([lat, lon + dlon], {
      icon: L.divIcon({
        html: `<div style="font-family:monospace;font-size:8px;font-weight:700;color:${color};background:rgba(20,20,20,.80);border:1px solid ${color}55;border-radius:3px;padding:1px 5px;white-space:nowrap;">${label}</div>`,
        iconSize: [70, 14], iconAnchor: [0, 7], className: ''
      }), interactive: false
    }).addTo(map));
  });

  // Center crosshair
  layers.push(L.marker([lat, lon], {
    icon: L.divIcon({
      html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="rgba(20,20,20,0.7)" stroke="#ea580c" stroke-width="1.5" opacity="0.9"/><circle cx="14" cy="14" r="5" fill="#ea580c" opacity="0.95"/><circle cx="14" cy="14" r="2" fill="#fff"/><line x1="14" y1="2" x2="14" y2="8" stroke="#ea580c" stroke-width="1.5" stroke-linecap="round"/><line x1="14" y1="20" x2="14" y2="26" stroke="#ea580c" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="14" x2="8" y2="14" stroke="#ea580c" stroke-width="1.5" stroke-linecap="round"/><line x1="20" y1="14" x2="26" y2="14" stroke="#ea580c" stroke-width="1.5" stroke-linecap="round"/></svg>`,
      iconSize: [28, 28], iconAnchor: [14, 14], className: ''
    }), interactive: false, zIndexOffset: 2000
  }).addTo(map));

  return layers;
}

// ── Leaflet CSS overrides ─────────────────────────────────────────────────────
const MAP_CSS = `
.tac-popup .leaflet-popup-content-wrapper {
  background: rgba(18, 18, 18, 0.88) !important;
  border: 1px solid rgba(255, 255, 255, 0.09) !important;
  backdrop-filter: blur(12px);
  border-radius: 14px !important;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.75) !important;
  padding: 0 !important;
}
.tac-popup .leaflet-popup-content {
  margin: 14px 16px !important;
  color: #ccc;
}
.tac-popup .leaflet-popup-tip {
  background: rgba(18, 18, 18, 0.88) !important;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.75) !important;
}
.leaflet-popup-close-button {
  color: #888 !important;
  padding: 8px 10px 0 0 !important;
}
.leaflet-popup-close-button:hover {
  color: #fff !important;
}
.leaflet-control-zoom {
  border: none !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6) !important;
  border-radius: 10px !important;
  overflow: hidden !important;
}
.leaflet-control-zoom a {
  background: rgba(30, 30, 30, 0.85) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
  color: #aaa !important;
  backdrop-filter: blur(6px);
}
.leaflet-control-zoom a:hover {
  background: rgba(50, 50, 50, 0.9) !important;
  color: #fff !important;
}
.leaflet-control-attribution {
  background: rgba(0, 0, 0, 0.6) !important;
  color: #555 !important;
  font-size: 9px !important;
}
.tac-tt {
  background: rgba(18, 18, 18, 0.9) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(8px);
  border-radius: 8px !important;
  font-family: system-ui, -apple-system, sans-serif !important;
  font-size: 11px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5) !important;
  color: #ccc !important;
  padding: 4px 8px !important;
}
.tac-tt::before {
  display: none !important;
}
@keyframes pulse {
  0% { opacity: 0.75; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.1); }
  100% { opacity: 0.75; transform: scale(0.95); }
}`;

// ── Main component ─────────────────────────────────────────────────────────────
export default function TacticalMapView({ events, isLoading, simContext }) {
  const [showSweep,   setShowSweep]   = useState(true);
  const [radarMode,   setRadarMode]   = useState('none');

  const mapRef        = useRef(null);
  const leafletMap    = useRef(null);
  const overlayRefs   = useRef([]);
  const radarRefs     = useRef([]);
  const sweepRef      = useRef(null);
  const simDroneRefs  = useRef({}); // For live simulation markers
  const simTrailRefs  = useRef({}); // For live simulation trails
  const simLineRefs   = useRef({}); // For live simulation detection lines

  const filtered   = events;
  const detectors  = useMemo(() => {
    if (simContext?.simMode && simContext?.detectors) {
      return simContext.detectors.map(d => ({ ...d, events: filtered.filter(e => e.detector_id === d.id) }));
    }
    return buildDetectors(filtered);
  }, [filtered, simContext?.simMode, simContext?.detectors]);
  const radarBound = useMemo(() => computeRadarBounds(detectors), [detectors]);
  const alertCount = filtered.filter(e => (e.estimated_distance_m ?? 999) < 100).length;

  // Auto-show global radar in simulation mode
  useEffect(() => {
    if (simContext?.simMode) {
      setRadarMode('global');
    }
  }, [simContext?.simMode]);

  // Compute live detections for React sidebar (updates at 2Hz)
  const liveDetections = useMemo(() => {
    if (!simContext?.simMode || !simContext.liveDrones) return [];
    const detections = [];
    simContext.liveDrones.forEach(drone => {
      detectors.forEach(det => {
        const dist = haversine(drone.latitude, drone.longitude, det.lat, det.lon);
        const detRadius = Math.min(Math.max(...(det.events?.map(e => e.estimated_distance_m ?? 800) || [800]), 800) * 1.3 + 200, 2000);
        if (dist < detRadius) {
          detections.push({ 
            droneId: drone.drone_id, 
            droneGroup: drone.group,
            droneColor: drone._simDroneRef?.color || '#f97316', 
            detId: det.id, 
            dist: Math.round(dist) 
          });
        }
      });
    });
    return detections.sort((a, b) => a.dist - b.dist);
  }, [simContext?.simMode, simContext?.liveDrones, detectors]);

  // Init map once
  useEffect(() => {
    loadLeaflet().then(() => {
      if (!mapRef.current || leafletMap.current) return;
      const map = window.L.map(mapRef.current, { center: [radarBound.lat, radarBound.lon], zoom: 12, zoomControl: true });
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OSM &copy; CARTO', subdomains: 'abcd', maxZoom: 19 }).addTo(map);
      leafletMap.current = map;
      setShowSweep(v => v);
    });
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, []);

  // Sync overlays on data / toggle change
  useEffect(() => {
    if (!leafletMap.current) return;
    const { L } = window, map = leafletMap.current;

    overlayRefs.current.forEach(o => { try { o.remove(); } catch (_) {} }); overlayRefs.current = [];
    radarRefs.current.forEach(o => { try { o.remove(); } catch (_) {} }); radarRefs.current = [];
    if (sweepRef.current) { try { map.removeLayer(sweepRef.current); } catch (_) {} sweepRef.current = null; }

    // ── Draw radar based on mode ──
    if (radarMode === 'global' && detectors.length > 0) {
      // Draw individual radars for each detector
      detectors.forEach(det => {
        const layers = drawDetectorRadar(map, L, det);
        radarRefs.current.push(...layers);
      });
      if (showSweep) {
        const sweepDetectors = detectors.map(det => {
          const maxDist = Math.max(...det.events.map(e => e.estimated_distance_m ?? 800), 800);
          return { lat: det.lat, lon: det.lon, radiusM: Math.min(maxDist * 1.3 + 200, 2000) };
        });
        const SweepControl = L.Layer.extend({
          onAdd(m) { this._impl = new SweepLayer(sweepDetectors); this._impl.onAdd(m); },
          onRemove(m) { this._impl?.onRemove(m); }
        });
        sweepRef.current = new SweepControl(); map.addLayer(sweepRef.current);
      }
    } else if (radarMode !== 'none' && radarMode !== 'global') {
      const det = detectors.find(d => d.id === radarMode);
      if (det) {
        radarRefs.current = drawDetectorRadar(map, L, det);
        if (showSweep) {
          const detRadius = Math.min(Math.max(...det.events.map(e => e.estimated_distance_m ?? 800), 800) * 1.3 + 200, 2000);
          const sweepDetectors = [{ lat: det.lat, lon: det.lon, radiusM: detRadius }];
          const SweepControl = L.Layer.extend({
            onAdd(m) { this._impl = new SweepLayer(sweepDetectors); this._impl.onAdd(m); },
            onRemove(m) { this._impl?.onRemove(m); }
          });
          sweepRef.current = new SweepControl(); map.addLayer(sweepRef.current);
        }
      }
    }

    // ── Detector markers ──
    detectors.forEach(det => {
      const color = GROUP_COLORS[det.group] ?? '#f97316';
      const mk = L.marker([det.lat, det.lon], { icon: makeDetectorIcon(color), zIndexOffset: 500 })
        .bindTooltip(
          '<b style="font-family:monospace;color:' + color + '">' + det.id + '</b>' + 
          (det.name ? '<br/><span style="font-size:10px;color:#aaa">' + det.name + '</span>' : '') + 
          '<br/><span style="font-size:10px;color:#888">' + (det.events ? det.events.length : 0) + ' detections</span>',
          { direction: 'top', className: 'tac-tt' }
        )
        .addTo(map);

      mk.on('click', () => {
        setRadarMode(prev => prev === det.id ? 'none' : det.id);
      });

      overlayRefs.current.push(mk);
    });

    // ── Drone dots ──
    if (!simContext?.simMode) {
      filtered.forEach(evt => {
        if (!evt.latitude || !evt.longitude) return;
        const dist  = evt.estimated_distance_m ?? null;
        const gc    = GROUP_COLORS[evt.group] ?? '#888';
        const isAlert = dist != null && dist < 100;

        const mk = L.marker([evt.latitude, evt.longitude], { icon: makeDroneDotIcon(gc, isAlert), zIndexOffset: isAlert ? 300 : 100 })
          .bindPopup(
            L.popup({ maxWidth: 260, closeButton: true, className: 'tac-popup' }).setContent(buildDronePopup(evt, gc))
          )
          .addTo(map);
        overlayRefs.current.push(mk);
      });
    }

    if (!simContext?.simMode && filtered.length > 0) {
      const pts = filtered.map(e => [e.latitude, e.longitude]).filter(p => p[0] && p[1]);
      detectors.forEach(d => pts.push([d.lat, d.lon]));
      if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [80, 80], maxZoom: 15 });
    } else if (!simContext?.simMode) {
      map.setView([radarBound.lat, radarBound.lon], 12);
    }
  }, [leafletMap.current, filtered.length, events, showSweep, radarMode, detectors.length, simContext?.simMode]);

  // ── Fast Subscription for Live Simulation Rendering ──
  useEffect(() => {
    if (!simContext?.subscribeTick || !leafletMap.current || !simContext.simMode) return;
    const map = leafletMap.current;
    const L = window.L;

    // Helper for drone icon with heading
    const makeSimIcon = (color, heading) => {
      const rot = Math.round(heading ?? 0);
      return L.divIcon({
        html: '<div style="transform:rotate(' + rot + 'deg);line-height:0">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">' +
            '<circle cx="14" cy="14" r="12" fill="' + color + '" opacity="0.18"/>' +
            '<polygon points="14,2 18,22 14,18 10,22" fill="' + color + '" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/>' +
            '<circle cx="14" cy="14" r="3" fill="' + color + '" opacity="0.9" stroke="#111" stroke-width="1"/>' +
            '<circle cx="14" cy="14" r="1.5" fill="#fff" opacity="0.85"/>' +
          '</svg>' +
        '</div>',
        iconSize: [28, 28], iconAnchor: [14, 14], className: ''
      });
    };

    const unsubscribe = simContext.subscribeTick((nextT, simData) => {
      if (!simData) return;
      
      const currentIds = new Set();
      const activeLines = new Set();

      simData.drones.forEach(drone => {
        const pos = getDronePosition(drone, nextT);
        if (!pos) return;

        // Draw detection lines and collect detecting radars first
        const detectingRadars = [];
        detectors.forEach(det => {
          const dist = haversine(pos.lat, pos.lon, det.lat, det.lon);
          const detRadius = Math.min(Math.max(...(det.events?.map(e => e.estimated_distance_m ?? 800) || [800]), 800) * 1.3 + 200, 2000);
          if (dist < detRadius) {
            detectingRadars.push({ id: det.id, dist: Math.round(dist), lat: det.lat, lon: det.lon });
          }
        });

        // Only show drone if it's detected by at least one radar
        if (detectingRadars.length === 0) return;

        currentIds.add(drone.id);

        if (!simDroneRefs.current[drone.id]) {
          // Create marker
          const mk = L.marker([pos.lat, pos.lon], { icon: makeSimIcon(drone.color, pos.heading), zIndexOffset: 400 })
            .bindPopup(L.popup({ maxWidth: 220, className: 'tac-popup' }).setContent('<div/>'))
            .addTo(map);
          simDroneRefs.current[drone.id] = mk;

          // Create trail
          const trail = L.polyline([[pos.lat, pos.lon]], {
            color: drone.color, weight: 1.5, opacity: 0.5, dashArray: '4 6'
          }).addTo(map);
          simTrailRefs.current[drone.id] = trail;
        } else {
          // Update existing
          simDroneRefs.current[drone.id].setLatLng([pos.lat, pos.lon]);
          simDroneRefs.current[drone.id].setIcon(makeSimIcon(drone.color, pos.heading));
          const trail = simTrailRefs.current[drone.id];
          const pts = trail.getLatLngs();
          pts.push(L.latLng(pos.lat, pos.lon));
          if (pts.length > 80) pts.shift(); // keep trail length bounded
          trail.setLatLngs(pts);
        }

        detectingRadars.forEach(r => {
          const lineId = drone.id + '-' + r.id;
          activeLines.add(lineId);
          if (!simLineRefs.current[lineId]) {
            simLineRefs.current[lineId] = L.polyline([[r.lat, r.lon], [pos.lat, pos.lon]], {
              color: '#ef4444', weight: 1.5, opacity: 0.6, dashArray: '4 8'
            }).addTo(map);
          } else {
            simLineRefs.current[lineId].setLatLngs([[r.lat, r.lon], [pos.lat, pos.lon]]);
          }
        });

        // Update popup content dynamically if open
        if (simDroneRefs.current[drone.id].isPopupOpen()) {
          const radarsHtml = detectingRadars.length > 0 
            ? detectingRadars.map(r => 
                '<div style="display:flex;justify-content:space-between;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);padding:2px 6px;border-radius:4px;margin-bottom:3px">' +
                  '<span style="color:#f87171;font-weight:bold;font-family:monospace">' + r.id + '</span>' +
                  '<span style="color:#fff;font-family:monospace">' + r.dist + ' m</span>' +
                '</div>'
              ).join('')
            : '<div style="color:#555;font-style:italic">Out of range (No Signal)</div>';

          const popupHtml = 
            '<div style="font-family:system-ui,sans-serif;font-size:11px;line-height:1.5;color:#ccc;padding:4px;min-width:180px">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:6px;margin-bottom:6px">' +
                '<div style="font-weight:800;color:' + drone.color + ';font-size:13px;font-family:monospace">' + drone.id + '</div>' +
                '<div style="font-size:9px;color:#888">' + drone.group + '</div>' +
              '</div>' +
              '<div style="display:flex;justify-content:space-between">' +
                '<span style="color:#888">Model:</span> <b style="color:#fff">' + drone.model + '</b>' +
              '</div>' +
              '<div style="display:flex;justify-content:space-between">' +
                '<span style="color:#888">Telemetry:</span> <b style="color:#fff">' + drone.speed + ' m/s @ ' + drone.height + 'm</b>' +
              '</div>' +
              '<div style="display:flex;justify-content:space-between">' +
                '<span style="color:#888">Protocol:</span> <b style="color:#34d399">' + drone.protocol + '</b>' +
              '</div>' +
              '<div style="margin-top:8px;padding-top:6px;border-top:1px dashed rgba(255,255,255,0.1)">' +
                '<div style="font-size:9px;color:#888;text-transform:uppercase;margin-bottom:4px;letter-spacing:0.05em;font-weight:bold">Tracking Radars (' + detectingRadars.length + ')</div>' +
                radarsHtml +
              '</div>' +
            '</div>';

          simDroneRefs.current[drone.id].setPopupContent(popupHtml);
        }
      });

      // Cleanup finished drones and lines
      Object.keys(simDroneRefs.current).forEach(id => {
        if (!currentIds.has(id)) {
          simDroneRefs.current[id].remove();
          delete simDroneRefs.current[id];
          simTrailRefs.current[id].remove();
          delete simTrailRefs.current[id];
        }
      });
      Object.keys(simLineRefs.current).forEach(id => {
        if (!activeLines.has(id)) {
          simLineRefs.current[id].remove();
          delete simLineRefs.current[id];
        }
      });
    });

    return () => {
      unsubscribe();
      Object.values(simDroneRefs.current).forEach(m => m.remove());
      Object.values(simTrailRefs.current).forEach(t => t.remove());
      Object.values(simLineRefs.current).forEach(l => l.remove());
      simDroneRefs.current = {};
      simTrailRefs.current = {};
      simLineRefs.current = {};
    };
  }, [simContext?.subscribeTick, simContext?.simMode, leafletMap.current]);

  return (
    <div className="flex-col-start h-full" style={{ background: '#0a0a0a' }}>
      <style>{MAP_CSS}</style>

      <Toolbar>
        <div className="flex-row-center gap-2">
          <TargetIcon style={{ width: '1rem', height: '1rem', color: '#f97316' }} />
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>Tactical Map</span>
          <span className="rounded-full font-bold" style={{ fontSize: '11px', padding: '2px 10px', background: 'rgba(249,115,22,.12)', color: '#f97316', border: '1px solid rgba(249,115,22,.35)' }}>{filtered.length} targets</span>
          {alertCount > 0 && <span className="rounded-full font-bold animate-pulse" style={{ fontSize: '11px', padding: '2px 10px', background: 'rgba(239,68,68,.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,.4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertIcon className="w-3 h-3" stroke="#ef4444" /> {alertCount} CRITICAL</span>}
        </div>

        {/* Layer toggles */}
        <div className="flex-row-center gap-1-5 flex-wrap">
          {/* Sweep toggle */}
          {radarMode !== 'global' && (
            <button onClick={() => setShowSweep(v => !v)}
              className="rounded-full font-bold transition-all"
              style={{ fontSize: '10px', padding: '6px 12px', background: showSweep ? '#22c55e18' : '#1a1a1a', border: '1px solid ' + (showSweep ? '#22c55e' : '#2a2a2a'), color: showSweep ? '#22c55e' : '#555', cursor: 'pointer' }}>
              Sweep
            </button>
          )}

          {/* Global radar overview button */}
          <button
            onClick={() => setRadarMode(prev => prev === 'global' ? 'none' : 'global')}
            className="rounded-full font-bold transition-all"
            style={{
              fontSize: '10px', padding: '6px 12px',
              background: radarMode === 'global' ? 'rgba(59,130,246,0.18)' : '#1a1a1a',
              border: '1px solid ' + (radarMode === 'global' ? '#3b82f6' : '#2a2a2a'),
              color: radarMode === 'global' ? '#3b82f6' : '#555',
              cursor: 'pointer'
            }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><LayersIcon className="w-3 h-3" stroke={radarMode === 'global' ? '#3b82f6' : '#555'} /> All Radars</span>
          </button>
        </div>

        <div className="flex-row-center gap-1-5 ml-auto flex-wrap">
          {!simContext?.simMode && (
            <button onClick={() => simContext.setShowConfig(true)} className="flex items-center justify-center p-2 rounded-lg border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-all" title="Simulate">
              <PlayIcon className="w-4 h-4" fill="currentColor" />
            </button>
          )}
        </div>
      </Toolbar>

      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
          </div>
        )}

        {/* Simulation Overlays */}
        {simContext?.showConfig && (
          <SimConfigPanel
            detectorCount={detectors.length}
            onStart={simContext.startSimulation}
            onClose={() => simContext.setShowConfig(false)}
          />
        )}

        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Simulation Control Toolbar (Compact Pill Design) */}
        {simContext?.simMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 md:gap-4 bg-[#111111]/90 backdrop-blur-xl border border-white/10 rounded-full py-2 px-4 md:px-5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] whitespace-nowrap transition-all">
            
            {/* Playback Controls */}
            <div className="flex items-center gap-1 md:gap-1.5">
              <button 
                onClick={() => {
                  if (simContext.simTime >= (simContext.simData?.durationSec ?? 0)) simContext.seek(0);
                  simContext.setIsPlaying(p => !p);
                }}
                className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-orange-500 hover:bg-orange-400 text-white rounded-full transition-all shadow-[0_0_12px_rgba(249,115,22,0.4)]"
              >
                {simContext.isPlaying ? <PauseIcon className="w-4 h-4 fill-current" /> : <PlayIcon className="w-4 h-4 ml-0.5 fill-current" />}
              </button>
              <button 
                onClick={() => { simContext.seek(0); simContext.setIsPlaying(true); }}
                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                title="Restart"
              >
                <RestartIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
              <button 
                onClick={simContext.toggleLoop}
                className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full transition-all ${simContext.isLooping ? 'text-orange-400 bg-orange-500/20' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                title="Toggle Loop"
              >
                <LoopIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>

            <div className="h-5 w-px bg-white/10" />

            {/* Timeline */}
            <div className="flex items-center gap-2 md:gap-3">
              <span className="font-mono text-[9px] md:text-[10px] text-gray-500 w-7 md:w-8 text-right">
                {Math.floor(simContext.simTime / 60).toString().padStart(2, '0')}:{Math.floor(simContext.simTime % 60).toString().padStart(2, '0')}
              </span>
              <input 
                type="range" min={0} max={simContext.simData?.durationSec ?? 120} step={1}
                value={simContext.simTime}
                onChange={(e) => simContext.seek(parseFloat(e.target.value))}
                className="w-24 md:w-40 h-1 md:h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
              />
              <span className="font-mono text-[9px] md:text-[10px] text-gray-500 w-7 md:w-8">
                {Math.floor((simContext.simData?.durationSec ?? 0) / 60).toString().padStart(2, '0')}:{Math.floor((simContext.simData?.durationSec ?? 0) % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="h-5 w-px bg-white/10 hidden sm:block" />

            {/* Speed Controls */}
            <div className="hidden sm:flex items-center gap-0.5 bg-black/40 rounded-full p-0.5 border border-white/5">
              {[1, 2, 4, 8].map(s => (
                <button key={s}
                  onClick={() => simContext.setSimSpeed(s)}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-all ${simContext.simSpeed === s ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <div className="h-5 w-px bg-white/10" />

            {/* Exit */}
            <button 
              onClick={simContext.stopSimulation}
              className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-red-500/80 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all"
              title="Exit Simulation"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="legend-box" style={{ background: 'rgba(14,14,14,0.92)', border: '1px solid #2a2a2a', backdropFilter: 'blur(8px)' }}>
          <span style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold', marginBottom: 2 }}>Radar Zones</span>
          {[['CRITICAL', '#ef4444', '< 20%'], ['DANGER', '#f97316', '< 40%'], ['WARNING', '#eab308', '< 60%'], ['CAUTION', '#22c55e', '< 80%'], ['BOUNDARY', '#3b82f6', 'outer']].map(([l, c, h]) => (
            <div key={l} className="flex-row-center gap-2-5">
              <div className="rounded" style={{ background: c, opacity: .75, width: 12, height: 12 }} />
              <span className="font-mono" style={{ fontSize: 10, fontWeight: 'bold', color: c }}>{l}</span>
              <span style={{ fontSize: 9, color: '#444', marginLeft: 'auto' }}>{h}</span>
            </div>
          ))}
          <div className="flex-col-start gap-1-5" style={{ borderTop: '1px solid #2a2a2a', paddingTop: 8, marginTop: 4 }}>
            {[['#ef4444', 'Critical drone (< 100m)'], ['#22c55e', 'Safe drone'], ['#f97316', 'Detector']].map(([c, l]) => (
              <div key={l} className="flex-row-center gap-2">
                <div className="rounded-full" style={{ background: c, opacity: .85, width: 10, height: 10 }} />
                <span style={{ fontSize: 9, color: '#555' }}>{l}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 8, marginTop: 4 }}>
            <div style={{ fontSize: 9, color: '#444' }}>Click detector → show its radar</div>
            <div style={{ fontSize: 9, color: '#444' }}>Click drone dot → details</div>
          </div>
        </div>

        {/* Live stats overlay */}
        {filtered.length > 0 && (
          <div className="stats-overlay-box" style={{ background: 'rgba(14,14,14,0.92)', border: '1px solid #2a2a2a', backdropFilter: 'blur(8px)', minWidth: '150px' }}>
            {[['Targets', filtered.length, '#f97316'], ['Detectors', detectors.length, '#3b82f6'], ['Critical', alertCount, '#ef4444'],
              ['No GPS', filtered.filter(e => !e.has_gps).length, '#eab308'],
              ['GA', filtered.filter(e => e.group === 'GA').length, '#f97316'],
              ['GB', filtered.filter(e => e.group === 'GB').length, '#eab308']].map(([l, v, c]) => (
              <div key={l} className="flex-row-between gap-4">
                <span style={{ fontSize: 11, color: '#555' }}>{l}</span>
                <span className="font-mono" style={{ fontSize: 13, fontWeight: 'bold', color: c }}>{v}</span>
              </div>
            ))}
            {radarMode !== 'none' && (
              <div style={{ borderTop: '1px solid #222', paddingTop: 6, marginTop: 2 }}>
                <div className="font-mono" style={{ fontSize: 9, fontWeight: 'bold', color: radarMode === 'global' ? '#3b82f6' : '#f97316', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {radarMode === 'global' ? (
                    <><LayersIcon className="w-3 h-3" stroke="#3b82f6" /> Global overview</>
                  ) : (
                     <><SignalIcon className="w-3 h-3" stroke="#f97316" /> {radarMode}</>
                  )}
                </div>
              </div>
            )}
            
            {/* Live Detections Panel */}
            {simContext?.simMode && (
              <div style={{ borderTop: '1px solid #222', paddingTop: 8, marginTop: 8 }}>
                <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', marginBottom: 6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="animate-pulse" style={{ width: 6, height: 6, background: '#ef4444', borderRadius: '50%' }}></span>
                  Live Tracking
                </div>
                {liveDetections.length > 0 ? (
                  <div className="flex-col-start gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1" style={{ pointerEvents: 'auto' }}>
                    {liveDetections.map((d, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 6px' }}>
                        <div className="flex-row-between">
                          <span style={{ fontSize: 11, fontWeight: 'bold', color: d.droneColor, fontFamily: 'monospace' }}>{d.droneId}</span>
                          <span style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>{d.dist}m</span>
                        </div>
                        <div className="flex-row-between mt-1">
                          <span style={{ fontSize: 9, color: '#777' }}>Detected by</span>
                          <span style={{ fontSize: 9, fontWeight: 'bold', color: '#f87171' }}>{d.detId}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: '#555', fontStyle: 'italic', padding: '4px 0' }}>No active detections</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}