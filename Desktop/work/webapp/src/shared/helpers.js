import { DIST_ZONES, DIR_LABELS } from './constants';

// ── Color resolvers ───────────────────────────────────────────────────────────
export function distColor(dist) {
  if (dist == null) return '#94a3b8';
  return DIST_ZONES.find(z => dist < z.max)?.color ?? '#22c55e';
}

export function getProtocolColor(name) {
  if (!name) return '#888';
  const n = name.toUpperCase();
  return (n.includes('DIY') || n.includes('FPV') || n === 'UNKNOWN') ? '#ef4444' : '#f97316';
}

export function getProtocolThreat(name) {
  if (!name) return { level: 'UNKNOWN', color: '#888', bg: '#88888822', label: 'Unknown Protocol' };
  const n = name.toUpperCase();
  if (n.includes('DIY') || n.includes('FPV'))
    return { level: 'CRITICAL', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'โดรนดัดแปลง / พลีชีพ', blink: true };
  if (n === 'UNKNOWN')
    return { level: 'CRITICAL', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'โปรโตคอลไม่ระบุ', blink: true };
  if (n.includes('OCUSYNC') || n.includes('DJI'))
    return { level: 'CAUTION', color: '#f97316', bg: 'rgba(249,115,22,0.10)', label: 'โดรนพาณิชย์ทั่วไป', blink: false };
  return { level: 'LOW', color: '#22c55e', bg: 'rgba(34,197,94,0.10)', label: 'สัญญาณปกติ', blink: false };
}

// ── Formatters ────────────────────────────────────────────────────────────────
export const dirLabel = (deg) => {
  if (deg == null) return '—';
  return DIR_LABELS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
};

export const formatDate = (str) => str?.replace('T', ' ').slice(0, 16) ?? '—';

export const toDateStr = (d) => d.toISOString().split('T')[0];

// ── Data builders ─────────────────────────────────────────────────────────────
export function buildModelDist(events) {
  const map = {};
  events.forEach(e => {
    const k = e.model ? String(e.model).trim() : 'Unknown';
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map).sort(([, a], [, b]) => b - a);
}

export function buildDirDist(events) {
  const map = Object.fromEntries(DIR_LABELS.map(d => [d, 0]));
  events.forEach(e => { if (e.direction && map[e.direction] !== undefined) map[e.direction]++; });
  return DIR_LABELS.map(d => ({ dir: d, count: map[d] }));
}