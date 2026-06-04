import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import mockData from '../data/Mockdata';
import { toDateStr } from '../shared/helpers';
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

// Helper function to fetch data
const fetchEvents = async (isMock, params) => {
  if (!params) return null;
  const { startDate, endDate, group, subgroup, detector } = params;

  // ── MOCK mode ────────────────────────────────────────────────────────────
  if (isMock) {
    await new Promise(res => setTimeout(res, 200));
    const filtered = mockData.filter(e => {
      const d = e.datetime.slice(0, 10);
      if (d < startDate || d > endDate)                                  return false;
      if (group    && group    !== 'ALL' && e.group       !== group)     return false;
      if (subgroup && subgroup !== 'ALL' && e.subgroup    !== subgroup)  return false;
      if (detector && detector !== 'ALL' && e.detector_id !== detector)  return false;
      return true;
    });

    return {
      events: filtered,
      summary: {
        total:         filtered.length,
        ga:            filtered.filter(e => e.group === 'GA').length,
        gb:            filtered.filter(e => e.group === 'GB').length,
        unique_drones: new Set(filtered.map(e => e.drone_id)).size,
        detectors:     new Set(filtered.map(e => e.detector_id).filter(Boolean)).size,
        avg_speed:     filtered.length ? (filtered.reduce((s, e) => s + e.speed,  0) / filtered.length).toFixed(1)  : '—',
        avg_height:    filtered.length ? Math.round(filtered.reduce((s, e) => s + e.height, 0) / filtered.length)   : '—',
        max_speed:     filtered.length ? Math.max(...filtered.map(e => e.speed)).toFixed(1)                         : '—',
        high_threat:   filtered.filter(e => e.threat === 'HIGH').length,
      },
      daily: buildDailyMap(filtered),
      hourly: buildHourlyMap(filtered),
      directions: buildDirectionMap(filtered),
      freqBands: buildFreqBands(filtered),
      droneStats: buildDroneStats(filtered),
      modelCount: buildDistribution(filtered, 'model'),
      protocolSummary: buildDistribution(filtered, 'protocol_name'),
    };
  }

  // ── LIVE mode ─────────────────────────────────────────────────────────────
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

  const dailyObj = {};
  (d.daily_detection ?? []).forEach(item => {
    dailyObj[item.date] = { GA: item.GA ?? 0, GB: item.GB ?? 0 };
  });

  const hourlyFull = Array.from({ length: 24 }, (_, h) => ({ hour: h, GA: 0, GB: 0 }));
  (d.hourly_detection ?? []).forEach(item => {
    if (item.hour >= 0 && item.hour < 24) {
      hourlyFull[item.hour] = { hour: item.hour, GA: item.GA ?? 0, GB: item.GB ?? 0 };
    }
  });

  const k = d.kpi_summary ?? {};

  return {
    events: d.raw_events ?? [],
    summary: {
      total:         k.total      ?? 0,
      ga:            k.ga         ?? 0,
      gb:            k.gb         ?? 0,
      unique_drones: k.unique     ?? 0,
      detectors:     0,
      avg_speed:     k.avgSpeed   ?? '—',
      avg_height:    k.avgHeight  ?? '—',
      max_speed:     k.maxSpeed   ?? '—',
      high_threat:   k.highThreat ?? 0,
    },
    daily: dailyObj,
    hourly: hourlyFull,
    directions: d.direction_summary ?? [],
    freqBands: (d.frequency_distribution ?? []).map(f => ({
      band:  f.range.replace(' MHz', '').replace('-', '–'),
      count: f.count,
    })),
    modelCount: (d.model_count ?? []).map(m => [m.device_type, m.count]),
    protocolSummary: (d.protocol_summary ?? []).map(p => [p.name, p.count]),
    droneStats: (d.drone_stats ?? []).map(ds => ({
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
    })),
  };
};

export function useEvents(isMockMode) {
  const [searchParams, setSearchParams] = useState(() => ({
    startDate: isMockMode ? '2026-04-01' : toDateStr(new Date(Date.now() - 7 * 86400000)),
    endDate: isMockMode ? '2026-04-10' : toDateStr(new Date()),
    group: 'ALL',
    subgroup: 'ALL',
    detector: 'ALL',
  }));

  const [currentPage, setCurrentPage] = useState(1);

  // Reset searchParams when isMockMode changes
  useEffect(() => {
    setSearchParams({
      startDate: isMockMode ? '2026-04-01' : toDateStr(new Date(Date.now() - 7 * 86400000)),
      endDate: isMockMode ? '2026-04-10' : toDateStr(new Date()),
      group: 'ALL',
      subgroup: 'ALL',
      detector: 'ALL',
    });
    setCurrentPage(1);
  }, [isMockMode]);

  const { data, isLoading } = useQuery({
    queryKey: ['events', isMockMode, searchParams],
    queryFn: () => fetchEvents(isMockMode, searchParams),
    enabled: !!searchParams,
    staleTime: 1000 * 60 * 5, // Cache 5 min
  });

  const search = useCallback((params) => {
    setSearchParams(params);
    setCurrentPage(1);
  }, []);

  return {
    events:          data?.events ?? [],
    summary:         data?.summary ?? EMPTY_SUMMARY,
    daily:           data?.daily ?? {},
    hourly:          data?.hourly ?? [],
    directions:      data?.directions ?? [],
    freqBands:       data?.freqBands ?? [],
    droneStats:      data?.droneStats ?? [],
    modelCount:      data?.modelCount ?? [],
    protocolSummary: data?.protocolSummary ?? [],
    isLoading,
    search,
    currentPage,
    setCurrentPage,
  };
}