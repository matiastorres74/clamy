/* Genera el video del spot: abre spot.html en Chromium, pide los cuadros de a
   uno (spot.js dibuja cualquier instante de forma determinista), sintetiza la
   música y junta todo con ffmpeg.

   Uso:  node render.js [salida.mp4]
   Necesita Playwright (con Chromium) y ffmpeg instalados en la máquina. */
'use strict';

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'clamy-navidad-2026.mp4'));
const PAGE = 'file://' + path.join(__dirname, 'spot.html') + '?render=1';
const SR = 48000;

/* ---------- música ----------
   "Noche de paz" (Franz Gruber, 1818, dominio público) en timbre de cajita de
   música. A 120 negras por minuto, los 24 compases de 3/4 duran 36 segundos,
   lo mismo que el spot: la puerta se abre al empezar el compás 5 y la nota
   más aguda cae al arrancar el zoom out. */
function music(dur) {
  const n = Math.round(dur * SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const BEAT = 0.5;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Nota con ataque corto y parciales que se apagan a distinta velocidad.
  function pluck(t0, midi, amp, pan = 0, long = 1) {
    const f0 = hz(midi);
    const partials = [[1, 1, 1.15 * long], [2, 0.34, 0.6 * long], [3, 0.11, 0.34], [5.4, 0.05, 0.12]];
    const i0 = Math.round(t0 * SR);
    const len = Math.min(n - i0, Math.round(4.5 * long * SR));
    const gl = amp * Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = amp * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      let v = 0;
      for (const [k, a, tau] of partials) v += a * Math.exp(-t / tau) * Math.sin(2 * Math.PI * f0 * k * t);
      v *= Math.min(1, t / 0.004);
      L[i0 + i] += v * gl;
      R[i0 + i] += v * gr;
    }
  }
  // Colchón: seno sostenido con entrada y salida lentas.
  function pad(t0, d, midi, amp) {
    const f0 = hz(midi);
    const i0 = Math.round(t0 * SR);
    const len = Math.min(n - i0, Math.round((d + 0.6) * SR));
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const env = Math.min(1, t / 0.5) * Math.min(1, (d + 0.6 - t) / 0.6);
      const v = amp * env * (Math.sin(2 * Math.PI * f0 * t) + 0.25 * Math.sin(4 * Math.PI * f0 * t));
      L[i0 + i] += v;
      R[i0 + i] += v;
    }
  }

  // Melodía en do mayor: [nota MIDI, duración en negras], un compás por línea.
  const G4 = 67, A4 = 69, B4 = 71, C5 = 72, D5 = 74, E5 = 76, F5 = 77, E4 = 64, F4 = 65, D4 = 62, C4 = 60;
  const melody = [
    [[G4, 1.5], [A4, 0.5], [G4, 1]], [[E4, 3]], [[G4, 1.5], [A4, 0.5], [G4, 1]], [[E4, 3]],
    [[D5, 2], [D5, 1]], [[B4, 3]], [[C5, 2], [C5, 1]], [[G4, 3]],
    [[A4, 2], [A4, 1]], [[C5, 1.5], [B4, 0.5], [A4, 1]], [[G4, 1.5], [A4, 0.5], [G4, 1]], [[E4, 3]],
    [[A4, 2], [A4, 1]], [[C5, 1.5], [B4, 0.5], [A4, 1]], [[G4, 1.5], [A4, 0.5], [G4, 1]], [[E4, 3]],
    [[D5, 2], [D5, 1]], [[F5, 1.5], [D5, 0.5], [B4, 1]], [[C5, 3]], [[E5, 3]],
    [[C5, 1], [G4, 1], [E4, 1]], [[G4, 1.5], [F4, 0.5], [D4, 1]], [[C4, 3]], [],
  ];
  const CH = { C: [48, 60, 64, 67], G: [43, 59, 62, 67], F: [41, 60, 65, 69] };
  const chords = 'C C C C G G C C F F C C F F C C G G C C C G C C'.split(' ');

  melody.forEach((bar, b) => {
    let beat = b * 3;
    for (const [m, d] of bar) {
      pluck(beat * BEAT, m + 12, 0.5, 0.15, d >= 2 ? 1.25 : 1);
      beat += d;
    }
    const [bass, a, c, e] = CH[chords[b]];
    const t = b * 3 * BEAT;
    pad(t, 1.5, bass, 0.1);
    pad(t, 1.5, a, 0.035);
    pad(t, 1.5, e, 0.03);
    if (b < 23) {
      pluck(t, a, 0.2, -0.35, 1.3);
      pluck(t + BEAT, c, 0.14, -0.2);
      pluck(t + 2 * BEAT, e, 0.14, -0.05);
    }
  });
  // Destello cuando se enciende la lámpara del logo (32,5 s).
  [84, 88, 91, 96].forEach((m, i) => pluck(32.5 + i * 0.07, m, 0.2, 0.3 - i * 0.2, 1.4));

  // Reverberación: cuatro peines en paralelo y dos pasa-todo por canal.
  function reverb(x, combs, aps) {
    const out = new Float32Array(n);
    for (const ms of combs) {
      const d = Math.round((ms / 1000) * SR);
      const buf = new Float32Array(d);
      let k = 0;
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const y = buf[k];
        lp = y * 0.7 + lp * 0.3;
        buf[k] = x[i] + lp * 0.8;
        out[i] += y;
        k = (k + 1) % d;
      }
    }
    for (const ms of aps) {
      const d = Math.round((ms / 1000) * SR);
      const buf = new Float32Array(d);
      let k = 0;
      for (let i = 0; i < n; i++) {
        const b = buf[k];
        const y = -0.5 * out[i] + b;
        buf[k] = out[i] + 0.5 * y;
        out[i] = y;
        k = (k + 1) % d;
      }
    }
    return out;
  }
  const wl = reverb(L, [29.7, 37.1, 41.1, 43.7], [5, 1.7]);
  const wr = reverb(R, [30.9, 36.3, 42.3, 44.9], [5.3, 1.9]);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.05) * Math.min(1, (dur - t) / 1.6);
    L[i] = (L[i] + 0.12 * wl[i]) * env;
    R[i] = (R[i] + 0.12 * wr[i]) * env;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const g = 0.8 / peak;
  const wav = Buffer.alloc(44 + n * 4);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + n * 4, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(SR, 24);
  wav.writeUInt32LE(SR * 4, 28);
  wav.writeUInt16LE(4, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    wav.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4);
    wav.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4);
  }
  return wav;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('requestfailed', (r) => problems.push('no cargó ' + r.url()));
  await page.goto(PAGE);
  await page.evaluate(() => window.__ready);
  const { DUR, FPS } = await page.evaluate(() => window.__spot);
  if (problems.length) throw new Error(problems.join('\n'));

  const wavPath = path.join(os.tmpdir(), `clamy-spot-${process.pid}.wav`);
  fs.writeFileSync(wavPath, music(DUR));

  const ff = spawn(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-i', wavPath,
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-profile:v', 'high',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
      OUT,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const done = new Promise((res, rej) => ff.on('close', (code) => (code ? rej(new Error('ffmpeg terminó con código ' + code)) : res())));

  const total = Math.round(DUR * FPS);
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.__seek(t), i / FPS);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 97 });
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 90 === 0) process.stdout.write(`cuadro ${i}/${total}\n`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
  fs.unlinkSync(wavPath);
  if (problems.length) throw new Error(problems.join('\n'));
  console.log('listo: ' + OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
