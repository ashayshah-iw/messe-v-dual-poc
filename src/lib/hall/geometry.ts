import type { Point, Stall } from "@/types/expo";
import { CORNER_R, getAisleH, getAisleV } from "@/data/hall-layout";

export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function dist2(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function nearestH(y: number) {
  const aisles = getAisleH();
  let best = aisles[0];
  let bestD = Infinity;
  for (const h of aisles) {
    const d = Math.abs(h.y - y);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  return best;
}

export function nearestV(x: number) {
  const aisles = getAisleV();
  let best = aisles[0];
  let bestD = Infinity;
  for (const v of aisles) {
    const d = Math.abs(v.x - x);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

export function snapToAisle(p: Point): Point {
  const h = nearestH(p.y);
  const v = nearestV(p.x);
  const onH = { x: clamp(p.x, h.x0, h.x1), y: h.y };
  const onV = { x: v.x, y: clamp(p.y, v.y0, v.y1) };
  return dist2(p, onH) <= dist2(p, onV) ? onH : onV;
}

export function onAisle(x: number, y: number): boolean {
  const aisleH = getAisleH();
  const aisleV = getAisleV();
  return (
    aisleH.some((h) => Math.abs(y - h.y) <= 14 && x >= h.x0 - 4 && x <= h.x1 + 4) ||
    aisleV.some((v) => Math.abs(x - v.x) <= 14 && y >= v.y0 - 4 && y <= v.y1 + 4)
  );
}

export function randomAislePoint(): Point {
  const aisleH = getAisleH().filter((a) => !a.id.startsWith("travel-"));
  const aisleV = getAisleV().filter((a) => !a.id.startsWith("travel-"));
  const hPool = aisleH.length ? aisleH : getAisleH();
  const vPool = aisleV.length ? aisleV : getAisleV();
  if (Math.random() < 0.55 && hPool.length) {
    const h = hPool[Math.floor(Math.random() * hPool.length)];
    return { x: h.x0 + Math.random() * (h.x1 - h.x0), y: h.y };
  }
  if (vPool.length) {
    const v = vPool[Math.floor(Math.random() * vPool.length)];
    return { x: v.x, y: v.y0 + Math.random() * (v.y1 - v.y0) };
  }
  const h = hPool[0];
  return { x: (h.x0 + h.x1) / 2, y: h.y };
}

export function pathPts(from: Point, to: Point): Point[] {
  return buildAisleWaypoints(from, to, null).filter((p, i, arr) => {
    if (i === 0 && dist2(from, p) < 3) return false;
    return i === 0 || dist2(arr[i - 1], p) > 3;
  });
}

export function stallApproach(stall: Stall): Point {
  const cx = stall.x + stall.w / 2;
  const frontY = stall.y + stall.h + 8;
  const h = nearestH(frontY);
  return { x: clamp(cx, h.x0, h.x1), y: h.y };
}

function smoothWaypoints(pts: Point[], radius: number): string {
  if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : "";
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const next = pts[i + 1];
    const d1 = dist2(prev, cur);
    const d2 = dist2(cur, next);
    if (d1 < 2 || d2 < 2) continue;
    const r = Math.min(radius, d1 * 0.45, d2 * 0.45);
    const ux1 = (cur.x - prev.x) / d1;
    const uy1 = (cur.y - prev.y) / d1;
    const ux2 = (next.x - cur.x) / d2;
    const uy2 = (next.y - cur.y) / d2;
    d += ` L ${cur.x - ux1 * r} ${cur.y - uy1 * r}`;
    d += ` Q ${cur.x} ${cur.y} ${cur.x + ux2 * r} ${cur.y + uy2 * r}`;
  }
  d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
  return d;
}

/** Route along real H/V aisles (Manhattan via nearest vertical connector) — never cut through stalls. */
export function buildAisleWaypoints(from: Point, to: Point, intoStall: Stall | null): Point[] {
  const start = snapToAisle(from);
  const endAisle = intoStall ? stallApproach(intoStall) : snapToAisle(to);
  const pts: Point[] = [{ x: from.x, y: from.y }];

  const push = (p: Point) => {
    const prev = pts[pts.length - 1];
    if (dist2(prev, p) > 8) pts.push(p);
  };

  push(start);

  if (Math.abs(start.y - endAisle.y) < 3) {
    push(endAisle);
  } else if (Math.abs(start.x - endAisle.x) < 3) {
    push(endAisle);
  } else {
    const v = nearestV((start.x + endAisle.x) / 2);
    const hStart = nearestH(start.y);
    const hEnd = nearestH(endAisle.y);
    const alongStart = {
      x: clamp(v.x, hStart.x0, hStart.x1),
      y: hStart.y,
    };
    const alongEnd = {
      x: clamp(v.x, hEnd.x0, hEnd.x1),
      y: hEnd.y,
    };
    const up = { x: v.x, y: clamp(hStart.y, v.y0, v.y1) };
    const down = { x: v.x, y: clamp(hEnd.y, v.y0, v.y1) };
    push(alongStart.x === start.x && alongStart.y === start.y ? up : alongStart);
    if (dist2(pts[pts.length - 1], up) > 6) push(up);
    if (dist2(pts[pts.length - 1], down) > 6) push(down);
    push(alongEnd);
    push(endAisle);
  }

  if (intoStall) {
    const door = { x: intoStall.x + intoStall.w / 2, y: intoStall.y + intoStall.h / 2 };
    push(door);
  } else if (dist2(pts[pts.length - 1], to) > 12 && onAisle(to.x, to.y)) {
    push(to);
  }

  return pts;
}

export function aislePath(from: Point, to: Point, intoStall: Stall | null): string {
  return smoothWaypoints(buildAisleWaypoints(from, to, intoStall), CORNER_R);
}

export function pathLengthApprox(from: Point, to: Point, intoStall: Stall | null): number {
  const pts = buildAisleWaypoints(from, to, intoStall);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += dist2(pts[i - 1], pts[i]);
  return len || 120;
}

export function nearestStallToPlayer(me: Point, stalls: Stall[], enterRadius: number): Stall | null {
  let best: Stall | null = null;
  let bestD = Infinity;
  for (const s of stalls) {
    const door = { x: s.x + s.w / 2, y: s.y + s.h + 14 };
    const d = dist2(me, door);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return bestD <= enterRadius ? best : null;
}
