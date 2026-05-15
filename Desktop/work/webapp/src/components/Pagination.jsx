export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const delta = 1;
  const pages = [];
  for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#3a3a3a] bg-[#1a1a1a]">
      <NavBtn disabled={currentPage <= 1}          onClick={() => onPageChange(currentPage - 1)} label="← Prev" />

      <div className="flex items-center gap-1">
        {currentPage > 2 && (
          <>
            <PageBtn n={1} current={currentPage} onChange={onPageChange} />
            {currentPage > 3 && <Ellipsis />}
          </>
        )}
        {pages.map((n) => <PageBtn key={n} n={n} current={currentPage} onChange={onPageChange} />)}
        {currentPage < totalPages - 1 && (
          <>
            {currentPage < totalPages - 2 && <Ellipsis />}
            <PageBtn n={totalPages} current={currentPage} onChange={onPageChange} />
          </>
        )}
      </div>

      <NavBtn disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} label="Next →" />
    </div>
  );
}

function NavBtn({ disabled, onClick, label }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex items-center px-3.5 py-1.5 text-[10px] font-bold tracking-wide rounded-lg border transition-all select-none whitespace-nowrap',
        disabled
          ? 'bg-[#1a1a1a] border-[#3a3a3a] text-[#444] cursor-not-allowed opacity-50'
          : 'bg-[#252525] border-[#4a4a4a] text-[#bbb] hover:bg-[#2e2e2e] hover:border-[#666] hover:text-[#f0f0f0] cursor-pointer',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function PageBtn({ n, current, onChange }) {
  const active = n === current;
  return (
    <button
      onClick={() => onChange(n)}
      className={[
        'inline-flex items-center justify-center min-w-[1.875rem] py-1 text-[10px] font-bold rounded-md border transition-all',
        active
          ? 'bg-gradient-to-br from-[#ea580c] to-[#f97316] border-[#c2410c] text-white shadow-[0_2px_8px_rgba(234,88,12,0.35)]'
          : 'bg-[#222] border-[#3d3d3d] text-[#999] hover:bg-[#2a2a2a] hover:border-[#555] hover:text-[#e0e0e0]',
      ].join(' ')}
    >
      {n}
    </button>
  );
}

function Ellipsis() {
  return <span className="text-[#555] text-xs px-1 select-none">…</span>;
}