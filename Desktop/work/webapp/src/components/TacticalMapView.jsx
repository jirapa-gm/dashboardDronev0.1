import { useEffect, useRef, useState, useMemo } from 'react';
import { GA, GB } from '../shared/constants';
import { distColor } from '../shared/helpers';
import { TargetIcon, AlertIcon, LayersIcon, SignalIcon, PlayIcon, PauseIcon, RestartIcon, LoopIcon, CloseIcon, GamepadIcon } from '../shared/icons';
import { Toolbar } from '../shared/ui';
import { loadLeaflet, haversine, destPoint, buildDetectors, computeRadarBounds } from '../utils/mapUtils';
import { makeDetectorIcon, makeDroneDotIcon, buildDronePopup, buildDetectorPopup } from './map/mapIcons';
import SimConfigPanel from '../simulation/SimConfigPanel';
import { getDronePosition } from '../simulation/engine';
import { SweepLayer } from '../simulation/SweepLayer';

// ── Constants ─────────────────────────────────────────────────────────────────
const GROUP_COLORS = { GA, GB };

import { drawDetectorRadar, drawGlobalRadar } from './map/radarDrawers';

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
}
.leaflet-marker-icon.tac-smooth {
  transition: transform 1.2s linear !important;
}`;

// ── Main component ─────────────────────────────────────────────────────────────
export default function TacticalMapView({ events, summary, isLoading, simContext }) {
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
  const liveDroneRefs = useRef({}); // For real live/mock api markers
  const liveTrailRefs = useRef({}); // For real live/mock api trails

  const filtered   = events;
  const detectors  = useMemo(() => {
    if (simContext?.simMode && simContext?.detectors) {
      return simContext.detectors.map(d => ({ ...d, events: filtered.filter(e => e.detector_id === d.id) }));
    }
    return buildDetectors(filtered);
  }, [filtered, simContext?.simMode, simContext?.detectors]);
  const radarBound = useMemo(() => computeRadarBounds(detectors), [detectors]);

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
        const detRadius = Math.min(Math.max(...(det.events?.map(e => e.estimated_distance_m ?? 800) || [800]), 800) * 1.3 + 200, 5000);
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

  // Compute stats for visible targets
  const visibleStats = useMemo(() => {
    let visibleCount = 0, critCount = 0, gaCount = 0, gbCount = 0;
    
    if (simContext?.simMode) {
      const uniqueSimDrones = Array.from(new Set(liveDetections.map(d => d.droneId)));
      visibleCount = uniqueSimDrones.length;
      critCount = liveDetections.filter(d => d.dist < 100).length;
      gaCount = liveDetections.filter(d => d.droneGroup === 'GA').length;
      gbCount = liveDetections.filter(d => d.droneGroup === 'GB').length;
    } else {
      // Events are already strictly filtered by useEvents.js (Option A)
      const droneMap = {};
      filtered.forEach(evt => {
        const id = evt.drone_id || 'unknown';
        if (!droneMap[id]) droneMap[id] = [];
        droneMap[id].push(evt);
      });
      
      const visibleEvts = Object.values(droneMap).map(evts => {
        evts.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        return evts[evts.length - 1];
      });
      
      visibleCount = visibleEvts.length;
      critCount = visibleEvts.filter(e => (e.estimated_distance_m ?? 999) < 100).length;
      gaCount = visibleEvts.filter(e => e.group === 'GA').length;
      gbCount = visibleEvts.filter(e => e.group === 'GB').length;
    }

    const noGpsCount = summary?.no_gps || 0;

    return { visibleCount, critCount, gaCount, gbCount, noGpsCount };
  }, [simContext?.simMode, liveDetections, filtered, summary]);

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

    // ── Drone dots & trails (Realistic Live/Mock) ──
    if (!simContext?.simMode) {
      // Group by drone
      const droneMap = {};
      
      // Calculate each detector's sweep radius
      const detRadii = {};
      detectors.forEach(det => {
        const maxDist = Math.max(...(det.events?.map(e => e.estimated_distance_m ?? 800) || [800]), 800);
        detRadii[det.id] = Math.min(maxDist * 1.3 + 200, 2000);
      });

      filtered.forEach(evt => {
        const id = evt.drone_id || 'unknown';
        if (!droneMap[id]) droneMap[id] = [];
        droneMap[id].push(evt);
      });

      const currentLiveIds = new Set(Object.keys(droneMap));

      // Update or create markers/trails
      Object.entries(droneMap).forEach(([id, evts]) => {
        evts.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        const latest = evts[evts.length - 1];
        const dist  = latest.estimated_distance_m ?? null;
        const gc    = GROUP_COLORS[latest.group] ?? '#888';
        const isAlert = dist != null && dist < 100;
        
        const pathCoords = evts.map(e => [e.latitude, e.longitude]);

        if (!liveDroneRefs.current[id]) {
          // Create new
          const trail = L.polyline(pathCoords, { color: gc, weight: 2, opacity: 0.35, dashArray: '4 6' }).addTo(map);
          liveTrailRefs.current[id] = trail;

          const mk = L.marker([latest.latitude, latest.longitude], { icon: makeDroneDotIcon(gc, isAlert), zIndexOffset: isAlert ? 300 : 100 })
            .bindPopup(L.popup({ maxWidth: 260, closeButton: true, className: 'tac-popup' }).setContent(buildDronePopup(latest, gc)))
            .addTo(map);
          liveDroneRefs.current[id] = mk;
        } else {
          // Update existing
          liveTrailRefs.current[id].setLatLngs(pathCoords);
          liveDroneRefs.current[id].setLatLng([latest.latitude, latest.longitude]);
          liveDroneRefs.current[id].setIcon(makeDroneDotIcon(gc, isAlert));
          if (liveDroneRefs.current[id].isPopupOpen()) {
            liveDroneRefs.current[id].setPopupContent(buildDronePopup(latest, gc));
          }
        }
      });

      // Cleanup removed drones
      Object.keys(liveDroneRefs.current).forEach(id => {
        if (!currentLiveIds.has(id)) {
          liveDroneRefs.current[id].remove();
          delete liveDroneRefs.current[id];
          liveTrailRefs.current[id].remove();
          delete liveTrailRefs.current[id];
        }
      });
    } else {
      // Clear live artifacts if switching to simMode
      Object.values(liveDroneRefs.current).forEach(m => m.remove());
      Object.values(liveTrailRefs.current).forEach(t => t.remove());
      liveDroneRefs.current = {};
      liveTrailRefs.current = {};
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
    <div className="tm-container flex-col-start h-full">
      <style>{MAP_CSS}</style>

      <Toolbar>
        <div className="flex-row-center gap-2">
          <TargetIcon className="tm-icon-orange" />
          <span className="tm-title">Tactical Map</span>
          <span className="tm-badge-orange rounded-full font-bold">{visibleStats.visibleCount} targets</span>
          {visibleStats.critCount > 0 && <span className="tm-badge-red rounded-full font-bold animate-pulse"><AlertIcon className="w-3 h-3" stroke="#ef4444" /> {visibleStats.critCount} CRITICAL</span>}
        </div>

        {/* Layer toggles */}
        <div className="flex-row-center gap-1-5 flex-wrap">
          {/* Sweep toggle */}
          {radarMode !== 'global' && (
            <button onClick={() => setShowSweep(v => !v)}
              className="rounded-full font-bold transition-all"
              className={showSweep ? 'tm-btn-sweep-active rounded font-bold' : 'tm-btn-sweep-inactive rounded font-bold'}>
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
            <span className="tm-icon-text"><LayersIcon className="w-3 h-3" stroke={radarMode === 'global' ? '#3b82f6' : '#555'} /> All Radars</span>
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

        <div ref={mapRef} className="tm-map-container" />

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
        <div className="legend-box tm-legend-overlay">
          <span className="tm-legend-title">Radar Zones</span>
          {[['CRITICAL', '#ef4444', '< 20%'], ['DANGER', '#f97316', '< 40%'], ['WARNING', '#eab308', '< 60%'], ['CAUTION', '#22c55e', '< 80%'], ['BOUNDARY', '#3b82f6', 'outer']].map(([l, c, h]) => (
            <div key={l} className="flex-row-center gap-2-5">
              <div className="rounded tm-legend-color-box" style={{ background: c }} />
              <span className="font-mono tm-legend-label" style={{ color: c }}>{l}</span>
              <span className="tm-legend-val font-mono">{h}</span>
            </div>
          ))}
          <div className="flex-col-start gap-1-5 tm-legend-divider">
            {[['#ef4444', 'Critical drone (< 100m)'], ['#22c55e', 'Safe drone'], ['#f97316', 'Detector']].map(([c, l]) => (
              <div key={l} className="flex-row-center gap-2">
                <div className="rounded-full tm-legend-dot" style={{ background: c }} />
                <span className="tm-legend-dot-label">{l}</span>
              </div>
            ))}
          </div>
          <div className="tm-legend-divider">
            <div className="tm-legend-hint">Click detector → show its radar</div>
            <div className="tm-legend-hint">Click drone dot → details</div>
          </div>
        </div>

        {/* Live stats overlay */}
        {filtered.length > 0 && (
          <div className="stats-overlay-box tm-stats-overlay">
            {[['Targets', visibleStats.visibleCount, '#f97316'], ['Detectors', detectors.length, '#3b82f6'], ['Critical', visibleStats.critCount, '#ef4444'],
              ['No GPS', visibleStats.noGpsCount, '#eab308'],
              ['GA', visibleStats.gaCount, '#f97316'],
              ['GB', visibleStats.gbCount, '#eab308']].map(([l, v, c]) => (
              <div key={l} className="flex-row-between gap-4">
                <span className="tm-stats-label">{l}</span>
                <span className="font-mono tm-stats-val" style={{ color: c }}>{v}</span>
              </div>
            ))}
            {radarMode !== 'none' && (
              <div className="tm-stats-divider">
                <div className="font-mono tm-stats-flex" style={{ color: radarMode === 'global' ? '#3b82f6' : '#f97316' }}>
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
              <div className="tm-active-det-divider">
                <div className="tm-active-det-title">
                  <span className="animate-pulse tm-pulse-dot"></span>
                  Live Tracking
                </div>
                {liveDetections.length > 0 ? (
                  <div className="flex-col-start gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1 tm-scroll-container">
                    {liveDetections.map((d, i) => (
                      <div key={i} className="flex-row-between tm-det-card">
                        <div className="flex-row-between">
                          <span className="tm-det-drone-id" style={{ color: d.droneColor }}>{d.droneId}</span>
                          <span className="tm-det-dist">{d.dist}m</span>
                        </div>
                        <div className="flex-row-between mt-1">
                          <span className="tm-det-label">Detected by</span>
                          <span className="tm-det-id">{d.detId}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="tm-det-empty">No active detections</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}