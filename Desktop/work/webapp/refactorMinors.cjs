const fs = require('fs');

function refactorMinor(path) {
  let content = fs.readFileSync(path, 'utf8');
  if (!content.includes('./Minors.css')) {
    content = content.replace(/import \{/, "import './Minors.css';\nimport {");
  }

  let replacements = [
    // Breadcrumb
    [`style={{ background: 'linear-gradient(to right, #0f0f0f, #141414)', borderBottom: '1px solid #222', padding: '0.625rem 1.25rem', gap: '0.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 10, position: 'relative' }}`, `className="breadcrumb-container flex-row-start"`],
    [`className="breadcrumb-container flex-row-start" className="breadcrumb-container flex-row-start"`, `className="breadcrumb-container flex-row-start"`],
    [`style={{ background: '#1a1a1a', padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid #2a2a2a', marginRight: '0.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}`, `className="breadcrumb-back flex-row-center"`],
    [`className="breadcrumb-back flex-row-center" className="breadcrumb-back flex-row-center"`, `className="breadcrumb-back flex-row-center"`],
    [`style={{ width: '0.875rem', height: '0.875rem' }}`, `className="breadcrumb-back-icon"`],
    [`style={{ fontWeight: 600, color: '#aaa' }}`, `className="breadcrumb-back-text"`],
    [`style={{ width: '1rem', height: '1rem', color: '#555', margin: '0 0.125rem' }}`, `className="breadcrumb-sep-icon"`],
    [`style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center' }}`, `className="breadcrumb-crumb"`],
    [`className="breadcrumb-crumb" className="breadcrumb-crumb"`, `className="breadcrumb-crumb"`],
    [`style={{ background: 'rgba(251, 146, 60, 0.1)', padding: '0.25rem 0.625rem', borderRadius: '6px', border: '1px solid rgba(251, 146, 60, 0.25)', display: 'flex', alignItems: 'center', boxShadow: '0 0 10px rgba(251, 146, 60, 0.05)' }}`, `className="breadcrumb-active"`],
    [`className="breadcrumb-active" className="breadcrumb-active"`, `className="breadcrumb-active"`],
    [`style={{ fontSize: '9px', color: '#666', marginLeft: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#141414', padding: '2px 6px', borderRadius: '4px', border: '1px solid #222' }}`, `className="breadcrumb-badge"`],

    // TabBar
    [`style={{ marginBottom: '-1px' }}`, `className="tabbar-btn-base"`],
    [`style={{ fontSize: '8px', padding: '2px 6px', background: active ? \`\${BADGE_COLOR}20\` : '#1a1a1a', color: active ? BADGE_COLOR : '#555', border: \`1px solid \${active ? \`\${BADGE_COLOR}40\` : '#2a2a2a'}\` }}`, `className="rounded-full font-bold tabbar-badge" style={{ background: active ? \`\${BADGE_COLOR}20\` : '#1a1a1a', color: active ? BADGE_COLOR : '#555', border: \`1px solid \${active ? \`\${BADGE_COLOR}40\` : '#2a2a2a'}\` }}`],
    [`className="rounded-full font-bold" className="rounded-full font-bold tabbar-badge"`, `className="rounded-full font-bold tabbar-badge"`],
    
    // SwipeHint
    [`style={{ animation: 'fadeInOut 3s ease forwards' }}`, `className="swipe-hint-container flex-row-center gap-2"`],
    [`className="swipe-hint-container flex-row-center gap-2" className="swipe-hint-container flex-row-center gap-2"`, `className="swipe-hint-container flex-row-center gap-2"`],
    [`style={{ width: '0.75rem', height: '0.75rem', color: '#fb923c' }}`, `className="swipe-hint-icon"`]
  ];

  replacements.forEach(([from, to]) => {
    content = content.split(from).join(to);
  });

  fs.writeFileSync(path, content);
}

refactorMinor('c:/Users/ASUS/Desktop/work/webapp/src/components/Breadcrumb.jsx');
refactorMinor('c:/Users/ASUS/Desktop/work/webapp/src/components/TabBar.jsx');
refactorMinor('c:/Users/ASUS/Desktop/work/webapp/src/components/SwipeHint.jsx');
