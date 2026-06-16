import { useState, useRef, useMemo } from 'react';

// ── Combined dual-bar hourly chart (GA & GB side-by-side) ─────────────────────
export function CombinedHourlyChart({ hourly, GA_color, GB_color }) {
  const [hovered, setHovered] = useState(null);
  const svgRef = useRef(null);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });

  const W = 620, H = 140;
  const PL = 28, PR = 8, PT = 12, PB = 24;
  const cW = W - PL - PR, cH = H - PT - PB;

  // Max value of either GA or GB across all hours
  const maxVal = useMemo(() => {
    return Math.max(...hourly.map(h => Math.max(h.GA, h.GB)), 1);
  }, [hourly]);

  const barW = cW / 24;

  const handleMouseMove = (e, hour) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHovered(hour);
    setTipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: `${H}px` }}
           onMouseLeave={() => setHovered(null)}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = PT + cH - pct * cH;
          return (
            <g key={pct}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" strokeDasharray={pct > 0 && pct < 1 ? "4 4" : "none"} />
              <text x={PL - 6} y={y + 3} textAnchor="end" fill="#555" fontSize="8" fontFamily="monospace">
                {Math.round(maxVal * pct)}
              </text>
            </g>
          );
        })}

        {/* X axis labels (Hours) */}
        {Array.from({ length: 24 }).map((_, hour) => {
          const x = PL + hour * barW;
          const showLabel = hour % 2 === 0; // Show every 2 hours
          return (
            <g key={hour}>
              {showLabel && (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" fill="#666" fontSize="8" fontFamily="monospace">
                  {String(hour).padStart(2, '0')}
                </text>
              )}
            </g>
          );
        })}

        {/* Bars */}
        {hourly.map(({ hour, GA: vGA, GB: vGB }) => {
          const x = PL + hour * barW;
          const isHov = hovered === hour;
          const bH_GA = (vGA / maxVal) * cH;
          const bH_GB = (vGB / maxVal) * cH;
          const totalVal = vGA + vGB;

          // Double bar width split inside the hour column
          const subBarW = barW * 0.38;

          return (
            <g key={hour}
               onMouseMove={e => handleMouseMove(e, hour)}
               style={{ cursor: totalVal > 0 ? 'crosshair' : 'default' }}>
              {/* transparent hit area for hover */}
              <rect x={x} y={PT} width={barW} height={cH} fill="transparent" />
              
              {/* hover highlight */}
              {isHov && (
                <rect x={x + 1} y={PT} width={barW - 2} height={cH}
                      fill="rgba(255, 255, 255, 0.03)" rx="3" />
              )}

              {/* GA Bar (Left) */}
              {vGA > 0 && (
                <rect
                  x={x + barW * 0.09}
                  y={PT + cH - bH_GA}
                  width={subBarW}
                  height={bH_GA}
                  fill={GA_color}
                  opacity={isHov ? 1 : 0.8}
                  rx="1.5"
                />
              )}

              {/* GB Bar (Right) */}
              {vGB > 0 && (
                <rect
                  x={x + barW * 0.53}
                  y={PT + cH - bH_GB}
                  width={subBarW}
                  height={bH_GB}
                  fill={GB_color}
                  opacity={isHov ? 1 : 0.8}
                  rx="1.5"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Custom Tooltip */}
      {hovered !== null && (() => {
        const hourData = hourly[hovered];
        const vGA = hourData?.GA ?? 0;
        const vGB = hourData?.GB ?? 0;
        if (vGA === 0 && vGB === 0) return null;

        const isLeft = tipPos.x > W * 0.75;
        const ttW = 120, ttH = 68;
        const xOffset = isLeft ? -ttW - 12 : 12;

        return (
          <div style={{
            position: 'absolute',
            left: tipPos.x + xOffset,
            top: tipPos.y - ttH / 2,
            width: ttW,
            background: 'rgba(18, 18, 18, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            padding: '8px 10px',
            zIndex: 10,
            pointerEvents: 'none',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
            color: '#ccc',
            fontSize: 10,
            lineHeight: 1.4
          }}>
            <div style={{ fontWeight: 800, color: '#fff', marginBottom: 4, fontFamily: 'monospace' }}>
              {String(hovered).padStart(2, '0')}:00 – {String(hovered).padStart(2, '0')}:59
            </div>
            {vGA > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: GA_color }}></span>
                <span style={{ color: '#888' }}>GA:</span>
                <span style={{ fontWeight: 700, color: GA_color, fontFamily: 'monospace', marginLeft: 'auto' }}>{vGA}</span>
              </div>
            )}
            {vGB > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: GB_color }}></span>
                <span style={{ color: '#888' }}>GB:</span>
                <span style={{ fontWeight: 700, color: GB_color, fontFamily: 'monospace', marginLeft: 'auto' }}>{vGB}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid rgba(255, 255, 255, 0.05)', marginTop: 4, paddingTop: 4 }}>
              <span style={{ color: '#888' }}>Total:</span>
              <span style={{ fontWeight: 800, color: '#fff', fontFamily: 'monospace', marginLeft: 'auto' }}>{vGA + vGB}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
