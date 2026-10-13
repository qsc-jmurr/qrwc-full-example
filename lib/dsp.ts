/**
 * Pure maths for drawing audio curves. No React, no QRWC — easy to test,
 * easy to reuse. (RBJ "Audio EQ Cookbook" biquads at 48 kHz.)
 */

export type EqBandType = "parametric" | "lowshelf" | "highshelf";

export type EqBand = {
  frequency: number; // Hz
  gain: number; // dB
  bandwidth: number; // octaves
  type: EqBandType;
  bypass: boolean;
};

const FS = 48000;

function coefficients(b: EqBand) {
  const A = Math.pow(10, b.gain / 40);
  const w0 = (2 * Math.PI * Math.min(b.frequency, FS / 2 - 1)) / FS;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);

  if (b.type === "parametric") {
    const alpha = sin * Math.sinh(((Math.LN2 / 2) * b.bandwidth * w0) / sin);
    return [1 + alpha * A, -2 * cos, 1 - alpha * A, 1 + alpha / A, -2 * cos, 1 - alpha / A];
  }
  const alpha = (sin / 2) * Math.SQRT2; // shelf slope S = 1
  const sq = 2 * Math.sqrt(A) * alpha;
  if (b.type === "lowshelf") {
    return [
      A * (A + 1 - (A - 1) * cos + sq),
      2 * A * (A - 1 - (A + 1) * cos),
      A * (A + 1 - (A - 1) * cos - sq),
      A + 1 + (A - 1) * cos + sq,
      -2 * (A - 1 + (A + 1) * cos),
      A + 1 + (A - 1) * cos - sq,
    ];
  }
  return [
    A * (A + 1 + (A - 1) * cos + sq),
    -2 * A * (A - 1 + (A + 1) * cos),
    A * (A + 1 + (A - 1) * cos - sq),
    A + 1 - (A - 1) * cos + sq,
    2 * (A - 1 - (A + 1) * cos),
    A + 1 - (A - 1) * cos - sq,
  ];
}

/** Magnitude (dB) of one band at frequency f. */
export function bandResponse(b: EqBand, f: number): number {
  if (b.bypass || b.gain === 0) return 0;
  const [b0, b1, b2, a0, a1, a2] = coefficients(b);
  const w = (2 * Math.PI * f) / FS;
  const c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
  const nr = b0 + b1 * c1 + b2 * c2, ni = -(b1 * s1 + b2 * s2);
  const dr = a0 + a1 * c1 + a2 * c2, di = -(a1 * s1 + a2 * s2);
  return 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di));
}

/** Log-spaced frequencies between lo and hi. */
export function logFrequencies(lo = 20, hi = 20000, points = 200): number[] {
  return Array.from({ length: points }, (_, i) => lo * Math.pow(hi / lo, i / (points - 1)));
}

export function formatHz(f: number): string {
  return f < 1000 ? `${Math.round(f)} Hz` : `${(f / 1000).toFixed(f < 10000 ? 2 : 1)} kHz`;
}

/** Map Q-SYS band-type strings ("Parametric", "Low Shelf"…) onto what we can draw. */
export function toBandType(s: string | undefined): EqBandType {
  const t = (s ?? "").toLowerCase();
  if (t.includes("shelf") && t.includes("low")) return "lowshelf";
  if (t.includes("shelf") && t.includes("high")) return "highshelf";
  return "parametric";
}

/** Static compressor curve (soft knee). */
export function compressorOut(input: number, threshold: number, ratio: number, knee: number): number {
  if (knee > 0 && input > threshold - knee / 2 && input < threshold + knee / 2) {
    const x = input - (threshold - knee / 2);
    return input + ((1 / ratio - 1) * x * x) / (2 * knee);
  }
  return input > threshold ? threshold + (input - threshold) / ratio : input;
}

/** Peak limiter static curve: unity below the threshold, flat above it (optional soft knee). */
export function limiterOut(input: number, threshold: number, knee = 0): number {
  return compressorOut(input, threshold, 1000, knee);
}
