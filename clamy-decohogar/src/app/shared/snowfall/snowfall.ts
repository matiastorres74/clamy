import { Component } from '@angular/core';

const FLAKE_COUNT = 36;

interface Flake {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
}

// Deterministic spread instead of Math.random(): the server and the browser
// must render the same markup, or hydration would rebuild every flake.
function spread(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const FLAKES: Flake[] = Array.from({ length: FLAKE_COUNT }, (_, i) => ({
  left: spread(i, 1) * 100,
  size: 2 + spread(i, 2) * 4,
  duration: 9 + spread(i, 3) * 10,
  delay: -spread(i, 4) * 18,
  drift: (spread(i, 5) - 0.5) * 80,
  opacity: 0.35 + spread(i, 6) * 0.5,
}));

/** Slow white snow, purely decorative; hidden for reduced-motion users. */
@Component({
  selector: 'app-snowfall',
  templateUrl: './snowfall.html',
  styleUrl: './snowfall.css',
  host: { 'aria-hidden': 'true' },
})
export class Snowfall {
  protected flakes = FLAKES;
}
