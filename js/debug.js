/* Panel diagnosa untuk HP: buka undangan dengan ?debug=1 di akhir alamat, lalu kirim tangkapan layarnya. */
(() => {
  const root = document.documentElement, hero = document.querySelector('#hero');
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:6px;top:6px;z-index:99999;background:#000c;color:#9f9;font:11px/1.35 monospace;padding:6px 8px;border-radius:6px;max-width:92vw;pointer-events:none;white-space:pre-wrap';
  document.body.append(box);
  let n = 0, last = performance.now(), fps = 0;
  const loop = t => { n++; if (t - last >= 1000) { fps = Math.round(n * 1000 / (t - last)); n = 0; last = t; } requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  const ok = v => v ? 'ya' : 'TIDAK';
  const draw = () => {
    const imgs = [...document.querySelectorAll('#hero img')];
    box.textContent = [
      'fps: ' + fps + (fps && fps < 30 ? '  <-- patah-patah' : ''),
      'hero: ' + (hero ? hero.className : '-'),
      'mode ringan: ' + ok(root.classList.contains('lite')),
      'gambar hero siap: ' + imgs.filter(i => i.complete && i.naturalWidth).length + '/' + imgs.length,
      'font siap: ' + (document.fonts ? document.fonts.status : '?'),
      'kurangi animasi (OS): ' + ok(matchMedia('(prefers-reduced-motion:reduce)').matches),
      'translate/scale CSS: ' + ok(CSS.supports('translate', '0 0')),
      'svh: ' + ok(CSS.supports('height', '100svh')),
      'layar: ' + innerWidth + 'x' + innerHeight + ' @' + devicePixelRatio + 'x',
      'RAM: ' + (navigator.deviceMemory || '?') + ' GB, core: ' + (navigator.hardwareConcurrency || '?'),
      'koneksi: ' + ((navigator.connection && navigator.connection.effectiveType) || '?') + (navigator.connection && navigator.connection.saveData ? ' (hemat data)' : ''),
      navigator.userAgent.replace(/\(.*?\)/, '').slice(0, 60)
    ].join('\n');
  };
  setInterval(draw, 500); draw();
})();
