import { useState } from 'react';
import { GA, GB } from './constants';
import { ChevronIcon } from './icons';

// ── Loading spinner ───────────────────────────────────────────────────────────
export function Spinner({ label = '' }) {
  return (
    <div className="flex-1 flex-center-all bg-dark-0a">
      <div className="flex-col-center gap-4">
        <div className="spinner-circle animate-spin" />
        {label && <span className="text-label-gray">{label}</span>}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📊', message = 'No data', sub = '' }) {
  return (
    <div className="flex-1 flex-center-all bg-dark-0f">
      <div className="text-center">
        <div style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>{icon}</div>
        <div style={{ color: '#555', fontSize: '0.875rem' }}>{message}</div>
        {sub && <div style={{ color: '#444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Card container ────────────────────────────────────────────────────────────
export function Card({ title, icon, children, className = '', action }) {
  return (
    <div className={`card-container ${className}`}>
      <div className="card-header">
        <div className="card-title-group">
          <span style={{ color: '#ea580c' }}>{icon}</span>
          <span className="card-title-text">{title}</span>
        </div>
        {action}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ label, color, bg, border }) {
  return (
    <span className="rounded font-bold"
          style={{ fontSize: '8px', padding: '2px 6px', background: bg ?? `${color}22`, color, border: `1px solid ${border ?? color + '44'}` }}>
      {label}
    </span>
  );
}

// ── Group filter tabs (ALL / GA / GB) ─────────────────────────────────────────
export function GroupTabs({ value, onChange }) {
  return (
    <div className="flex-row-center gap-1-5">
      {['ALL', 'GA', 'GB'].map(g => {
        const c = g === 'GA' ? GA : g === 'GB' ? GB : '#aaa';
        const active = value === g;
        return (
          <button key={g} onClick={() => onChange(g)}
            className="rounded-full font-bold transition-all"
            style={{ fontSize: '12px', padding: '0.25rem 0.75rem', background: active ? `${c}22` : '#1e1e1e', border: `1px solid ${active ? c : '#3a3a3a'}`, color: active ? c : '#777', cursor: 'pointer' }}>
            {g}
          </button>
        );
      })}
    </div>
  );
}

// ── Toolbar wrapper ───────────────────────────────────────────────────────────
export function Toolbar({ children }) {
  return (
    <div className="toolbar-styled">
      {children}
    </div>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────
export function Collapsible({ isOpen, maxH = '800px', children }) {
  return (
    <div style={{
      maxHeight:  isOpen ? maxH : '0',
      opacity:    isOpen ? 1 : 0,
      overflow:   'hidden',
      transition: 'max-height 0.22s ease, opacity 0.18s ease',
    }}>
      {children}
    </div>
  );
}

// ── Section header with collapse toggle ───────────────────────────────────────
export function SectionHeader({ label, icon, isOpen, onToggle, count }) {
  return (
    <button onClick={onToggle} className="section-header">
      <div className="flex-row-center gap-2 text-xs-caps-bold" style={{ color: '#888' }}>
        <span style={{ color: '#555' }}>{icon}</span>
        <span>{label}</span>
        {count !== undefined && (
          <span className="rounded font-bold" style={{ fontSize: '12px', padding: '2px 8px', background: '#1a1a1a', color: '#777', border: '1px solid #333' }}>
            {count}
          </span>
        )}
      </div>
      <ChevronIcon className="transition-transform duration-200" style={{ width: '0.875rem', height: '0.875rem', color: '#444', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
    </button>
  );
}

// ── Form field label wrapper ──────────────────────────────────────────────────
export function Field({ label, children }) {
  return (
    <div className="flex-col-start gap-1">
      <label className="text-label-medium-gray" style={{ fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────
export function LoadingSkeleton({ rows = 4, className = '' }) {
  return (
    <div className={`flex-col-start gap-3 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex-col-start gap-2">
          <div className="flex-row-between">
            <div className="rounded" style={{ height: '0.75rem', background: '#222', width: `${40 + (i * 17) % 35}%` }} />
            <div className="rounded" style={{ height: '0.75rem', width: '3rem', background: '#1e1e1e' }} />
          </div>
          <div className="rounded-full" style={{ height: '0.5rem', background: '#1a1a1a', overflow: 'hidden' }}>
            <div className="h-full rounded-full" style={{ background: '#2a2a2a', width: `${30 + (i * 23) % 50}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Horizontal bar chart row ──────────────────────────────────────────────────
export function HBar({ data, colors, maxCount, total }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="flex-col-start gap-2-5">
      {data.map(([label, count], i) => {
        const pct   = ((count / maxCount) * 100).toFixed(1);
        const share = ((count / total) * 100).toFixed(0);
        const color = colors[i % colors.length];
        const isHov = hovered === i;
        return (
          <div key={label} className="relative"
               onMouseEnter={() => setHovered(i)}
               onMouseLeave={() => setHovered(null)}
               tabIndex={0} onFocus={() => setHovered(i)} onBlur={() => setHovered(null)}
               aria-label={`${label}: ${count} (${share}%)`}
               style={{ outline: 'none', cursor: 'default' }}>
            <div className="flex-row-between" style={{ fontSize: '12px', marginBottom: '4px' }}>
              <span className="truncate" style={{ color: isHov ? '#fff' : '#999', maxWidth: '140px' }}>{label}</span>
              <span className="font-mono font-bold" style={{ color }}>
                {count} <span style={{ color: '#555' }}>({share}%)</span>
              </span>
            </div>
            <div className="rounded-full overflow-hidden" style={{ height: '0.5rem', background: '#1e1e1e' }}>
              <div className="h-full rounded-full transition-all duration-500"
                   style={{ width: `${pct}%`, background: color, opacity: isHov ? 1 : 0.85, boxShadow: isHov ? `0 0 6px ${color}88` : 'none' }} />
            </div>
            {isHov && (
              <div style={{
                position: 'absolute', right: 0, top: -36,
                background: '#1a1a1a', border: `1px solid ${color}55`, borderRadius: 6,
                padding: '4px 10px', zIndex: 20, pointerEvents: 'none',
                boxShadow: '0 4px 16px rgba(0,0,0,0.6)', whiteSpace: 'nowrap',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'monospace' }}>{count}</span>
                <span style={{ fontSize: 10, color: '#888', marginLeft: 6 }}>/ {total} total ({share}%)</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}