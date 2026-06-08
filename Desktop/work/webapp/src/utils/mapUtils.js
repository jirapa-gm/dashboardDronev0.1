// ── Leaflet loader (singleton) ────────────────────────────────────────────────
let leafletReady = null;
export function loadLeaflet() {
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
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, r = d => d * Math.PI / 180;
  const dLat = r(lat2 - lat1), dLon = r(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function destPoint(lat, lon, bearingDeg, distM) {
  const R = 6371000, r = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const d = distM / R, brg = r(bearingDeg), φ1 = r(lat), λ1 = r(lon);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(brg));
  const λ2 = λ1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
  return [deg(φ2), deg(λ2)];
}

// ── Data builders ─────────────────────────────────────────────────────────────
export function buildDetectors(events) {
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

// Compute boundaries
export function computeRadarBounds(detectors) {
  if (!detectors.length) return { lat: 13.7563, lon: 100.5018, radiusM: 4000 };
  const avgLat = detectors.reduce((s, d) => s + d.lat, 0) / detectors.length;
  const avgLon = detectors.reduce((s, d) => s + d.lon, 0) / detectors.length;
  let maxDist = 600;
  detectors.forEach(d => { const dist = haversine(avgLat, avgLon, d.lat, d.lon); if (dist > maxDist) maxDist = dist; });
  return { lat: avgLat, lon: avgLon, radiusM: maxDist * 1.55 + 600 };
}
