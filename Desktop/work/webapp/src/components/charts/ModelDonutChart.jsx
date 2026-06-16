import { useState } from 'react';

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
