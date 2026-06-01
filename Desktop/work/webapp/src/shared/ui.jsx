import { useState } from 'react';
import { GA, GB } from './constants';
import { ChevronIcon } from './icons';

// ── Loading spinner ───────────────────────────────────────────────────────────
export function Spinner({ label = '' }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-orange-500 rounded-full animate-spin" />
        {label && <span className="text-[11px] text-[#555] uppercase tracking-widest">{label}</span>}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📊', message = 'No data', sub = '' }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#0f0f0f]">
      <div className="text-center">
        <div className="text-4xl mb-3">{icon}</div>
        <div className="text-[#555] text-sm">{message}</div>
        {sub && <div className="text-[#444] text-xs mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ── Card container ────────────────────────────────────────────────────────────
export function Card({ title, icon, children, className = '', action }) {
  return (
    <div className={`bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
        <div className="flex items-center gap-2">
          <span className="text-orange-500">{icon}</span>
          <span className="text-xs font-bold text-[#888] uppercase tracking-wider">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ label, color, bg, border }) {
  return (
    <span className="text-[8px] px-1.5 py-0.5 rounded font-bold"
          style={{ background: bg ?? `${color}22`, color, border: `1px solid ${border ?? color + '44'}` }}>
      {label}
    </span>
  );
}

// ── Group filter tabs (ALL / GA / GB) ─────────────────────────────────────────
export function GroupTabs({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {['ALL', 'GA', 'GB'].map(g => {
        const c = g === 'GA' ? GA : g === 'GB' ? GB : '#aaa';
        const active = value === g;
        return (
          <button key={g} onClick={() => onChange(g)}
            className="text-xs px-3 py-1 rounded-full font-bold transition-all"
            style={{ background: active ? `${c}22` : '#1e1e1e', border: `1px solid ${active ? c : '#3a3a3a'}`, color: active ? c : '#777' }}>
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
    <div className="px-4 py-2.5 border-b border-[#2a2a2a] bg-[#111] flex items-center gap-3 flex-wrap flex-none sticky top-0 z-10">
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
    <button onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#202020] transition-colors group">
      <div className="flex items-center gap-2 text-xs font-bold text-[#888] uppercase tracking-wider">
        <span className="text-[#555] group-hover:text-[#777]">{icon}</span>
        {label}
        {count !== undefined && (
          <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: '#1a1a1a', color: '#777', border: '1px solid #333' }}>
            {count}
          </span>
        )}
      </div>
      <ChevronIcon className={`w-3.5 h-3.5 text-[#444] transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
    </button>
  );
}

// ── Form field label wrapper ──────────────────────────────────────────────────
export function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-[#666] uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────────
export function LoadingSkeleton({ rows = 4, className = '' }) {
  return (
    <div className={`flex flex-col gap-3 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="flex justify-between">
            <div className="h-3 rounded" style={{ background: '#222', width: `${40 + (i * 17) % 35}%` }} />
            <div className="h-3 rounded w-12" style={{ background: '#1e1e1e' }} />
          </div>
          <div className="h-2 rounded-full" style={{ background: '#1a1a1a' }}>
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
    <div className="flex flex-col gap-2.5">
      {data.map(([label, count], i) => {
        const pct   = ((count / maxCount) * 100).toFixed(1);
        const share = ((count / total) * 100).toFixed(0);
        const color = colors[i % colors.length];
        const isHov = hovered === i;
        return (
          <div key={label} className="relative cursor-default"
               onMouseEnter={() => setHovered(i)}
               onMouseLeave={() => setHovered(null)}
               tabIndex={0} onFocus={() => setHovered(i)} onBlur={() => setHovered(null)}
               aria-label={`${label}: ${count} (${share}%)`}
               style={{ outline: 'none' }}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#999] truncate max-w-[140px]" style={{ color: isHov ? '#fff' : undefined }}>{label}</span>
              <span className="font-mono font-bold" style={{ color }}>
                {count} <span className="text-[#555]">({share}%)</span>
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e1e1e' }}>
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