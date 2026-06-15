import { useState, useRef } from 'react';
import { Collapsible, SectionHeader, Field } from '../shared/ui';
import { FilterIcon, LayersIcon, SearchIcon, CalendarIcon } from '../shared/icons';
import { GROUP_COLOR } from '../shared/constants';
import { mockGroupTree } from '../data/Mockdata';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// ── Detector tree ─────────────────────────────────────────────────────────────
function DetectorTree({ selectedGroup, selectedSubgroup, selectedDetector, onChange }) {
  const [openGroups,    setOpenGroups]    = useState({});
  const [openSubgroups, setOpenSubgroups] = useState({});

  const toggle = (map, setMap, key) => setMap(m => ({ ...m, [key]: !m[key] }));

  return (
    <div className="flex-col-start" style={{ padding: '0.5rem 0.75rem' }}>
      {/* ALL */}
      <button
        onClick={() => onChange({ group: 'ALL', subgroup: 'ALL', detector: 'ALL' })}
        className="tree-node-btn"
        style={{
          background: selectedGroup === 'ALL' ? 'linear-gradient(90deg, rgba(249, 115, 22, 0.12) 0%, transparent 100%)' : 'transparent',
          borderLeftColor: selectedGroup === 'ALL' ? '#f97316' : 'transparent',
          color: selectedGroup === 'ALL' ? '#f97316' : '#888',
          marginBottom: '0.5rem',
        }}>
        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>All Detectors</span>
      </button>

      {mockGroupTree.map(g => {
        const gColor  = GROUP_COLOR[g.group] ?? '#888';
        const isGSel  = selectedGroup === g.group && selectedSubgroup === 'ALL';
        const isGOpen = openGroups[g.group];
        const detCount = g.subgroups.reduce((s, sg) => s + sg.detectors.length, 0);

        return (
          <div key={g.group} style={{ marginBottom: '0.25rem' }}>
            <div className="flex-row-center">
              <button
                onClick={() => { onChange({ group: g.group, subgroup: 'ALL', detector: 'ALL' }); toggle(openGroups, setOpenGroups, g.group); }}
                className="tree-node-btn"
                style={{
                  flex: 1,
                  background: isGSel ? `linear-gradient(90deg, ${gColor}15 0%, transparent 100%)` : 'transparent',
                  borderLeftColor: isGSel ? gColor : 'transparent',
                  color: isGSel ? gColor : '#aaa',
                }}>
                <div className="rounded-full flex-none" style={{ background: gColor, width: '0.5rem', height: '0.5rem', boxShadow: isGSel ? `0 0 8px ${gColor}` : 'none' }} />
                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{g.group}</span>
                <span className="badge-count" style={{ marginLeft: 'auto', background: isGSel ? `${gColor}22` : 'rgba(255,255,255,0.03)', color: isGSel ? gColor : '#555', border: `1px solid ${isGSel ? gColor + '33' : 'rgba(255,255,255,0.05)'}` }}>
                  {detCount}
                </span>
              </button>
              <button onClick={() => toggle(openGroups, setOpenGroups, g.group)} className="tree-arrow-btn" style={{ marginLeft: '0.25rem' }}>
                <svg style={{ width: '0.625rem', height: '0.625rem', transform: isGOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>

            <Collapsible isOpen={isGOpen} maxH="600px">
              <div className="tree-subgroup-container">
                {g.subgroups.map(sg => {
                  const isSgOpen = openSubgroups[sg.subgroup];
                  const isSgSel  = selectedGroup === g.group && selectedSubgroup === sg.subgroup && selectedDetector === 'ALL';
                  return (
                    <div key={sg.subgroup} className="tree-branch-node" style={{ margin: '0.125rem 0' }}>
                      <div className="flex-row-center">
                        <button
                          onClick={() => { onChange({ group: g.group, subgroup: sg.subgroup, detector: 'ALL' }); toggle(openSubgroups, setOpenSubgroups, sg.subgroup); }}
                          className="tree-node-btn"
                          style={{
                            flex: 1,
                            background: isSgSel ? `linear-gradient(90deg, ${gColor}0e 0%, transparent 100%)` : 'transparent',
                            borderLeftColor: isSgSel ? gColor : 'transparent',
                            color: isSgSel ? gColor : '#888',
                          }}>
                          <span style={{ fontSize: '10.5px', fontWeight: '600' }}>{sg.subgroup}</span>
                          <span className="badge-count" style={{ marginLeft: 'auto', background: isSgSel ? `${gColor}15` : 'rgba(255,255,255,0.02)', color: isSgSel ? gColor : '#444', border: `1px solid ${isSgSel ? gColor + '22' : 'rgba(255,255,255,0.03)'}` }}>
                            {sg.detectors.length}
                          </span>
                        </button>
                        <button onClick={() => toggle(openSubgroups, setOpenSubgroups, sg.subgroup)} className="tree-arrow-btn" style={{ marginLeft: '0.25rem' }}>
                          <svg style={{ width: '0.55rem', height: '0.55rem', transform: isSgOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                      </div>

                      <Collapsible isOpen={isSgOpen} maxH="400px">
                        <div className="tree-detector-container">
                          {sg.detectors.map(det => {
                            const isDetSel = selectedGroup === g.group && selectedSubgroup === sg.subgroup && selectedDetector === det.id;
                            return (
                              <div key={det.id} className="tree-detector-node" style={{ margin: '0.125rem 0' }}>
                                <button
                                  onClick={() => onChange({ group: g.group, subgroup: sg.subgroup, detector: det.id })}
                                  className="tree-node-btn"
                                  style={{
                                    background: isDetSel ? `linear-gradient(90deg, ${gColor}18 0%, transparent 100%)` : 'transparent',
                                    borderLeftColor: isDetSel ? gColor : 'transparent',
                                    color: isDetSel ? gColor : '#666',
                                  }}>
                                  <div className={`rounded-full flex-none ${isDetSel ? 'animate-pulse' : ''}`} style={{ background: isDetSel ? gColor : '#444', width: '0.3125rem', height: '0.3125rem', boxShadow: isDetSel ? `0 0 6px ${gColor}` : 'none' }} />
                                  <span className="font-mono" style={{ fontSize: '10.5px' }}>{det.id}</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </Collapsible>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Sidebar({ events, isLoading, onSearch, defaultStartDate, defaultEndDate, visible }) {
  const [startDate,     setStartDate]   = useState(defaultStartDate);
  const [endDate,       setEndDate]     = useState(defaultEndDate);
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedSG,    setSelectedSG]  = useState('ALL');
  const [selectedDet,   setSelectedDet] = useState('ALL');
  const [filtersOpen,   setFiltersOpen] = useState(true);
  const [treeOpen,      setTreeOpen]    = useState(true);

  const startDateInputRef = useRef(null);
  const endDateInputRef = useRef(null);

  const handleTreeChange = ({ group, subgroup, detector }) => {
    const g   = group;
    const sg  = group === 'ALL' ? 'ALL' : subgroup;
    const det = sg    === 'ALL' ? 'ALL' : detector;
    setSelectedGroup(g); setSelectedSG(sg); setSelectedDet(det);
    onSearch({ startDate, endDate, group: g, subgroup: sg, detector: det });
  };

  const handleSearch = () =>
    onSearch({ startDate, endDate, group: selectedGroup, subgroup: selectedSG, detector: selectedDet });

  return (
    <aside style={{ width: visible ? '19rem' : '0', minWidth: visible ? '19rem' : '0', overflow: 'hidden', transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1), min-width 0.28s cubic-bezier(0.4,0,0.2,1)', flexShrink: 0, zIndex: 40 }}
           className="sidebar-container">
      <div style={{ width: '19rem' }} className="flex-col-start flex-1 overflow-y-auto">

        <section className="sidebar-section-card">
          <SectionHeader label="Search Filters" icon={<FilterIcon />} isOpen={filtersOpen} onToggle={() => setFiltersOpen(v => !v)} />
          <Collapsible isOpen={filtersOpen} maxH="240px">
            <div className="flex-col-start gap-3" style={{ padding: '0.75rem 0.875rem 0.875rem 0.875rem' }}>
              <div className="date-group-capsule w-full">
                <div
                  className="date-row"
                  onClick={() => {
                    try {
                      startDateInputRef.current?.showPicker();
                    } catch (e) {
                      console.error("showPicker not supported", e);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <CalendarIcon className="date-row-icon" />
                  <span className="date-row-label">Start Date</span>
                  <span className="date-row-value">{formatDate(startDate)}</span>
                  <input
                    ref={startDateInputRef}
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="date-row-input-hidden"
                  />
                </div>
                <div
                  className="date-row"
                  onClick={() => {
                    try {
                      endDateInputRef.current?.showPicker();
                    } catch (e) {
                      console.error("showPicker not supported", e);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <CalendarIcon className="date-row-icon" />
                  <span className="date-row-label">End Date</span>
                  <span className="date-row-value">{formatDate(endDate)}</span>
                  <input
                    ref={endDateInputRef}
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="date-row-input-hidden"
                  />
                </div>
              </div>
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="btn btn-primary w-full"
                style={{
                  height: '2.25rem',
                  borderRadius: '10px',
                  fontSize: '11px',
                  marginTop: '2px',
                  padding: '0 0.875rem',
                  lineHeight: '1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isLoading
                  ? (
                    <>
                      <div className="spinner-small-white animate-spin" />
                      <span style={{ lineHeight: '1' }}>Searching…</span>
                    </>
                  ) : (
                    <>
                      <SearchIcon style={{ width: '0.875rem', height: '0.875rem' }} />
                      <span style={{ lineHeight: '1' }}>Search</span>
                    </>
                  )
                }
              </button>
            </div>
          </Collapsible>
        </section>

        <section className="sidebar-section-card">
          <SectionHeader label="Scope" icon={<LayersIcon />} isOpen={treeOpen} onToggle={() => setTreeOpen(v => !v)}
            count={selectedDet !== 'ALL' ? `Det: ${selectedDet}` : selectedSG !== 'ALL' ? selectedSG : selectedGroup} />
          <Collapsible isOpen={treeOpen} maxH="320px">
            <div className="no-scrollbar" style={{ padding: '0.25rem 0.5rem 0.25rem 0', maxHeight: '300px', overflowY: 'auto' }}>
              <DetectorTree selectedGroup={selectedGroup} selectedSubgroup={selectedSG} selectedDetector={selectedDet} onChange={handleTreeChange} />
            </div>
          </Collapsible>
        </section>

      </div>
    </aside>
  );
}