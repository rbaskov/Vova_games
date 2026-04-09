/**
 * Seeded 2D Simplex Noise
 * Based on Stefan Gustavson's simplex noise algorithm.
 * Uses mulberry32 PRNG for deterministic permutation table shuffling.
 */

// mulberry32 PRNG — returns a function that yields floats in [0, 1)
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gradient vectors for 2D simplex noise
const GRAD3 = [
  [ 1,  1], [-1,  1], [ 1, -1], [-1, -1],
  [ 1,  0], [-1,  0], [ 1,  0], [-1,  0],
  [ 0,  1], [ 0, -1], [ 0,  1], [ 0, -1],
];

/**
 * Create a 2D simplex noise function with the given seed.
 * @param {number} seed - Integer seed value
 * @returns {function(x: number, y: number): number} noise2D function returning values in roughly [-1, 1]
 */
export function createNoise(seed) {
  const rand = mulberry32(seed);

  // Build permutation table (0..255) and shuffle with seeded PRNG
  const perm = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;

  // Fisher-Yates shuffle
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = base[i];
    base[i] = base[j];
    base[j] = tmp;
  }

  // Double the table to avoid index wrapping
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];

  /**
   * 2D Simplex noise.
   * @param {number} x
   * @param {number} y
   * @returns {number} value in roughly [-1, 1]
   */
  function noise2D(x, y) {
    // Skew the input space to determine which simplex cell we're in
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * G2;
    // Unskew the cell origin back to (x, y) space
    const X0 = i - t;
    const Y0 = j - t;

    // Offsets from cell origin
    const x0 = x - X0;
    const y0 = y - Y0;

    // Determine which simplex triangle we are in
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else          { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    // Hashed gradient indices
    const ii = i & 255;
    const jj = j & 255;

    const gi0 = perm[ii +          perm[jj     ]] % 12;
    const gi1 = perm[ii + i1 +     perm[jj + j1]] % 12;
    const gi2 = perm[ii +  1 +     perm[jj +  1]] % 12;

    // Calculate contributions from the three corners
    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      const g = GRAD3[gi0];
      n0 = t0 * t0 * (g[0] * x0 + g[1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      const g = GRAD3[gi1];
      n1 = t1 * t1 * (g[0] * x1 + g[1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      const g = GRAD3[gi2];
      n2 = t2 * t2 * (g[0] * x2 + g[1] * y2);
    }

    // Scale result to [-1, 1]
    return 70 * (n0 + n1 + n2);
  }

  return noise2D;
}
