const fs = require('fs');

function refactorFile(path, isIntelTable) {
  let content = fs.readFileSync(path, 'utf8');
  if (!content.includes('./DroneTables.css')) {
    content = content.replace(/import \{/, "import './DroneTables.css';\nimport {");
  }

  let replacements = [];
  if (isIntelTable) {
    replacements = [
      [`style={{ marginBottom: 12 }}`, `className="dit-controls-row flex-row-center gap-2 flex-wrap"`],
      [`className="flex-row-center gap-2 flex-wrap" className="dit-controls-row flex-row-center gap-2 flex-wrap"`, `className="dit-controls-row flex-row-center gap-2 flex-wrap"`],
      [`style={{ minWidth: 160 }}`, `className="dit-search-wrap relative flex-1"`],
      [`className="relative flex-1" className="dit-search-wrap relative flex-1"`, `className="dit-search-wrap relative flex-1"`],
      [`style={{ left: '0.625rem', top: '50%', transform: 'translateY(-50%)', width: '0.75rem', height: '0.75rem' }}`, `className="dit-search-icon absolute text-[#666]"`],
      [`className="absolute text-[#666]" className="dit-search-icon absolute text-[#666]"`, `className="dit-search-icon absolute text-[#666]"`],
      [`className="select-styled" style={{ padding: '0.375rem 0.5rem' }}`, `className="select-styled dit-select"`],
      [`style={{ fontSize: 12, color: '#666', marginLeft: 'auto' }}`, `className="dit-count-label font-mono"`],
      [`style={{ border: '1px solid #222' }}`, `className="dit-table-wrap table-wrapper rounded-lg"`],
      [`className="table-wrapper rounded-lg" className="dit-table-wrap table-wrapper rounded-lg"`, `className="dit-table-wrap table-wrapper rounded-lg"`],
      [`style={{ minWidth: '720px' }}`, `className="dit-table-main table-main"`],
      [`className="table-main" className="dit-table-main table-main"`, `className="dit-table-main table-main"`],
      [`style={{ position: 'sticky', top: 0, zIndex: 10 }}`, `className="dit-table-head table-header"`],
      [`className="table-header" className="dit-table-head table-header"`, `className="dit-table-head table-header"`],
      [`className="th-sortable" style={{ cursor: 'default' }}`, `className="th-sortable dit-th-nosort"`],
      [`className="table-body-row" style={{ cursor: 'pointer' }}`, `className="table-body-row dit-tr-clickable"`],
      [`style={{ fontWeight: 'bold', color: gc }}`, `className="table-cell font-mono dit-td-id" style={{ color: gc }}`],
      [`className="table-cell font-mono" className="table-cell font-mono dit-td-id"`, `className="table-cell font-mono dit-td-id"`],
      [`style={{ color: '#ddd', whiteSpace: 'nowrap' }}`, `className="table-cell dit-td-model"`],
      [`style={{ fontSize: '10px', padding: '2px 6px', background:\`\${gc}22\`, color:gc, border:\`1px solid \${gc}44\` }}`, `className="rounded-full font-bold dit-badge-group" style={{ background:\`\${gc}22\`, color:gc, border:\`1px solid \${gc}44\` }}`],
      [`style={{ fontWeight: 'bold', color: '#fff' }}`, `className="table-cell font-mono dit-td-det"`],
      [`style={{ fontSize: '10px', padding: '2px 6px', background:\`\${tc}22\`, color:tc }}`, `className="rounded font-bold dit-badge-threat" style={{ background:\`\${tc}22\`, color:tc }}`],
      [`style={{ color: '#aaa' }}`, `className="table-cell font-mono dit-td-measure"`],
      [`className="table-cell font-mono" className="table-cell font-mono dit-td-measure"`, `className="table-cell font-mono dit-td-measure"`],
      [`style={{ color: '#888' }}`, `className="table-cell dit-td-proto"`],
      [`className="table-cell font-mono" className="table-cell dit-td-proto"`, `className="table-cell font-mono dit-td-proto"`],
      [`style={{ color: '#777', whiteSpace: 'nowrap' }}`, `className="table-cell font-mono dit-td-date"`],
      [`className="table-cell font-mono" className="table-cell font-mono dit-td-date"`, `className="table-cell font-mono dit-td-date"`],
      [`style={{ marginTop: 8 }}`, `className="dit-pagination-row flex-row-between"`],
      [`className="flex-row-between" className="dit-pagination-row flex-row-between"`, `className="dit-pagination-row flex-row-between"`],
      [`style={{ fontSize: 9, color: '#555' }}`, `className="dit-page-info font-mono"`]
    ];
  } else {
    replacements = [
      [`style={{\n        padding: '0.375rem',\n        borderRadius: '8px',\n        background: 'rgba(20, 20, 20, 0.4)',\n        border: '1px solid rgba(255, 255, 255, 0.05)',\n        display: 'flex',\n        alignItems: 'center',\n        gap: '0.5rem'\n      }}`, `className="drone-stat-card dh-card-bg"`],
      [`style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}`, `className="dh-stat-col"`],
      [`style={{\n          fontSize: '14px',\n          fontWeight: 800,\n          color: valColor,\n          fontFamily: 'monospace',\n          whiteSpace: 'nowrap',\n          overflow: 'hidden',\n          textOverflow: 'ellipsis'\n        }}`, `className="drone-stat-value dh-stat-val-text" style={{ color: valColor }}`],
      [`style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px 0' }}`, `className="dh-header-row"`],
      [`style={{ fontSize: 8.5, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, fontFamily: 'system-ui, -apple-system, sans-serif' }}`, `className="dh-header-label"`],
      [`style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(249, 115, 22, 0.12), transparent)' }}`, `className="dh-header-line"`],
      [`style={{ maxWidth: '95vw' }}`, `className="drone-modal-content dh-modal-content"`],
      [`style={{ background:'rgba(25, 25, 25, 0.6)', borderBottom:'1px solid rgba(255, 255, 255, 0.06)', padding:'10px 16px',\n               display:'flex', alignItems:'center', justifyContent:'space-between' }}`, `className="dh-modal-header flex-row-between"`],
      [`style={{ display: 'flex', alignItems: 'center', gap: 12 }}`, `className="dh-modal-title-row"`],
      [`style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: gc }}`, `className="dh-modal-icon-box" style={{ color: gc }}`],
      [`style={{ display:'flex', alignItems:'center', gap:9, marginBottom:3 }}`, `className="dh-modal-id-row"`],
      [`style={{ fontSize:18, fontWeight:800, fontFamily:'monospace', letterSpacing:'0.02em', color: '#fff' }}`, `className="dh-modal-id-text"`],
      [`style={{ fontSize:7.5, fontWeight:800, padding:'2px 8px', borderRadius:4,\n                                background:\`\${gc}22\`, color:gc, border:\`1px solid \${gc}44\` }}`, `className="dh-modal-badge" style={{ background:\`\${gc}22\`, color:gc, border:\`1px solid \${gc}44\` }}`],
      [`style={{ fontSize:10, color:'#777', fontFamily:'system-ui, -apple-system, sans-serif' }}`, `className="dh-modal-subtitle"`],
      [`style={{ width: 10, height: 10 }}`, `className="dh-modal-close-icon"`],
      [`style={{ padding:'8px 16px 8px', overflowY:'auto', flex:1 }}`, `className="no-scrollbar dh-modal-body-scroll"`],
      [`style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}`, `className="dh-grid-2col"`],
      [`style={{ display:'grid', gridTemplateColumns:'1fr', gap:7 }}`, `className="dh-grid-1col"`],
      [`style={{ opacity: 0.6, marginLeft: 2 }}`, `className="dh-array-item-count"`],
      [`style={{ height:4 }}`, `className="dh-spacer-4"`],
      [`style={{ padding:'0 16px 12px', flexShrink:0 }}`, `className="dh-modal-footer"`]
    ];
  }

  replacements.forEach(([from, to]) => {
    content = content.split(from).join(to);
  });

  fs.writeFileSync(path, content);
}

refactorFile('c:/Users/ASUS/Desktop/work/webapp/src/components/DroneIntelTable.jsx', true);
refactorFile('c:/Users/ASUS/Desktop/work/webapp/src/components/DroneHistoryPanel.jsx', false);

