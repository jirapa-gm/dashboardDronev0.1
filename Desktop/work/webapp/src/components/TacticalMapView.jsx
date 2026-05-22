import { useEffect, useRef, useState, useMemo } from 'react';
import { GA, GB } from '../shared/constants';
import { distColor } from '../shared/helpers';
import { TargetIcon } from '../shared/icons';
import { Toolbar } from '../shared/ui';

// ── Constants ─────────────────────────────────────────────────────────────────
const GROUP_COLORS = { GA, GB };

// ── Leaflet loader (singleton) ────────────────────────────────────────────────
let leafletReady = null;
function loadLeaflet() {
  if (leafletReady) return leafletReady;
  leafletReady = new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      Object.assign(link, { id: 'leaflet-css', rel: 'stylesheet', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' });
      document.head.appendChild(link);
    }
    if (window.L) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  return leafletReady;
}

// ── Math helpers ──────────────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, r = d => d * Math.PI / 180;
  const dLat = r(lat2 - lat1), dLon = r(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function destPoint(lat, lon, bearingDeg, distM) {
  const R = 6371000, r = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const d = distM / R, brg = r(bearingDeg), φ1 = r(lat), λ1 = r(lon);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(brg));
  const λ2 = λ1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
  return [deg(φ2), deg(λ2)];
}

// ── Data builders ─────────────────────────────────────────────────────────────
function buildDetectors(events) {
  const map = {};
  events.forEach(e => {
    if (!map[e.detector_id]) map[e.detector_id] = {
      id: e.detector_id, name: e.detector_name,
      lat: e.detector_lat, lon: e.detector_lon,
      group: e.group, events: []
    };
    map[e.detector_id].events.push(e);
  });
  return Object.values(map);
}

function computeRadarBounds(detectors) {
  if (!detectors.length) return { lat: 13.7563, lon: 100.5018, radiusM: 4000 };
  const avgLat = detectors.reduce((s, d) => s + d.lat, 0) / detectors.length;
  const avgLon = detectors.reduce((s, d) => s + d.lon, 0) / detectors.length;
  let maxDist = 600;
  detectors.forEach(d => { const dist = haversine(avgLat, avgLon, d.lat, d.lon); if (dist > maxDist) maxDist = dist; });
  return { lat: avgLat, lon: avgLon, radiusM: maxDist * 1.55 + 600 };
}

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
  // normal = 18px radius, alert = 22px radius — clearly visible on map
  const s = isAlert ? 22 : 18, t = s * 2;
  const pulse = isAlert
    ? `<circle cx="${s}" cy="${s}" r="${s - 2}" fill="${color}" opacity="0.18">
         <animate attributeName="r" values="${s - 2};${s + 10};${s - 2}" dur="1.4s" repeatCount="indefinite"/>
         <animate attributeName="opacity" values="0.18;0;0.18" dur="1.4s" repeatCount="indefinite"/>
       </circle>`
    : '';
  // outer glow ring
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
  const row = (label, val, vc = '#ccc') =>
    `<div style="display:flex;flex-direction:column;gap:1px">
       <div style="color:#555;font-size:8px;text-transform:uppercase;letter-spacing:.05em">${label}</div>
       <div style="color:${vc};font-weight:700;font-size:11px;font-family:monospace">${val}</div>
     </div>`;
  return `<div style="font-family:monospace;font-size:11px;line-height:1.7;padding:2px 0;min-width:210px">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <div style="font-size:14px;font-weight:800;color:${color}">${evt.drone_id}</div>
      ${crit ? `<span style="font-size:8px;padding:2px 5px;border-radius:4px;font-weight:700;background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.35)">⚠ CRITICAL</span>` : ''}
    </div>
    <div style="color:#666;font-size:10px;margin-bottom:8px">${evt.model ?? '—'} · ${evt.group}</div>
    <div style="background:#111;border-radius:8px;padding:8px;display:grid;grid-template-columns:1fr 1fr;gap:7px;border:1px solid #222">
      ${row('ID', evt.drone_id, color)}
      ${row('Direction', `${dirLabel}`, '#60a5fa')}
      ${row('Protocol', evt.protocol_name ?? '—', (evt.protocol_name === 'DIY/FPV' || evt.protocol_name === 'Unknown') ? '#ef4444' : '#ccc')}
      ${row('Frequency', evt.freq ? `${evt.freq} MHz` : '—', '#a78bfa')}
      ${row('Distance', `${dist ?? '—'} m`, dc)}
      ${row('Height', `${evt.height} m`)}
    </div>
    <div style="margin-top:6px;color:#444;font-size:9px">${evt.datetime?.replace('T', ' ').slice(0, 16) ?? ''}</div>
  </div>`;
}

// ── Detector popup HTML ───────────────────────────────────────────────────────
function buildDetectorPopup(det, color) {
  const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dirCount = Object.fromEntries(DIRS.map(d => [d, 0]));
  det.events.forEach(e => { if (e.direction && dirCount[e.direction] !== undefined) dirCount[e.direction]++; });
  const dirRows = DIRS.filter(d => dirCount[d] > 0)
    .map(d => `<div style="display:flex;justify-content:space-between;padding:3px 6px;background:#1a1a1a;border-radius:4px;border:1px solid #2a2a2a">
        <span style="color:#888;font-size:9px">${d}</span>
        <span style="color:#f97316;font-weight:700;font-size:10px">${dirCount[d]}</span>
      </div>`).join('');
  return `<div style="font-family:monospace;font-size:11px;min-width:200px">
    <div style="font-size:13px;font-weight:800;color:${color};margin-bottom:2px">${det.id}</div>
    <div style="color:#666;font-size:10px;margin-bottom:8px">${det.name ?? ''}</div>
    <div style="color:#555;font-size:9px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Detections by Direction</div>
    ${dirRows || '<div style="color:#444;font-size:10px">No directional data</div>'}
    <div style="margin-top:8px;padding:6px;background:#1a1a1a;border-radius:6px;border:1px solid #222;display:flex;justify-content:space-between">
      <span style="color:#555;font-size:9px">TOTAL DETECTIONS</span>
      <span style="color:${color};font-weight:700;font-size:12px">${det.events.length}</span>
    </div>
  </div>`;
}

// ── Animated radar sweep (Canvas layer) — stays anchored to detector position ──
class SweepLayer {
  constructor(center, radiusM) {
    this._c = center; this._r = radiusM; this._angleDeg = 0; this._lastTime = null;
    this._raf = null; this._canvas = null; this._map = null;
    this._SPEED = 45;
    // bind handlers so we can remove them
    this._onViewChange = this._onViewChange.bind(this);
  }
  onAdd(map) {
    this._map = map;
    this._canvas = document.createElement('canvas');
    this._canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:400;';
    map.getPanes().overlayPane.appendChild(this._canvas);
    // listen to ALL events that change the canvas-to-latLng mapping
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
    // no need to call _draw here — _tick loop handles continuous redraw
  }
  _resize() {
    if (!this._map || !this._canvas) return;
    const s = this._map.getSize();
    this._canvas.width = s.x; this._canvas.height = s.y;
    // Reset canvas position to map origin on every resize/move
    const origin = this._map.containerPointToLayerPoint([0, 0]);
    window.L.DomUtil.setPosition(this._canvas, origin);
  }
  _tick(now) {
    if (!this._map || !this._canvas) return;
    const dt = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now; this._angleDeg = (this._angleDeg + this._SPEED * dt) % 360;
    this._draw(); this._raf = requestAnimationFrame(t => this._tick(t));
  }
  _draw() {
    if (!this._map || !this._canvas) return;
    const cv = this._canvas, ctx = cv.getContext('2d');
    const s = this._map.getSize(); ctx.clearRect(0, 0, s.x, s.y);
    // Always recompute pixel position from lat/lon each frame so it tracks the map
    const cp = this._map.latLngToContainerPoint([this._c.lat, this._c.lon]);
    const ep = this._map.latLngToContainerPoint([this._c.lat + this._r / 111320, this._c.lon]);
    const rPx = Math.abs(cp.y - ep.y);
    const sweepRad = (this._angleDeg - 90) * Math.PI / 180, fanRad = 80 * Math.PI / 180;
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
.tac-popup .leaflet-popup-content-wrapper{background:#1a1a1a!important;border:1px solid #333!important;border-radius:14px!important;box-shadow:0 16px 48px rgba(0,0,0,.6)!important;padding:0!important}
.tac-popup .leaflet-popup-content{margin:14px 16px!important;color:#ccc}
.tac-popup .leaflet-popup-tip{background:#1a1a1a!important}
.leaflet-popup-close-button{color:#666!important}
.leaflet-control-zoom{border:none!important;box-shadow:0 4px 16px rgba(0,0,0,.5)!important;border-radius:10px!important;overflow:hidden!important}
.leaflet-control-zoom a{background:#1e1e1e!important;border-color:#333!important;color:#aaa!important}
.leaflet-control-zoom a:hover{background:#2a2a2a!important;color:#fff!important}
.leaflet-control-attribution{background:rgba(0,0,0,.5)!important;color:#555!important;font-size:9px!important}
.tac-tt{background:#1a1a1a!important;border:1px solid #333!important;border-radius:8px!important;font-family:monospace!important;font-size:12px!important;box-shadow:0 4px 16px rgba(0,0,0,.5)!important;color:#ccc!important}
.tac-tt::before{display:none!important}`;

// ── Radar mode: 'none' | 'global' | detectorId ──
// 'none'   = no radar drawn
// 'global' = global overview radar
// detId    = per-detector radar for that detector

// ── Main component ─────────────────────────────────────────────────────────────
export default function TacticalMapView({ events, isLoading }) {
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [showSweep,   setShowSweep]   = useState(true);
  // radarMode: 'none' | 'global' | '<detectorId>'
  const [radarMode,   setRadarMode]   = useState('none');

  const mapRef        = useRef(null);
  const leafletMap    = useRef(null);
  const overlayRefs   = useRef([]);
  const radarRefs     = useRef([]);
  const sweepRef      = useRef(null);

  const filtered   = filterGroup === 'ALL' ? events : events.filter(e => e.group === filterGroup);
  const detectors  = useMemo(() => buildDetectors(filtered), [filtered]);
  const radarBound = useMemo(() => computeRadarBounds(detectors), [detectors]);
  const alertCount = filtered.filter(e => (e.estimated_distance_m ?? 999) < 100).length;

  // Init map once
  useEffect(() => {
    loadLeaflet().then(() => {
      if (!mapRef.current || leafletMap.current) return;
      const map = window.L.map(mapRef.current, { center: [radarBound.lat, radarBound.lon], zoom: 12, zoomControl: true });
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OSM &copy; CARTO', subdomains: 'abcd', maxZoom: 19 }).addTo(map);
      leafletMap.current = map;
      // force re-render to trigger overlay effect
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
      // Global overview: static radar rings only, no sweep
      radarRefs.current = drawGlobalRadar(map, L, radarBound, radarBound.radiusM, filtered);
    } else if (radarMode !== 'none' && radarMode !== 'global') {
      // Per-detector radar: rings + sweep anchored to that detector
      const det = detectors.find(d => d.id === radarMode);
      if (det) {
        radarRefs.current = drawDetectorRadar(map, L, det);
        if (showSweep) {
          const detCenter = { lat: det.lat, lon: det.lon };
          const detRadius = Math.min(Math.max(...det.events.map(e => e.estimated_distance_m ?? 800), 800) * 1.3 + 200, 2000);
          const SweepControl = L.Layer.extend({
            onAdd(m) { this._impl = new SweepLayer(detCenter, detRadius); this._impl.onAdd(m); },
            onRemove(m) { this._impl?.onRemove(m); }
          });
          sweepRef.current = new SweepControl(); map.addLayer(sweepRef.current);
        }
      }
    }

    // ── Detector markers (always visible, no popup — tooltip on hover, radar on click) ──
    detectors.forEach(det => {
      const color = GROUP_COLORS[det.group] ?? '#f97316';
      const mk = L.marker([det.lat, det.lon], { icon: makeDetectorIcon(color), zIndexOffset: 500 })
        .bindTooltip(
          `<b style="font-family:monospace;color:${color}">${det.id}</b>${det.name ? `<br/><span style="font-size:10px;color:#aaa">${det.name}</span>` : ''}<br/><span style="font-size:10px;color:#888">${det.events.length} detections</span>`,
          { direction: 'top', className: 'tac-tt' }
        )
        .addTo(map);

      mk.on('click', () => {
        // Toggle: click same detector → close radar; click different → open its radar
        setRadarMode(prev => prev === det.id ? 'none' : det.id);
      });

      overlayRefs.current.push(mk);
    });

    // ── Drone dots ──
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

    if (filtered.length > 0) {
      const pts = filtered.map(e => [e.latitude, e.longitude]).filter(p => p[0] && p[1]);
      detectors.forEach(d => pts.push([d.lat, d.lon]));
      if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [80, 80], maxZoom: 15 });
    } else {
      map.setView([radarBound.lat, radarBound.lon], 12);
    }
  }, [leafletMap.current, filtered.length, filterGroup, events, showSweep, radarMode, detectors.length]);

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0a0a' }}>
      <style>{MAP_CSS}</style>

      <Toolbar>
        <div className="flex items-center gap-2">
          <TargetIcon className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-bold text-white">Tactical Map</span>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(249,115,22,.12)', color: '#f97316', border: '1px solid rgba(249,115,22,.35)' }}>{filtered.length} targets</span>
          {alertCount > 0 && <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold animate-pulse" style={{ background: 'rgba(239,68,68,.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,.4)' }}>🚨 {alertCount} CRITICAL</span>}
        </div>

        {/* Layer toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Sweep toggle */}
          {radarMode !== 'global' && (
            <button onClick={() => setShowSweep(v => !v)}
              className="text-[10px] px-3 py-1.5 rounded-full font-bold transition-all"
              style={{ background: showSweep ? '#22c55e18' : '#1a1a1a', border: `1px solid ${showSweep ? '#22c55e' : '#2a2a2a'}`, color: showSweep ? '#22c55e' : '#555' }}>
              Sweep
            </button>
          )}

          {/* Global radar overview button */}
          <button
            onClick={() => setRadarMode(prev => prev === 'global' ? 'none' : 'global')}
            className="text-[10px] px-3 py-1.5 rounded-full font-bold transition-all"
            style={{
              background: radarMode === 'global' ? 'rgba(59,130,246,0.18)' : '#1a1a1a',
              border: `1px solid ${radarMode === 'global' ? '#3b82f6' : '#2a2a2a'}`,
              color: radarMode === 'global' ? '#3b82f6' : '#555'
            }}>
            🌐 All Radars
          </button>
        </div>

        <div className="flex gap-1.5 ml-auto flex-wrap items-center">
          {['ALL', 'GA', 'GB'].map(g => {
            const active = filterGroup === g, color = g === 'GA' ? GA : g === 'GB' ? GB : '#64748b';
            const count = g === 'ALL' ? events.length : events.filter(e => e.group === g).length;
            return (
              <button key={g} onClick={() => setFilterGroup(g)}
                className="text-[11px] px-3.5 py-1.5 rounded-full font-bold transition-all"
                style={{ background: active ? `${color}18` : '#1a1a1a', border: `1px solid ${active ? color : '#2a2a2a'}`, color: active ? color : '#555', boxShadow: active ? `0 0 10px ${color}25` : 'none' }}>
                {g === 'ALL' ? `All (${count})` : `${g} (${count})`}
              </button>
            );
          })}
        </div>
      </Toolbar>

      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-[1000] backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-orange-500 rounded-full animate-spin" />
              <span className="text-[12px] text-[#555] uppercase tracking-widest">Loading…</span>
            </div>
          </div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Legend */}
        <div className="absolute bottom-8 left-3 z-[999] rounded-xl px-4 py-3 flex flex-col gap-2 shadow-xl pointer-events-none"
          style={{ background: 'rgba(14,14,14,0.92)', border: '1px solid #2a2a2a', backdropFilter: 'blur(8px)' }}>
          <span className="text-[9px] text-[#555] uppercase tracking-widest font-bold mb-0.5">Radar Zones</span>
          {[['CRITICAL', '#ef4444', '< 20%'], ['DANGER', '#f97316', '< 40%'], ['WARNING', '#eab308', '< 60%'], ['CAUTION', '#22c55e', '< 80%'], ['BOUNDARY', '#3b82f6', 'outer']].map(([l, c, h]) => (
            <div key={l} className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: c, opacity: .75 }} />
              <span className="text-[10px] font-bold font-mono" style={{ color: c }}>{l}</span>
              <span className="text-[9px] text-[#444] ml-auto">{h}</span>
            </div>
          ))}
          <div className="border-t border-[#2a2a2a] pt-2 mt-1 flex flex-col gap-1.5">
            {[['#ef4444', 'Critical drone (< 100m)'], ['#22c55e', 'Safe drone'], ['#f97316', 'Detector']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: .85 }} />
                <span className="text-[9px] text-[#555]">{l}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#2a2a2a] pt-2 mt-1">
            <div className="text-[9px] text-[#444]">Click detector → show its radar</div>
            <div className="text-[9px] text-[#444]">Click drone dot → details</div>
          </div>
        </div>

        {/* Live stats overlay */}
        {filtered.length > 0 && (
          <div className="absolute top-3 right-3 z-[999] rounded-xl px-4 py-3 flex flex-col gap-1.5 shadow-xl pointer-events-none"
            style={{ background: 'rgba(14,14,14,0.92)', border: '1px solid #2a2a2a', backdropFilter: 'blur(8px)', minWidth: '150px' }}>
            {[['Targets', filtered.length, '#f97316'], ['Detectors', detectors.length, '#3b82f6'], ['Critical', alertCount, '#ef4444'],
              ['No GPS', filtered.filter(e => !e.has_gps).length, '#eab308'],
              ['GA', filtered.filter(e => e.group === 'GA').length, '#f97316'],
              ['GB', filtered.filter(e => e.group === 'GB').length, '#eab308']].map(([l, v, c]) => (
              <div key={l} className="flex items-center justify-between gap-4">
                <span className="text-[11px] text-[#555]">{l}</span>
                <span className="text-[13px] font-bold font-mono" style={{ color: c }}>{v}</span>
              </div>
            ))}
            {radarMode !== 'none' && (
              <div className="border-t border-[#222] pt-1.5 mt-0.5">
                <div className="text-[9px] font-bold font-mono" style={{ color: radarMode === 'global' ? '#3b82f6' : '#f97316' }}>
                  {radarMode === 'global' ? '🌐 Global overview' : `📡 ${radarMode}`}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}