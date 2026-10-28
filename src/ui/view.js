// Khung nhìn canvas: hệ toạ độ (tâm + tỉ lệ), đổi toạ độ màn hình ↔ toạ độ hình, độ phân giải cao
// (devicePixelRatio), dời/phóng, và gom việc vẽ lại theo requestAnimationFrame (tối đa 1 lần mỗi khung).

export class CanvasView {
  constructor(host) {
    this.host = host;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'board-canvas';
    host.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.cx = 0;
    this.cy = 0;
    this.scale = 40; // pixel cho mỗi đơn vị
    this.W = 0;
    this.H = 0;
    this.painter = null; // (ctx, view) => void
    this.frameHooks = []; // việc cần làm ngay trước khi vẽ (vd áp vị trí chuột đang kéo)
    this.listeners = [];
    this.frameRequested = false;
    this.resize();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.resize()).observe(host);
    else window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const r = this.host.getBoundingClientRect();
    const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
    const dpr = window.devicePixelRatio || 1;
    if (W === this.W && H === this.H && dpr === this.dpr) return;
    this.W = W;
    this.H = H;
    this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.canvas.style.width = W + 'px';
    this.canvas.style.height = H + 'px';
    this.drawNow();
  }

  /** Đăng ký hàm gọi khi khung nhìn đổi (dời/phóng). */
  onViewChange(fn) {
    this.listeners.push(fn);
  }

  viewChanged() {
    for (const fn of this.listeners) fn(this);
  }

  toScreen(P) {
    return { x: this.W / 2 + (P.x - this.cx) * this.scale, y: this.H / 2 - (P.y - this.cy) * this.scale };
  }

  toUser(sx, sy) {
    return { x: this.cx + (sx - this.W / 2) / this.scale, y: this.cy - (sy - this.H / 2) / this.scale };
  }

  /** [xTrái, yTrên, xPhải, yDưới] (cùng quy ước với JSXGraph trước đây, để tương thích tệp cũ). */
  getBoundingBox() {
    const a = this.toUser(0, 0), b = this.toUser(this.W, this.H);
    return [a.x, a.y, b.x, b.y];
  }

  setBoundingBox([x1, y1, x2, y2]) {
    const w = Math.abs(x2 - x1), h = Math.abs(y1 - y2);
    if (!(w > 0) || !(h > 0)) return;
    this.scale = Math.min(this.W / w, this.H / h);
    this.cx = (x1 + x2) / 2;
    this.cy = (y1 + y2) / 2;
    this.requestDraw();
    this.viewChanged();
  }

  panBy(dx, dy) {
    this.cx -= dx / this.scale;
    this.cy += dy / this.scale;
    this.requestDraw();
    this.viewChanged();
  }

  zoomAt(sx, sy, factor) {
    const P = this.toUser(sx, sy);
    this.scale = Math.min(1e5, Math.max(0.02, this.scale * factor));
    // giữ điểm dưới con trỏ đứng yên
    this.cx = P.x - (sx - this.W / 2) / this.scale;
    this.cy = P.y + (sy - this.H / 2) / this.scale;
    this.requestDraw();
    this.viewChanged();
  }

  /** Xin vẽ lại; nhiều lần xin trong cùng một khung chỉ vẽ một lần. */
  requestDraw() {
    if (this.frameRequested || this.drawing) return;
    this.frameRequested = true;
    requestAnimationFrame(() => {
      this.frameRequested = false;
      this.drawNow();
    });
  }

  drawNow() {
    this.drawing = true;
    try {
      for (const f of this.frameHooks) f();
      const ctx = this.ctx;
      ctx.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
      ctx.clearRect(0, 0, this.W, this.H);
      if (this.painter) this.painter(ctx, this);
    } finally {
      this.drawing = false;
    }
  }
}
