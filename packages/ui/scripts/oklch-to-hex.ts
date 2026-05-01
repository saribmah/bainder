#!/usr/bin/env bun
import { color } from "../src/tokens/color.ts";

function oklchToHex(L: number, C: number, h: number): string {
  const hRad = (h * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const enc = (c: number): number => {
    if (c >= 0.0031308) return 1.055 * c ** (1.0 / 2.4) - 0.055;
    return 12.92 * c;
  };

  r = enc(r);
  g = enc(g);
  bl = enc(bl);

  const clamp = (c: number): number => Math.max(0, Math.min(255, Math.round(c * 255)));
  const hex = (n: number): string => clamp(n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(bl)}`;
}

function parseOklch(s: string): [number, number, number] {
  const m = s.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)/);
  if (!m || !m[1] || !m[2] || !m[3]) throw new Error(`Bad oklch: ${s}`);
  return [parseFloat(m[1]) / 100, parseFloat(m[2]), parseFloat(m[3])];
}

function convert(s: string): string {
  if (!s.startsWith("oklch(")) return s;
  const [L, C, h] = parseOklch(s);
  return oklchToHex(L, C, h);
}

const lines: string[] = ["export const color = {"];
for (const [scaleName, scale] of Object.entries(color)) {
  lines.push(`  ${scaleName}: {`);
  for (const [stop, value] of Object.entries(scale)) {
    const hex = convert(value as string);
    lines.push(`    ${JSON.stringify(stop)}: "${hex}",`);
  }
  lines.push(`  },`);
}
lines.push(`} as const;`);
lines.push(``);
lines.push(`export type Color = typeof color;`);

console.log(lines.join("\n"));
