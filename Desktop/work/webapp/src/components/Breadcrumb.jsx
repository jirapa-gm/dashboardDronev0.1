export default function Breadcrumb({ activeGroup, activeSubgroup, activeDetector, onReset, onResetToGroup }) {
  const showDetector = activeDetector !== 'ALL';
  const showSubgroup = !showDetector && activeSubgroup !== 'ALL';
  const showGroup    = !showDetector && !showSubgroup && activeGroup !== 'ALL';
  
  const Sep = () => (
    <svg style={{ width: '1rem', height: '1rem', color: '#555', margin: '0 0.125rem' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );

  const Badge = ({ children, isCurrent, onClick }) => {
    if (onClick) {
      return (
        <button onClick={onClick} className="breadcrumb-crumb" style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center' }}>
          {children}
        </button>
      );
    }
    return (
      <span className="breadcrumb-active" style={{ background: 'rgba(251, 146, 60, 0.1)', padding: '0.25rem 0.625rem', borderRadius: '6px', border: '1px solid rgba(251, 146, 60, 0.25)', display: 'flex', alignItems: 'center', boxShadow: '0 0 10px rgba(251, 146, 60, 0.05)' }}>
        {children}
      </span>
    );
  };

  const TypeLabel = ({ text }) => (
    <span style={{ fontSize: '9px', color: '#666', marginLeft: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#141414', padding: '2px 6px', borderRadius: '4px', border: '1px solid #222' }}>
      {text}
    </span>
  );

  return (
    <div className="breadcrumb-container" style={{ background: 'linear-gradient(to right, #0f0f0f, #141414)', borderBottom: '1px solid #222', padding: '0.625rem 1.25rem', gap: '0.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 10, position: 'relative' }}>
      <button onClick={onReset} className="breadcrumb-back" style={{ background: '#1a1a1a', padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid #2a2a2a', marginRight: '0.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
        <svg style={{ width: '0.875rem', height: '0.875rem' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        <span style={{ fontWeight: 600, color: '#aaa' }}>All Detectors</span>
      </button>

      {showGroup && (
        <>
          <Sep/>
          <Badge isCurrent={true}>{activeGroup}</Badge>
          <TypeLabel text="Group Summary" />
        </>
      )}

      {showSubgroup && (
        <>
          <Sep/>
          <Badge onClick={onReset}>{activeGroup}</Badge>
          <Sep/>
          <Badge isCurrent={true}>{activeSubgroup}</Badge>
          <TypeLabel text="Subgroup Summary" />
        </>
      )}

      {showDetector && (
        <>
          <Sep/>
          <Badge onClick={onReset}>{activeGroup}</Badge>
          <Sep/>
          <Badge onClick={onResetToGroup}>{activeSubgroup}</Badge>
          <Sep/>
          <Badge isCurrent={true}>{activeDetector}</Badge>
          <TypeLabel text="Detector Summary" />
        </>
      )}
    </div>
  );
}
