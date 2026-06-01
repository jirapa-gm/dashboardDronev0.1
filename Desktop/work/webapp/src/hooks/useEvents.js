import { useState, useCallback, useRef, useEffect } from 'react';
import mockData from '../data/Mockdata';
import {
  buildDailyMap, buildHourlyMap, buildDirectionMap,
  buildFreqBands, buildDroneStats, buildDistribution,
} from '../utils/chartUtils';

const API_URL = 'http://localhost:8000/api/events';

const EMPTY_SUMMARY = {
  total: 0, ga: 0, gb: 0, unique_drones: 0,
  detectors: 0, avg_speed: '—', avg_height: '—',
  max_speed: '—', high_threat: 0,
};

export function useEvents(isMockMode) {
  const [events,          setEvents]          = useState([]);
  const [summary,         setSummary]         = useState(EMPTY_SUMMARY);
  const [daily,           setDaily]           = useState({});
  const [hourly,          setHourly]          = useState([]);
  const [directions,      setDirections]      = useState([]);
  const [freqBands,       setFreqBands]       = useState([]);
  const [droneStats,      setDroneStats]      = useState([]);
  const [modelCount,      setModelCount]      = useState([]);  
  const [protocolSummary, setProtocolSummary] = useState([]);  
  const [isLoading,       setIsLoading]       = useState(false);
  const [currentPage,     setCurrentPage]     = useState(1);

  const isMockRef = useRef(isMockMode);
  useEffect(() => { isMockRef.current = isMockMode; }, [isMockMode]);

  const search = useCallback(async ({ startDate, endDate, group, subgroup, detector }) => {
    setIsLoading(true);
    setCurrentPage(1);

    // ── MOCK mode ────────────────────────────────────────────────────────────
    if (isMockRef.current) {
      await new Promise(res => setTimeout(res, 350));
      const filtered = mockData.filter(e => {
        const d = e.datetime.slice(0, 10);
        if (d < startDate || d > endDate)                                  return false;
        if (group    && group    !== 'ALL' && e.group       !== group)     return false;
        if (subgroup && subgroup !== 'ALL' && e.subgroup    !== subgroup)  return false;
        if (detector && detector !== 'ALL' && e.detector_id !== detector)  return false;
        return true;
      });

      setEvents(filtered);
      setSummary({
        total:         filtered.length,
        ga:            filtered.filter(e => e.group === 'GA').length,
        gb:            filtered.filter(e => e.group === 'GB').length,
        unique_drones: new Set(filtered.map(e => e.drone_id)).size,
        detectors:     new Set(filtered.map(e => e.detector_id).filter(Boolean)).size,
        avg_speed:     filtered.length ? (filtered.reduce((s, e) => s + e.speed,  0) / filtered.length).toFixed(1)  : '—',
        avg_height:    filtered.length ? Math.round(filtered.reduce((s, e) => s + e.height, 0) / filtered.length)   : '—',
        max_speed:     filtered.length ? Math.max(...filtered.map(e => e.speed)).toFixed(1)                         : '—',
        high_threat:   filtered.filter(e => e.threat === 'HIGH').length,
      });
      setDaily(buildDailyMap(filtered));
      setHourly(buildHourlyMap(filtered));
      setDirections(buildDirectionMap(filtered));
      setFreqBands(buildFreqBands(filtered));
      setDroneStats(buildDroneStats(filtered));
      setModelCount(buildDistribution(filtered, 'model'));
      setProtocolSummary(buildDistribution(filtered, 'protocol_name'));

      setIsLoading(false);
      return;
    }

    // ── LIVE mode ─────────────────────────────────────────────────────────────
    try {
      // 1. สร้าง Request Body ──────────────────────────────────
      const filters = {};
      if (group    && group    !== 'ALL') filters.group    = group;
      if (subgroup && subgroup !== 'ALL') filters.subgroup = subgroup;
      if (detector && detector !== 'ALL') filters.detectors = [detector];

      const body = {
        filters,
        time_range: { start: startDate, end: endDate },
        metrics: [
          'kpi_summary',
          'model_count',
          'frequency_distribution',
          'daily_detection',
          'hourly_detection',
          'direction_summary',
          'protocol_summary',
          'drone_stats',
          'raw_events',
        ],
      };

      const res = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const d = json.data ?? {};

      // 2. Raw events ───────────────────────────────────────────────────────
      setEvents(d.raw_events ?? []);

      // 3. kpi_summary ───────────
      const k = d.kpi_summary ?? {};
      setSummary({
        total:         k.total      ?? 0,
        ga:            k.ga         ?? 0,
        gb:            k.gb         ?? 0,
        unique_drones: k.unique     ?? 0,    // unique → unique_drones
        detectors:     0,
        avg_speed:     k.avgSpeed   ?? '—',  // avgSpeed → avg_speed
        avg_height:    k.avgHeight  ?? '—',  // avgHeight → avg_height
        max_speed:     k.maxSpeed   ?? '—',  // maxSpeed → max_speed
        high_threat:   k.highThreat ?? 0,    // highThreat → high_threat
      });

      // 4. daily_detection ─────────────────
      const dailyObj = {};
      (d.daily_detection ?? []).forEach(item => {
        dailyObj[item.date] = { GA: item.GA ?? 0, GB: item.GB ?? 0 };
      });
      setDaily(dailyObj);

      // 5. hourly_detection: sparse → เติมครบ 24 ชั่วโมง ─────────────────────
      const hourlyFull = Array.from({ length: 24 }, (_, h) => ({ hour: h, GA: 0, GB: 0 }));
      (d.hourly_detection ?? []).forEach(item => {
        if (item.hour >= 0 && item.hour < 24) {
          hourlyFull[item.hour] = { hour: item.hour, GA: item.GA ?? 0, GB: item.GB ?? 0 };
        }
      });
      setHourly(hourlyFull);

      // 6. direction_summary────────────────────────
      setDirections(d.direction_summary ?? []);

      // 7. frequency_distribution ──
      setFreqBands(
        (d.frequency_distribution ?? []).map(f => ({
          band:  f.range.replace(' MHz', '').replace('-', '–'),
          count: f.count,
        }))
      );

      // 8. model_count ────────
      setModelCount(
        (d.model_count ?? []).map(m => [m.device_type, m.count])
      );

      // 9. protocol_summary ───────────
      setProtocolSummary(
        (d.protocol_summary ?? []).map(p => [p.name, p.count])
      );

      // 10. droneStats
      setDroneStats(
        (d.drone_stats ?? []).map(ds => ({
          drone_id:   ds.drone_id,
          model:      ds.model,
          group:      ds.group,
          detections: ds.detections,
          threat:     ds.threat,
          maxHeight:  ds.max_height,
          maxSpeed:   ds.max_speed,
          avgSpeed:   ds.avg_speed,
          protocols:  ds.protocols  ?? [],
          freqs:      ds.freqs      ?? [],
          directions: ds.directions ?? [],
          firstSeen:  ds.first_seen,
          lastSeen:   ds.last_seen,
        }))
      );

    } catch (err) {
      console.error('API Error:', err);
      setEvents([]);
      setSummary(EMPTY_SUMMARY);
      setDaily({});
      setHourly([]);
      setDirections([]);
      setFreqBands([]);
      setDroneStats([]);
      setModelCount([]);
      setProtocolSummary([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    events, summary, daily, hourly, directions,
    freqBands, droneStats, modelCount, protocolSummary,
    isLoading, search, currentPage, setCurrentPage,
  };
}