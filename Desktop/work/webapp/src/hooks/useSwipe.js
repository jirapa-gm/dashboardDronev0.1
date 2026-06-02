import { useRef, useCallback } from 'react';

export function useSwipe(sidebarVisible, setSidebarVisible) {
  const startX = useRef(null), startY = useRef(null);
  const THRESHOLD = 60;
  const onStart = useCallback(e => { startX.current = e.touches[0].clientX; startY.current = e.touches[0].clientY; }, []);
  const onEnd   = useCallback(e => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    startX.current = null; startY.current = null;
    if (Math.abs(dx) < Math.abs(dy)) return;
    if (dx >  THRESHOLD && !sidebarVisible) setSidebarVisible(true);
    if (dx < -THRESHOLD &&  sidebarVisible) setSidebarVisible(false);
  }, [sidebarVisible, setSidebarVisible]);
  return { onStart, onEnd };
}
