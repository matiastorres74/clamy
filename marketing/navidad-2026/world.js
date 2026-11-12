/* Dibujo del mundo del spot: la cabaña (fachada y corte interior), el bosque
   nevado y los productos. Todo es SVG generado por código, en "unidades de
   mundo": 250 unidades = 1 metro, el piso de la planta baja está en y = 0 y
   hacia arriba es negativo. La cámara (spot.js) solo mueve y escala estos
   grupos; nada de acá depende del tiempo salvo lo marcado con clases que
   spot.js anima (.tw titila, #door se abre, #gears gira, etc.). */
(function () {
  'use strict';

  const f = (n) => Math.round(n * 10) / 10;
  const P = (pts) => pts.map((p) => f(p[0]) + ',' + f(p[1])).join(' ');

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Línea del techo a dos aguas: cumbrera en x = 1200.
  const SLOPE = 700 / 1240;
  const roofY = (x) => -1400 + Math.abs(x - 1200) * SLOPE;

  const EXT_LOGS = ['#5e3b22', '#684327', '#54341d'];
  const INT_LOGS = ['#c48d54', '#bb834b', '#cc965d'];

  /* ---------- piezas reutilizables ---------- */

  const GLOW = { w: 'gWarm', r: 'gRed', g: 'gGreen', a: 'gWarm' };
  const BULB = { w: '#fff1c4', r: '#ff5a4d', g: '#58e08a', a: '#ffc24d' };
  let bulbCount = 0;
  function bulb(x, y, r = 5, c = 'w', halo = 4.2) {
    bulbCount++;
    const p = ((bulbCount * 0.618) % 1).toFixed(3);
    return (
      `<g class="tw" data-p="${p}"><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * halo)}" fill="url(#${GLOW[c]})"/>` +
      `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${BULB[c]}"/></g>`
    );
  }

  function qpt(x1, y1, cx, cy, x2, y2, t) {
    const u = 1 - t;
    return [u * u * x1 + 2 * u * t * cx + t * t * x2, u * u * y1 + 2 * u * t * cy + t * t * y2];
  }

  // Guirnalda verde colgante con lamparitas.
  function swag(x1, y1, x2, y2, sag, n = 7, w = 14, cols = ['w', 'r', 'w', 'g']) {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2 + sag * 2;
    const d = `M${f(x1)} ${f(y1)} Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)}`;
    let s =
      `<path d="${d}" fill="none" stroke="#17472c" stroke-width="${w}" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="#2f7a4b" stroke-width="${f(w * 0.5)}" stroke-linecap="round" stroke-dasharray="${f(w * 0.5)} ${f(w * 0.75)}"/>`;
    for (let i = 0; i < n; i++) {
      const [px, py] = qpt(x1, y1, cx, cy, x2, y2, (i + 0.5) / n);
      s += bulb(px, py + w * 0.15, w * 0.27, cols[i % cols.length], 3.8);
    }
    return s;
  }

  function wreath(x, y, r) {
    let s =
      `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#17472c" stroke-width="${f(r * 0.5)}"/>` +
      `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#2f7a4b" stroke-width="${f(r * 0.28)}" stroke-dasharray="${f(r * 0.2)} ${f(r * 0.22)}"/>`;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      s += `<circle cx="${f(x + Math.cos(a) * r)}" cy="${f(y + Math.sin(a) * r)}" r="${f(r * 0.09)}" fill="#d8342a"/>`;
    }
    const by = y + r;
    s +=
      `<path d="M${x} ${by} l${-r * 0.42} ${-r * 0.24} v${r * 0.48}z M${x} ${by} l${r * 0.42} ${-r * 0.24} v${r * 0.48}z" fill="#c3271f"/>` +
      `<path d="M${x} ${by} l${-r * 0.2} ${r * 0.5} h${r * 0.16}z M${x} ${by} l${r * 0.2} ${r * 0.5} h${-r * 0.16}z" fill="#a3201a"/>` +
      `<circle cx="${x}" cy="${by}" r="${f(r * 0.11)}" fill="#e2463a"/>`;
    return s;
  }

  function stones(x, y, w, h, seed, base = '#6a6259') {
    const r = rng(seed);
    const cols = ['#9a9085', '#8a8076', '#a79d92', '#7d746a', '#91877b'];
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${base}"/>`;
    const rows = Math.max(1, Math.round(h / 34));
    const rh = h / rows;
    for (let i = 0; i < rows; i++) {
      const yy = y + i * rh;
      let xx = x - r() * 24;
      while (xx < x + w) {
        const ww = 38 + r() * 46;
        const x0 = Math.max(x, xx) + 2;
        const x1 = Math.min(x + w, xx + ww) - 2;
        if (x1 - x0 > 8) {
          s += `<rect x="${f(x0)}" y="${f(yy + 2)}" width="${f(x1 - x0)}" height="${f(rh - 4)}" rx="7" fill="${cols[(r() * cols.length) | 0]}"/>`;
        }
        xx += ww;
      }
    }
    return s;
  }

  function logs(x, y, w, h, rowH, cols, line, hi, seed) {
    const r = rng(seed);
    let s = '';
    const n = Math.ceil(h / rowH);
    for (let i = 0; i < n; i++) {
      const yy = y + i * rowH;
      const hh = Math.min(rowH, y + h - yy);
      s += `<rect x="${x}" y="${f(yy)}" width="${w}" height="${f(hh + 0.5)}" fill="${cols[i % cols.length]}"/>`;
      s += `<rect x="${x}" y="${f(yy)}" width="${w}" height="${f(Math.min(5, hh))}" fill="${hi}" opacity=".45"/>`;
      s += `<rect x="${x}" y="${f(yy + hh - 5)}" width="${w}" height="5" fill="${line}" opacity=".6"/>`;
      for (let k = 0; k < w / 240; k++) {
        const gx = x + r() * w;
        const gw = Math.min(40 + r() * 120, x + w - gx);
        s += `<rect x="${f(gx)}" y="${f(yy + rowH * (0.3 + r() * 0.4))}" width="${f(gw)}" height="2.5" rx="1" fill="${line}" opacity=".3"/>`;
      }
    }
    return s;
  }

  function pine(x, y, h, c1, c2, snow = 0.92) {
    const n = 5;
    const w = h * 0.46;
    let s = `<rect x="${f(x - h * 0.03)}" y="${f(y - h * 0.12)}" width="${f(h * 0.06)}" height="${f(h * 0.12)}" fill="#2b1a10"/>`;
    for (let i = 0; i < n; i++) {
      const k = i / n;
      const ty = y - h * 0.1 - h * 0.9 * k * 0.92;
      const tw = w * (1 - k * 0.78);
      const th = h * 0.34 * (1 - k * 0.35);
      s += `<path d="M${f(x - tw / 2)} ${f(ty)} L${f(x)} ${f(ty - th)} L${f(x + tw / 2)} ${f(ty)} Z" fill="${i % 2 ? c1 : c2}"/>`;
      if (snow) {
        s +=
          `<path d="M${f(x - tw * 0.32)} ${f(ty - th * 0.36)} L${f(x)} ${f(ty - th)} L${f(x + tw * 0.32)} ${f(ty - th * 0.36)} ` +
          `Q${f(x + tw * 0.16)} ${f(ty - th * 0.52)} ${f(x + tw * 0.05)} ${f(ty - th * 0.38)} ` +
          `Q${f(x - tw * 0.12)} ${f(ty - th * 0.54)} ${f(x - tw * 0.32)} ${f(ty - th * 0.36)}Z" fill="#dfe7f7" opacity="${snow}"/>`;
      }
    }
    return s;
  }

  function gift(x, y, w, h, c, rc) {
    return (
      `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" rx="3" fill="${c}"/>` +
      `<rect x="${f(x + w / 2 - w * 0.08)}" y="${y - h}" width="${f(w * 0.16)}" height="${h}" fill="${rc}"/>` +
      `<rect x="${x}" y="${f(y - h * 0.58)}" width="${w}" height="${f(h * 0.14)}" fill="${rc}"/>` +
      `<path d="M${f(x + w / 2)} ${y - h} q${-w * 0.3} ${-h * 0.36} ${-w * 0.34} ${-h * 0.06} q${w * 0.1} ${h * 0.1} ${w * 0.34} ${h * 0.06} ` +
      `q${w * 0.3} ${-h * 0.36} ${w * 0.34} ${-h * 0.06} q${-w * 0.1} ${h * 0.1} ${-w * 0.34} ${h * 0.06}z" fill="${rc}"/>`
    );
  }

  function candle(x, y, h, w = 12) {
    return (
      `<rect x="${f(x - w / 2)}" y="${y - h}" width="${w}" height="${h}" rx="2" fill="#f4ead6"/>` +
      `<g class="tw" data-p="${((x * 0.37) % 1).toFixed(3)}"><circle cx="${x}" cy="${y - h - 10}" r="34" fill="url(#gWarm)"/>` +
      `<path d="M${x} ${y - h - 22} q7 12 0 20 q-7 -8 0 -20z" fill="#ffd27a"/></g>`
    );
  }

  // Ventana interior: se ve la noche nevada.
  function nightWin(x, y, w, h, seed) {
    const r = rng(seed);
    let s =
      `<rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="4" fill="#4a2c17"/>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#winNight)"/>`;
    for (let i = 0; i < 4; i++) {
      const px = x + w * (0.12 + i * 0.26) + r() * 10;
      const ph = h * (0.35 + r() * 0.3);
      s += `<path d="M${f(px - ph * 0.22)} ${y + h} L${f(px)} ${f(y + h - ph)} L${f(px + ph * 0.22)} ${y + h}Z" fill="#0b1829"/>`;
    }
    s += `<path d="M${x} ${y + h} v-14 q${f(w * 0.25)} -14 ${f(w * 0.5)} -4 t${f(w * 0.5)} -4 v22z" fill="#dfe7f6"/>`;
    for (let i = 0; i < 14; i++) {
      s += `<circle cx="${f(x + 4 + r() * (w - 8))}" cy="${f(y + 4 + r() * h * 0.8)}" r="${f(1.5 + r() * 2)}" fill="#fff" opacity="${f(0.5 + r() * 0.4)}"/>`;
    }
    s +=
      `<rect x="${f(x + w / 2 - 4)}" y="${y}" width="8" height="${h}" fill="#4a2c17"/>` +
      `<rect x="${x}" y="${f(y + h * 0.45 - 4)}" width="${w}" height="8" fill="#4a2c17"/>` +
      `<rect x="${x - 24}" y="${y + h + 10}" width="${w + 48}" height="12" rx="3" fill="#5a371d"/>`;
    return s;
  }

  // Cono de luz hacia abajo desde (x, y).
  function cone(x, y, topW, botW, h, op = 0.5) {
    return `<path d="M${f(x - topW / 2)} ${y} h${topW} l${f((botW - topW) / 2)} ${h} h${-botW}z" fill="url(#coneWarm)" opacity="${op}"/>`;
  }

  /* ---------- productos del catálogo de Clamy ---------- */

  // Arbolito de Navidad LED (id 52): ramas finas cubiertas de LED cálidos.
  function arbolito(x, y, h, seed) {
    const r = rng(seed);
    let s =
      `<circle cx="${x}" cy="${f(y - h * 0.5)}" r="${f(h * 0.66)}" fill="url(#gWarmSoft)"/>` +
      `<ellipse cx="${x}" cy="${y - 5}" rx="${f(h * 0.11)}" ry="${f(h * 0.018 + 4)}" fill="#6d4324"/>` +
      `<rect x="${x - 2.5}" y="${y - h}" width="5" height="${h}" fill="#8a5527"/>`;
    const n = Math.round(h / 19);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const by = y - h * 0.13 - t * h * 0.8;
      const len = h * 0.3 * (1 - t * 0.82) + 8;
      for (const sgn of [-1, 1]) {
        const ex = x + sgn * len * (0.72 + r() * 0.28);
        const ey = by - len * (0.7 + r() * 0.35);
        s += `<path d="M${x} ${f(by)} L${f(ex)} ${f(ey)}" stroke="#b9772f" stroke-width="2"/>`;
        const m = Math.max(2, Math.round(len / 12));
        for (let k = 1; k <= m; k++) {
          const u = k / m;
          s += `<circle class="tw" data-p="${r().toFixed(3)}" cx="${f(x + (ex - x) * u)}" cy="${f(by + (ey - by) * u)}" r="${f(2.6 + r() * 1.3)}" fill="#ffe9ad"/>`;
        }
      }
    }
    s += `<circle class="tw" data-p=".5" cx="${x}" cy="${y - h}" r="4" fill="#fff3cf"/>`;
    return s;
  }

  // Jabalina solar RGB (id 34). El color del halo lo cambia spot.js.
  function stake(x, y, k, i) {
    const h = 70 * k;
    const w = 46 * k;
    return (
      `<circle cx="${x}" cy="${f(y - h * 0.72)}" r="${f(120 * k)}" fill="url(#rgbGlow${i})"/>` +
      `<rect x="${f(x - 3 * k)}" y="${f(y - h)}" width="${f(6 * k)}" height="${f(h)}" fill="#131316"/>` +
      `<path d="M${f(x - w / 2)} ${f(y - h - 4 * k)} h${f(w)} l${f(-w * 0.2)} ${f(16 * k)} h${f(-w * 0.6)}z" fill="#f6f9ff" class="rgbHead" data-i="${i}"/>` +
      `<rect x="${f(x - w / 2 - 2 * k)}" y="${f(y - h - 12 * k)}" width="${f(w + 4 * k)}" height="${f(9 * k)}" rx="${f(4 * k)}" fill="#1b1b20"/>`
    );
  }

  // Reloj con engranajes que giran (id 36).
  function gearClock(x, y, r) {
    const gear = (gx, gy, gr, id) =>
      `<g class="gear" data-dir="${id % 2 ? -1 : 1}" data-r="${gr}" transform="rotate(0 ${gx} ${gy})" data-cx="${gx}" data-cy="${gy}">` +
      `<circle cx="${gx}" cy="${gy}" r="${gr}" fill="none" stroke="#c9ccd2" stroke-width="${f(gr * 0.34)}" stroke-dasharray="${f(gr * 0.3)} ${f(gr * 0.224)}"/>` +
      `<circle cx="${gx}" cy="${gy}" r="${f(gr * 0.8)}" fill="#aab0b8"/>` +
      `<circle cx="${gx}" cy="${gy}" r="${f(gr * 0.5)}" fill="#1b1b1f"/>` +
      `<path d="M${gx - gr * 0.8} ${gy} h${gr * 1.6} M${gx} ${gy - gr * 0.8} v${gr * 1.6}" stroke="#aab0b8" stroke-width="${f(gr * 0.16)}"/>` +
      `<circle cx="${gx}" cy="${gy}" r="${f(gr * 0.17)}" fill="#e6e8ec"/></g>`;
    let s =
      `<circle cx="${x}" cy="${y}" r="${r}" fill="#101013"/>` +
      `<circle cx="${x}" cy="${y}" r="${f(r * 0.86)}" fill="#1f1f24"/>`;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      s += `<path d="M${f(x + Math.cos(a) * r * 0.7)} ${f(y + Math.sin(a) * r * 0.7)} L${f(x + Math.cos(a) * r * 0.82)} ${f(y + Math.sin(a) * r * 0.82)}" stroke="#d9dce2" stroke-width="${i % 3 ? 2 : 4.5}"/>`;
    }
    s += gear(x - r * 0.2, y - r * 0.12, r * 0.3, 0);
    s += gear(x + r * 0.26, y + r * 0.06, r * 0.22, 1);
    s += gear(x - r * 0.02, y + r * 0.36, r * 0.19, 2);
    s += gear(x + r * 0.1, y - r * 0.42, r * 0.14, 3);
    s +=
      `<path d="M${x} ${y} L${f(x + r * 0.34)} ${f(y - r * 0.3)}" stroke="#f2f2f3" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M${x} ${y} L${f(x - r * 0.1)} ${f(y - r * 0.6)}" stroke="#f2f2f3" stroke-width="3.5" stroke-linecap="round"/>` +
      `<circle cx="${x}" cy="${y}" r="5" fill="#f2f2f3"/>`;
    return s;
  }

  // Lámpara de pie 3 luces negra y madera (id 51).
  function floorLamp3(x, y) {
    const head = (hx, hy, dir) => {
      const ang = dir * 32;
      return (
        `<g transform="rotate(${ang} ${hx} ${hy})">` +
        cone(hx, hy + 30, 26, 190, 250, 0.42) +
        `<rect x="${hx - 15}" y="${hy - 32}" width="30" height="62" rx="4" fill="#141416"/>` +
        `<rect x="${hx - 15}" y="${hy - 32}" width="30" height="15" rx="4" fill="#b98248"/>` +
        `<ellipse cx="${hx}" cy="${hy + 30}" rx="13" ry="4" fill="#fff0c2"/></g>`
      );
    };
    return (
      head(x - 34, y - 420, 1) +
      head(x + 34, y - 350, -1) +
      head(x - 34, y - 280, 1) +
      `<path d="M${x} ${y - 430} h-24 M${x} ${y - 360} h24 M${x} ${y - 290} h-24" stroke="#141416" stroke-width="6"/>` +
      `<rect x="${x - 3.5}" y="${y - 450}" width="7" height="450" fill="#141416"/>` +
      `<ellipse cx="${x}" cy="${y - 3}" rx="42" ry="7" fill="#141416"/>`
    );
  }

  // Lámpara de pie blanca LED, en espiral (id 42).
  function spiralLamp(x, y) {
    const top = y - 420;
    const pts = (ph) => {
      let d = '';
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const yy = y - 14 - t * (y - 14 - top);
        const amp = 26 * (1 - t * 0.35);
        const xx = x + Math.sin(t * Math.PI * 3.2 + ph) * amp;
        d += (i ? 'L' : 'M') + f(xx) + ' ' + f(yy) + ' ';
      }
      return d;
    };
    return (
      `<ellipse class="tw slow" data-p=".2" cx="${x}" cy="${y - 230}" rx="230" ry="300" fill="url(#gWarmSoft)"/>` +
      `<path d="${pts(0)}" fill="none" stroke="#fff2c9" stroke-width="16" stroke-linecap="round" opacity=".35"/>` +
      `<path d="${pts(Math.PI)}" fill="none" stroke="#fff2c9" stroke-width="16" stroke-linecap="round" opacity=".35"/>` +
      `<path d="${pts(0)}" fill="none" stroke="#fffdf4" stroke-width="8" stroke-linecap="round"/>` +
      `<path d="${pts(Math.PI)}" fill="none" stroke="#fffdf4" stroke-width="8" stroke-linecap="round"/>` +
      `<ellipse cx="${x}" cy="${y - 5}" rx="38" ry="8" fill="#f5f1e6"/>`
    );
  }

  // Aplique de pared negro LED (id 43): cinta negra en espiral con LED.
  function wallSconce(x, y) {
    const d = `M${x + 26} ${y - 62} C${x - 60} ${y - 52} ${x + 62} ${y - 16} ${x} ${y} C${x - 62} ${y + 16} ${x + 60} ${y + 52} ${x - 26} ${y + 62}`;
    return (
      `<ellipse class="tw slow" data-p=".6" cx="${x}" cy="${y}" rx="170" ry="190" fill="url(#gWarmSoft)"/>` +
      `<circle cx="${x + 34}" cy="${y}" r="15" fill="#3b3b40"/>` +
      `<path d="M${x} ${y} h34" stroke="#141416" stroke-width="7"/>` +
      `<path d="${d}" fill="none" stroke="#fff3cc" stroke-width="20" stroke-linecap="round" opacity=".5"/>` +
      `<path d="${d}" fill="none" stroke="#141416" stroke-width="13" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="#fffbe8" stroke-width="5" stroke-linecap="round" transform="translate(-5 0)"/>`
    );
  }

  // Colgante fibras naturales (id 38).
  function fiberPendant(x, top, drop) {
    const y = top + drop;
    const w = 164;
    const h = 92;
    let s =
      cone(x, y + h, 130, 420, 300, 0.36) +
      `<circle cx="${x}" cy="${y + h}" r="120" fill="url(#gWarm)"/>` +
      `<rect x="${x - 1.5}" y="${top}" width="3" height="${drop}" fill="#141416"/>` +
      `<rect x="${x - 9}" y="${y - 12}" width="18" height="16" rx="3" fill="#141416"/>` +
      `<path d="M${x - w / 2} ${y + h} A${w / 2} ${h} 0 0 1 ${x + w / 2} ${y + h}Z" fill="#c8914d"/>`;
    for (let i = 1; i <= 3; i++) {
      const k = i / 4;
      s += `<path d="M${f(x - (w / 2) * Math.sqrt(1 - k * k))} ${f(y + h - h * k)} H${f(x + (w / 2) * Math.sqrt(1 - k * k))}" stroke="#8f5f2a" stroke-width="3" opacity=".7"/>`;
    }
    for (let i = -6; i <= 6; i++) {
      const bx = x + (i / 6.5) * (w / 2);
      s += `<path d="M${f(bx)} ${y + h} Q${f(x + (bx - x) * 0.6)} ${f(y + h * 0.4)} ${x} ${y}" fill="none" stroke="${i % 2 ? '#e2b377' : '#8f5f2a'}" stroke-width="2.4" opacity=".75"/>`;
    }
    s +=
      `<path d="M${x - w / 2} ${y + h} h${w}" stroke="#f1c98c" stroke-width="5" stroke-linecap="round"/>` +
      `<ellipse cx="${x}" cy="${y + h}" rx="${w / 2 - 14}" ry="6" fill="#fff0c2"/>`;
    return s;
  }

  // Lamparita negra con filamento (id 41): jaula negra y filamento en S.
  function cagePendant(x, top, drop) {
    const y = top + drop;
    let s =
      `<circle class="tw slow" data-p=".1" cx="${x}" cy="${y + 62}" r="150" fill="url(#gWarm)"/>` +
      `<rect x="${x - 1.5}" y="${top}" width="3" height="${drop}" fill="#141416"/>` +
      `<rect x="${x - 10}" y="${y - 10}" width="20" height="18" rx="3" fill="#141416"/>` +
      `<rect x="${x - 32}" y="${y + 6}" width="64" height="120" rx="30" fill="#ffd98a" opacity=".22"/>` +
      `<path d="M${x} ${y + 30} q22 14 0 30 q-22 16 0 32 q14 8 0 14" fill="none" stroke="#fff3c4" stroke-width="5" stroke-linecap="round"/>`;
    for (let i = -3; i <= 3; i++) {
      s += `<path d="M${x + i * 5} ${y + 6} Q${x + i * 13} ${y + 66} ${x + i * 5} ${y + 126}" fill="none" stroke="#141416" stroke-width="2.2"/>`;
    }
    for (let i = 1; i < 6; i++) {
      s += `<path d="M${x - 31} ${y + 6 + i * 20} h62" stroke="#141416" stroke-width="1.6" opacity=".8"/>`;
    }
    s += `<rect x="${x - 32}" y="${y + 6}" width="64" height="120" rx="30" fill="none" stroke="#141416" stroke-width="4"/>`;
    return s;
  }

  // Barral 4 luces negras AR111 (id 45).
  function trackLight(x, y, w) {
    let s = '';
    for (let i = 0; i < 4; i++) {
      const sx = x + 34 + (i * (w - 68)) / 3;
      const tilt = [-14, -5, 5, 14][i];
      s +=
        `<g transform="rotate(${tilt} ${sx} ${y + 8})">` +
        `<circle cx="${sx}" cy="${y + 70}" r="46" fill="url(#gWarm)" opacity=".8"/>` +
        `<rect x="${sx - 2.5}" y="${y + 6}" width="5" height="22" fill="#141416"/>` +
        `<rect x="${sx - 25}" y="${y + 24}" width="50" height="40" rx="9" fill="#141416"/>` +
        `<ellipse cx="${sx}" cy="${y + 63}" rx="20" ry="5" fill="#fff0c2"/></g>`;
    }
    s += `<rect x="${x}" y="${y}" width="${w}" height="10" rx="3" fill="#141416"/>`;
    return s;
  }

  // Set 2 dispensers con bandeja madera (id 47).
  function dispensers(x, y) {
    const bottle = (bx) =>
      `<rect x="${bx - 15}" y="${y - 70}" width="30" height="62" rx="6" fill="#141416"/>` +
      `<path d="M${bx - 9} ${y - 44} h18 M${bx - 9} ${y - 36} h12" stroke="#f2f2f3" stroke-width="2.4"/>` +
      `<rect x="${bx - 8}" y="${y - 80}" width="16" height="11" rx="2" fill="#c8914d"/>` +
      `<path d="M${bx} ${y - 80} v-12 h13 v5" fill="none" stroke="#141416" stroke-width="4" stroke-linejoin="round"/>`;
    return bottle(x - 19) + bottle(x + 19) + `<rect x="${x - 44}" y="${y - 9}" width="88" height="9" rx="4" fill="#c8914d"/>`;
  }

  // Velador honguito (ids 49 y 50).
  function mushroomLamp(x, y, col) {
    return (
      `<circle class="tw slow" data-p="${col === '#1b1b1d' ? '.3' : '.8'}" cx="${x}" cy="${y - 44}" r="130" fill="url(#gWarm)"/>` +
      `<ellipse cx="${x}" cy="${y - 50}" rx="30" ry="7" fill="#fff0c2"/>` +
      `<path d="M${x - 19} ${y} L${x - 7} ${y - 52} h14 L${x + 19} ${y}z" fill="${col}"/>` +
      `<path d="M${x - 40} ${y - 50} A40 34 0 0 1 ${x + 40} ${y - 50}z" fill="${col}"/>`
    );
  }

  // Espejo LED con luz recargable USB (id 44).
  function ledMirror(x, y) {
    return (
      `<circle class="tw slow" data-p=".45" cx="${x}" cy="${y - 62}" r="130" fill="url(#gWhite)"/>` +
      `<path d="M${x - 16} ${y} l5 -20 h22 l5 20z" fill="#f3efe8"/>` +
      `<rect x="${x - 36}" y="${y - 108}" width="72" height="90" rx="13" fill="#fffdf6"/>` +
      `<rect x="${x - 26}" y="${y - 98}" width="52" height="70" rx="7" fill="url(#mirror)"/>` +
      `<path d="M${x - 18} ${y - 44} l24 -44" stroke="#fff" stroke-width="5" opacity=".45" stroke-linecap="round"/>`
    );
  }

  /* ---------- decorado ---------- */

  function xmasTree(x, y, h, seed) {
    const r = rng(seed);
    const w = h * 0.56;
    let s =
      `<ellipse cx="${x}" cy="${f(y - h * 0.45)}" rx="${f(w * 0.95)}" ry="${f(h * 0.62)}" fill="url(#gWarmSoft)"/>` +
      `<rect x="${x - 13}" y="${f(y - h * 0.12)}" width="26" height="${f(h * 0.12)}" fill="#4a2c17"/>` +
      `<path d="M${x - 50} ${f(y - h * 0.075)} h100 l-12 ${f(h * 0.075)} h-76z" fill="url(#plaid)"/>`;
    const tiers = 5;
    const cols = ['#17502f', '#1c5a36', '#1f6a3f', '#1c5a36', '#227346'];
    const edges = [];
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers;
      const by = y - h * 0.1 - h * 0.86 * t * 0.9;
      const tw = w * (1 - t * 0.72);
      const th = h * 0.33 * (1 - t * 0.3);
      const k = 5;
      let d = `M${f(x)} ${f(by - th)} L${f(x - tw / 2)} ${f(by)} `;
      for (let j = 0; j < k; j++) {
        const xa = x - tw / 2 + (tw * (j + 0.5)) / k;
        const xb = x - tw / 2 + (tw * (j + 1)) / k;
        d += `Q${f(xa)} ${f(by + th * 0.13)} ${f(xb)} ${f(by)} `;
      }
      s += `<path d="${d}Z" fill="${cols[i]}"/>`;
      s += `<path d="M${f(x)} ${f(by - th)} L${f(x - tw * 0.22)} ${f(by - th * 0.2)} L${f(x + tw * 0.08)} ${f(by - th * 0.26)}Z" fill="#2f8a56" opacity=".3"/>`;
      edges.push([by, tw, th]);
    }
    // tiras de luces y adornos
    edges.forEach(([by, tw, th], i) => {
      const yy = by - th * 0.22;
      const half = tw * 0.36;
      const n = 6 - i;
      const cx = x;
      const cy = yy + 22;
      s += `<path d="M${f(x - half)} ${f(yy - 10)} Q${cx} ${f(cy + 12)} ${f(x + half)} ${f(yy - 10)}" fill="none" stroke="#0f3a22" stroke-width="2"/>`;
      for (let j = 0; j < n; j++) {
        const [px, py] = qpt(x - half, yy - 10, cx, cy + 12, x + half, yy - 10, (j + 0.5) / n);
        s += bulb(px, py, 4.6, ['w', 'a', 'w', 'r'][(j + i) % 4], 4);
      }
      for (let j = 0; j < Math.max(1, 3 - (i >> 1)); j++) {
        const ox = x + (r() - 0.5) * tw * 0.5;
        const oy = by - th * (0.38 + r() * 0.22);
        const oc = ['#d8342a', '#f0b243', '#f4ead6'][(j + i) % 3];
        s += `<circle cx="${f(ox)}" cy="${f(oy)}" r="9" fill="${oc}"/><circle cx="${f(ox - 3)}" cy="${f(oy - 3)}" r="2.6" fill="#fff" opacity=".7"/>`;
      }
    });
    const ty = y - h - 8;
    let star = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? 11 : 27;
      star += (i ? 'L' : 'M') + f(x + Math.cos(a) * rr) + ' ' + f(ty + Math.sin(a) * rr) + ' ';
    }
    s += `<g class="tw slow" data-p=".7"><circle cx="${x}" cy="${ty}" r="90" fill="url(#gWarm)"/></g><path d="${star}Z" fill="#ffd257"/>`;
    return s;
  }

  function stocking(x, y, c) {
    return (
      `<path d="M${x - 12} ${y} h24 v46 q0 8 10 12 q16 8 10 18 q-4 8 -22 6 q-22 -2 -22 -22z" fill="${c}"/>` +
      `<rect x="${x - 15}" y="${y - 4}" width="30" height="16" rx="5" fill="#f6efe2"/>`
    );
  }

  function sofa(x, y, w) {
    return (
      `<rect x="${x + 12}" y="${y - 250}" width="${w - 24}" height="170" rx="22" fill="#d8c9b0"/>` +
      `<rect x="${x + 26}" y="${y - 236}" width="${(w - 60) / 2}" height="120" rx="16" fill="#e9dcc6"/>` +
      `<rect x="${x + 34 + (w - 60) / 2}" y="${y - 236}" width="${(w - 60) / 2}" height="120" rx="16" fill="#e9dcc6"/>` +
      `<rect x="${x + 8}" y="${y - 140}" width="${w - 16}" height="70" rx="14" fill="#efe3cf"/>` +
      `<rect x="${x - 12}" y="${y - 186}" width="44" height="150" rx="18" fill="#dccdb4"/>` +
      `<rect x="${x + w - 32}" y="${y - 186}" width="44" height="150" rx="18" fill="#dccdb4"/>` +
      `<rect x="${x + 44}" y="${y - 208}" width="74" height="70" rx="12" fill="url(#plaid)" transform="rotate(-8 ${x + 80} ${y - 170})"/>` +
      `<rect x="${x + w - 120}" y="${y - 204}" width="70" height="66" rx="12" fill="#1f5d3a" transform="rotate(7 ${x + w - 85} ${y - 170})"/>` +
      `<rect x="${x + 6}" y="${y - 40}" width="12" height="30" fill="#4a2c17"/><rect x="${x + w - 18}" y="${y - 40}" width="12" height="30" fill="#4a2c17"/>`
    );
  }

  function chairBack(x, y) {
    return (
      `<rect x="${x - 40}" y="${y - 300}" width="80" height="120" rx="12" fill="#5a371d"/>` +
      `<rect x="${x - 29}" y="${y - 289}" width="58" height="92" rx="9" fill="#c9b596"/>`
    );
  }

  function chairSide(x, y, dir) {
    const d = dir;
    return (
      `<path d="M${x - d * 34} ${y - 300} q${d * 6} 90 ${d * 4} 176" fill="none" stroke="#5a371d" stroke-width="13" stroke-linecap="round"/>` +
      `<rect x="${Math.min(x - d * 34, x + d * 44)}" y="${y - 136}" width="78" height="20" rx="9" fill="#e9dcc6"/>` +
      `<rect x="${Math.min(x - d * 36, x + d * 46)}" y="${y - 120}" width="82" height="11" rx="3" fill="#5a371d"/>` +
      `<path d="M${x - d * 30} ${y - 112} l${-d * 4} 102 M${x + d * 40} ${y - 112} l${d * 4} 102" stroke="#5a371d" stroke-width="10" stroke-linecap="round"/>`
    );
  }

  /* ---------- interior en corte ---------- */

  function interior() {
    let s = '';
    const HI = '#e0b07a';
    const LN = '#8f5f33';

    // Altillo: pared del fondo bajo las aguas del techo.
    s +=
      `<clipPath id="clipLoft"><polygon points="${P([[700, -730], [700, -1083], [1200, -1365], [1700, -1083], [1700, -730]])}"/></clipPath>` +
      `<g clip-path="url(#clipLoft)">${logs(700, -1380, 1000, 650, 58, INT_LOGS, LN, HI, 7)}` +
      `<rect x="700" y="-1380" width="1000" height="650" fill="url(#roomShade)"/></g>`;
    // cabios
    s += `<path d="M690 -1078 L1200 -1366 L1710 -1078" fill="none" stroke="#4a2c17" stroke-width="20" stroke-linejoin="miter"/>`;
    s += `<rect x="690" y="-1090" width="16" height="360" fill="#4a2c17"/><rect x="1694" y="-1090" width="16" height="360" fill="#4a2c17"/>`;
    // ventana redonda
    s +=
      `<circle cx="1200" cy="-1190" r="88" fill="#4a2c17"/><circle cx="1200" cy="-1190" r="74" fill="url(#winNight)"/>` +
      `<path d="M1126 -1190 h148 M1200 -1264 v148" stroke="#4a2c17" stroke-width="8"/>` +
      `<path d="M1136 -1152 q64 -22 128 0 a74 74 0 0 1 -128 0z" fill="#dfe7f6"/>`;
    for (let i = 0; i < 8; i++) s += `<circle cx="${1150 + ((i * 37) % 100)}" cy="${-1250 + ((i * 53) % 90)}" r="2.4" fill="#fff" opacity=".7"/>`;
    // guirnaldas sobre los cabios
    s += swag(730, -1070, 960, -1200, 22, 6, 12) + swag(960, -1200, 1190, -1330, 22, 6, 12);
    s += swag(1210, -1330, 1440, -1200, 22, 6, 12) + swag(1440, -1200, 1670, -1070, 22, 6, 12);
    // alfombra, cama
    s += `<rect x="930" y="-748" width="540" height="12" rx="6" fill="url(#plaid)"/>`;
    s +=
      `<rect x="1004" y="-1050" width="392" height="290" rx="18" fill="#6d4324"/>` +
      `<rect x="1022" y="-1034" width="356" height="120" rx="12" fill="#7d5030"/>` +
      `<rect x="1030" y="-950" width="160" height="78" rx="22" fill="#fbf6ea"/><rect x="1210" y="-950" width="160" height="78" rx="22" fill="#fbf6ea"/>` +
      `<rect x="1090" y="-930" width="110" height="64" rx="18" fill="url(#plaid)"/>` +
      `<rect x="996" y="-888" width="408" height="124" rx="20" fill="#f1e7d3"/>` +
      `<rect x="996" y="-836" width="408" height="72" rx="14" fill="url(#plaid)"/>` +
      `<rect x="996" y="-776" width="408" height="26" rx="6" fill="#6d4324"/>` +
      `<rect x="1004" y="-752" width="16" height="20" fill="#4a2c17"/><rect x="1380" y="-752" width="16" height="20" fill="#4a2c17"/>`;
    // mesas de luz y veladores honguito
    const nightTable = (x) =>
      `<rect x="${x - 56}" y="-860" width="112" height="118" rx="6" fill="#7d5030"/>` +
      `<rect x="${x - 46}" y="-846" width="92" height="40" rx="4" fill="#8f5f38"/><rect x="${x - 46}" y="-798" width="92" height="40" rx="4" fill="#8f5f38"/>` +
      `<circle cx="${x}" cy="-826" r="4" fill="#3a2314"/><circle cx="${x}" cy="-778" r="4" fill="#3a2314"/>` +
      `<rect x="${x - 50}" y="-744" width="10" height="12" fill="#4a2c17"/><rect x="${x + 40}" y="-744" width="10" height="12" fill="#4a2c17"/>`;
    s += nightTable(935) + mushroomLamp(935, -860, '#1b1b1d');
    s += nightTable(1465) + mushroomLamp(1465, -860, '#efe6d2');
    // cómoda con espejo LED
    s +=
      `<rect x="1540" y="-910" width="140" height="170" rx="6" fill="#7d5030"/>` +
      [0, 1, 2].map((i) => `<rect x="1550" y="${-900 + i * 52}" width="120" height="44" rx="4" fill="#8f5f38"/><rect x="1598" y="${-882 + i * 52}" width="24" height="5" rx="2" fill="#3a2314"/>`).join('') +
      `<rect x="1546" y="-742" width="10" height="12" fill="#4a2c17"/><rect x="1664" y="-742" width="10" height="12" fill="#4a2c17"/>`;
    s += ledMirror(1622, -910);
    s += `<rect x="1556" y="-934" width="34" height="24" rx="4" fill="#a3231c"/><rect x="1570" y="-934" width="6" height="24" fill="#f0b243"/>`;
    // rincón izquierdo: arbolito LED chico y regalos
    s += arbolito(800, -732, 250, 91) + gift(838, -732, 54, 44, '#1f5d3a', '#f0b243') + gift(740, -732, 40, 34, '#a3231c', '#f6efe2');

    // Planta baja: pared, piso y cielorraso.
    s += logs(0, -700, 2400, 668, 58, INT_LOGS, LN, HI, 11);
    s += `<rect x="0" y="-700" width="2400" height="668" fill="url(#roomShade)"/>`;
    s += `<rect x="0" y="-36" width="2400" height="36" fill="#8a5a34"/>`;
    for (let i = 0; i < 24; i++) s += `<path d="M${i * 104 + 30} -36 l-22 36" stroke="#6d4324" stroke-width="2.5" opacity=".7"/>`;
    s += `<rect x="0" y="-38" width="2400" height="6" fill="#5a371d"/>`;

    /* --- LIVING --- */
    // hogar a leña
    s += stones(96, -700, 228, 400, 21);
    s += stones(60, -292, 300, 282, 22);
    s +=
      `<path d="M128 -10 v-150 a82 60 0 0 1 164 0 v150z" fill="#160d08"/>` +
      `<circle class="tw slow" data-p=".15" cx="210" cy="-90" r="250" fill="url(#gFire)"/>` +
      `<path d="M150 -22 l120 -14 M156 -40 l110 16" stroke="#3a2314" stroke-width="16" stroke-linecap="round"/>` +
      `<g id="flames">` +
      `<path class="flame" data-p="0" d="M176 -30 q-22 -40 8 -78 q4 26 22 34 q-8 -34 10 -62 q30 40 22 76 q10 -10 10 -28 q22 34 -2 58z" fill="#ff8a2a"/>` +
      `<path class="flame" data-p=".5" d="M192 -30 q-10 -28 10 -52 q4 18 14 24 q-2 -22 8 -36 q18 30 6 64z" fill="#ffd257"/>` +
      `</g>` +
      `<rect x="40" y="-16" width="340" height="12" rx="4" fill="#57504a"/>` +
      `<rect x="44" y="-312" width="332" height="22" rx="4" fill="#5a371d"/>` +
      `<rect x="44" y="-294" width="332" height="5" fill="#3a2314"/>`;
    s += swag(60, -318, 210, -318, 14, 5, 15) + swag(210, -318, 360, -318, 14, 5, 15);
    s += stocking(112, -288, '#b3261e') + stocking(178, -288, '#1f5d3a') + stocking(244, -288, '#b3261e') + stocking(310, -288, '#1f5d3a');
    s += gearClock(210, -500, 84);
    s += `<path d="M196 -330 l28 0 -6 -16 6 -16 -28 0 6 16z" fill="#c3271f"/>`;
    // plafón de techo
    s += `<ellipse cx="720" cy="-640" rx="250" ry="120" fill="url(#gWarmSoft)"/><rect x="654" y="-676" width="132" height="20" rx="8" fill="#141416"/><rect x="662" y="-660" width="116" height="9" rx="4" fill="#fff0c2"/>`;
    // ventana, sillón, lámpara de pie 3 luces
    s += nightWin(476, -600, 190, 250, 31) + swag(456, -622, 686, -622, 18, 6, 12);
    s += `<rect x="410" y="-20" width="330" height="12" rx="6" fill="url(#plaid)"/>`;
    s += sofa(462, -10, 250);
    s += floorLamp3(420, -10);
    // árbol y regalos
    s += xmasTree(826, -10, 560, 5);
    s += gift(700, -10, 70, 58, '#a3231c', '#f0b243') + gift(760, -10, 52, 40, '#f4ead6', '#a3231c') + gift(876, -10, 64, 50, '#1f5d3a', '#f6efe2') + gift(930, -10, 40, 70, '#a3231c', '#f6efe2');
    s += spiralLamp(1010, -10);

    /* --- COMEDOR --- */
    s += wallSconce(1085, -470);
    s += wreath(1340, -400, 62);
    s += chairBack(1250, -10) + chairBack(1430, -10);
    s += fiberPendant(1240, -676, 96) + fiberPendant(1440, -676, 96);
    s +=
      `<rect x="1150" y="-200" width="380" height="18" rx="5" fill="#6d4324"/>` +
      `<rect x="1168" y="-184" width="344" height="16" fill="#5a371d"/>` +
      `<rect x="1172" y="-170" width="16" height="160" fill="#5a371d"/><rect x="1492" y="-170" width="16" height="160" fill="#5a371d"/>`;
    s +=
      `<ellipse cx="1340" cy="-204" rx="78" ry="10" fill="#17472c"/><ellipse cx="1340" cy="-206" rx="62" ry="6" fill="#2f7a4b"/>` +
      `<circle cx="1296" cy="-208" r="5" fill="#d8342a"/><circle cx="1384" cy="-208" r="5" fill="#d8342a"/>` +
      candle(1316, -206, 52) + candle(1340, -206, 76) + candle(1364, -206, 44);
    const plate = (x) =>
      `<ellipse cx="${x}" cy="-202" rx="36" ry="5" fill="#f6efe2"/><path d="M${x - 14} -204 l14 -16 l14 16z" fill="#a3231c"/>` +
      `<path d="M${x + 46} -202 v-34 M${x + 38} -250 q8 22 16 0z" fill="#dfeaf2" stroke="#dfeaf2" stroke-width="2.5" opacity=".8"/>`;
    s += plate(1210) + plate(1450);
    s += chairSide(1120, -10, 1) + chairSide(1560, -10, -1);
    // consola con flor de pascua bajo la lamparita con filamento
    s +=
      `<rect x="1606" y="-196" width="92" height="12" rx="3" fill="#5a371d"/>` +
      `<path d="M1614 -184 v174 M1690 -184 v174 M1614 -90 h76" stroke="#5a371d" stroke-width="8"/>` +
      `<path d="M1634 -196 h36 l-6 -34 h-24z" fill="#b98248"/>`;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      s += `<ellipse cx="${f(1652 + Math.cos(a) * 20)}" cy="${f(-250 + Math.sin(a) * 14)}" rx="20" ry="9" fill="${i % 2 ? '#c3271f' : '#a3201a'}" transform="rotate(${f((a * 180) / Math.PI)} ${f(1652 + Math.cos(a) * 20)} ${f(-250 + Math.sin(a) * 14)})"/>`;
    }
    s += `<circle cx="1652" cy="-250" r="6" fill="#f0b243"/>`;
    s += cagePendant(1652, -676, 190);
    // poste que separa la cocina
    s += `<rect x="1716" y="-676" width="26" height="676" fill="#7a4d2b"/><rect x="1716" y="-676" width="6" height="676" fill="#9a6a3e" opacity=".6"/>`;
    s += wreath(1729, -420, 30);

    /* --- COCINA --- */
    // azulejos
    s += `<rect x="1770" y="-430" width="520" height="200" fill="#efe9df"/>`;
    for (let i = 1; i < 5; i++) s += `<path d="M1770 ${-430 + i * 40} h520" stroke="#cfc6b6" stroke-width="2"/>`;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 9; j++) s += `<path d="M${1770 + j * 60 + (i % 2) * 30} ${-430 + i * 40} v40" stroke="#cfc6b6" stroke-width="2"/>`;
    // ventana sobre la bacha
    s += nightWin(2100, -600, 170, 220, 41) + swag(2080, -622, 2290, -622, 16, 5, 12);
    // alacenas con barra LED debajo
    s += `<rect x="1780" y="-640" width="290" height="216" rx="4" fill="#2c4a3a"/>`;
    for (let i = 0; i < 3; i++) {
      s += `<rect x="${1790 + i * 94}" y="-630" width="82" height="196" rx="3" fill="#355845"/><rect x="${1798 + i * 94}" y="-622" width="66" height="180" rx="2" fill="none" stroke="#284235" stroke-width="3"/><circle cx="${1860 + i * 94 - (i === 2 ? 56 : 0)}" cy="-470" r="5" fill="#d7b46a"/>`;
    }
    s += swag(1780, -648, 2070, -648, 12, 7, 11);
    s +=
      `<path d="M1794 -412 h262 l34 172 h-330z" fill="url(#coneWarm)" opacity=".62"/>` +
      `<rect x="1800" y="-424" width="250" height="9" rx="3" fill="#141416"/>` +
      `<rect x="1806" y="-416" width="238" height="4" rx="2" fill="#fff6d6"/>`;
    // bajo mesada, horno, mesada
    s += `<rect x="1770" y="-226" width="520" height="216" fill="#2c4a3a"/>`;
    for (let i = 0; i < 4; i++) {
      const dx = 1950 + i * 84;
      s += `<rect x="${dx}" y="-214" width="74" height="194" rx="3" fill="#355845"/><circle cx="${dx + 60}" cy="-190" r="5" fill="#d7b46a"/>`;
    }
    s +=
      `<rect x="1784" y="-214" width="156" height="194" rx="5" fill="#1b1b1f"/>` +
      `<rect x="1798" y="-170" width="128" height="120" rx="6" fill="#3a1c0c"/>` +
      `<rect class="tw slow" data-p=".9" x="1804" y="-164" width="116" height="108" rx="4" fill="url(#gFire)"/>` +
      `<rect x="1800" y="-196" width="124" height="8" rx="4" fill="#c9ccd2"/>` +
      `<path d="M1824 -100 h76" stroke="#8a8f98" stroke-width="2"/>` +
      [0, 1, 2].map((i) => `<circle cx="${1838 + i * 24}" cy="-108" r="8" fill="#c98a45"/>`).join('');
    s += `<rect x="1760" y="-240" width="540" height="16" rx="4" fill="#f3efe6"/><rect x="1760" y="-228" width="540" height="4" fill="#c9c2b4"/>`;
    // olla, casita de jengibre, dispensers, grifería
    s +=
      `<rect x="1826" y="-286" width="76" height="46" rx="8" fill="#b3261e"/><rect x="1818" y="-292" width="92" height="10" rx="5" fill="#8f1c16"/>` +
      `<circle cx="1864" cy="-297" r="6" fill="#1b1b1f"/><path d="M1818 -270 h-12 M1910 -270 h12" stroke="#8f1c16" stroke-width="7" stroke-linecap="round"/>` +
      `<g id="steam"><circle cx="1850" cy="-320" r="12" fill="#fff"/><circle cx="1872" cy="-340" r="14" fill="#fff"/><circle cx="1858" cy="-366" r="16" fill="#fff"/></g>`;
    s +=
      `<path d="M1972 -240 v-44 l34 -30 l34 30 v44z" fill="#a8672f"/>` +
      `<path d="M1964 -280 l42 -38 l42 38" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<rect x="1998" y="-266" width="16" height="26" rx="3" fill="#7a431a"/><circle cx="1986" cy="-270" r="4" fill="#d8342a"/><circle cx="2026" cy="-270" r="4" fill="#58e08a"/>`;
    s += dispensers(2130, -240);
    s += `<path d="M2222 -240 v-52 q0 -22 -24 -22 v14" fill="none" stroke="#d7b46a" stroke-width="7" stroke-linecap="round"/>`;
    // heladera
    s +=
      `<rect x="2298" y="-520" width="96" height="510" rx="14" fill="#e9e3d2"/>` +
      `<path d="M2298 -360 h96" stroke="#c4bca6" stroke-width="4"/>` +
      `<rect x="2308" y="-440" width="7" height="60" rx="3" fill="#aab0b8"/><rect x="2308" y="-340" width="7" height="90" rx="3" fill="#aab0b8"/>` +
      `<rect x="2340" y="-470" width="30" height="36" rx="3" fill="#a3231c"/><path d="M2345 -444 l10 -16 l10 16z" fill="#1f5d3a"/>`;
    // barral 4 luces
    s += trackLight(2040, -676, 280);

    // vigas del cielorraso y entrepiso
    s += `<rect x="0" y="-700" width="2400" height="26" fill="#4a2c17"/>`;
    for (let i = 0; i < 17; i++) s += `<rect x="${20 + i * 146}" y="-676" width="22" height="16" fill="#3a2314"/>`;
    s += `<rect x="0" y="-732" width="2400" height="34" fill="#3a2314"/><rect x="0" y="-732" width="2400" height="5" fill="#6d4324"/>`;
    return s;
  }

  /* ---------- fachada ---------- */

  function extWin(cx, cy, w, h, kind) {
    const x = cx - w / 2;
    const y = cy - h / 2;
    let s =
      `<ellipse cx="${cx}" cy="${cy}" rx="${f(w * 1.3)}" ry="${f(h * 1.15)}" fill="url(#gWarmSoft)"/>` +
      `<rect x="${x - 16}" y="${y - 16}" width="${w + 32}" height="${h + 32}" rx="4" fill="#2a180c"/>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#winWarm)"/>`;
    if (kind === 'tree') {
      s += `<path d="M${cx + 30} ${y + h} l-70 0 l44 -90 l-26 0 l40 -80 l-20 0 l32 -78 l32 78 l-20 0 l40 80 l-26 0 l44 90z" fill="#2c6b3f" opacity=".85"/>`;
      for (let i = 0; i < 9; i++) s += bulb(cx + 8 - 44 + ((i * 53) % 90), y + h - 30 - ((i * 71) % 190), 4, ['w', 'r', 'a'][i % 3], 3);
    }
    if (kind === 'lamp') {
      s += `<path d="M${cx - 40} ${y + 60} h80 l-16 -44 h-48z" fill="#8f5f2a" opacity=".8"/><rect x="${cx - 2}" y="${y}" width="4" height="18" fill="#2a180c"/>`;
    }
    s +=
      `<path d="M${x} ${y} h${f(w * 0.26)} q${f(-w * 0.04)} ${f(h * 0.5)} ${f(-w * 0.26)} ${f(h * 0.82)}z" fill="#a3231c" opacity=".8"/>` +
      `<path d="M${x + w} ${y} h${f(-w * 0.26)} q${f(w * 0.04)} ${f(h * 0.5)} ${f(w * 0.26)} ${f(h * 0.82)}z" fill="#a3231c" opacity=".8"/>` +
      `<rect x="${f(cx - 5)}" y="${y}" width="10" height="${h}" fill="#2a180c"/>` +
      `<rect x="${x}" y="${f(y + h * 0.42)}" width="${w}" height="10" fill="#2a180c"/>` +
      `<rect x="${x - 30}" y="${y + h + 12}" width="${w + 60}" height="14" rx="3" fill="#2a180c"/>` +
      `<path d="M${x - 34} ${y + h + 14} q${f((w + 68) / 2)} -36 ${w + 68} 0z" fill="#e6edfa"/>`;
    s += swag(x - 22, y - 26, x + w + 22, y - 26, 24, 7, 13);
    return s;
  }

  function facade() {
    let s = '';
    const sil = [[-40, 70], [-40, -700], [1200, -1400], [2440, -700], [2440, 70]];
    s += `<clipPath id="clipFacade"><polygon points="${P(sil)}"/></clipPath>`;
    s += `<g clip-path="url(#clipFacade)">${logs(-40, -1400, 2480, 1400, 50, EXT_LOGS, '#2f1c0f', '#8a5c36', 3)}</g>`;
    // testas de troncos en las esquinas
    for (let i = 0; i < 14; i++) {
      const y = -675 + i * 50;
      s += `<circle cx="-40" cy="${y}" r="26" fill="#7a4d2b"/><circle cx="-40" cy="${y}" r="15" fill="none" stroke="#54341d" stroke-width="3"/>`;
      s += `<circle cx="2440" cy="${y}" r="26" fill="#7a4d2b"/><circle cx="2440" cy="${y}" r="15" fill="none" stroke="#54341d" stroke-width="3"/>`;
    }
    s += stones(-66, 0, 2532, 72, 9, '#4f4a45');

    s += extWin(330, -360, 250, 290, 'tree') + extWin(760, -360, 250, 290, 'lamp');
    s += extWin(1640, -360, 250, 290, 'lamp') + extWin(2070, -360, 250, 290, '');
    // ventana del altillo, con arco
    s +=
      `<ellipse cx="1200" cy="-1040" rx="300" ry="270" fill="url(#gWarmSoft)"/>` +
      `<path d="M1064 -900 v-170 a136 136 0 0 1 272 0 v170z" fill="#2a180c"/>` +
      `<path d="M1080 -916 v-154 a120 120 0 0 1 240 0 v154z" fill="url(#winWarm)"/>` +
      `<path d="M1200 -1190 v274 M1080 -1040 h240" stroke="#2a180c" stroke-width="10"/>` +
      `<rect x="1050" y="-906" width="300" height="14" rx="3" fill="#2a180c"/><path d="M1046 -904 q154 -34 308 0z" fill="#e6edfa"/>`;
    s += wreath(1200, -1010, 46);
    // estrella en el hastial
    let star = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? 16 : 40;
      star += (i ? 'L' : 'M') + f(1200 + Math.cos(a) * rr) + ' ' + f(-1278 + Math.sin(a) * rr) + ' ';
    }
    s += `<g class="tw slow" data-p=".35"><circle cx="1200" cy="-1278" r="150" fill="url(#gWarm)"/></g><path d="${star}Z" fill="#ffd257"/>`;

    // porche
    s += `<rect x="930" y="-4" width="540" height="28" fill="#4a2c17"/><rect x="930" y="-4" width="540" height="7" fill="#6d4324"/>`;
    s += `<rect x="1030" y="24" width="340" height="24" fill="#3f2513"/><rect x="1000" y="48" width="400" height="24" fill="#352010"/>`;
    s += `<path d="M1030 26 q170 -12 340 0 v6 h-340z M1000 50 q200 -12 400 0 v6 h-400z" fill="#e6edfa"/>`;
    // puerta: detrás, la luz del interior
    s +=
      `<rect x="1078" y="-466" width="244" height="466" rx="4" fill="#2a180c"/>` +
      `<rect x="1100" y="-444" width="200" height="440" fill="url(#doorLight)"/>` +
      `<g id="door"><rect x="1100" y="-444" width="200" height="440" fill="#9a2420"/>` +
      `<rect x="1118" y="-424" width="72" height="150" rx="3" fill="none" stroke="#7a1a17" stroke-width="5"/><rect x="1210" y="-424" width="72" height="150" rx="3" fill="none" stroke="#7a1a17" stroke-width="5"/>` +
      `<rect x="1118" y="-180" width="72" height="150" rx="3" fill="none" stroke="#7a1a17" stroke-width="5"/><rect x="1210" y="-180" width="72" height="150" rx="3" fill="none" stroke="#7a1a17" stroke-width="5"/>` +
      `<circle cx="1280" cy="-212" r="9" fill="#e8c36a"/>` +
      wreath(1200, -330, 56) +
      `</g>`;
    // faroles
    const lantern = (x) =>
      `<circle class="tw slow" data-p="${x > 1200 ? '.2' : '.7'}" cx="${x}" cy="-350" r="150" fill="url(#gWarm)"/>` +
      `<path d="M${x - 16} -384 h32 l-6 -16 h-20z" fill="#141416"/><rect x="${x - 13}" y="-384" width="26" height="54" fill="#ffd98a"/>` +
      `<rect x="${x - 15}" y="-386" width="30" height="58" rx="2" fill="none" stroke="#141416" stroke-width="5"/><path d="M${x} -384 v54" stroke="#141416" stroke-width="3"/>`;
    s += lantern(1040) + lantern(1360);
    // postes y alero del porche
    s += `<rect x="938" y="-560" width="26" height="560" fill="#4a2c17"/><rect x="1436" y="-560" width="26" height="560" fill="#4a2c17"/>`;
    for (let i = 0; i < 9; i++) {
      s += `<path d="M936 ${-70 - i * 56} l30 -26" stroke="#2f7a4b" stroke-width="9" stroke-linecap="round"/><path d="M1434 ${-70 - i * 56} l30 -26" stroke="#2f7a4b" stroke-width="9" stroke-linecap="round"/>`;
      s += bulb(951, -112 - i * 56, 4, ['w', 'r'][i % 2], 3.4) + bulb(1449, -112 - i * 56, 4, ['r', 'w'][i % 2], 3.4);
    }
    s +=
      `<polygon points="${P([[910, -548], [1200, -716], [1490, -548]])}" fill="#54341d"/>` +
      `<polygon points="${P([[880, -548], [1200, -734], [1520, -548], [1520, -580], [1200, -766], [880, -580]])}" fill="#3a2314"/>` +
      `<path d="M872 -574 L1200 -764 L1528 -574 l4 -36 L1200 -806 L868 -610z" fill="#e6edfa"/>` +
      `<path d="M872 -574 q22 18 44 -22 q20 16 44 -24 q22 14 46 -26 q20 14 44 -24 q22 12 46 -28 q22 12 46 -26 q10 6 58 -34 L872 -610z" fill="#e6edfa"/>` +
      `<path d="M1528 -574 q-22 18 -44 -22 q-20 16 -44 -24 q-22 14 -46 -26 q-20 14 -44 -24 q-22 12 -46 -28 q-22 12 -46 -26 q-10 6 -58 -34 L1528 -610z" fill="#e6edfa"/>`;
    s += swag(964, -548, 1200, -548, 30, 8, 14) + swag(1200, -548, 1436, -548, 30, 8, 14);
    // arbolitos LED en el porche
    s += arbolito(1010, -4, 330, 61) + arbolito(1392, -4, 430, 62);
    return s;
  }

  // Techo: vuela 130 unidades, con nieve, luces y carámbanos.
  function roof() {
    let s = '';
    const under = (x) => roofY(x); // -1400 en la cumbrera
    const top = (x) => roofY(x) - 46;
    s += `<polygon points="${P([[-170, under(-170)], [1200, -1400], [2570, under(2570)], [2570, top(2570)], [1200, -1446], [-170, top(-170)]])}" fill="#3a2314"/>`;
    s += `<path d="M-170 ${f(under(-170) - 6)} L1200 -1406 L2570 ${f(under(2570) - 6)}" fill="none" stroke="#6d4324" stroke-width="6"/>`;
    // nieve
    let d = `M-196 ${f(top(-196) + 26)} Q-206 ${f(top(-196) - 50)} -150 ${f(top(-150) - 60)} `;
    d += `L1150 ${f(top(1150) - 62)} Q1200 ${f(-1446 - 92)} 1250 ${f(top(1250) - 62)} `;
    d += `L2550 ${f(top(2550) - 60)} Q2606 ${f(top(2596) - 50)} 2596 ${f(top(2596) + 26)} `;
    for (let x = 2560; x >= -170; x -= 46) {
      const yy = top(x) + 5 + 9 * Math.sin(x * 0.07) + 6 * Math.sin(x * 0.023 + 1);
      d += `L${x} ${f(yy)} `;
    }
    s += `<path d="${d}Z" fill="#e6edfa"/>`;
    s += `<path d="M-150 ${f(top(-150) - 60)} L1150 ${f(top(1150) - 62)} Q1200 ${f(-1446 - 92)} 1250 ${f(top(1250) - 62)} L2550 ${f(top(2550) - 60)}" fill="none" stroke="#fff" stroke-width="7" opacity=".7"/>`;
    // carámbanos
    for (let i = 0; i < 9; i++) {
      for (const [x0, sg] of [[-165, 1], [2565, -1]]) {
        const x = x0 + sg * i * 15;
        const y = under(x) + 2;
        s += `<path d="M${x - 5} ${f(y)} h10 l-5 ${18 + ((i * 37) % 30)}z" fill="#eaf2ff" opacity=".85"/>`;
      }
    }
    // luces del alero
    const cols = ['w', 'r', 'w', 'g', 'w', 'a'];
    for (let i = 0; i < 25; i++) {
      const xl = -140 + i * 54;
      const xr = 2540 - i * 54;
      s += bulb(xl, under(xl) + 14, 8.5, cols[i % cols.length], 3.6) + bulb(xr, under(xr) + 14, 8.5, cols[(i + 3) % cols.length], 3.6);
    }
    return s;
  }

  function chimney() {
    let s = stones(380, -1240, 124, 320, 15);
    s += `<rect x="368" y="-1258" width="148" height="22" rx="3" fill="#57504a"/><path d="M362 -1254 q80 -44 160 0z" fill="#e6edfa"/>`;
    let puffs = '';
    for (let i = 0; i < 7; i++) puffs += `<circle class="puff" data-i="${i}" cx="442" cy="-1280" r="30" fill="#c9d3ea"/>`;
    return `<g id="smoke">${puffs}</g>` + s;
  }

  // Corte de la casa: lo que queda a la vista cuando la fachada se desvanece.
  function shell() {
    let s = `<polygon points="${P([[-40, 70], [-40, -700], [1200, -1400], [2440, -700], [2440, 70]])}" fill="#1d110a"/>`;
    s += stones(-66, 0, 2532, 72, 9, '#4f4a45');
    for (let i = 0; i < 14; i++) {
      const y = -675 + i * 50;
      s += `<circle cx="-20" cy="${y}" r="24" fill="#7a4d2b"/><circle cx="2420" cy="${y}" r="24" fill="#7a4d2b"/>`;
    }
    return s;
  }

  /* ---------- paisaje ---------- */

  function ground() {
    let s = `<rect x="-9000" y="40" width="21000" height="9000" fill="url(#snow)"/>`;
    s += `<ellipse cx="200" cy="70" rx="1500" ry="90" fill="#cdd8ee"/><ellipse cx="2400" cy="80" rx="1700" ry="110" fill="#c5d1ea"/>`;
    // camino pisado hacia la puerta
    s += `<path d="M1010 72 L1390 72 L1760 1700 L640 1700Z" fill="#aab8d8" opacity=".55"/>`;
    // luz de las ventanas sobre la nieve
    for (const x of [330, 760, 1200, 1640, 2070]) s += `<ellipse cx="${x}" cy="150" rx="${x === 1200 ? 300 : 230}" ry="90" fill="url(#gWarmSoft)" opacity=".8"/>`;
    return s;
  }

  function backPines() {
    const a = '#12332f';
    const b = '#0c2523';
    let s = '';
    s += pine(-90, 60, 1500, a, b) + pine(2520, 60, 1420, a, b) + pine(820, 30, 1560, '#0e2a28', '#0a2020', 0.7) + pine(1690, 30, 1640, '#0e2a28', '#0a2020', 0.7);
    return s;
  }

  function sidePines() {
    const a = '#14393a';
    const b = '#0f2c2c';
    let s = '';
    const L = [[-760, 110, 1350], [-560, 130, 1050], [-360, 100, 1500], [-240, 160, 820]];
    const R = [[2640, 150, 900], [2790, 100, 1450], [2990, 130, 1100], [3180, 110, 1400]];
    for (const [x, y, h] of L.concat(R)) s += pine(x, y, h, a, b);
    return s;
  }

  function frontProps() {
    let s = '';
    // montículos de nieve contra la casa
    s += `<path d="M-90 74 q120 -70 300 -10 q160 -50 330 6 q120 -40 300 8z" fill="#e6edfa"/>`;
    s += `<path d="M1500 74 q160 -60 320 -6 q200 -60 380 0 q160 -40 320 6z" fill="#e6edfa"/>`;
    // tercer arbolito LED, sobre la nieve
    s += arbolito(1590, 84, 380, 63);
    // jabalinas solares RGB a los lados del camino
    const pts = [[960, 190, 1], [1440, 190, 1], [900, 430, 1.35], [1500, 430, 1.35], [826, 760, 1.8], [1574, 760, 1.8]];
    pts.forEach(([x, y, k], i) => (s += stake(x, y, k, i)));
    // buzón
    s +=
      `<rect x="536" y="250" width="14" height="170" fill="#3a2314"/>` +
      `<path d="M486 250 v-52 a34 34 0 0 1 68 0 h60 v52z" fill="#b3261e"/><rect x="600" y="182" width="7" height="44" fill="#f0b243"/><rect x="600" y="182" width="26" height="16" fill="#f0b243"/>` +
      `<path d="M482 158 q62 -60 136 6 l-4 12 h-128z" fill="#e6edfa"/>`;
    // muñeco de nieve
    s +=
      `<ellipse cx="2010" cy="318" rx="110" ry="16" fill="#8c9cc4" opacity=".5"/>` +
      `<circle cx="2010" cy="240" r="84" fill="#eef3fc"/><circle cx="2010" cy="120" r="60" fill="#f4f7fd"/><circle cx="2010" cy="30" r="42" fill="#f9fbfe"/>` +
      `<path d="M1972 76 h76 v18 h-28 v46 h-18 v-46 h-30z" fill="#b3261e"/>` +
      `<circle cx="1996" cy="22" r="5" fill="#141416"/><circle cx="2024" cy="22" r="5" fill="#141416"/><path d="M2010 34 l34 8 l-34 6z" fill="#f08a2a"/>` +
      `<rect x="1976" y="-42" width="68" height="36" rx="3" fill="#141416"/><rect x="1962" y="-10" width="96" height="10" rx="4" fill="#141416"/><rect x="1976" y="-18" width="68" height="8" fill="#b3261e"/>` +
      `<circle cx="2010" cy="110" r="5" fill="#141416"/><circle cx="2010" cy="140" r="5" fill="#141416"/>` +
      `<path d="M1954 110 l-70 -40 M2066 110 l70 -44" stroke="#4a2c17" stroke-width="7" stroke-linecap="round"/>`;
    return s;
  }

  function mountains() {
    const pk = [[-1700, -900], [-1100, -1500], [-500, -1150], [100, -1700], [700, -1250], [1300, -1820], [1900, -1300], [2500, -1760], [3100, -1200], [3700, -1600], [4300, -1000]];
    let d = 'M-2600 400 ';
    pk.forEach((q) => (q[1] = Math.round(q[1] * 0.7)));
    pk.forEach(([x, y], i) => {
      d += `L${x} ${y} `;
      if (i < pk.length - 1) d += `L${(x + pk[i + 1][0]) / 2} ${Math.max(y, pk[i + 1][1]) + 260} `;
    });
    d += 'L5200 400Z';
    let s = `<path d="${d}" fill="#16224a"/>`;
    for (const [x, y] of pk) s += `<path d="M${x} ${y} l-150 190 l70 -30 l60 60 l50 -70 l90 60z" fill="#3a4a7a" opacity=".8"/>`;
    s += `<rect x="-9000" y="380" width="21000" height="9000" fill="#16224a"/>`;
    return s;
  }

  function forest() {
    const r = rng(77);
    let s = `<ellipse cx="1200" cy="60" rx="4200" ry="330" fill="#6f81ad"/><rect x="-9000" y="20" width="21000" height="9000" fill="#7f90b9"/>`;
    for (let i = 0; i < 46; i++) {
      const x = -1900 + i * 138 + r() * 60;
      const h = 620 + r() * 420;
      s += pine(x, -40 + r() * 70, h, '#0e2433', '#0a1c29', 0.35);
    }
    return s;
  }

  function foreground() {
    return pine(-700, 1250, 2500, '#0a2022', '#071718', 0.5) + pine(3120, 1350, 2700, '#0a2022', '#071718', 0.5);
  }

  const DEFS = `
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#040714"/><stop offset=".5" stop-color="#0c1736"/><stop offset=".82" stop-color="#1e2f5c"/><stop offset="1" stop-color="#2d4170"/></linearGradient>
    <linearGradient id="snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d5ee"/><stop offset=".12" stop-color="#b3c1e0"/><stop offset="1" stop-color="#7f90bc"/></linearGradient>
    <linearGradient id="winWarm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7ae"/><stop offset="1" stop-color="#ffb347"/></linearGradient>
    <linearGradient id="doorLight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6dc"/><stop offset="1" stop-color="#ffcf7a"/></linearGradient>
    <linearGradient id="winNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1330"/><stop offset="1" stop-color="#22345f"/></linearGradient>
    <linearGradient id="roomShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0d05" stop-opacity=".42"/><stop offset=".45" stop-color="#1a0d05" stop-opacity=".1"/><stop offset="1" stop-color="#1a0d05" stop-opacity=".3"/></linearGradient>
    <linearGradient id="coneWarm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".95"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></linearGradient>
    <linearGradient id="mirror" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9c7a6"/><stop offset="1" stop-color="#8a735a"/></linearGradient>
    <radialGradient id="gWarm"><stop offset="0" stop-color="#ffe2a0" stop-opacity=".95"/><stop offset=".3" stop-color="#ffb648" stop-opacity=".42"/><stop offset="1" stop-color="#ffb648" stop-opacity="0"/></radialGradient>
    <radialGradient id="gWarmSoft"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".5"/><stop offset=".5" stop-color="#ffb648" stop-opacity=".16"/><stop offset="1" stop-color="#ffb648" stop-opacity="0"/></radialGradient>
    <radialGradient id="gWhite"><stop offset="0" stop-color="#fffdf2" stop-opacity=".85"/><stop offset=".35" stop-color="#fff2d0" stop-opacity=".28"/><stop offset="1" stop-color="#fff2d0" stop-opacity="0"/></radialGradient>
    <radialGradient id="gRed"><stop offset="0" stop-color="#ff7a66" stop-opacity=".95"/><stop offset=".3" stop-color="#ff3b2e" stop-opacity=".4"/><stop offset="1" stop-color="#ff3b2e" stop-opacity="0"/></radialGradient>
    <radialGradient id="gGreen"><stop offset="0" stop-color="#8dffb2" stop-opacity=".95"/><stop offset=".3" stop-color="#2fd46e" stop-opacity=".4"/><stop offset="1" stop-color="#2fd46e" stop-opacity="0"/></radialGradient>
    <radialGradient id="gFire"><stop offset="0" stop-color="#ffb24d" stop-opacity=".85"/><stop offset=".4" stop-color="#ff7a1f" stop-opacity=".3"/><stop offset="1" stop-color="#ff7a1f" stop-opacity="0"/></radialGradient>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<radialGradient id="rgbGlow${i}"><stop class="rgbStop" data-i="${i}" offset="0" stop-color="#fff" stop-opacity=".9"/><stop class="rgbStop" data-i="${i}" offset=".35" stop-color="#fff" stop-opacity=".35"/><stop class="rgbStop" data-i="${i}" offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`).join('')}
    <pattern id="plaid" width="26" height="26" patternUnits="userSpaceOnUse"><rect width="26" height="26" fill="#a3231c"/><rect y="9" width="26" height="8" fill="#000" opacity=".3"/><rect x="9" width="8" height="26" fill="#000" opacity=".3"/><path d="M0 2H26M2 0V26" stroke="#f2e2b8" stroke-width="1.2" opacity=".55"/></pattern>
  `;

  window.ClamyWorld = {
    DEFS,
    mountains,
    forest,
    foreground,
    world() {
      return (
        `<g id="ground">${ground()}</g>` +
        `<g id="backPines">${backPines()}</g>` +
        `<g id="sidePines">${sidePines()}</g>` +
        `<g id="chimney">${chimney()}</g>` +
        `<g id="shell">${shell()}</g>` +
        `<g id="interior">${interior()}</g>` +
        `<g id="facade">${facade()}</g>` +
        `<g id="roof">${roof()}</g>` +
        `<g id="front">${frontProps()}</g>`
      );
    },
  };
})();
