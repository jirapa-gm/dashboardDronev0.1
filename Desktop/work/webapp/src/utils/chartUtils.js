export function buildDailyMap(events) {
  return events.reduce((acc, e) => {
    const d = e.datetime.split('T')[0];
    if (!acc[d]) acc[d] = { GA: 0, GB: 0 };
    if (e.group === 'GA') acc[d].GA++;
    else if (e.group === 'GB') acc[d].GB++;
    return acc;
  }, {});
}

export function buildDistribution(events, field) {
  const map = events.reduce((acc, e) => {
    const key = e[field] ? String(e[field]).trim() : 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(map).sort(([, a], [, b]) => b - a);
}

export function buildHourlyMap(events) {
  const map = Array.from({ length: 24 }, (_, h) => ({ hour: h, GA: 0, GB: 0 }));
  events.forEach((e) => {
    const h = parseInt(e.datetime.slice(11, 13), 10);
    if (!isNaN(h) && h >= 0 && h < 24) {
      if (e.group === 'GA') map[h].GA++;
      else if (e.group === 'GB') map[h].GB++;
    }
  });
  return map;
}

export function buildDirectionMap(events) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const map  = Object.fromEntries(dirs.map((d) => [d, { GA: 0, GB: 0 }]));
  events.forEach((e) => {
    if (e.direction && map[e.direction]) {
      if (e.group === 'GA') map[e.direction].GA++;
      else if (e.group === 'GB') map[e.direction].GB++;
    }
  });
  return dirs.map((d) => ({ dir: d, ...map[d], total: map[d].GA + map[d].GB }));
}

export function buildDroneStats(events) {
  const map = {};
  events.forEach((e) => {
    if (!map[e.drone_id]) {
      map[e.drone_id] = {
        drone_id:   e.drone_id,
        model:      e.model ? String(e.model).trim() : 'Unknown',
        group:      e.group,
        detections: 0,
        maxHeight:  0,
        maxSpeed:   0,
        totalSpeed: 0,
        freqs:      new Set(),
        protocols:  new Set(),
        directions: new Set(),
        firstSeen:  e.datetime,
        lastSeen:   e.datetime,
        threat:     e.threat || 'LOW',
      };
    }
    const d = map[e.drone_id];
    d.detections++;
    d.maxHeight  = Math.max(d.maxHeight, e.height);
    d.maxSpeed   = Math.max(d.maxSpeed, e.speed);
    d.totalSpeed += e.speed;
    if (e.freq)      d.freqs.add(e.freq);
    if (e.protocol)  d.protocols.add(e.protocol);
    if (e.direction) d.directions.add(e.direction);
    if (e.datetime < d.firstSeen) d.firstSeen = e.datetime;
    if (e.datetime > d.lastSeen)  d.lastSeen  = e.datetime;
    
    const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 };
    if (rank[e.threat] > rank[d.threat]) d.threat = e.threat;
  });

  return Object.values(map).map((d) => ({
    ...d,
    avgSpeed:   parseFloat((d.totalSpeed / d.detections).toFixed(2)),
    freqs:      [...d.freqs].sort(),
    protocols:  [...d.protocols],
    directions: [...d.directions],
  })).sort((a, b) => b.detections - a.detections);
}

export function buildKPIs(events) {
  if (!events.length) return { total: 0, ga: 0, gb: 0, unique: 0, avgSpeed: '—', avgHeight: '—', maxSpeed: '—', highThreat: 0 };
  const ga       = events.filter((e) => e.group === 'GA').length;
  const gb       = events.filter((e) => e.group === 'GB').length;
  const unique   = new Set(events.map((e) => e.drone_id)).size;
  const avgSpeed = (events.reduce((s, e) => s + e.speed, 0) / events.length).toFixed(1);
  const avgHeight= Math.round(events.reduce((s, e) => s + e.height, 0) / events.length);
  const maxSpeed = Math.max(...events.map((e) => e.speed)).toFixed(1);
  const highThreat = events.filter((e) => e.threat === 'HIGH').length;
  return { total: events.length, ga, gb, unique, avgSpeed, avgHeight, maxSpeed, highThreat };
}

export function buildFreqBands(events) {
  const bands = { '2400–2430': 0, '2430–2460': 0, '2460–2500': 0 };
  events.forEach((e) => {
    const f = parseFloat(e.freq);
    if (isNaN(f)) return;
    if (f >= 2400 && f < 2430) bands['2400–2430']++;
    else if (f >= 2430 && f < 2460) bands['2430–2460']++;
    else if (f >= 2460 && f <= 2500) bands['2460–2500']++;
  });
  return Object.entries(bands).map(([band, count]) => ({ band, count }));
}

