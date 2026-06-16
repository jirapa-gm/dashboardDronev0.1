const fs = require('fs');

let content = fs.readFileSync('c:/Users/ASUS/Desktop/work/webapp/src/simulation/SimConfigPanel.jsx', 'utf8');

if (!content.includes('./SimConfigPanel.css')) {
  content = content.replace(/import \{ PlayIcon/, "import './SimConfigPanel.css';\nimport { PlayIcon");
}

const replacements = [
  [`style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}`, `className="sim-panel-overlay"`],
  [`style={{ background: '#111', border: '1px solid #333', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}`, `className="sim-panel-card"`],
  [`style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}`, `className="sim-panel-header"`],
  [`style={{ fontSize: '18px', fontWeight: 'bold' }}`, `className="sim-panel-title"`],
  [`style={{ fontSize: '12px', color: '#888' }}`, `className="sim-panel-subtitle"`],
  [`style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}`, `className="sim-panel-body"`],
  [`style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '6px', fontWeight: 'bold', textTransform: 'uppercase' }}`, `className="sim-panel-label"`],
  [`style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}`, `className="sim-panel-btn-group"`],
  [`style={{\n                  padding: '6px 12px',\n                  borderRadius: '6px',\n                  fontSize: '12px',\n                  fontWeight: 'bold',\n                  cursor: 'pointer',\n                  background: numDrones === n ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',\n                  border: numDrones === n ? '1px solid rgba(249,115,22,0.5)' : '1px solid rgba(255,255,255,0.1)',\n                  color: numDrones === n ? '#f97316' : '#888'\n                }}`, `className={numDrones === n ? 'sim-panel-btn active' : 'sim-panel-btn'}`],
  [`style={{\n                  padding: '6px 12px',\n                  borderRadius: '6px',\n                  fontSize: '12px',\n                  fontWeight: 'bold',\n                  cursor: 'pointer',\n                  background: duration === d.val ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',\n                  border: duration === d.val ? '1px solid rgba(249,115,22,0.5)' : '1px solid rgba(255,255,255,0.1)',\n                  color: duration === d.val ? '#f97316' : '#888'\n                }}`, `className={duration === d.val ? 'sim-panel-btn active' : 'sim-panel-btn'}`],
  [`style={{\n                  padding: '6px 12px',\n                  borderRadius: '6px',\n                  fontSize: '12px',\n                  fontWeight: 'bold',\n                  cursor: 'pointer',\n                  background: targetGroup === g ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',\n                  border: targetGroup === g ? '1px solid rgba(249,115,22,0.5)' : '1px solid rgba(255,255,255,0.1)',\n                  color: targetGroup === g ? '#f97316' : '#888'\n                }}`, `className={targetGroup === g ? 'sim-panel-btn active' : 'sim-panel-btn'}`],
  [`style={{ display: 'flex', gap: '12px', marginTop: '24px' }}`, `className="sim-panel-footer"`],
  [`style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ccc', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}`, `className="sim-panel-cancel-btn"`],
  [`style={{ flex: 2, padding: '10px', borderRadius: '8px', background: '#f97316', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}`, `className="sim-panel-start-btn"`]
];

replacements.forEach(([from, to]) => {
  content = content.split(from).join(to);
});

fs.writeFileSync('c:/Users/ASUS/Desktop/work/webapp/src/simulation/SimConfigPanel.jsx', content);
