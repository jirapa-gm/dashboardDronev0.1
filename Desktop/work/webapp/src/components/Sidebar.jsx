import { useState } from 'react';
import { Collapsible, SectionHeader, Field } from '../shared/ui';
import { FilterIcon, LayersIcon, SearchIcon } from '../shared/icons';
import { GROUP_COLOR } from '../shared/constants';
import { mockGroupTree } from '../data/Mockdata';

// ── Detector tree ─────────────────────────────────────────────────────────────
function DetectorTree({ selectedGroup, selectedSubgroup, selectedDetector, onChange }) {
  const [openGroups,    setOpenGroups]    = useState({});
  const [openSubgroups, setOpenSubgroups] = useState({});

  const toggle = (map, setMap, key) => setMap(m => ({ ...m, [key]: !m[key] }));

  return (
    <div className="flex-col-start">
      {/* ALL */}
      <button
        onClick={() => onChange({ group: 'ALL', subgroup: 'ALL', detector: 'ALL' })}
        className="tree-node-btn"
        style={{
          background: selectedGroup === 'ALL' ? '#f9731612' : 'transparent',
          borderLeft: `2px solid ${selectedGroup === 'ALL' ? '#f97316' : 'transparent'}`,
        }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#888' }}>All Detectors</span>
      </button>

      {mockGroupTree.map(g => {
        const gColor  = GROUP_COLOR[g.group] ?? '#888';
        const isGSel  = selectedGroup === g.group && selectedSubgroup === 'ALL';
        const isGOpen = openGroups[g.group];
        const detCount = g.subgroups.reduce((s, sg) => s + sg.detectors.length, 0);

        return (
          <div key={g.group}>
            <div className="flex-row-center">
              <button
                onClick={() => { onChange({ group: g.group, subgroup: 'ALL', detector: 'ALL' }); toggle(openGroups, setOpenGroups, g.group); }}
                className="tree-node-btn"
                style={{
                  flex: 1,
                  background: isGSel ? `${gColor}12` : 'transparent',
                  borderLeft: `2px solid ${isGSel ? gColor : 'transparent'}`,
                }}>
                <div className="rounded-full flex-none" style={{ background: gColor, width: '0.625rem', height: '0.625rem' }} />
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: gColor }}>{g.group}</span>
                <span style={{ fontSize: '11px', color: '#555', marginLeft: 'auto' }}>{detCount}</span>
              </button>
              <button onClick={() => toggle(openGroups, setOpenGroups, g.group)} className="tree-arrow-btn">
                <svg style={{ width: '0.75rem', height: '0.75rem', transform: isGOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>

            <Collapsible isOpen={isGOpen} maxH="600px">
              {g.subgroups.map(sg => {
                const isSgOpen = openSubgroups[sg.subgroup];
                const isSgSel  = selectedGroup === g.group && selectedSubgroup === sg.subgroup && selectedDetector === 'ALL';
                return (
                  <div key={sg.subgroup}>
                    <div className="flex-row-center" style={{ paddingLeft: '1rem' }}>
                      <button
                        onClick={() => { onChange({ group: g.group, subgroup: sg.subgroup, detector: 'ALL' }); toggle(openSubgroups, setOpenSubgroups, sg.subgroup); }}
                        className="tree-node-btn"
                        style={{
                          flex: 1,
                          background: isSgSel ? `${gColor}0a` : 'transparent',
                          borderLeft: `2px solid ${isSgSel ? gColor : '#2a2a2a'}`,
                        }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: isSgSel ? gColor : '#777' }}>{sg.subgroup}</span>
                        <span style={{ fontSize: '11px', color: '#555', marginLeft: 'auto' }}>{sg.detectors.length}</span>
                      </button>
                      <button onClick={() => toggle(openSubgroups, setOpenSubgroups, sg.subgroup)} className="tree-arrow-btn" style={{ padding: '0.5rem' }}>
                        <svg style={{ width: '0.625rem', height: '0.625rem', transform: isSgOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                    </div>

                    <Collapsible isOpen={isSgOpen} maxH="400px">
                      {sg.detectors.map(det => {
                        const isDetSel = selectedGroup === g.group && selectedSubgroup === sg.subgroup && selectedDetector === det.id;
                        return (
                          <button key={det.id}
                            onClick={() => onChange({ group: g.group, subgroup: sg.subgroup, detector: det.id })}
                            className="tree-node-btn"
                            style={{
                              paddingLeft: '2.5rem',
                              background: isDetSel ? `${gColor}15` : 'transparent',
                              borderLeft: `2px solid ${isDetSel ? gColor : 'transparent'}`,
                            }}>
                            <div className="rounded-full flex-none" style={{ background: isDetSel ? gColor : '#444', width: '0.375rem', height: '0.375rem' }} />
                            <span className="font-mono" style={{ fontSize: '11px', color: isDetSel ? gColor : '#666' }}>{det.id}</span>
                          </button>
                        );
                      })}
                    </Collapsible>
                  </div>
                );
              })}
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

        <section className="sidebar-section">
          <SectionHeader label="Search Filters" icon={<FilterIcon />} isOpen={filtersOpen} onToggle={() => setFiltersOpen(v => !v)} />
          <Collapsible isOpen={filtersOpen} maxH="240px">
            <div className="flex-col-start gap-3" style={{ padding: '1rem' }}>
              <Field label="Start Date"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" /></Field>
              <Field label="End Date"><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" /></Field>
              <button onClick={handleSearch} disabled={isLoading} className="btn btn-primary w-full">
                {isLoading
                  ? <><div className="spinner-small-white animate-spin" />Searching…</>
                  : <><SearchIcon style={{ width: '0.875rem', height: '0.875rem' }} />Search</>}
              </button>
            </div>
          </Collapsible>
        </section>

        <section className="sidebar-section">
          <SectionHeader label="Scope" icon={<LayersIcon />} isOpen={treeOpen} onToggle={() => setTreeOpen(v => !v)}
            count={selectedDet !== 'ALL' ? `Det: ${selectedDet}` : selectedSG !== 'ALL' ? selectedSG : selectedGroup} />
          <Collapsible isOpen={treeOpen} maxH="500px">
            <div style={{ padding: '0.25rem 0' }}>
              <DetectorTree selectedGroup={selectedGroup} selectedSubgroup={selectedSG} selectedDetector={selectedDet} onChange={handleTreeChange} />
            </div>
          </Collapsible>
        </section>

      </div>
    </aside>
  );
}