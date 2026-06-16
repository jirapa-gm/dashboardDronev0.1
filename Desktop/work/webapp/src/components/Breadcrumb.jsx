export default function Breadcrumb({ activeGroup, activeSubgroup, activeDetector, onReset, onResetToGroup }) {
  const showDetector = activeDetector !== 'ALL';
  const showSubgroup = !showDetector && activeSubgroup !== 'ALL';
  const showGroup    = !showDetector && !showSubgroup && activeGroup !== 'ALL';
  
  const Sep = () => (
    <svg className="breadcrumb-sep-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );

  const Badge = ({ children, isCurrent, onClick }) => {
    if (onClick) {
      return (
        <button onClick={onClick} className="breadcrumb-crumb">
          {children}
        </button>
      );
    }
    return (
      <span className="breadcrumb-active">
        {children}
      </span>
    );
  };

  const TypeLabel = ({ text }) => (
    <span className="breadcrumb-badge">
      {text}
    </span>
  );

  return (
    <div className="breadcrumb-container" className="breadcrumb-container flex-row-start">
      <button onClick={onReset} className="breadcrumb-back" className="breadcrumb-back flex-row-center">
        <svg className="breadcrumb-back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        <span className="breadcrumb-back-text">All Detectors</span>
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
