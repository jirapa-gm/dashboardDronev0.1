import { useState, useRef } from 'react';

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
