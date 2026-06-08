export default function Breadcrumb({ activeGroup, activeSubgroup, activeDetector, onReset, onResetToGroup }) {
  const showDetector = activeDetector !== 'ALL';
  const showSubgroup = !showDetector && activeSubgroup !== 'ALL';
  const showGroup    = !showDetector && !showSubgroup && activeGroup !== 'ALL';
  const Sep = () => <span style={{ color: '#3a3a3a' }}>/</span>;

  return (
    <div className="breadcrumb-container">
      <button onClick={onReset} className="breadcrumb-back">
        <svg style={{ width: '0.75rem', height: '0.75rem' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>

      {showGroup    && <><Sep/><span className="breadcrumb-active">{activeGroup}</span><span style={{ fontSize: '9px', color: '#555', marginLeft: '0.25rem' }}>Group Summary</span></>}
      {showSubgroup && <><Sep/><span className="breadcrumb-active">{activeGroup}</span><Sep/><span className="breadcrumb-active">{activeSubgroup}</span><span style={{ fontSize: '9px', color: '#555', marginLeft: '0.25rem' }}>Subgroup Summary</span></>}
      {showDetector && <>
        <Sep/><button onClick={onReset} className="breadcrumb-crumb">{activeGroup}</button>
        <Sep/><button onClick={onResetToGroup} className="breadcrumb-crumb">{activeSubgroup}</button>
        <Sep/><span className="breadcrumb-active">{activeDetector}</span><span style={{ fontSize: '9px', color: '#555', marginLeft: '0.25rem' }}>Detector Summary</span>
      </>}
    </div>
  );
}
