import raw from './mockData.json';

// ── Protocol from frequency ────────────────────────────────────────────────────
function freqToProtocol(freq) {
  if (freq < 2430) return 'OcuSync';
  if (freq < 2460) return 'LBv2';
  return 'Enhanced Wi-Fi';
}

// ── Bearing from two lat/lon points ──────────────────────────────────────────
function calcBearing(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLon  = toRad(lon2 - lon1);
  const φ1    = toRad(lat1);
  const φ2    = toRad(lat2);
  const x     = Math.sin(dLon) * Math.cos(φ2);
  const y     = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLon);
  return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}

// ── Haversine distance (meters) ───────────────────────────────────────────────
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Cardinal direction from bearing ──────────────────────────────────────────
function bearingToDir(bearing) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(bearing / 45) % 8];
}

// ── Threat level from height + speed ─────────────────────────────────────────
function calcThreat(height, speed, protocolName) {
  let base = (speed / 20) * 0.5 + (height > 50 ? 0.3 : 0.1) + Math.random() * 0.15;
  // DIY/FPV or Unknown protocols add threat
  if (protocolName === 'DIY/FPV' || protocolName === 'Unknown') base += 0.25;
  if (base > 0.65) return 'HIGH';
  if (base > 0.35) return 'MEDIUM';
  return 'LOW';
}

// ── Expand raw JSON into flat events with enriched fields ─────────────────────
const mockData = [];
const mockGroupTree = [];

raw.groups.forEach((g) => {
  const groupNode = { group: g.group, subgroups: [] };

  g.subgroups.forEach((sg) => {
    const sgNode = { subgroup: sg.subgroup, detectors: [] };

    sg.detectors.forEach((det) => {
      const detLat = det.latitude;
      const detLon = det.longitude;

      sgNode.detectors.push({ id: det.detector_id, name: det.name, lat: detLat, lon: detLon });

      const evts = det.data.events;
      evts.forEach((evt) => {
        const bearing  = calcBearing(detLat, detLon, evt.latitude, evt.longitude);
        const protocol = freqToProtocol(evt.freq);
        const threat   = calcThreat(evt.height, evt.speed, evt.protocol_name ?? '');

        // Pilot-to-drone distance (if GPS available)
        let pilot_drone_distance_m = null;
        if (evt.has_gps && evt.pilot_lat != null && evt.pilot_lng != null) {
          pilot_drone_distance_m = Math.round(
            haversineDistance(evt.pilot_lat, evt.pilot_lng, evt.latitude, evt.longitude)
          );
        }

        mockData.push({
          ...evt,
          group:                  g.group,
          subgroup:               sg.subgroup,
          detector_id:            det.detector_id,
          detector_name:          det.name,
          detector_lat:           detLat,
          detector_lon:           detLon,
          bearing:                parseFloat(bearing.toFixed(1)),
          direction:              bearingToDir(bearing),
          protocol,
          threat,
          // ── Tactical fields (pass-through + computed) ──────────────────────
          has_gps:                evt.has_gps ?? true,
          pilot_lat:              evt.pilot_lat ?? null,
          pilot_lng:              evt.pilot_lng ?? null,
          aoa_degrees:            evt.aoa_degrees ?? null,
          estimated_distance_m:   evt.estimated_distance_m ?? Math.round(haversineDistance(detLat, detLon, evt.latitude, evt.longitude)),
          rssi_dbm:               evt.rssi_dbm ?? null,
          snr_db:                 evt.snr_db ?? null,
          protocol_name:          evt.protocol_name ?? 'Unknown',
          registered:             evt.registered ?? false,
          pilot_drone_distance_m,
        });
      });
    });

    groupNode.subgroups.push(sgNode);
  });

  mockGroupTree.push(groupNode);
});

export default mockData;
export { mockGroupTree };