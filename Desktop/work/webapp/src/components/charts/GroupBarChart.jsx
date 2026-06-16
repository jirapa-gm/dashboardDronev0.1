import { useState, useRef } from 'react';
import { SunIcon, MoonIcon } from '../../shared/icons';

// ── Single group bar chart with hover tooltip ─────────────────────────────────
export function GroupBarChart({ hourly, groupKey, color, label }) {
  const [hovered, setHovered] = useState(null);
  const svgRef = useRef(null);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });

  const W = 620, H = 110;
  const PL = 28, PR = 8, PT = 10, PB = 24;
  const cW = W - PL - PR, cH = H - PT - PB;
  const vals   = hourly.map(h => h[groupKey]);
  const maxVal = Math.max(...vals, 1);
  const barW   = cW / 24;
  const peakH  = hourly.reduce((a, b) => (a[groupKey] >= b[groupKey] ? a : b), hourly[0]);

  const handleMouseMove = (e, hour) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHovered(hour);
    setTipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className="flex-row-center gap-2" style={{ marginBottom: '6px' }}>
        <div className="rounded flex-none" style={{ background: color, width: 8, height: 8 }} />
        <span className="text-xs-caps-bold" style={{ color }}>{label}</span>
        <span className="font-mono" style={{ fontSize: '10px', color: '#444', marginLeft: 4 }}>
          peak {String(peakH.hour).padStart(2,'0')}:00 · {peakH[groupKey]} events
        </span>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: `${H}px` }}
           onMouseLeave={() => setHovered(null)}>
        {[0, 0.5, 1].map(pct => {
          const y = PT + cH - pct * cH;
          return (
            <g key={pct}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#1e1e1e" strokeWidth="1" />
              <text x={PL - 4} y={y + 3} textAnchor="end" fill="#555" fontSize="8" fontFamily="monospace">
                {Math.round(maxVal * pct)}
              </text>
            </g>
          );
        })}

        {hourly.map(({ hour }) => {
          const v    = vals[hour];
          const bH   = (v / maxVal) * cH;
          const x    = PL + hour * barW;
          const isHov  = hovered === hour;
          const isPeak = hour === peakH.hour && v > 0;
          return (
            <g key={hour}
               onMouseMove={e => handleMouseMove(e, hour)}
               style={{ cursor: v > 0 ? 'crosshair' : 'default' }}>
              {/* transparent hit area for easy hover */}
              <rect x={x.toFixed(1)} y={PT} width={barW.toFixed(1)} height={cH} fill="transparent" />
              {/* hover column highlight */}
              {isHov && (
                <rect x={(x + barW * 0.05).toFixed(1)} y={PT} width={(barW * 0.9).toFixed(1)} height={cH}
                      fill="#ffffff" opacity="0.04" rx="2" />
              )}
              {v > 0 && (
                <rect
                  x={(x + barW * 0.15).toFixed(1)}
                  y={(PT + cH - bH).toFixed(1)}
                  width={(barW * 0.7).toFixed(1)}
                  height={bH.toFixed(1)}
                  fill={color} opacity={isHov ? 1 : 0.82} rx="2"
                />
              )}
              {isPeak && (
                <rect
                  x={(x + barW * 0.1).toFixed(1)}
                  y={(PT + cH - bH - 2).toFixed(1)}
                  width={(barW * 0.8).toFixed(1)}
                  height={(bH + 2).toFixed(1)}
                  fill="none" stroke={color} strokeWidth="1.5"
                  strokeDasharray="3 2" rx="2" opacity="0.6"
                />
              )}
              {hour % 3 === 0 && (
                <text x={(x + barW / 2).toFixed(1)} y={H - 5} textAnchor="middle"
                      fill={isHov ? '#aaa' : '#555'} fontSize="8" fontFamily="monospace">
                  {String(hour).padStart(2, '0')}
                </text>
              )}
            </g>
          );
        })}

        <line x1={PL} y1={PT} x2={PL} y2={PT + cH} stroke="#3a3a3a" strokeWidth="1" />
        <line x1={PL} y1={PT + cH} x2={W - PR} y2={PT + cH} stroke="#3a3a3a" strokeWidth="1" />
      </svg>

      {/* Tooltip */}
      {hovered !== null && (() => {
        const v    = vals[hovered];
        const total = hourly.reduce((s, h) => s + h[groupKey], 0);
        const pct  = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
        const isPeak = hovered === peakH.hour;
        const isDay  = hovered >= 6 && hovered < 18;
        const svgW  = svgRef.current?.getBoundingClientRect().width ?? 400;
        const left  = Math.min(tipPos.x + 12, svgW - 150);
        return (
          <div style={{
            position: 'absolute',
            left,
            top: Math.max(tipPos.y - 10, 0),
            background: '#1c1c1c',
            border: `1px solid ${v > 0 ? color + '66' : '#2a2a2a'}`,
            borderRadius: 8,
            padding: '8px 12px',
            pointerEvents: 'none',
            zIndex: 20,
            minWidth: 130,
            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: 'monospace', marginBottom: 5 }}>
              {String(hovered).padStart(2,'0')}:00 – {String(hovered).padStart(2,'0')}:59
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: v > 0 ? color : '#555', fontFamily: 'monospace', marginBottom: 4 }}>
              {v} event{v !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>
              {pct}% of {label}
            </div>
            <div style={{ marginTop: 5, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {isPeak && v > 0 && (
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: color + '22', color, border: `1px solid ${color}44`, fontWeight: 700 }}>
                  PEAK
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#222', color: isDay ? '#facc15' : '#818cf8', border: '1px solid #333', fontWeight: 700 }}>
                {isDay ? <SunIcon className="w-2.5 h-2.5" /> : <MoonIcon className="w-2.5 h-2.5" />}
                {isDay ? 'DAYTIME' : 'NIGHT'}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
