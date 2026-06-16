import { DIR_LABELS } from '../../shared/constants';

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
