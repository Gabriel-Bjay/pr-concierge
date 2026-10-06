import picomatch from "picomatch";
import type { SizeThresholds } from "./config.js";

export const SIZES = ["XS", "S", "M", "L", "XL"] as const;
export type Size = (typeof SIZES)[number];

const COLORS: Record<Size, string> = {
  XS: "3cbf00",
  S: "5d9801",
  M: "7f7203",
  L: "a14c05",
  XL: "c32607",
};

export interface ChangedFile {
  filename: string;
  additions: number;
  deletions: number;
}

export function sizeLabel(size: Size): string {
  return `size/${size}`;
}

export const SIZE_LABELS: readonly string[] = SIZES.map(sizeLabel);

export function sizeLabelColor(size: Size): string {
  return COLORS[size];
}

export function countChangedLines(files: ChangedFile[], ignore: string[]): number {
  const isIgnored = ignore.length > 0 ? picomatch(ignore, { dot: true }) : () => false;
  return files.reduce(
    (total, file) => (isIgnored(file.filename) ? total : total + file.additions + file.deletions),
    0,
  );
}

export function sizeFor(lines: number, thresholds: SizeThresholds): Size {
  if (lines < thresholds.xs) return "XS";
  if (lines < thresholds.s) return "S";
  if (lines < thresholds.m) return "M";
  if (lines < thresholds.l) return "L";
  return "XL";
}
