/* Línea de tiempo del spot. Todo lo que se ve es función de un solo número,
   el tiempo t en segundos: render(t) deja el cuadro exactamente igual cada
   vez, así render.mjs puede pedir los cuadros de a uno y el video sale
   idéntico en cada corrida. */
(function () {
  'use strict';

  const W = 1080;
  const H = 1920;
  const DUR = 36;
  const SVG = 'http://www.w3.org/2000/svg';

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ramp = (t, a, b) => clamp((t - a) / (b - a));
  const ss = (x) => x * x * (3 - 2 * x);
  const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const TAU = Math.PI * 2;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- cámara ---------- */

  // Tiempos de cada tramo, en segundos.
  const T = {
    pushA: 0.7, pushB: 5.7, // acercamiento a la puerta
    doorA: 5.1, doorB: 5.7, // se abre la puerta
    cut: 6.0, // fundido a luz: de la fachada al interior
    tourA: 6.1, tourB: 22.9, // living, comedor y cocina, de izquierda a derecha
    riseA: 23.6, riseB: 25.1, // sube al altillo
    loftB: 28.8, // dormitorio
    outB: 32.2, // zoom out
    wallA: 29.0, wallB: 30.4, // vuelve a aparecer la fachada
  };
  const REF = { x: 1200, y: -1500, z: 0.3 }; // plano general de apertura
  const DOOR = { x: 1200, y: -240 };
  const Z_DOOR = 2.0;
  const Z_TOUR = 1.75;
  const Z_LOFT = 1.45; // el dormitorio es más ancho que el cuadro a 1.75
  const Z_END = 0.27;
  const FLOOR_Y = -274; // con este centro el piso queda en y = 1440 px
  const LOFT_Y = -1061;
  const END_Y = -2300; // deja el suelo en y = 1600 px y el cielo libre para el logo

  const tourX = (t) => {
    const p = ramp(t, T.tourA, T.tourB);
    return 300 + 1790 * (0.85 * p + 0.15 * ss(p));
  };
  // Tiempo en el que la cámara del recorrido pasa por un x dado.
  function tOfCx(cx) {
    let a = T.tourA;
    let b = T.tourB;
    for (let i = 0; i < 40; i++) {
      const m = (a + b) / 2;
      if (tourX(m) < cx) a = m;
      else b = m;
    }
    return (a + b) / 2;
  }

  function cam(t) {
    if (t < T.cut) {
      // La puerta viaja en línea recta hasta el centro del cuadro mientras el
      // zoom crece de forma exponencial: se lee como un travelling hacia ella.
      const p = eio(ramp(t, T.pushA, T.pushB));
      const z = Math.exp(lerp(Math.log(REF.z), Math.log(Z_DOOR), p));
      const sy = (DOOR.y - REF.y) * REF.z * (1 - p);
      return { x: 1200, y: DOOR.y - sy / z, z };
    }
    if (t < T.riseA) return { x: tourX(t), y: FLOOR_Y, z: Z_TOUR };
    if (t < T.riseB) {
      const p = eio(ramp(t, T.riseA, T.riseB));
      return { x: lerp(2090, 1440, p), y: lerp(FLOOR_Y, LOFT_Y, p), z: lerp(Z_TOUR, Z_LOFT, p) * (1 - 0.1 * Math.sin(Math.PI * p)) };
    }
    if (t < T.loftB) return { x: lerp(1440, 1200, eio(ramp(t, T.riseB, T.loftB))), y: LOFT_Y, z: Z_LOFT };
    const p = eio(ramp(t, T.loftB, T.outB));
    const z = Math.exp(lerp(Math.log(Z_LOFT), Math.log(Z_END), p)) * (1 - 0.035 * ramp(t, T.outB, DUR));
    const sy = (LOFT_Y - END_Y) * Z_END * p;
    return { x: 1200, y: LOFT_Y - sy / z, z };
  }

  // 1 con la casa cerrada (exterior), 0 en el corte interior.
  const exterior = (t) => (t < T.cut ? 1 : ss(ramp(t, T.wallA, T.wallB)));

  /* ---------- productos ---------- */

  // id = id del producto en el catálogo; la foto es productos/<id>.jpg.
  // hot = punto del dibujo que señala la tarjeta, en unidades de mundo.
  // Las tarjetas del recorrido se definen por la posición de cámara (cx) en
  // la que se muestran; las demás, por tiempo (t).
  const CARDS = [
    { id: 34, cat: 'Iluminación exterior', name: 'Jabalina solar RGB', hot: [900, 350], t: [1.5, 3.1] },
    { id: 52, cat: 'Navidad', name: 'Arbolito de Navidad LED', det: 'Con control remoto · 1 m, 1,20 m, 1,50 m y 1,80 m', hot: [1010, -190], t: [3.3, 5.45] },
    { id: 36, cat: 'Decoración', name: 'Reloj con engranajes que giran', hot: [210, -500], cx: [300, 455] },
    { id: 51, cat: 'Iluminación', name: 'Lámpara de pie 3 luces', det: 'Negra y madera', hot: [420, -340], cx: [475, 645] },
    { id: 42, cat: 'Iluminación', name: 'Lámpara de pie blanca LED', hot: [1010, -270], cx: [790, 960] },
    { id: 43, cat: 'Iluminación', name: 'Aplique de pared negro LED', hot: [1085, -470], cx: [975, 1140] },
    { id: 38, cat: 'Iluminación', name: 'Colgante fibras naturales', hot: [1240, -530], cx: [1155, 1325] },
    { id: 41, cat: 'Iluminación', name: 'Lamparita negra con filamento', hot: [1652, -420], cx: [1400, 1575] },
    { id: 19, cat: 'Iluminación', name: 'Barra LED bajo alacena', det: '60 cm · con sensor · 3 colores de luz', hot: [1925, -420], cx: [1640, 1810] },
    { id: 47, cat: 'Cocina', name: 'Set 2 dispensers con bandeja madera', hot: [2130, -290], cx: [1860, 2030] },
    { id: 45, cat: 'Iluminación', name: 'Barral 4 luces negras AR111', hot: [2180, -640], t: [tOfCx(2042), 23.85] },
    { id: 44, cat: 'Varios', name: 'Espejo LED con luz recargable USB', hot: [1622, -975], t: [25.2, 26.85] },
    { id: 49, cat: 'Iluminación', name: 'Velador honguito', det: 'Negro o marfil', hot: [1465, -905], t: [27.0, 28.75] },
  ];
  CARDS.forEach((c) => {
    if (c.cx) c.t = [Math.max(tOfCx(c.cx[0]), 6.4), tOfCx(c.cx[1])];
  });

  const ROOMS = [
    { name: 'Entrada', t: [3.3, 5.5] },
    { name: 'Living', t: [6.4, tOfCx(985)] },
    { name: 'Comedor', t: [tOfCx(1010), tOfCx(1700)] },
    { name: 'Cocina', t: [tOfCx(1725), 23.7] },
    { name: 'Dormitorio', t: [25.1, 28.8] },
  ];

  /* ---------- armado del documento ---------- */

  const $ = (s) => document.querySelector(s);
  const scene = $('#scene');
  const Wd = window.ClamyWorld;

  const rs = rng(2026);
  let stars = '';
  for (let i = 0; i < 110; i++) {
    stars += `<circle class="star" data-p="${rs().toFixed(3)}" cx="${(rs() * W).toFixed(1)}" cy="${(rs() * rs() * 1250).toFixed(1)}" r="${(0.8 + rs() * 1.9).toFixed(1)}" fill="#fff"/>`;
  }
  let flakes = '';
  const FLAKES = [];
  for (let i = 0; i < 170; i++) {
    const fl = { x: rs() * W, y: rs() * (H + 60), r: 1.6 + rs() * rs() * 6, v: 70 + rs() * 150, amp: 10 + rs() * 40, w: 0.3 + rs() * 0.9, ph: rs() * TAU };
    FLAKES.push(fl);
    flakes += `<circle r="${fl.r.toFixed(1)}" fill="#fff" opacity="${(0.45 + rs() * 0.5).toFixed(2)}"/>`;
  }

  scene.innerHTML =
    `<defs>${Wd.DEFS}</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
    `<g id="stars">${stars}</g>` +
    `<g id="Lmount">${Wd.mountains()}</g>` +
    `<g id="Lforest">${Wd.forest()}</g>` +
    `<g id="Lworld">${Wd.world()}</g>` +
    `<g id="Lfore">${Wd.foreground()}</g>` +
    `<g id="snowfall">${flakes}</g>`;

  // Guirnaldas del cierre, en coordenadas de pantalla.
  const STRANDS = [
    { a: [-30, 140], c: [540, 330], b: [1110, 140], n: 15, t0: 30.3 },
    { a: [-30, 250], c: [540, 360], b: [1110, 250], n: 13, t0: 30.55 },
  ];
  const BCOL = ['#fff1c4', '#ff5a4d', '#fff1c4', '#58e08a', '#fff1c4', '#ffc24d'];
  const BGLOW = ['gWarm', 'gRed', 'gWarm', 'gGreen', 'gWarm', 'gWarm'];
  let fxHtml =
    `<g id="hot" opacity="0"><path id="hotLine" fill="none" stroke="#f6ead3" stroke-width="2.5" opacity=".6"/>` +
    `<circle id="hotPulse" r="26" fill="none" stroke="#f6ead3" stroke-width="3"/>` +
    `<circle id="hotRing" r="24" fill="#f6ead322" stroke="#f6ead3" stroke-width="3"/><circle id="hotDot" r="7" fill="#ffb648"/></g>`;
  STRANDS.forEach((s, si) => {
    fxHtml += `<path class="wire" data-s="${si}" d="M${s.a[0]} ${s.a[1]} Q${s.c[0]} ${s.c[1]} ${s.b[0]} ${s.b[1]}" fill="none" stroke="#1d3a2a" stroke-width="5" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/>`;
    for (let i = 0; i < s.n; i++) {
      const u = (i + 0.5) / s.n;
      const v = 1 - u;
      const x = v * v * s.a[0] + 2 * v * u * s.c[0] + u * u * s.b[0];
      const y = v * v * s.a[1] + 2 * v * u * s.c[1] + u * u * s.b[1];
      const k = (i + si * 2) % BCOL.length;
      fxHtml +=
        `<g class="sb" data-s="${si}" data-u="${u.toFixed(3)}" data-i="${i}" opacity="0">` +
        `<circle class="sbGlow" cx="${x.toFixed(1)}" cy="${(y + 26).toFixed(1)}" r="58" fill="url(#${BGLOW[k]})"/>` +
        `<rect x="${(x - 5).toFixed(1)}" y="${(y - 2).toFixed(1)}" width="10" height="13" rx="2" fill="#1d3a2a"/>` +
        `<ellipse class="sbBulb" cx="${x.toFixed(1)}" cy="${(y + 26).toFixed(1)}" rx="12" ry="17" fill="${BCOL[k]}"/></g>`;
    }
  });
  $('#fx').innerHTML = fxHtml;

  // Logo redibujado en vector a partir de public/assets/clamy-logo.jpg.
  $('#logo').innerHTML =
    `<defs><radialGradient id="lampGlow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".95"/><stop offset=".4" stop-color="#ffb648" stop-opacity=".35"/><stop offset="1" stop-color="#ffb648" stop-opacity="0"/></radialGradient></defs>` +
    `<circle id="lampHalo" cx="450" cy="300" r="190" fill="url(#lampGlow)" opacity="0"/>` +
    `<g fill="none" stroke="#fbf3e2" stroke-width="15" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M275 243 L450 127 L628 246"/><path d="M312 262 V362 Q312 386 336 386 H415"/><path d="M592 262 V362 Q592 386 572 386"/>` +
    `<path d="M450 186 V214"/></g>` +
    `<path id="lampShade" d="M432 214 h36 l44 50 h-124z" fill="#8a6a3a" stroke="#fbf3e2" stroke-width="13" stroke-linejoin="round"/>` +
    `<g id="lampRays" stroke="#ffb648" stroke-width="9" stroke-linecap="round" opacity="0"><path d="M450 294 V320"/><path d="M430 290 L411 309"/><path d="M470 290 L489 309"/></g>` +
    `<text x="450" y="588" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="600" font-size="226" letter-spacing="-4" textLength="628" lengthAdjust="spacingAndGlyphs" fill="#fbf3e2">Clamy</text>` +
    `<path d="M256 636 Q450 758 646 636" fill="none" stroke="#fbf3e2" stroke-width="10" stroke-linecap="round"/>` +
    `<text x="450" y="775" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="600" font-size="45" letter-spacing="7" fill="#fbf3e2">DECO HOGAR</text>` +
    `<text x="450" y="834" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="600" font-size="45" letter-spacing="7" fill="#fbf3e2">ILUMINACIÓN</text>`;

  $('#cards').innerHTML = CARDS.map(
    (c) =>
      `<div class="card" data-id="${c.id}"><img src="productos/${c.id}.jpg" alt=""><div><div class="cat">${c.cat}</div><h3>${c.name}</h3>${c.det ? `<p>${c.det}</p>` : ''}</div></div>`,
  ).join('');
  $('#rooms').innerHTML = ROOMS.map((r) => `<span>${r.name}</span>`).join('');

  /* ---------- referencias a lo que se anima ---------- */

  const el = {
    mount: $('#Lmount'), forest: $('#Lforest'), world: $('#Lworld'), fore: $('#Lfore'),
    interior: $('#interior'), facade: $('#facade'), front: $('#front'), door: $('#door'),
    snow: $('#snowfall'), flash: $('#flash'), title: $('#title'), brand: $('#brand'),
    scrimT: $('#scrimT'), scrimB: $('#scrimB'),
    hot: $('#hot'), hotLine: $('#hotLine'), hotPulse: $('#hotPulse'), hotRing: $('#hotRing'), hotDot: $('#hotDot'),
    logo: $('#logo'), halo: $('#lampHalo'), shade: $('#lampShade'), rays: $('#lampRays'),
  };
  const q = (s) => Array.from(document.querySelectorAll(s));
  const twIn = q('#interior .tw').map((n) => [n, +n.dataset.p, n.classList.contains('slow')]);
  const twOut = q('#facade .tw, #front .tw').map((n) => [n, +n.dataset.p, n.classList.contains('slow')]);
  const twRoof = q('#roof .tw').map((n) => [n, +n.dataset.p, n.classList.contains('slow')]);
  const starEls = q('.star').map((n) => [n, +n.dataset.p]);
  const flakeEls = q('#snowfall circle');
  const flames = q('.flame');
  const gears = q('.gear');
  const puffs = q('.puff');
  const steam = q('#steam circle');
  const rgbStops = q('.rgbStop');
  const rgbHeads = q('.rgbHead');
  const cardEls = q('.card');
  const roomEls = q('#rooms span');
  const wires = q('.wire');
  const sbs = q('.sb');
  const endLines = q('#end p');

  const twinkle = (list, t) => {
    for (const [n, p, slow] of list) {
      const o = slow ? 0.84 + 0.16 * Math.sin(TAU * (t * 0.45 + p)) : 0.62 + 0.38 * Math.sin(TAU * (t * (0.55 + p * 0.7) + p * 3));
      n.setAttribute('opacity', o.toFixed(3));
    }
  };
  const fade = (t, a, b, i = 0.3, o = 0.25) => Math.min(ramp(t, a, a + i), 1 - ramp(t, b - o, b));

  /* ---------- un cuadro ---------- */

  function render(t) {
    t = clamp(t, 0, DUR);
    const c = cam(t);
    const ext = exterior(t);

    // Capas con paralaje: p = 1 sigue a la cámara; con p < 1 la capa se mueve
    // y escala menos (queda lejos), con p > 1 más (queda cerca).
    const layer = (node, p) => {
      const z = REF.z * Math.pow(c.z / REF.z, p);
      const x = REF.x + (c.x - REF.x) * p;
      const y = REF.y + (c.y - REF.y) * p;
      node.setAttribute('transform', `translate(540 960) scale(${z.toFixed(5)}) translate(${(-x).toFixed(2)} ${(-y).toFixed(2)})`);
    };
    layer(el.mount, 0.2);
    layer(el.forest, 0.5);
    layer(el.world, 1);
    layer(el.fore, 1.35);

    el.facade.setAttribute('opacity', ext.toFixed(3));
    el.front.setAttribute('opacity', ext.toFixed(3));
    el.fore.setAttribute('opacity', ext.toFixed(3));
    el.snow.setAttribute('opacity', ext.toFixed(3));
    el.interior.style.display = ext >= 1 ? 'none' : '';
    el.facade.style.display = ext <= 0 ? 'none' : '';
    el.front.style.display = ext <= 0 ? 'none' : '';

    const open = t < T.wallA ? ss(ramp(t, T.doorA, T.doorB)) : 0;
    el.door.setAttribute('transform', `translate(1100 0) scale(${(1 - 0.93 * open).toFixed(4)} 1) translate(-1100 0)`);
    el.flash.style.opacity = (t < T.cut ? ss(ramp(t, 5.5, T.cut)) : 1 - ss(ramp(t, T.cut, 6.75))).toFixed(3);

    // luces
    if (ext < 1) twinkle(twIn, t);
    if (ext > 0) twinkle(twOut, t);
    twinkle(twRoof, t);
    for (const [n, p] of starEls) n.setAttribute('opacity', (0.35 + 0.55 * (0.5 + 0.5 * Math.sin(TAU * (t * (0.2 + p * 0.5) + p * 7)))).toFixed(3));

    if (ext > 0) {
      FLAKES.forEach((fl, i) => {
        const y = ((fl.y + fl.v * t) % (H + 60)) - 30;
        const x = fl.x + Math.sin(t * fl.w + fl.ph) * fl.amp;
        flakeEls[i].setAttribute('cx', x.toFixed(1));
        flakeEls[i].setAttribute('cy', y.toFixed(1));
      });
      rgbStops.forEach((n) => n.setAttribute('stop-color', `hsl(${((t * 70 + n.dataset.i * 60) % 360).toFixed(0)} 100% 62%)`));
      rgbHeads.forEach((n) => n.setAttribute('fill', `hsl(${((t * 70 + n.dataset.i * 60) % 360).toFixed(0)} 100% 90%)`));
    }
    puffs.forEach((n) => {
      const ph = (t * 0.2 + n.dataset.i / 7) % 1;
      n.setAttribute('cx', (442 + 110 * ph + 46 * ph * Math.sin(n.dataset.i * 1.7 + ph * 4)).toFixed(1));
      n.setAttribute('cy', (-1275 - 560 * ph).toFixed(1));
      n.setAttribute('r', (24 + 90 * ph).toFixed(1));
      n.setAttribute('opacity', (0.34 * (1 - ph) * Math.min(1, ph * 6)).toFixed(3));
    });
    if (ext < 1) {
      flames.forEach((n) => {
        const p = +n.dataset.p;
        const sy = 1 + 0.16 * Math.sin(TAU * (t * 2.9 + p)) + 0.07 * Math.sin(TAU * (t * 7.3 + p));
        const sx = 1 + 0.07 * Math.sin(TAU * (t * 2.1 + p + 0.3));
        n.setAttribute('transform', `translate(210 -30) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-210 30)`);
      });
      gears.forEach((n) => n.setAttribute('transform', `rotate(${(n.dataset.dir * t * 900 / n.dataset.r).toFixed(1)} ${n.dataset.cx} ${n.dataset.cy})`));
      steam.forEach((n, i) => {
        const ph = (t * 0.45 + i / 3) % 1;
        n.setAttribute('transform', `translate(${(8 * Math.sin(ph * 5 + i)).toFixed(1)} ${(-46 * ph).toFixed(1)})`);
        n.setAttribute('opacity', (0.4 * (1 - ph) * Math.min(1, ph * 5)).toFixed(3));
      });
    }

    // textos
    const titleA = fade(t, 0.3, 3.2, 0.6, 0.5);
    el.title.style.opacity = titleA.toFixed(3);
    el.title.style.transform = `translateY(${((1 - ramp(t, 0.3, 0.9)) * 24).toFixed(1)}px)`;
    ROOMS.forEach((r, i) => (roomEls[i].style.opacity = fade(t, r.t[0], r.t[1]).toFixed(3)));
    el.brand.style.opacity = (0.92 * fade(t, 6.5, 28.9, 0.5, 0.5)).toFixed(3);

    // tarjeta de producto y su marcador
    let hot = null;
    let hotA = 0;
    CARDS.forEach((cd, i) => {
      const a = fade(t, cd.t[0], cd.t[1]);
      cardEls[i].style.opacity = a.toFixed(3);
      cardEls[i].style.transform = `translateY(${((1 - ramp(t, cd.t[0], cd.t[0] + 0.3)) * 26).toFixed(1)}px)`;
      if (a > hotA) {
        hotA = a;
        hot = cd;
      }
    });
    el.hot.setAttribute('opacity', hotA.toFixed(3));
    if (hot) {
      const sx = 540 + (hot.hot[0] - c.x) * c.z;
      const sy = 960 + (hot.hot[1] - c.y) * c.z;
      const ph = (t * 0.9) % 1;
      for (const n of [el.hotRing, el.hotDot, el.hotPulse]) {
        n.setAttribute('cx', sx.toFixed(1));
        n.setAttribute('cy', sy.toFixed(1));
      }
      el.hotPulse.setAttribute('r', (26 + 30 * ph).toFixed(1));
      el.hotPulse.setAttribute('opacity', (0.8 * (1 - ph)).toFixed(3));
      const ax = clamp(sx, 110, 870);
      let d = '';
      if (sy < 1316 - 60) d = `M${sx.toFixed(1)} ${(sy + 26).toFixed(1)} L${ax.toFixed(1)} 1316`;
      else if (sy > 1536 + 60) d = `M${sx.toFixed(1)} ${(sy - 26).toFixed(1)} L${ax.toFixed(1)} 1536`;
      el.hotLine.setAttribute('d', d);
    }

    const cardOn = hotA;
    el.scrimB.style.opacity = Math.max((1 - ext) * 0.95, cardOn * 0.75).toFixed(3);
    el.scrimT.style.opacity = Math.max((1 - ext) * 0.8, titleA * 0.75, ramp(t, 30.5, 32) * 0.55).toFixed(3);

    // cierre: guirnaldas, logo y datos
    wires.forEach((n) => n.setAttribute('stroke-dashoffset', (1 - ss(ramp(t, STRANDS[n.dataset.s].t0, STRANDS[n.dataset.s].t0 + 1.0))).toFixed(4)));
    sbs.forEach((n) => {
      const s = STRANDS[n.dataset.s];
      const u = +n.dataset.u;
      const appear = ramp(t, s.t0 + u * 0.9, s.t0 + u * 0.9 + 0.15);
      const lit = ramp(t, s.t0 + 0.9 + u * 0.8, s.t0 + 1.0 + u * 0.8);
      const tw = 0.78 + 0.22 * Math.sin(TAU * (t * 0.8 + u * 5 + +n.dataset.s * 0.4));
      n.setAttribute('opacity', appear.toFixed(3));
      n.querySelector('.sbGlow').setAttribute('opacity', (lit * tw).toFixed(3));
      n.querySelector('.sbBulb').setAttribute('opacity', (0.3 + 0.7 * lit).toFixed(3));
    });
    const logoA = ss(ramp(t, 31.7, 32.5));
    el.logo.style.opacity = logoA.toFixed(3);
    el.logo.style.transform = `scale(${(0.94 + 0.06 * logoA).toFixed(4)})`;
    const on = ss(ramp(t, 32.5, 32.95));
    el.halo.setAttribute('opacity', (on * (0.9 + 0.1 * Math.sin(TAU * t * 0.6))).toFixed(3));
    el.rays.setAttribute('opacity', on.toFixed(3));
    el.shade.setAttribute('fill', on > 0.5 ? '#f6ad3c' : '#8a6a3a');
    endLines.forEach((n, i) => {
      const a = ss(ramp(t, 33.0 + i * 0.28, 33.5 + i * 0.28));
      n.style.opacity = a.toFixed(3);
      n.style.transform = `translateY(${((1 - a) * 16).toFixed(1)}px)`;
    });
  }

  /* ---------- reproducción ---------- */

  const params = new URLSearchParams(location.search);
  const renderMode = params.has('render');
  const stage = $('#stage');
  window.__spot = { DUR, FPS: 30, W, H };
  window.__seek = render;
  window.__ready = Promise.all([
    document.fonts.ready,
    document.fonts.load('600 40px Outfit'),
    document.fonts.load('800 40px Montserrat'),
    ...q('.card img').map((im) => (im.complete ? im.decode().catch(() => {}) : new Promise((res) => { im.onload = im.onerror = res; }))),
  ]).then(() => render(params.has('t') ? +params.get('t') : 0));

  if (renderMode) {
    document.body.classList.add('render');
    return;
  }

  const fit = () => {
    const k = Math.min(innerWidth / W, (innerHeight - 44) / H);
    stage.style.transform = `translate(${((innerWidth - W * k) / 2).toFixed(1)}px, 0) scale(${k.toFixed(4)})`;
  };
  addEventListener('resize', fit);
  fit();

  const scrub = $('#scrub');
  const clock = $('#clock');
  const playBtn = $('#play');
  let playing = !params.has('t');
  let t0 = performance.now();
  let tNow = params.has('t') ? +params.get('t') : 0;
  const setPlaying = (v) => {
    playing = v;
    t0 = performance.now() - tNow * 1000;
    playBtn.textContent = v ? 'Pausa' : 'Reproducir';
  };
  setPlaying(playing);
  playBtn.addEventListener('click', () => setPlaying(!playing));
  scrub.addEventListener('input', () => {
    tNow = +scrub.value;
    setPlaying(false);
    render(tNow);
    clock.textContent = tNow.toFixed(1) + ' s';
  });
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      setPlaying(!playing);
    }
  });
  window.__ready.then(function loop() {
    if (playing) {
      tNow = ((performance.now() - t0) / 1000) % DUR;
      render(tNow);
      scrub.value = tNow;
      clock.textContent = tNow.toFixed(1) + ' s';
    }
    requestAnimationFrame(loop);
  });
})();
