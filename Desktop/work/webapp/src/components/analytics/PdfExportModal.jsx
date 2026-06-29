import { useState } from 'react';
import { BarChartIcon, LayersIcon, DroneIcon, SignalIcon, CompassIcon, LogIcon, CloseIcon, TargetIcon, GridIcon, DownloadIcon, RestartIcon } from '../../shared/icons';

const ALL_SECTIONS = [
  { id: 'kpi',      label: 'KPI Summary',        sub: 'Total events, drones, speed…',  Icon: BarChartIcon },
  { id: 'subgroup', label: 'Subgroup / Detector', sub: 'Groups, detectors, lat/lon',    Icon: LayersIcon },
  { id: 'model',    label: 'Drone Models',        sub: 'Model distribution bars',       Icon: DroneIcon },
  { id: 'protocol', label: 'Protocol & Freq',     sub: 'Protocol & frequency bands',    Icon: SignalIcon },
  { id: 'direction',label: 'Direction of Origin', sub: 'Top bearing sectors',           Icon: CompassIcon },
];

const DETAIL_LEVELS = [
  { id: 'group',    Icon: GridIcon,   label: 'Basic Overview' },
  { id: 'subgroup', Icon: TargetIcon, label: 'Zone Breakdown'},
  { id: 'detector', Icon: CompassIcon,label: 'Full Details' },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
      <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PdfExportModal({ onClose, onExport, groupFilter, isLoading }) {
  const [scope,       setScope]       = useState(groupFilter);
  const [detailLevel, setDetailLevel] = useState('group');
  const [sections,    setSections]    = useState(new Set(['kpi','model','protocol','direction']));

  const toggle = (id) =>
    setSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allOn  = ALL_SECTIONS.every(s => sections.has(s.id));
  const toggleAll = () => setSections(allOn ? new Set() : new Set(ALL_SECTIONS.map(s => s.id)));

  return (
    <div className="pdf-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pdf-modal-card">
        {/* Header */}
        <div className="pdf-modal-header">
          <div className="pdf-modal-title">
            <span className="pdf-modal-title-icon"><LogIcon /></span>
            Export PDF Report
          </div>
          <button className="pdf-modal-close" onClick={onClose}><CloseIcon /></button>
        </div>

        <div className="pdf-modal-body">
          {/* Scope */}
          <div>
            <div className="pdf-section-label">Data Scope</div>
            <div className="pdf-scope-row">
              {['ALL','GA','GB'].map(g => (
                <button
                  key={g}
                  className={`pdf-scope-btn ${scope === g ? 'active' : ''}`}
                  onClick={() => setScope(g)}
                >
                  {g === 'ALL' ? '⬡ All Groups' : g === 'GA' ? '● Group GA' : '● Group GB'}
                </button>
              ))}
            </div>
          </div>

          {/* Detail Level */}
          <div>
            <div className="pdf-section-label">Report Format</div>
            <div className="pdf-detail-row">
              {DETAIL_LEVELS.map(d => (
                <button
                  key={d.id}
                  className={`pdf-detail-btn ${detailLevel === d.id ? 'active' : ''}`}
                  onClick={() => setDetailLevel(d.id)}
                >
                  <span className="pdf-detail-btn-icon"><d.Icon /></span>
                  <span className="pdf-detail-btn-label">{d.label}</span>
                  <span className="pdf-detail-btn-sub">{d.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section checkboxes */}
          <div>
            <div className="pdf-select-all-row">
              <div className="pdf-section-label" style={{ marginBottom: 0 }}>Report Sections</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="pdf-selected-count">
                  <strong>{sections.size}</strong> / {ALL_SECTIONS.length} selected
                </span>
                <button className="pdf-select-all-btn" onClick={toggleAll}>
                  {allOn ? 'Deselect all' : 'Select all'}
                </button>
              </div>
            </div>
            <div style={{ height: '0.5rem' }} />
            <div className="pdf-sections-grid">
              {ALL_SECTIONS.map(s => {
                const isChecked = sections.has(s.id);
                const disabled  = s.id === 'subgroup' && scope === 'ALL';
                return (
                  <div
                    key={s.id}
                    className={`pdf-check-item ${isChecked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
                    onClick={() => !disabled && toggle(s.id)}
                    style={disabled ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
                    title={disabled ? 'Subgroup data is not available in ALL scope' : undefined}
                  >
                    <div className="pdf-check-box">
                      {isChecked && <CheckIcon />}
                    </div>
                    <div className="pdf-check-text">
                      <span className="pdf-check-label"><s.Icon className="w-4 h-4 inline mr-1" /> {s.label}</span>
                      <span className="pdf-check-sub">{s.sub}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pdf-modal-footer">
          <button className="pdf-cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="pdf-export-btn"
            disabled={sections.size === 0 || isLoading}
            onClick={() => onExport({ scope, detailLevel, sections })}
          >
            {isLoading
              ? <><RestartIcon className="w-3 h-3 inline mr-1 animate-spin" /> Preparing…</>
              : <><DownloadIcon className="w-3 h-3 inline mr-1" /> Export PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}
