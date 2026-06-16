import { useState } from 'react';
import { GamepadIcon, PlayIcon, CloseIcon } from '../shared/icons';

export default function SimConfigPanel({ onStart, detectorCount, onClose }) {
  const [numDrones,     setNumDrones]     = useState(3);
  const [durationSec,   setDurationSec]   = useState(120);
  const [entryDir,      setEntryDir]      = useState('random');
  const [group,         setGroup]         = useState('mixed');
  const [spawnInterval, setSpawnInterval] = useState(15);

  return (
    <div className="absolute inset-0 z-[2500] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div style={{
        background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px', padding: '24px', width: '420px', maxWidth: '90vw',
        boxShadow: '0 20px 40px rgba(0,0,0,0.8)', color: '#fff', fontFamily: 'system-ui, sans-serif'
      }}>
        <div className="sim-panel-header">
          <GamepadIcon className="w-8 h-8 text-orange-500" />
          <div>
            <div className="sim-panel-title">Simulation Setup</div>
            <div className="sim-panel-subtitle">{detectorCount} detectors loaded</div>
          </div>
        </div>

        <div className="sim-panel-body">
          {/* Number of drones */}
          <div>
            <label className="sim-panel-label">Number of Drones</label>
            <div className="sim-panel-btn-group">
              {[1, 2, 3, 5, 10, 20].map(n => (
                <button key={n}
                  style={{
                    padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                    background: numDrones === n ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${numDrones === n ? '#f97316' : 'rgba(255,255,255,0.1)'}`,
                    color: numDrones === n ? '#f97316' : '#ccc'
                  }}
                  onClick={() => setNumDrones(n)}>{n}</button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="sim-panel-label">Duration</label>
            <div className="sim-panel-btn-group">
              {[{v:60,l:'1 min'},{v:120,l:'2 min'},{v:180,l:'3 min'},{v:300,l:'5 min'}].map(({v,l}) => (
                <button key={v}
                  style={{
                    padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                    background: durationSec === v ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${durationSec === v ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                    color: durationSec === v ? '#3b82f6' : '#ccc'
                  }}
                  onClick={() => setDurationSec(v)}>{l}</button>
              ))}
            </div>
          </div>

          {/* Group */}
          <div>
            <label className="sim-panel-label">Group</label>
            <div className="sim-panel-btn-group">
              {[{v:'mixed',l:'GA + GB'},{v:'GA',l:'GA Only'},{v:'GB',l:'GB Only'}].map(({v,l}) => (
                <button key={v}
                  style={{
                    padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                    background: group === v ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${group === v ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                    color: group === v ? '#22c55e' : '#ccc'
                  }}
                  onClick={() => setGroup(v)}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="sim-panel-footer">
          <button
            className="sim-panel-cancel-btn"
            onClick={onClose}
          >
            <CloseIcon className="w-4 h-4" /> Cancel
          </button>
          <button
            className="sim-panel-start-btn"
            onClick={() => onStart({ numDrones, durationSec, entryDir, group, spawnInterval })}
          >
            <PlayIcon className="w-4 h-4 fill-current" /> Start Simulation
          </button>
        </div>
      </div>
    </div>
  );
}
