import { useState, useCallback, useRef, useEffect } from 'react';
import mockData from '../data/Mockdata';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export function useEvents(isMockMode) {
  const [events,      setEvents]      = useState([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const isMockRef = useRef(isMockMode);
  useEffect(() => { isMockRef.current = isMockMode; }, [isMockMode]);

  const search = useCallback(async ({ startDate, endDate, group, subgroup, detector }) => {
    setIsLoading(true);
    setCurrentPage(1);

    if (isMockRef.current) {
      await new Promise((res) => setTimeout(res, 350));
      const filtered = mockData.filter((e) => {
        const d = e.datetime.split('T')[0];
        if (d < startDate || d > endDate)              return false;
        if (group && group !== 'ALL' && e.group !== group) return false;
        if (subgroup && subgroup !== 'ALL' && e.subgroup !== subgroup) return false;
        if (detector && detector !== 'ALL' && e.detector_id !== detector) return false;
        return true;
      });
      setEvents(filtered);
      setIsLoading(false);
      return;
    }

    try {
      const res  = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ start: startDate, end: endDate, group, subgroup, detector }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setEvents(json.data ?? []);
    } catch (err) {
      console.error('API Error:', err);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { events, isLoading, search, currentPage, setCurrentPage };
}