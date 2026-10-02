export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const FLAT_BOOTH_FULL: ViewBox = { x: 0, y: 0, w: 960, h: 540 };

export const FLAT_BOOTH_ZONES = {
  video: {
    label: "Video wall",
    bounds: { x: 288, y: 118, w: 384, h: 228 },
    frame: { padX: 72, padY: 108, shiftX: 0, shiftY: -42 },
  },
  products: {
    label: "Product display",
    bounds: { x: 48, y: 128, w: 200, h: 268 },
    frame: { padX: 56, padY: 48, shiftX: -32, shiftY: 8 },
  },
  brochures: {
    label: "Brochure rack",
    bounds: { x: 712, y: 138, w: 200, h: 258 },
    frame: { padX: 56, padY: 48, shiftX: 32, shiftY: 8 },
  },
  reception: {
    label: "Reception desk",
    bounds: { x: 298, y: 348, w: 364, h: 150 },
    frame: { padX: 64, padY: 72, shiftX: 0, shiftY: 36 },
  },
} as const;

export type FlatBoothZoneId = keyof typeof FLAT_BOOTH_ZONES;

/** Smaller viewBox = more zoom. Floor prevents cropping to a single panel. */
const MIN_VIEW_W = FLAT_BOOTH_FULL.w * 0.46;
const MIN_VIEW_H = FLAT_BOOTH_FULL.h * 0.46;

function clampViewBox(vb: ViewBox): ViewBox {
  const margin = 12;
  let { x, y, w, h } = vb;
  x = Math.max(-margin, Math.min(x, FLAT_BOOTH_FULL.w - w + margin));
  y = Math.max(-margin, Math.min(y, FLAT_BOOTH_FULL.h - h + margin));
  return { x, y, w, h };
}

/**
 * Walk toward a zone — meaningful pan + zoom, with breathing room around the fixture
 * (like Three.js camera positions, but 2D viewBox).
 */
export function computeNearViewBox(zoneId: FlatBoothZoneId, stageAspect: number): ViewBox {
  const zone = FLAT_BOOTH_ZONES[zoneId];
  const b = zone.bounds;
  const f = zone.frame;

  let w = b.w + f.padX * 2;
  let h = b.h + f.padY * 2;
  const cx = b.x + b.w / 2 + f.shiftX;
  const cy = b.y + b.h / 2 + f.shiftY;

  const aspect = stageAspect > 0.25 ? stageAspect : 16 / 9;
  const frameAspect = w / h;
  if (frameAspect > aspect) {
    h = w / aspect;
  } else {
    w = h * aspect;
  }

  w = Math.max(w, MIN_VIEW_W);
  h = Math.max(h, MIN_VIEW_H);

  return clampViewBox({ x: cx - w / 2, y: cy - h / 2, w, h });
}
