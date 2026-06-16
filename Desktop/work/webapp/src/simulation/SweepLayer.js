let globalSweepAngleDeg = 0;

export class SweepLayer {
  constructor(detectors) {
    // detectors: Array of { lat, lon, radiusM }
    this._detectors = detectors; 
    this._lastTime = null;
    this._raf = null; this._canvas = null; this._map = null;
    this._SPEED = 45;
    this._onViewChange = this._onViewChange.bind(this);
  }
  onAdd(map) {
    this._map = map;
    this._canvas = document.createElement('canvas');
    this._canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:400;';
    map.getPanes().overlayPane.appendChild(this._canvas);
    map.on('move zoom viewreset resize moveend zoomend', this._onViewChange, this);
    this._resize(); this._lastTime = performance.now();
    this._raf = requestAnimationFrame(t => this._tick(t));
  }
  onRemove(map) {
    cancelAnimationFrame(this._raf); this._raf = null;
    if (this._canvas?.parentNode) this._canvas.parentNode.removeChild(this._canvas);
    map.off('move zoom viewreset resize moveend zoomend', this._onViewChange, this);
    this._canvas = null; this._map = null;
  }
  _onViewChange() {
    this._resize();
  }
  _resize() {
    if (!this._map || !this._canvas) return;
    const s = this._map.getSize();
    this._canvas.width = s.x; this._canvas.height = s.y;
    const origin = this._map.containerPointToLayerPoint([0, 0]);
    window.L.DomUtil.setPosition(this._canvas, origin);
  }
  _tick(now) {
    if (!this._map || !this._canvas) return;
    const dt = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now; globalSweepAngleDeg = (globalSweepAngleDeg + this._SPEED * dt) % 360;
    this._draw(); this._raf = requestAnimationFrame(t => this._tick(t));
  }
  _draw() {
    if (!this._map || !this._canvas) return;
    const cv = this._canvas, ctx = cv.getContext('2d');
    const s = this._map.getSize(); ctx.clearRect(0, 0, s.x, s.y);
    
    this._detectors.forEach(det => {
      const cp = this._map.latLngToContainerPoint([det.lat, det.lon]);
      const ep = this._map.latLngToContainerPoint([det.lat + det.radiusM / 111320, det.lon]);
      const rPx = Math.abs(cp.y - ep.y);
      const sweepRad = (globalSweepAngleDeg - 90) * Math.PI / 180, fanRad = 80 * Math.PI / 180;
      ctx.save();
      const grd = ctx.createRadialGradient(cp.x, cp.y, 0, cp.x, cp.y, rPx);
      grd.addColorStop(0, 'rgba(34,197,94,0.0)'); grd.addColorStop(0.15, 'rgba(34,197,94,0.10)');
      grd.addColorStop(0.65, 'rgba(34,197,94,0.06)'); grd.addColorStop(1.0, 'rgba(34,197,94,0.0)');
      ctx.beginPath(); ctx.moveTo(cp.x, cp.y);
      ctx.arc(cp.x, cp.y, rPx, sweepRad - fanRad, sweepRad, false); ctx.closePath();
      ctx.fillStyle = grd; ctx.fill();
      ctx.beginPath(); ctx.moveTo(cp.x, cp.y);
      ctx.lineTo(cp.x + rPx * Math.cos(sweepRad), cp.y + rPx * Math.sin(sweepRad));
      ctx.strokeStyle = 'rgba(34,197,94,0.75)'; ctx.lineWidth = 2;
      ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(34,197,94,0.7)'; ctx.stroke();
      ctx.restore();
    });
  }
}
