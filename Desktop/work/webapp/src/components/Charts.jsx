import { useState, useRef, useMemo } from 'react';
import { GA, GB, DIR_LABELS, MODEL_COLORS, THREAT_COLOR } from '../shared/constants';
import { distColor, dirLabel } from '../shared/helpers';
import { SunIcon, MoonIcon, AlertIcon } from '../shared/icons';

// ── Donut chart (model distribution) ─────────────────────────────────────────
export function ModelDonutChart({ data, colors }) {
  const [hovered, setHovered] = useState(null);
  if (!data.length) return null;
  const total = data.reduce((s,[,v]) => s+v, 0);
  const CX=80, CY=80, RO=68, RI=42;
  let cum = -Math.PI/2;
  const slices = data.slice(0,6).map(([label,count],i) => {
    const frac=count/total;
    let angle=frac*2*Math.PI;
    if (angle >= 2 * Math.PI - 0.001) {
      angle = 2 * Math.PI - 0.001; // Avoid identical start and end points for 100% slice
    }
    const start=cum; cum+=angle;
    const x1=CX+RO*Math.cos(start), y1=CY+RO*Math.sin(start);
    const x2=CX+RO*Math.cos(cum),   y2=CY+RO*Math.sin(cum);
    const xi1=CX+RI*Math.cos(cum),  yi1=CY+RI*Math.sin(cum);
    const xi2=CX+RI*Math.cos(start),yi2=CY+RI*Math.sin(start);
    const large=angle>Math.PI?1:0;
    const d=[`M ${x1.toFixed(2)} ${y1.toFixed(2)}`,`A ${RO} ${RO} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
             `L ${xi1.toFixed(2)} ${yi1.toFixed(2)}`,`A ${RI} ${RI} 0 ${large} 0 ${xi2.toFixed(2)} ${yi2.toFixed(2)}`,'Z'].join(' ');
    return { d, label, count, frac, color:colors[i%colors.length] };
  });
  const active = hovered!==null ? slices[hovered] : null;
  return (
    <div className="flex-col-start gap-3">
      <div className="flex-row-center gap-4">
        <svg viewBox="0 0 160 160" style={{ width:'160px', height:'160px', flexShrink:0 }}>
          {slices.map((s,i) => (
            <path key={s.label} d={s.d} fill={s.color} stroke="#0a0a0a" strokeWidth="2" opacity={hovered===null||hovered===i?1:0.35}
              style={{ transform:hovered===i?'scale(1.04)':'scale(1)', transformOrigin:'80px 80px', transition:'transform 0.15s ease', cursor:'pointer' }}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
          ))}
          <text x="80" y="75" textAnchor="middle" fill={active?active.color:'#ccc'} fontSize="22" fontWeight="800" fontFamily="monospace">{active?active.count:total}</text>
          <text x="80" y="92" textAnchor="middle" fill="#555" fontSize="9" fontFamily="monospace">{active?'detections':'total'}</text>
        </svg>
        <div className="flex-col-start gap-2 flex-1" style={{ minWidth: 0 }}>
          {slices.map((s,i) => (
            <div key={s.label} className="flex-row-center gap-2"
                 onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)}
                 style={{ opacity:hovered===null||hovered===i?1:0.4, transition:'opacity 0.15s', cursor:'pointer' }}>
              <div className="rounded flex-none" style={{ background:s.color, width: '0.625rem', height: '0.625rem' }}/>
              <span className="flex-1 truncate" style={{ fontSize: '11px', color: '#bbb' }}>{s.label}</span>
              <span className="font-mono flex-none" style={{ fontSize: '11px', fontWeight: 'bold', color:s.color }}>{s.count}</span>
              <span className="flex-none" style={{ fontSize: '10px', color: '#555' }}>{(s.frac*100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: '0.5rem', display: 'flex', gap: '1px' }}>
        {slices.map(s => <div key={s.label} style={{ width:`${s.frac*100}%`, background:s.color }}/>)}
      </div>
      <div className="flex-row-between" style={{ fontSize: '10px', color: '#444' }}>
        <span>Model spread</span><span>{data.length} models</span>
      </div>
    </div>
  );
}

// ── Direction rose ─────────────────────────────────────────────────────────────
export function MiniDirRose({ dirData, color }) {
  const maxVal=Math.max(...dirData.map(d=>d.count),1), R=55, CX=68, CY=68, n=8;
  const pts=dirData.map((d,i) => { const a=(i/n)*2*Math.PI-Math.PI/2, r=(d.count/maxVal)*R; return `${(CX+r*Math.cos(a)).toFixed(1)},${(CY+r*Math.sin(a)).toFixed(1)}`; });
  const topDir=[...dirData].sort((a,b)=>b.count-a.count)[0];
  return (
    <div className="flex-col-center gap-2">
      <div className="text-label-medium-gray" style={{ fontWeight: 'bold' }}>Direction of Origin</div>
      <svg viewBox="0 0 136 136" style={{ width:'140px', height:'140px' }}>
        {[.33,.67,1.0].map(p => <circle key={p} cx={CX} cy={CY} r={R*p} fill="none" stroke="#2a2a2a" strokeWidth="1" strokeDasharray="3 3"/>)}
        {dirData.map((_,i) => { const a=(i/n)*2*Math.PI-Math.PI/2; return <line key={i} x1={CX} y1={CY} x2={(CX+R*Math.cos(a)).toFixed(1)} y2={(CY+R*Math.sin(a)).toFixed(1)} stroke="#2a2a2a" strokeWidth="1"/>; })}
        <polygon points={pts.join(' ')} fill={`${color}22`} stroke={color} strokeWidth="2" strokeLinejoin="round"/>
        {dirData.map((d,i) => { if(!d.count) return null; const a=(i/n)*2*Math.PI-Math.PI/2, r=(d.count/maxVal)*R; return <circle key={i} cx={(CX+r*Math.cos(a)).toFixed(1)} cy={(CY+r*Math.sin(a)).toFixed(1)} r="4" fill={color} stroke="#0a0a0a" strokeWidth="1.5"/>; })}
        {DIR_LABELS.map((dir,i) => { const a=(i/n)*2*Math.PI-Math.PI/2, lr=R+12, isTop=dir===topDir?.dir&&topDir.count>0; return <text key={dir} x={(CX+lr*Math.cos(a)).toFixed(1)} y={(CY+lr*Math.sin(a)+4).toFixed(1)} textAnchor="middle" fill={isTop?color:'#555'} fontSize={isTop?'10':'9'} fontWeight={isTop?'800':'400'} fontFamily="monospace">{dir}</text>; })}
        <text x={CX} y={CY+4} textAnchor="middle" fill="#333" fontSize="8" fontFamily="monospace">ORIGIN</text>
      </svg>
      {topDir?.count>0 && <div className="dir-rose-legend"><span style={{ fontSize: '11px', color: '#666' }}>Top: </span><span style={{ fontSize: '13px', fontWeight: 'bold', color }}>{topDir.dir}</span><span style={{ fontSize: '11px', color: '#555' }}> ({topDir.count})</span></div>}
    </div>
  );
}

// ── Radar chart (direction of origin) ─────────────────────────────────────────
export function RadarChart({ dirData, groupFilter }) {
  const R = 90, CX = 110, CY = 110;
  const maxVal = Math.max(...dirData.map(d => d.total), 1);
  const n      = 8;

  const polygon = (vals) => vals.map((v, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const r = (v / maxVal) * R;
    return `${(CX + r * Math.cos(angle)).toFixed(1)},${(CY + r * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');

  const gaVals = dirData.map(d => d.GA);
  const gbVals = dirData.map(d => d.GB);

  return (
    <svg viewBox="0 0 220 220" style={{ width: '100%', maxWidth: '220px', margin: '0 auto', display: 'block' }}>
      {[0.25, 0.5, 0.75, 1.0].map(pct => (
        <circle key={pct} cx={CX} cy={CY} r={R * pct} fill="none" stroke="#2a2a2a" strokeWidth="1" strokeDasharray="3 3" />
      ))}
      {DIR_LABELS.map((_, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        return <line key={i} x1={CX} y1={CY} x2={(CX + R * Math.cos(angle)).toFixed(1)} y2={(CY + R * Math.sin(angle)).toFixed(1)} stroke="#2a2a2a" strokeWidth="1" />;
      })}

      {(groupFilter !== 'GB') && <polygon points={polygon(gaVals)} fill={`${GA}22`} stroke={GA} strokeWidth="1.5" strokeLinejoin="round" />}
      {(groupFilter !== 'GA') && <polygon points={polygon(gbVals)} fill={`${GB}22`} stroke={GB} strokeWidth="1.5" strokeLinejoin="round" />}

      {DIR_LABELS.map((dir, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        const lr = R + 16;
        const x = CX + lr * Math.cos(angle), y = CY + lr * Math.sin(angle);
        return (
          <g key={dir}>
            <text x={x.toFixed(1)} y={(y - 3).toFixed(1)} textAnchor="middle" fill="#aaa" fontSize="9" fontWeight="700" fontFamily="monospace">{dir}</text>
            <text x={x.toFixed(1)} y={(y + 7).toFixed(1)} textAnchor="middle" fill="#555" fontSize="7" fontFamily="monospace">{dirData[i].total}</text>
          </g>
        );
      })}
      <text x={CX} y={CY + 4} textAnchor="middle" fill="#444" fontSize="8" fontFamily="monospace">ORIGIN</text>
    </svg>
  );
}

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

// ── Altitude gauge ─────────────────────────────────────────────────────────────
export function AltitudeGauge({ height, maxHeight = 500 }) {
  const pct   = Math.min((height ?? 0) / maxHeight, 1);
  const color = pct > 0.7 ? '#ef4444' : pct > 0.4 ? '#f97316' : '#22c55e';
  return (
    <div className="flex-col-center gap-1" style={{ width: 52 }}>
      <span className="text-label-dark-gray" style={{ fontSize: 9 }}>Alt</span>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column-reverse', width: 28, height: 90, background: '#111', borderRadius: 6, border: '1px solid #2a2a2a', overflow: 'visible' }}>
        <div style={{ width: '100%', height: `${pct * 100}%`, background: `linear-gradient(to top, ${color}cc, ${color}44)`, borderRadius: 4, transition: 'height 0.5s ease' }} />
        {[0, 100, 200, 300, 400, 500].map(t => (
          <div key={t} style={{ position: 'absolute', bottom: `${(t / maxHeight) * 100}%`, left: 0, right: 0, borderTop: '1px solid #2a2a2a', pointerEvents: 'none' }}>
            <span style={{ position: 'absolute', right: -28, top: -5, fontSize: 7, color: '#444', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{t}m</span>
          </div>
        ))}
      </div>
      <span className="font-mono" style={{ fontSize: 11, fontWeight: 'bold', color }}>{height ?? '—'}m</span>
    </div>
  );
}

// ── Signal sparkline ──────────────────────────────────────────────────────────
export function SignalSparkline({ detections, width = 160, height = 36 }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);
  if (!detections || detections.length < 2) return null;

  const values = detections.map(d => d.rssi_dbm ?? -90);
  const times  = detections.map(d => new Date(d.datetime).getTime());
  const minV = Math.min(...values), maxV = Math.max(...values), range = maxV - minV || 1;
  const minT = Math.min(...times),  maxT = Math.max(...times),  timeRange = maxT - minT || 1;

  const px = t => ((t - minT) / timeRange) * (width - 8) + 4;
  const py = v => height - 4 - ((v - minV) / range) * (height - 8);
  const pts = detections.map((d, i) => `${px(times[i])},${py(values[i])}`).join(' ');

  return (
    <div className="relative" style={{ width, height: height + 16 }}>
      <div className="text-label-dark-gray" style={{ fontSize: 8, marginBottom: 2 }}>RSSI over time</div>
      <svg ref={svgRef} width={width} height={height} style={{ display: 'block', overflow: 'visible' }}
           onMouseMove={e => {
             const rect = svgRef.current.getBoundingClientRect();
             const t = minT + ((e.clientX - rect.left) / width) * timeRange;
             let ci = 0, minD = Infinity;
             times.forEach((tt, i) => { const d = Math.abs(tt - t); if (d < minD) { minD = d; ci = i; } });
             setTooltip({ x: px(times[ci]), y: py(values[ci]), val: values[ci], time: detections[ci].datetime?.slice(11,16) });
           }}
           onMouseLeave={() => setTooltip(null)}>
         <polyline points={pts} fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.8"/>
         {detections.map((d, i) => <circle key={i} cx={px(times[i])} cy={py(values[i])} r="2.5" fill="#22c55e" opacity="0.7"/>)}
         {tooltip && (
           <>
             <line x1={tooltip.x} y1={0} x2={tooltip.x} y2={height} stroke="#fff" strokeWidth="0.5" opacity="0.3"/>
             <circle cx={tooltip.x} cy={tooltip.y} r="4" fill="#22c55e" stroke="#fff" strokeWidth="1"/>
             <rect x={tooltip.x + 6} y={tooltip.y - 14} width={56} height={18} rx="3" fill="rgba(20,20,20,0.92)" stroke="#333"/>
             <text x={tooltip.x + 9} y={tooltip.y - 2} fill="#ccc" fontSize="8" fontFamily="monospace">{tooltip.val} dBm {tooltip.time}</text>
           </>
         )}
       </svg>
    </div>
  );
}

// ── 7-day detection timeline ──────────────────────────────────────────────────
export function DetectionTimeline({ detections }) {
  const [hover, setHover] = useState(null);
  if (!detections?.length) return null;

  const sorted = [...detections].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const sessions = [];
  let cur = null;
  sorted.forEach(d => {
    const t = new Date(d.datetime).getTime();
    if (!cur || t - cur.end > 5 * 60 * 1000) {
      if (cur) sessions.push(cur);
      cur = { start: t, end: t, events: [d], detectors: new Set([d.detector_id]) };
    } else { cur.end = t; cur.events.push(d); cur.detectors.add(d.detector_id); }
  });
  if (cur) sessions.push(cur);

  const now = Date.now(), windowMs = 7 * 24 * 60 * 60 * 1000, minT = now - windowMs;
  const toX = t => Math.max(0, Math.min(100, ((t - minT) / windowMs) * 100));
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - i * 86400000); d.setHours(0,0,0,0);
    return { x: toX(d.getTime()), label: `${d.getMonth()+1}/${d.getDate()}` };
  }).reverse();

  const fmtTime = ms => {
    const min = Math.round(ms / 60000);
    if (min < 1) return '< 1 min';
    if (min < 60) return `${min} min`;
    return `${Math.floor(min/60)}h ${min%60}m`;
  };
  const fmtHHMM = ts => new Date(ts).toLocaleString('th-TH', { hour:'2-digit', minute:'2-digit' });
  const fmtDate = ts => new Date(ts).toLocaleString('th-TH', { month:'2-digit', day:'2-digit' });

  const totalMs = sessions.reduce((s, ss) => s + (ss.end - ss.start), 0);

  return (
    <div className="flex-col-start gap-1-5">
      <div className="text-label-dark-gray" style={{ fontSize: 9, fontWeight: 'bold' }}>7-Day Detection Timeline</div>

      {/* Timeline bar */}
      <div className="relative" style={{ height: 28, background: '#0d0d0d', borderRadius: 6, border: '1px solid #1e1e1e' }}>
        {dayLabels.map((dl, i) => (
          <div key={i} style={{ position: 'absolute', left: `${dl.x}%`, top: 0, bottom: 0, borderLeft: '1px solid #1e1e1e', pointerEvents: 'none' }}>
            <span style={{ position: 'absolute', bottom: -14, left: 2, fontSize: 8, color: '#333', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{dl.label}</span>
          </div>
        ))}
        {sessions.map((s, i) => (
          <div key={i} style={{ position: 'absolute', left: `${toX(s.start)}%`, width: `${Math.max(toX(s.end) - toX(s.start), 0.5)}%`, top: 4, bottom: 4, background: s.events.some(e => (e.estimated_distance_m ?? 999) < 100) ? '#ef4444' : '#f97316', borderRadius: 3, opacity: hover === i ? 1 : 0.75, cursor: 'pointer', transition: 'opacity 0.15s', zIndex: 2 }}
               onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
        {hover !== null && sessions[hover] && (() => {
          const s = sessions[hover];
          const x1 = toX(s.start);
          const dMs = s.end - s.start;
          return (
            <div style={{ position:'absolute', left:`${Math.min(x1,60)}%`, top:-52, background:'rgba(14,14,14,0.97)', border:'1px solid #333', borderRadius:7, padding:'5px 9px', zIndex:10, pointerEvents:'none', minWidth:150, boxShadow:'0 6px 20px rgba(0,0,0,0.7)' }}>
              <div style={{ fontSize:9, color:'#f97316', fontWeight:700, marginBottom:2, fontFamily:'monospace' }}>#{hover+1} · {fmtTime(dMs)}</div>
              <div style={{ fontSize:9, color:'#777', fontFamily:'monospace' }}>{fmtDate(s.start)} {fmtHHMM(s.start)} → {fmtHHMM(s.end)}</div>
              <div style={{ fontSize:9, color:'#666', marginTop:2 }}>Events: <b style={{ color:'#ccc' }}>{s.events.length}</b></div>
            </div>
          );
        })()}
      </div>

      <div style={{ height: 6 }} />

      <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight: '90px', overflowY: 'auto', paddingRight: '2px' }} className="no-scrollbar">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:9, color:'#555', textTransform:'uppercase', letterSpacing:'0.12em', fontFamily:'monospace', fontWeight:700 }}>Detection Sessions</span>
          <span style={{ fontSize:9, color:'#888', fontFamily:'monospace' }}>รวม {fmtTime(totalMs)}</span>
        </div>
        {sessions.map((s, i) => {
          const dMs   = s.end - s.start;
          const dMin  = Math.round(dMs / 60000);
          const isCrit = s.events.some(e => (e.estimated_distance_m ?? 999) < 100);
          const color  = isCrit ? '#ef4444' : '#f97316';
          const barW   = sessions.length > 1 ? Math.max((dMs / (sessions.reduce((a,b) => a + (b.end - b.start), 0) || 1)) * 100, 4) : 100;
          return (
            <div key={i} style={{ background:'#111', border:`1px solid ${color}22`, borderRadius:7, padding:'7px 10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }} />
                  <span style={{ fontSize:10, fontWeight:700, color:'#ccc', fontFamily:'monospace' }}>
                    {fmtDate(s.start)} {fmtHHMM(s.start)}
                    <span style={{ color:'#555', margin:'0 4px' }}>→</span>
                    {fmtHHMM(s.end)}
                  </span>
                </div>
                <span style={{ fontSize:13, fontWeight:800, color, fontFamily:'monospace' }}>
                  {dMin < 1 ? '< 1' : dMin} <span style={{ fontSize:9, fontWeight:500, color:'#666' }}>min</span>
                </span>
              </div>
              <div style={{ height:3, background:'#1e1e1e', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${barW}%`, background:color, borderRadius:2, opacity:0.7 }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                <span style={{ fontSize:8, color:'#555', fontFamily:'monospace' }}>{s.events.length} events · {[...s.detectors].length} detector{[...s.detectors].length>1?'s':''}</span>
                {isCrit && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: 8, color: '#ef4444', fontWeight: 700, padding: '2px 5px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px' }}>
                    <AlertIcon className="w-2.5 h-2.5" />
                    CLOSE RANGE
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
