import { destPoint, haversine } from '../utils/mapUtils';

// ── Constants ─────────────────────────────────────────────────────────────────
const DETECTION_RADIUS_M = 800;   // meters — detector triggers within this range
const EARTH_R = 6371000;

// ── Math helpers ──────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function bearing(lat1, lon1, lat2, lon2) {
  const r = d => d * Math.PI / 180;
  const dLon = r(lon2 - lon1), φ1 = r(lat1), φ2 = r(lat2);
  const x = Math.sin(dLon) * Math.cos(φ2);
  const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLon);
  return ((Math.atan2(x, y) * 180 / Math.PI) + 360) % 360;
}
function rnd(min, max) { return min + Math.random() * (max - min); }
function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function spawnOutside(bounds, dir) {
  const { minLat, maxLat, minLon, maxLon } = bounds;
  const pad = 0.015; // ~1.5 km outside
  if (dir === 'random') {
    const dirs = ['N','S','E','W','NE','NW','SE','SW'];
    dir = dirs[rndInt(0, 7)];
  }
  switch (dir) {
    case 'N':  return [maxLat + pad, rnd(minLon, maxLon)];
    case 'S':  return [minLat - pad, rnd(minLon, maxLon)];
    case 'E':  return [rnd(minLat, maxLat), maxLon + pad];
    case 'W':  return [rnd(minLat, maxLat), minLon - pad];
    case 'NE': return [maxLat + pad * 0.7, maxLon + pad * 0.7];
    case 'NW': return [maxLat + pad * 0.7, minLon - pad * 0.7];
    case 'SE': return [minLat - pad * 0.7, maxLon + pad * 0.7];
    case 'SW': return [minLat - pad * 0.7, minLon - pad * 0.7];
    default:   return [rnd(minLat - pad, maxLat + pad), rnd(minLon - pad, maxLon + pad)];
  }
}

function buildFlightPath(detectors, bounds, entryDir, exitDir) {
  const entryPt = spawnOutside(bounds, entryDir);
  const exitPt  = spawnOutside(bounds, exitDir);

  // Pick 1–3 target detectors to fly near (sorted by proximity to the straight line)
  const numTargets = rndInt(1, Math.min(3, detectors.length));
  // Score detectors by how close they are to the straight line entry→exit
  const scored = detectors.map(det => {
    const t = Math.max(0, Math.min(1,
      ((det.lat - entryPt[0]) * (exitPt[0] - entryPt[0]) + (det.lon - entryPt[1]) * (exitPt[1] - entryPt[1])) /
      ((exitPt[0] - entryPt[0]) ** 2 + (exitPt[1] - entryPt[1]) ** 2 + 1e-10)
    ));
    const closestLat = entryPt[0] + t * (exitPt[0] - entryPt[0]);
    const closestLon = entryPt[1] + t * (exitPt[1] - entryPt[1]);
    const dist = haversine(det.lat, det.lon, closestLat, closestLon);
    return { det, dist, t };
  });

  // Pick closest + shuffle for variety
  const targets = scored
    .filter(s => s.dist < 5000)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, numTargets * 2)
    .sort((a, b) => a.t - b.t);

  const chosen = shuffle(targets).slice(0, numTargets).sort((a, b) => a.t - b.t);

  // Build waypoints: entry → near each chosen detector → exit
  const waypoints = [entryPt];
  chosen.forEach(({ det }) => {
    // Fly to a point close to the detector (within detection range / 2)
    const offset = rnd(80, DETECTION_RADIUS_M * 0.6);
    const brg = rnd(0, 360);
    const [wLat, wLon] = destPoint(det.lat, det.lon, brg, offset);
    waypoints.push([wLat, wLon]);
  });
  waypoints.push(exitPt);

  // Smooth the path using Chaikin's corner cutting algorithm (4 iterations)
  let smoothed = [...waypoints];
  for (let iter = 0; iter < 4; iter++) {
    const next = [];
    next.push(smoothed[0]); // Keep start
    for (let i = 0; i < smoothed.length - 1; i++) {
      const p0 = smoothed[i];
      const p1 = smoothed[i + 1];
      next.push([p0[0] * 0.75 + p1[0] * 0.25, p0[1] * 0.75 + p1[1] * 0.25]);
      next.push([p0[0] * 0.25 + p1[0] * 0.75, p0[1] * 0.25 + p1[1] * 0.75]);
    }
    next.push(smoothed[smoothed.length - 1]); // Keep end
    smoothed = next;
  }

  return { waypoints: smoothed, passedDetectors: chosen.map(s => s.det) };
}

function pathLength(waypoints) {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += haversine(waypoints[i-1][0], waypoints[i-1][1], waypoints[i][0], waypoints[i][1]);
  }
  return total;
}

function interpolateWaypoints(waypoints, t) {
  const total = pathLength(waypoints);
  const target = total * Math.max(0, Math.min(1, t));
  let dist = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const seg = haversine(waypoints[i-1][0], waypoints[i-1][1], waypoints[i][0], waypoints[i][1]);
    if (dist + seg >= target || i === waypoints.length - 1) {
      const segT = seg > 0 ? (target - dist) / seg : 0;
      const lat = lerp(waypoints[i-1][0], waypoints[i][0], Math.max(0, Math.min(1, segT)));
      const lon = lerp(waypoints[i-1][1], waypoints[i][1], Math.max(0, Math.min(1, segT)));
      const hdg = bearing(waypoints[i-1][0], waypoints[i-1][1], waypoints[i][0], waypoints[i][1]);
      return { lat, lon, heading: hdg };
    }
    dist += seg;
  }
  const last = waypoints[waypoints.length - 1];
  return { lat: last[0], lon: last[1], heading: 0 };
}

// ── Drone models ──────────────────────────────────────────────────────────────
const DRONE_MODELS = [
  'DJI Mini 3', 'DJI Mavic 3', 'DJI Phantom 4', 'DJI FPV',
  'Parrot Anafi', 'Autel EVO II', 'Skydio 2', 'Custom FPV',
];
const PROTOCOLS = ['OcuSync', 'LBv2', 'Enhanced Wi-Fi', 'DJI OcuSync', 'Unknown'];
const DRONE_COLORS = {
  GA: '#f97316',  // orange
  GB: '#eab308',  // yellow
};

/**
 * Main export: generateSimulation
 * @param {Array}  detectors   - [{id, name, lat, lon, group}]
 * @param {number} numDrones   - how many drones to simulate
 * @param {number} durationSec - total simulation duration in seconds
 * @param {string} entryDir    - 'N'|'S'|'E'|'W'|'NE'|'SW'|'random'
 * @param {string} group       - 'GA'|'GB'|'mixed'
 * @param {number} spawnInterval - seconds between drone spawns
 * @returns {{ drones, detectionEvents, durationSec }}
 */
export function generateSimulation({
  detectors,
  numDrones      = 3,
  durationSec    = 120,
  entryDir       = 'random',
  group          = 'mixed',
  spawnInterval  = 15,
}) {
  if (!detectors || detectors.length === 0) return { drones: [], detectionEvents: [], durationSec };

  // Compute bounding box of detectors
  const lats = detectors.map(d => d.lat);
  const lons = detectors.map(d => d.lon);
  const bounds = {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
  };

  const EXIT_DIRS = ['N','S','E','W','NE','NW','SE','SW'];
  const drones = [];
  const detectionEvents = [];

  const groupAssign = (i) => {
    if (group === 'GA') return 'GA';
    if (group === 'GB') return 'GB';
    return i % 2 === 0 ? 'GA' : 'GB';
  };

  for (let i = 0; i < numDrones; i++) {
    const droneGroup   = groupAssign(i);
    const droneId      = `SIM-${droneGroup}-${String(i + 1).padStart(2, '0')}`;
    const model        = DRONE_MODELS[i % DRONE_MODELS.length];
    const protocol     = PROTOCOLS[i % PROTOCOLS.length];
    const speed        = rnd(8, 22);         // m/s
    const height       = rndInt(20, 120);    // meters AGL
    const spawnTime    = i * spawnInterval;  // staggered spawn
    const color        = DRONE_COLORS[droneGroup] ?? '#f97316';

    // Choose entry and exit directions
    const entry = entryDir === 'random' ? EXIT_DIRS[rndInt(0, 7)] : entryDir;
    let exitD;
    do { exitD = EXIT_DIRS[rndInt(0, 7)]; } while (exitD === entry);

    const { waypoints, passedDetectors } = buildFlightPath(detectors, bounds, entry, exitD);

    // Compute flight duration: total path meters / speed
    const totalDist = pathLength(waypoints);
    const flightDur = totalDist / speed;  // seconds

    // Actual active window in simulation
    const activeStart = spawnTime;
    const activeEnd   = Math.min(spawnTime + flightDur, durationSec);

    drones.push({
      id:       droneId,
      model,
      group:    droneGroup,
      color,
      protocol,
      speed:    parseFloat(speed.toFixed(1)),
      height,
      waypoints,
      totalDist,
      flightDur,
      spawnTime,
      activeStart,
      activeEnd,
      passedDetectors: passedDetectors.map(d => d.id),
    });

    // Pre-compute detection events
    passedDetectors.forEach(det => {
      // Find time when drone is closest to detector
      let minDist = Infinity, bestT = 0;
      for (let step = 0; step <= 300; step++) {
        const frac = step / 300;
        const simT = activeStart + frac * flightDur;
        if (simT > durationSec) break;
        const flightT = frac;
        const pos = interpolateWaypoints(waypoints, flightT);
        const d = haversine(pos.lat, pos.lon, det.lat, det.lon);
        if (d < minDist) { minDist = d; bestT = frac; }
      }
      const simTime = activeStart + bestT * flightDur;
      if (simTime <= durationSec && minDist <= DETECTION_RADIUS_M) {
        const exactPos = interpolateWaypoints(waypoints, bestT);
        const baseDate = new Date();
        // create a fake time based on start date + simTime seconds
        const evDate = new Date(baseDate.getTime() + simTime * 1000);
        
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const brg = bearing(det.lat, det.lon, exactPos.lat, exactPos.lon);
        const direction = dirs[Math.round(brg / 45) % 8];

        detectionEvents.push({
          time:        simTime, // for simulation scrubber logic
          
          // standard fields to match mockData
          drone_id:    droneId,
          model:       model,
          group:       droneGroup,
          subgroup:    det.subgroup ?? 'Unknown',
          detector_id: det.id,
          detector_name: det.name ?? det.id,
          detector_lat:  det.lat,
          detector_lon:  det.lon,
          latitude:    exactPos.lat,
          longitude:   exactPos.lon,
          direction:   direction,
          bearing:     parseFloat(brg.toFixed(1)),
          estimated_distance_m: Math.round(minDist),
          speed:       parseFloat(speed.toFixed(1)),
          height:      height,
          threat:      minDist < 200 ? 'HIGH' : minDist < 500 ? 'MEDIUM' : 'LOW',
          protocol_name: protocol,
          datetime:    evDate.toISOString(),
          has_gps:     true,
          
          // legacy fields used by SimulationView.jsx log
          droneModel:  model,
          droneGroup,
          detectorId:  det.id,
          detectorName: det.name ?? det.id,
          distance:    Math.round(minDist),
          protocol,
        });
      }
    });
  }

  // Sort detection events by time
  detectionEvents.sort((a, b) => a.time - b.time);

  return { drones, detectionEvents, durationSec };
}

export function getDronePosition(drone, t) {
  if (t < drone.activeStart || t > drone.activeEnd) return null;
  const elapsed  = t - drone.activeStart;
  const fraction = Math.min(1, elapsed / Math.max(1, drone.flightDur));
  return { ...interpolateWaypoints(drone.waypoints, fraction), visible: true };
}

export { DETECTION_RADIUS_M, DRONE_COLORS };
