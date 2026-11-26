/* Burung + kupu-kupu: canvas, gerak fluid berbasis fisika sederhana */
(() => {
const hero = document.getElementById('hero'), cv = document.getElementById('fauna');
if (!hero || !cv) return;
const ctx = cv.getContext('2d'), calm = false, K = 1;
const R = Math.random, TAU = Math.PI * 2, lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const INK = '#25334E';
let W = 0, H = 0, top = 0, t0 = performance.now(), clock = 0;
const size = () => {
  const r = hero.getBoundingClientRect(), dpr = Math.min(document.documentElement.classList.contains('lite') ? 1 : 1.5, devicePixelRatio || 1);
  W = r.width; H = r.height; top = Math.min(W, 480) * 302 / 1100;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

class Bird {
  constructor(i) { this.reset(); this.dir = i % 2 ? -1 : 1; this.x = this.dir > 0 ? -40 : W + 40; this.wait = 4.2 + i * 3.5; }
  reset() {
    this.dir = R() < .5 ? -1 : 1; this.s = 1.3 + R() * .5;
    this.x = this.dir > 0 ? -40 : W + 40;
    this.y = top + H * (.04 + R() * .22); this.sp = 26 + R() * 16;
    this.ph = R() * TAU; this.w = R() * TAU; this.flap = 1; this.mode = 1; this.mt = 0; this.nt = 1.5 + R() * 2;
    this.amp = 1; this.vy = 0; this.pitch = 0; this.wait = .4 + R() * 2.2;
  }
  update(dt) {
    if (this.wait > 0) { this.wait -= dt; return; }
    this.mt += dt; this.w += dt * .6;
    if (this.mt > this.nt) { this.mode ^= 1; this.mt = 0; this.nt = this.mode ? 2 + R() * 2.5 : 1 + R() * 1.4; }
    this.amp += ((this.mode ? 1 : .15) - this.amp) * (1 - Math.exp(-dt * 2.5));
    this.ph += dt * TAU * lerp(1.2, 5.5, this.amp);
    const goal = this.mode ? -9 : 7, lim = clamp((top + H * .34 - this.y) / 40, -1, 1) * 8;
    this.vy += (goal + Math.sin(this.w) * 5 + lim - this.vy) * (1 - Math.exp(-dt * 1.6));
    const vx = this.dir * this.sp * lerp(.8, 1.1, this.amp);
    this.x += vx * dt; this.y += this.vy * dt;
    this.pitch += (Math.atan2(this.vy, Math.abs(vx)) - this.pitch) * (1 - Math.exp(-dt * 3));
    if ((this.dir > 0 && this.x > W + 50) || (this.dir < 0 && this.x < -50)) this.reset();
  }
  wing(k, far) {
    const A = lerp(.22, .9, this.amp), b = Math.sin(this.ph + (far ? .2 : 0));
    const rx = 1.5, ry = -1, a1 = .3 + b * A, a2 = .3 + Math.sin(this.ph - .9 + (far ? .2 : 0)) * A * 1.25;
    const ex = rx - 2.1 * k, ey = ry - 7 * k * a1, tx = ex - 4 * k, ty = ey - 9 * k * a2;
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.quadraticCurveTo(ex + 1, ey - .5, tx, ty);
    ctx.quadraticCurveTo(tx - 2, ty + 2.6, ex - 4.5 * k, ey + 1.8); ctx.quadraticCurveTo(rx - 3 * k, ry + 1, rx - 5 * k, ry + 1.5); ctx.closePath(); ctx.fill();
  }
  draw(a) {
    if (this.wait > 0) return;
    const bob = Math.sin(this.ph + .6) * 1.2 * this.amp;
    ctx.save(); ctx.translate(this.x, this.y + bob * this.s); ctx.scale(this.dir * this.s, this.s); ctx.rotate(this.pitch);
    ctx.fillStyle = INK; ctx.globalAlpha = a * .45; this.wing(.82, true);
    ctx.globalAlpha = a * .85;
    ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 2.2, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(6.6, -.7, 1.7, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -1); ctx.lineTo(10.4, -.4); ctx.lineTo(8, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5.5, -.6); ctx.lineTo(-11.5, -1.8); ctx.lineTo(-11.5, 1.6); ctx.lineTo(-5.5, 1); ctx.fill();
    this.wing(1, false); ctx.restore();
  }
}

const FORE = new Path2D('M0 -1.5C2 -8 8 -13 13 -11.5C14.5 -8 12.5 -3.5 6 0C3 1 1 1 0 .5Z');
const HIND = new Path2D('M0 .5C5 -.5 11 -1 12 3C12.5 7.5 8 11 4.5 10C2 9.5 .8 6 0 3.5Z');
const PAL = [['#F3DDA0', '#AF8741'], ['#D5E2EF', '#5E7896'], ['#FBF1E2', '#C9AE87']];
class Fly {
  constructor(i) {
    this.pal = PAL[i % PAL.length]; this.z = .85 + R() * .45;
    this.x = W * (.15 + R() * .7); this.y = H * (.5 + R() * .3); this.th = R() * TAU;
    this.p = [R() * TAU, R() * TAU, R() * TAU]; this.t = R() * 50; this.ph = R() * TAU;
    this.hover = 0; this.rest = 3 + R() * 5; this.f = 4; this.sp = 0; this.fade = 0;
    this.g = ctx.createLinearGradient(0, 0, 13, 0); this.g.addColorStop(0, this.pal[0]); this.g.addColorStop(1, this.pal[1]);
  }
  update(dt) {
    this.t += dt; const t = this.t;
    this.rest -= dt; if (this.rest < 0) { this.hover = .8 + R() * 1.6; this.rest = 4 + R() * 6; }
    if (this.hover > 0) this.hover -= dt;
    let turn = Math.sin(t * .9 + this.p[0]) * 1.5 + Math.sin(t * 2.3 + this.p[1]) * 1.1 + Math.sin(t * 5.1 + this.p[2]) * .35;
    const mx = this.x / W, my = this.y / H;
    const cx = mx < .08 ? 1 : mx > .92 ? -1 : 0, cy = my < .4 ? 1 : my > .9 ? -1 : 0;
    if (cx || cy) { let d = Math.atan2(cy * .8, cx || (mx < .5 ? 1 : -1) * .3) - this.th; d = Math.atan2(Math.sin(d), Math.cos(d)); turn += d * 2.2; }
    this.th += turn * dt;
    const want = this.hover > 0 ? .1 : 1;
    this.sp += (want * (22 + 16 * (.5 + .5 * Math.sin(t * .5 + this.p[2])) ) - this.sp) * (1 - Math.exp(-dt * 2));
    const fw = this.hover > 0 ? 5.2 : (Math.sin(t * 1.3 + this.p[1]) > .55 ? 1.6 : 4.2);
    this.f += (fw - this.f) * (1 - Math.exp(-dt * 3)); this.ph += dt * TAU * this.f;
    const surge = 1 + .45 * Math.sin(this.ph), v = this.sp * surge;
    this.x += Math.cos(this.th) * v * dt; this.y += Math.sin(this.th) * v * dt - Math.cos(this.ph) * 5 * dt * (this.hover > 0 ? .4 : 1);
    this.x = clamp(this.x, -10, W + 10); this.y = clamp(this.y, top, H);
  }
  wings(s) {
    ctx.fillStyle = this.g; ctx.strokeStyle = INK; ctx.lineWidth = .6; ctx.lineJoin = 'round';
    for (const m of [1, -1]) {
      ctx.save(); ctx.scale(m * s, 1);
      for (const p of [HIND, FORE]) { ctx.fill(p); ctx.stroke(p); }
      ctx.strokeStyle = 'rgba(37,51,78,.35)'; ctx.lineWidth = .4; ctx.beginPath();
      ctx.moveTo(.5, -1); ctx.lineTo(11, -9); ctx.moveTo(.5, -.5); ctx.lineTo(13, -4); ctx.moveTo(.5, 1); ctx.lineTo(10, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(10, -8, 1.2, 1.7, .6, 0, TAU); ctx.fill();
      ctx.fillStyle = this.g; ctx.strokeStyle = INK; ctx.restore();
    }
  }
  draw(a) {
    const s = .16 + .84 * Math.pow((Math.cos(this.ph) + 1) / 2, .8);
    ctx.save(); ctx.globalAlpha = a * .95; ctx.translate(this.x, this.y); ctx.rotate(this.th + Math.PI / 2); ctx.scale(this.z, this.z);
    this.wings(s);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(0, 0, .95, 5.6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -6.4, 1.15, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = .5; ctx.beginPath();
    ctx.moveTo(-.3, -7.2); ctx.quadraticCurveTo(-2.4, -10.5, -4.2, -11); ctx.moveTo(.3, -7.2); ctx.quadraticCurveTo(2.4, -10.5, 4.2, -11); ctx.stroke();
    ctx.restore();
  }
}

let birds = [], flies = [];
const init = () => { size(); birds = [0, 1, 2].map(i => new Bird(i)); flies = [0, 1, 2].map(i => new Fly(i)); };
const step = dt => { dt *= K; clock += dt; birds.forEach(b => b.update(dt)); flies.forEach(f => f.update(dt)); };
const render = () => {
  const a = clamp((performance.now() - t0 - 4500) / 1800, 0, 1);
  ctx.clearRect(0, 0, W, H); if (a <= 0) return;
  flies.forEach(f => f.draw(a)); birds.forEach(b => b.draw(a));
};
let last = 0, raf = 0, vis = true;
const frame = t => { raf = 0; const dt = Math.min(.05, (t - (last || t)) / 1000); last = t; step(dt); render(); if (vis && !document.hidden) raf = requestAnimationFrame(frame); };
const go = () => { if (!raf && vis && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
init();
new IntersectionObserver(es => { vis = es[0].isIntersecting; go(); }).observe(hero);
document.addEventListener('visibilitychange', go); go();
new ResizeObserver(size).observe(hero);
})();
