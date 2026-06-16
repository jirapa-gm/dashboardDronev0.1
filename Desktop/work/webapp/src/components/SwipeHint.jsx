import './Minors.css';
import { useState, useEffect } from 'react';

export default function SwipeHint() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);
  
  if (!visible) return null;
  
  return (
    <div className="swipe-hint-container" className="swipe-hint-container flex-row-center gap-2">
      <svg className="swipe-hint-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
      Swipe right to open filters
    </div>
  );
}
