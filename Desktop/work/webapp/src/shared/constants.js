// ── Brand colors ──────────────────────────────────────────────────────────────
export const GA = '#f97316';
export const GB = '#eab308';

// ── Threat / group / protocol colors ─────────────────────────────────────────
export const THREAT_COLOR  = { HIGH: '#ef4444', MEDIUM: '#f97316', LOW: '#22c55e' };
export const GROUP_COLOR   = { GA, GB };
export const PROTO_COLORS  = { OcuSync: '#38bdf8', LBv2: '#a78bfa', 'Enhanced Wi-Fi': '#34d399' };
export const MODEL_COLORS  = ['#f97316','#eab308','#38bdf8','#a78bfa','#34d399','#f43f5e','#fb923c'];

// ── Distance zone colors ──────────────────────────────────────────────────────
export const DIST_ZONES = [
  { max: 100,  color: '#ef4444' },
  { max: 300,  color: '#f97316' },
  { max: 600,  color: '#eab308' },
  { max: Infinity, color: '#22c55e' },
];

// ── Compass directions ────────────────────────────────────────────────────────
export const DIR_LABELS = ['N','NE','E','SE','S','SW','W','NW'];

// ── Pagination ────────────────────────────────────────────────────────────────
export const PER_PAGE = 15;