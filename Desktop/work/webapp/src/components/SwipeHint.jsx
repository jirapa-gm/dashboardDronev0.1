import { useState, useEffect } from 'react';

export default function SwipeHint() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);
  
  if (!visible) return null;
  
  return (
    <div className="swipe-hint-container" style={{ animation: 'fadeInOut 3s ease forwards' }}>
      <svg style={{ width: '0.75rem', height: '0.75rem', color: '#fb923c' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
      Swipe right to open filters
    </div>
  );
}
