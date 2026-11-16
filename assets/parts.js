// AsciiParts: Judy's approved pieces for ASCII plates, in Gaegu and marker colours. Load after
// palette.js, and after pixel.js and pixel/parts.js if you use icons (the pixel icons, in the
// plate's indigo and red; wait for PixelInk.ready too). Numbers and symbols are plain Gaegu, not parts. Wait for the Gaegu font before drawing. Gallery: ascii-parts.html.
//
//   AsciiParts.plate(canvas, d => {
//     AsciiParts.ring(d, 210, 160, 125, 'all the points the same distance ');
//     AsciiParts.frame(d, 40, 30, 380, 290);
//   }, { w: 420, h: 320, time: 0 });
//
// The rules behind them are in Pipelines/ASCII.md.
(function () {
  const M = window.MARKERS;
  const INDIGO = M['POSCA Indigo'], BLUE = M['Dark Blue Light 15'], GREY = M['Cool Grey C43'], FROST = M['Frost Blue 182'], INK = M['Blue Grey B47'];
  const ORANGE = M['POSCA Orange'], SAND = M['Sand 107'], RED = M['POSCA Tomato Red'];
  const NEAR = { c: INDIGO, w: 700, size: 20 }, FAR = { c: GREY, w: 400, size: 17 };
  const WARM = { c: RED, w: 700, size: 20 }, COOL = { c: BLUE, w: 700, size: 20 };
  const TIGHT = { c: INDIGO, w: 700, size: 12 };  // Approved for big shapes: fill(d, test, word, TIGHT, 8, 11)
  const hash = (x, y) => ((Math.round(x) * 73 + Math.round(y) * 151) % 97) / 97 * 6.283;

  // Run a drawing on a canvas. draw gets d with mark, text and rule. Every marked letter wobbles
  // and breathes on its own phase; loop-safe if time comes from whole cycles per loop.
  function plate(canvas, draw, { w = 420, h = 320, time = 0, dpr = 2 } = {}) {
    const g = canvas.getContext('2d');
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const glyph = (x, y, ch, o) => {
      const ph = hash(x, y), breathe = 0.5 + 0.5 * Math.sin(time * 1.1 + ph), wob = o.still ? 0 : 1;
      g.save();
      g.translate(x + wob * 0.9 * Math.sin(time * 2.2 + ph * 2), y + wob * 0.9 * Math.cos(time * 2.2 + ph));
      g.rotate(wob * 0.06 * Math.sin(time * 2.2 + ph));
      g.font = `${o.w} ${o.size}px Gaegu, cursive`;
      g.fillStyle = wob && o.c === INDIGO && breathe > 0.82 ? BLUE : o.c;
      g.globalAlpha = (o.a ?? 1) * (1 - 0.25 * breathe * wob);
      g.fillText(ch, 0, 0); g.restore();
    };
    draw({
      w, h, time,
      mark: glyph,
      text: (x, y, s, o) => glyph(x, y, s, { ...o, still: true }),
      image: (im, x, y, alpha = 1, [sx, sy, sw, sh] = [0, 0, im.width, im.height]) => {
        g.globalAlpha = alpha; g.drawImage(im, sx, sy, sw, sh, x, y, sw / 2, sh / 2); g.globalAlpha = 1;
      },
      rule: (x0, y0, x1, y1, width, key) => {  // a brass rule: dead straight, only the inking varies
        const len = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / len, uy = (y1 - y0) / len;
        g.strokeStyle = INK; g.lineWidth = width; g.lineCap = 'butt';
        for (let s = 0; s < len; s += 5) {
          g.globalAlpha = 0.93 + 0.05 * Math.sin(s * 0.03 + key * 7);
          g.beginPath(); g.moveTo(x0 + ux * s, y0 + uy * s);
          g.lineTo(x0 + ux * Math.min(len, s + 5.5), y0 + uy * Math.min(len, s + 5.5)); g.stroke();
        }
        g.globalAlpha = 1;
      }
    });
  }

  // Write a word through every cell of a shape, always left to right.
  function fill(d, test, word, o = NEAR, cw = 13, ch = 19) {
    let i = 0;
    for (let y = ch / 2; y < d.h; y += ch) for (let x = cw / 2; x < d.w; x += cw) {
      if (!test(x, y)) continue;
      const c = word[i++ % word.length];
      if (c !== ' ') d.mark(x, y, c, typeof o === 'function' ? o(x, y) : o);
    }
  }

  // The pixel icons in the plate's two inks: warm ones red, the rest indigo.
  const WARM_ICONS = ['star', 'heart', 'cross', 'hint', 'trophy', 'crown', 'coin', 'flag', 'dice', 'sun'];
  const absorb = c => [1, 3, 5].map(i => {
    const at = (h, k) => parseInt(h.slice(k, k + 2), 16);
    return -Math.log(at(c, i) / at(PixelInk.data.paper, i));
  });
  const inked = {};
  const dabs = (name, c, px) => {
    const key = [name, px, c].join();
    if (!inked[key]) {
      const A = absorb(c);
      PixelInk.render(inked[key] = document.createElement('canvas'), PixelParts.icon(name).map(row => row.map(on => on && { A, t: 1 })), { px: px * 2, seed: 3 });
    }
    return inked[key];
  };
  // Each dab fades a little toward a lighter ink on its own phase. Nothing moves.
  function icon(d, name, { x = 0, y = 0, px = 10, warm = WARM_ICONS.includes(name) } = {}) {
    const glow = dabs(name, warm ? ORANGE : BLUE, px), pad = Math.ceil(px * 2 * 0.3), P = px * 2;
    d.image(dabs(name, warm ? RED : INDIGO, px), x, y);
    PixelParts.icon(name).forEach((row, j) => row.forEach((on, i) => {
      if (on) d.image(glow, x + (pad + i * P) / 2, y + (pad + j * P) / 2, 0.1 + 0.1 * Math.sin(d.time * 1.1 + Math.sin(i * 12.9 + j * 78.2) * 437.6), [pad + i * P, pad + j * P, P, P]);
    }));
  }

  // Approved: words on a ring, upright, read left to right. The lower half runs backwards.
  function ring(d, cx, cy, r, text, o = NEAR) {
    const n = Math.round(2 * Math.PI * r / 14);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI + i / n * 2 * Math.PI, lower = Math.sin(a) > 0;
      const c = text[(lower ? n * 3 - i : i) % text.length];
      if (c !== ' ') d.mark(cx + r * Math.cos(a), cy + r * Math.sin(a) * 0.92, c, o);
    }
  }

  const poly = pts => (x, y) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };

  // Approved: a cube with bold near face, faded far faces. Any words fit.
  function cube(d, { near = 'NEAR ', side = 'side ', top = 'top ', cx = d.w / 2, cy = d.h / 2, r = 125 } = {}) {
    const q = r * 0.53, h = r * 1.12;
    const A = [cx, cy - q * 2.53], B = [cx + r, cy - q * 1.28], C = [cx, cy - q * 0.03], D = [cx - r, cy - q * 1.28];
    const E = [D[0], D[1] + h], F = [C[0], C[1] + h], G = [B[0], B[1] + h];
    fill(d, poly([D, C, F, E]), near, NEAR);
    fill(d, poly([C, B, G, F]), side, FAR);
    fill(d, poly([A, B, C, D]), top, { c: FROST, w: 400, size: 17 });
  }

  // Approved: a word bar. parts is [[share, word], ...]. The first part is warm, the rest cool.
  function bar(d, parts, { x = 15, y = 110, w = d.w - 30, h = 100 } = {}) {
    const total = parts.reduce((a, p) => a + p[0], 0);
    let at = x;
    parts.forEach(([share, word], i) => {
      const end = at + w * share / total, from = at;
      const stop = i < parts.length - 1 ? end - 13 : end;  // one empty column between parts
      fill(d, (px, py) => py > y && py < y + h && px >= from && px < stop, word + ' ', i ? COOL : WARM);
      at = end;
    });
  }

  // Approved: one brass rule, with joints a little off. Keeps eyes inside without pulling at them.
  function frame(d, x0, y0, x1, y1, w = 2.5) {
    d.rule(x0 - 2, y0, x1 + 1, y0, w, 1); d.rule(x1, y0 - 1, x1, y1 + 2, w, 2);
    d.rule(x1 + 2, y1, x0, y1, w, 3); d.rule(x0, y1 + 1, x0, y0 - 2, w, 4);
  }

  // Approved: tapered big dots, the one thing that travels. pts is the path, head an index.
  function travel(d, pts, head, length = 8, big = 40) {
    for (let back = length - 1; back >= 0; back--) {
      const [x, y] = pts[(head - back + pts.length * 2) % pts.length];
      d.mark(x, y, '●', { c: back < length * 0.7 ? ORANGE : SAND, w: 700, size: big - back * (big / (length + 2)), still: true });
    }
  }

  window.AsciiParts = { plate, fill, icon, ring, cube, bar, frame, travel, NEAR, FAR, WARM, COOL, TIGHT, get icons() { return PixelParts.icons; } };
})();
