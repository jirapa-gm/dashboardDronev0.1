export function initRipple() {
  document.addEventListener(
    'pointerdown',
    (e) => {
      const btn = e.target.closest('.btn');
      if (!btn || btn.disabled) return;

      const rect = btn.getBoundingClientRect();
      btn.style.setProperty('--ripple-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
      btn.style.setProperty('--ripple-y', `${((e.clientY - rect.top)  / rect.height) * 100}%`);
      btn.classList.add('rippling');

      const cleanup = () => {
        btn.classList.remove('rippling');
        btn.removeEventListener('pointerup',     cleanup);
        btn.removeEventListener('pointerleave',  cleanup);
        btn.removeEventListener('pointercancel', cleanup);
      };
      btn.addEventListener('pointerup',     cleanup);
      btn.addEventListener('pointerleave',  cleanup);
      btn.addEventListener('pointercancel', cleanup);
      setTimeout(() => btn.classList.remove('rippling'), 600);
    },
    { passive: true },
  );
}