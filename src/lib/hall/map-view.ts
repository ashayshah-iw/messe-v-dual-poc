import type { HallView } from "@/types/expo";
import { FIT_INSET, FIT_PAD, getMapH, getMapW } from "@/data/hall-layout";
import { clamp } from "@/lib/hall/geometry";

export function clampPan(panX: number, panY: number, scale: number, vw: number, vh: number) {
  const mapW = getMapW() * scale;
  const mapH = getMapH() * scale;
  const minX = Math.min(0, vw - mapW);
  const maxX = Math.max(0, vw - mapW);
  const minY = Math.min(0, vh - mapH);
  const maxY = Math.max(0, vh - mapH);
  return {
    x: Math.max(minX, Math.min(maxX, panX)),
    y: Math.max(minY, Math.min(maxY, panY)),
  };
}

export function computeFitTransform(vw: number, vh: number): HallView | null {
  if (!vw || !vh) return null;
  const mapW = getMapW();
  const mapH = getMapH();
  const innerW = Math.max(1, vw - FIT_INSET * 2);
  const innerH = Math.max(1, vh - FIT_INSET * 2);
  const scale = clamp(Math.min(innerW / mapW, innerH / mapH) * FIT_PAD, 0.15, 2.4);
  return {
    scale,
    x: FIT_INSET + (innerW - mapW * scale) / 2,
    y: FIT_INSET + (innerH - mapH * scale) / 2,
  };
}

/** Fit camera to a world-space rect (e.g. zone cluster) instead of the full map. */
export function computeFitBoundsTransform(
  vw: number,
  vh: number,
  bounds: { x: number; y: number; w: number; h: number },
  pad = 48,
): HallView | null {
  if (!vw || !vh || bounds.w <= 0 || bounds.h <= 0) return null;
  const innerW = Math.max(1, vw - pad * 2);
  const innerH = Math.max(1, vh - pad * 2);
  const scale = clamp(Math.min(innerW / bounds.w, innerH / bounds.h) * FIT_PAD, 0.18, 2.4);
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  return {
    scale,
    x: vw / 2 - cx * scale,
    y: vh / 2 - cy * scale,
  };
}
