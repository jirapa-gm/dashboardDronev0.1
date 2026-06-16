import { distColor } from '../../shared/helpers';

const GROUP_COLORS = { GA: '#f97316', GB: '#3b82f6' };

// ── Per-detector radar overlay ────────────────────────────────────────────────
export function drawDetectorRadar(map, L, det) {
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
export function drawGlobalRadar(map, L, center, radiusM, events) {
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
