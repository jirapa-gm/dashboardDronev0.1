import { useState, useRef, useEffect, useCallback } from 'react';
import { generateSimulation, getDronePosition } from './engine';
import mockData from '../data/Mockdata';

// Extract unique detectors from mockData for simulation
const detectors = Object.values(mockData.reduce((acc, e) => {
  if (!acc[e.detector_id]) acc[e.detector_id] = {
    id: e.detector_id, name: e.detector_name ?? e.detector_id,
    lat: e.detector_lat, lon: e.detector_lon, group: e.group,
    subgroup: e.subgroup
  };
  return acc;
}, {}));

export function useSimulation() {
  const [simMode, setSimMode] = useState(false);
  const [simData, setSimData] = useState(null);
  const [simTime, setSimTime] = useState(0); // Throttled for React
  const [isPlaying, setIsPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [showConfig, setShowConfig] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  const rafRef = useRef(null);
  const lastTRef = useRef(null);
  const exactSimTimeRef = useRef(0);
  const lastReactUpdateRef = useRef(-1);
  const isLoopingRef = useRef(false);

  const toggleLoop = useCallback(() => {
    setIsLooping(v => {
      isLoopingRef.current = !v;
      return !v;
    });
  }, []);

  // Subscribers for 60fps updates (like TacticalMapView)
  const subscribers = useRef(new Set());
  const subscribeTick = useCallback((cb) => {
    subscribers.current.add(cb);
    return () => subscribers.current.delete(cb);
  }, []);

  // Animation loop
  const tick = useCallback((timestamp) => {
    if (lastTRef.current == null) lastTRef.current = timestamp;
    const dt = (timestamp - lastTRef.current) / 1000 * simSpeed;
    lastTRef.current = timestamp;

    let nextT = exactSimTimeRef.current + dt;
    const maxT = simData?.durationSec ?? 0;
    if (nextT >= maxT) {
      if (isLoopingRef.current && maxT > 0) {
        nextT = nextT % maxT;
      } else {
        nextT = maxT;
        setIsPlaying(false);
      }
    }
    exactSimTimeRef.current = nextT;

    // Notify fast subscribers
    subscribers.current.forEach(cb => cb(nextT, simData));

    // Throttle React state updates to ~2Hz to keep Dashboard responsive
    if (Math.abs(nextT - lastReactUpdateRef.current) >= 0.5 || nextT === maxT || nextT === 0) {
      setSimTime(nextT);
      lastReactUpdateRef.current = nextT;
    }

    if (nextT < maxT || isLoopingRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [simData, simSpeed]);

  // Effect to manage play/pause of the loop
  useEffect(() => {
    if (isPlaying) {
      lastTRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, tick]);

  const startSimulation = useCallback((config) => {
    const sim = generateSimulation({ detectors, ...config });
    setSimData(sim);
    exactSimTimeRef.current = 0;
    lastReactUpdateRef.current = -1;
    setSimTime(0);
    setIsPlaying(true);
    setShowConfig(false);
    setSimMode(true);
  }, []);

  const stopSimulation = useCallback(() => {
    setIsPlaying(false);
    setSimData(null);
    exactSimTimeRef.current = 0;
    lastReactUpdateRef.current = -1;
    setSimTime(0);
    setSimMode(false);
    setShowConfig(false);
  }, []);

  const seek = useCallback((t) => {
    exactSimTimeRef.current = t;
    lastReactUpdateRef.current = t;
    setSimTime(t);
    // Notify fast subscribers immediately
    subscribers.current.forEach(cb => cb(t, simData));
  }, [simData]);

  // Compute live drone points at the React-throttled time (for components that don't subscribe to fast updates)
  const liveDrones = simData?.drones
    ?.map(d => {
      const pos = getDronePosition(d, simTime);
      if (!pos) return null;
      
      const threatColor = d.threat === 'HIGH' ? '#f43f5e' : d.threat === 'MEDIUM' ? '#fb923c' : '#34d399';
      
      return {
        // Standard event format for drones currently flying
        drone_id: d.id,
        group: d.group,
        model: d.model,
        protocol_name: d.protocol,
        latitude: pos.lat,
        longitude: pos.lon,
        speed: d.speed,
        height: d.height,
        threat: 'LOW', // could be dynamically calculated based on distance, but TacticalMapView only uses estimated_distance_m
        direction: pos.heading ? 'N' : 'N', // simplified
        datetime: new Date().toISOString(),
        has_gps: true,
        // The overlay logic handles distance calculations, but we just pass the object
        _simDroneRef: d, // useful if TacticalMapView needs drone config (like trail data)
        _simPos: pos,
      };
    })
    .filter(Boolean) ?? [];

  // Filter detection events that have occurred up to simTime
  const simulatedEvents = simData?.detectionEvents?.filter(e => e.time <= simTime) ?? [];

  return {
    simMode, setSimMode,
    showConfig, setShowConfig,
    simData, simTime,
    isPlaying, setIsPlaying,
    simSpeed, setSimSpeed,
    isLooping, toggleLoop,
    startSimulation, stopSimulation, seek,
    simulatedEvents,
    liveDrones,
    subscribeTick,
    exactSimTimeRef,
    detectors
  };
}
