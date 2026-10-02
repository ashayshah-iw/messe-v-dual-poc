import type { Stall } from "@/types/expo";
import {
  FULL_HALL,
  PLAYER_SPAWN,
  STALLS,
  buildHallLayoutFromStalls,
  type HallLayout,
} from "@/data/hall-layout";

/** Fixed zone count for the zoned-hall map. */
export const ZONE_COUNT = 4;

const ZONE_COLORS = [
  "#3DD6C3",
  "#FFB020",
  "#4DA3FF",
  "#E0517B",
  "#9B59B6",
  "#25C08B",
  "#E8A85A",
  "#8899FF",
];

export interface ZoneBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ZonePortal {
  id: string;
  fromZoneId: string;
  toZoneId: string;
  toLabel: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ZoneSection {
  id: string;
  index: number;
  col: number;
  row: number;
  label: string;
  color: string;
  stalls: Stall[];
  /** Real hall stalls in this zone (blurred on overview). */
  previewStalls: Stall[];
  bounds: ZoneBounds;
  /** Mini hall layout (zone booths) shown after enter */
  layout: HallLayout;
  spawn: { x: number; y: number };
  /** Path-side door on the center aisle — walk here to enter. */
  enterPoint: { x: number; y: number };
}

export interface ZoneTravelTile {
  zone: ZoneSection;
  bounds: ZoneBounds;
  enterPoint: { x: number; y: number };
  previewStalls: Stall[];
  isActive: boolean;
}

export interface ZoneTravelMap {
  frame: ZoneBounds;
  label: { x: number; y: number };
  tiles: ZoneTravelTile[];
  aisleH: HallLayout["aisleH"];
  aisleV: HallLayout["aisleV"];
  portals: ZonePortal[];
  blockedRects: ZoneBounds[];
  spawn: { x: number; y: number };
  mapH: number;
}

const DOOR_W = 188;
const DOOR_H = 52;
/** Narrow center aisle — short walks between zone doors. */
const ZONE_GAP_X = 72;
/** Narrow row aisle between top/bottom zones. */
const ZONE_GAP_Y = 56;
/** Overview zone tiles stay compact so cards stay readable. */
const OVERVIEW_ZONE_MAX_W = 360;
const OVERVIEW_ZONE_MAX_H = 280;

/** Mini map under booth Entry — destinations only. */
const TRAVEL_TILE = 168;
const TRAVEL_GAP_X = 96;
const TRAVEL_GAP_Y = 92;
const TRAVEL_FRAME_PAD = 36;
const TRAVEL_BELOW_ENTRY = 72;

/**
 * Spatial slots on the real hall floor:
 *
 *   Zone 3 | Zone 4
 *   -------+-------
 *   Zone 1 | Zone 2
 *            |
 *          Entry
 */
const TREE_SLOTS = [
  { col: 0, row: 1 }, // Zone 1 — bottom left
  { col: 1, row: 1 }, // Zone 2 — bottom right
  { col: 0, row: 0 }, // Zone 3 — top left
  { col: 1, row: 0 }, // Zone 4 — top right
] as const;

function stallCenter(s: Stall) {
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}

/**
 * Place compact zone tiles in a tight 2×2 just above Entry so walks stay short.
 */
function overviewTileNearEntry(
  col: number,
  row: number,
  spineX: number,
  entryY: number,
): ZoneBounds {
  const w = OVERVIEW_ZONE_MAX_W;
  const h = OVERVIEW_ZONE_MAX_H;
  const botRowTop = entryY - 72 - h;
  const topRowTop = botRowTop - ZONE_GAP_Y - h;
  return {
    x: col === 0 ? spineX - ZONE_GAP_X / 2 - w : spineX + ZONE_GAP_X / 2,
    y: row === 0 ? topRowTop : botRowTop,
    w,
    h,
  };
}

/** Fit real zone stalls into the overview tile (blurred backdrop). */
export function mapStallsIntoBounds(
  stalls: Stall[],
  bounds: ZoneBounds,
  pad = 14,
): Stall[] {
  if (!stalls.length) return [];
  const minX = Math.min(...stalls.map((s) => s.x));
  const minY = Math.min(...stalls.map((s) => s.y));
  const maxX = Math.max(...stalls.map((s) => s.x + s.w));
  const maxY = Math.max(...stalls.map((s) => s.y + s.h));
  const srcW = Math.max(1, maxX - minX);
  const srcH = Math.max(1, maxY - minY);
  const innerW = Math.max(1, bounds.w - pad * 2);
  const innerH = Math.max(1, bounds.h - pad * 2);
  const scale = Math.min(innerW / srcW, innerH / srcH);
  const ox = bounds.x + pad + (innerW - srcW * scale) / 2;
  const oy = bounds.y + pad + (innerH - srcH * scale) / 2;
  return stalls.map((s) => ({
    ...s,
    x: ox + (s.x - minX) * scale,
    y: oy + (s.y - minY) * scale,
    w: Math.max(16, s.w * scale),
    h: Math.max(12, s.h * scale),
  }));
}

/**
 * Split the real flat-hall stalls into 2×2 zones with a clear center aisle gap.
 */
export function buildZoneSections(
  stalls: Stall[] = STALLS,
  zoneCount = ZONE_COUNT,
): ZoneSection[] {
  const nZones = Math.min(TREE_SLOTS.length, Math.max(1, Math.floor(zoneCount)));
  if (!stalls.length) return [];

  const centers = stalls.map(stallCenter);
  const midX =
    (Math.min(...centers.map((c) => c.x)) + Math.max(...centers.map((c) => c.x))) / 2;
  const midY =
    (Math.min(...centers.map((c) => c.y)) + Math.max(...centers.map((c) => c.y))) / 2;
  const spineX = PLAYER_SPAWN.x;

  const buckets: Stall[][] = Array.from({ length: nZones }, () => []);
  for (const s of stalls) {
    const c = stallCenter(s);
    const col = c.x < midX ? 0 : 1;
    const row = c.y < midY ? 0 : 1;
    const index = TREE_SLOTS.findIndex((slot) => slot.col === col && slot.row === row);
    buckets[index >= 0 && index < nZones ? index : 0].push(s);
  }

  for (let i = 0; i < nZones; i++) {
    if (buckets[i].length) continue;
    let donorIdx = 0;
    let donorLen = -1;
    buckets.forEach((b, idx) => {
      if (b.length > donorLen) {
        donorLen = b.length;
        donorIdx = idx;
      }
    });
    if (donorLen > 1) buckets[i].push(buckets[donorIdx].pop()!);
  }

  return buckets.map((chunk, index) => {
    const slot = TREE_SLOTS[index] ?? { col: index % 2, row: Math.floor(index / 2) };
    const stallsInZone = chunk.length ? chunk : [stalls[index % stalls.length]];
    const bounds = overviewTileNearEntry(
      slot.col,
      slot.row,
      spineX,
      FULL_HALL.entryZone.y,
    );
    const enterY = bounds.y + bounds.h / 2;
    const enterPoint = {
      x: slot.col === 0 ? bounds.x + bounds.w + ZONE_GAP_X * 0.5 : bounds.x - ZONE_GAP_X * 0.5,
      y: enterY,
    };
    const layout = buildHallLayoutFromStalls(stallsInZone);

    return {
      id: `zone-${index + 1}`,
      index,
      col: slot.col,
      row: slot.row,
      label: `Zone ${index + 1}`,
      color: ZONE_COLORS[index % ZONE_COLORS.length],
      stalls: stallsInZone,
      previewStalls: mapStallsIntoBounds(stallsInZone, bounds),
      bounds,
      layout,
      spawn: { x: spineX, y: enterY },
      enterPoint,
    };
  });
}

export const ZONE_SECTIONS = buildZoneSections();

export const STALLS_PER_ZONE = Math.ceil(STALLS.length / ZONE_COUNT);

/**
 * Overview = full hall floor + short aisles through the compact zone cluster.
 */
export function buildZoneMapLayout(): HallLayout {
  const spineX = PLAYER_SPAWN.x;
  const entry = FULL_HALL.entryZone;
  const zones = [
    overviewTileNearEntry(0, 0, spineX, entry.y),
    overviewTileNearEntry(1, 0, spineX, entry.y),
    overviewTileNearEntry(0, 1, spineX, entry.y),
    overviewTileNearEntry(1, 1, spineX, entry.y),
  ];
  const topY = Math.min(...zones.map((z) => z.y + z.h / 2));
  const botY = Math.max(...zones.map((z) => z.y + z.h / 2));
  const leftMouth = spineX - ZONE_GAP_X / 2;
  const rightMouth = spineX + ZONE_GAP_X / 2;

  return {
    mapW: FULL_HALL.mapW,
    mapH: FULL_HALL.mapH,
    aisleH: [
      {
        id: "zone-row-top",
        y: topY,
        x0: leftMouth - 24,
        x1: rightMouth + 24,
        label: "",
      },
      {
        id: "zone-row-bot",
        y: botY,
        x0: leftMouth - 24,
        x1: rightMouth + 24,
        label: "",
      },
      {
        id: "zone-cross",
        y: (topY + botY) / 2,
        x0: leftMouth - 16,
        x1: rightMouth + 16,
        label: "Center aisle",
      },
      {
        id: "zone-to-entry-h",
        y: entry.y + entry.h / 2,
        x0: Math.min(spineX, entry.x + entry.w / 2) - 8,
        x1: Math.max(spineX, entry.x + entry.w / 2) + 8,
        label: "",
      },
    ],
    aisleV: [
      {
        id: "zone-spine",
        x: spineX,
        y0: topY - 8,
        y1: entry.y + entry.h / 2,
      },
    ],
    spawn: { x: spineX, y: entry.y - 28 },
    entryZone: { ...FULL_HALL.entryZone },
    stalls: [],
  };
}

export const ZONE_MAP_LAYOUT = buildZoneMapLayout();

function travelEnterPoint(bounds: ZoneBounds, side: 0 | 1): { x: number; y: number } {
  return {
    x: side === 0 ? bounds.x + bounds.w + 8 : bounds.x - 8,
    y: bounds.y + bounds.h / 2,
  };
}

/**
 * Destinations under booth Entry after entering a zone (hide current zone).
 */
export function buildZoneTravelMap(
  active: ZoneSection,
  all: ZoneSection[] = ZONE_SECTIONS,
): ZoneTravelMap {
  const entry = active.layout.entryZone;
  const entryCx = entry.x + entry.w / 2;
  const entryBottom = entry.y + entry.h;

  const others = all.filter((z) => z.id !== active.id);
  const cols = others.map((z) => z.col);
  const rows = others.map((z) => z.row);
  const minCol = cols.length ? Math.min(...cols) : 0;
  const maxCol = cols.length ? Math.max(...cols) : 0;
  const minRow = rows.length ? Math.min(...rows) : 0;
  const maxRow = rows.length ? Math.max(...rows) : 0;
  const colCount = Math.max(1, maxCol - minCol + 1);
  const rowCount = Math.max(1, maxRow - minRow + 1);

  const gridW = colCount * TRAVEL_TILE + Math.max(0, colCount - 1) * TRAVEL_GAP_X;
  const gridH = rowCount * TRAVEL_TILE + Math.max(0, rowCount - 1) * TRAVEL_GAP_Y;
  const gridLeft = entryCx - gridW / 2;
  const travelTop = entryBottom + TRAVEL_BELOW_ENTRY;

  const tileAt = (col: number, row: number): ZoneBounds => ({
    x: gridLeft + (col - minCol) * (TRAVEL_TILE + TRAVEL_GAP_X),
    y: travelTop + (row - minRow) * (TRAVEL_TILE + TRAVEL_GAP_Y),
    w: TRAVEL_TILE,
    h: TRAVEL_TILE,
  });

  const leftCols = others.filter((z) => z.col === minCol);
  const rightCols = others.filter((z) => z.col === maxCol && maxCol !== minCol);
  const midX =
    leftCols.length && rightCols.length
      ? (tileAt(minCol, minRow).x + TRAVEL_TILE + tileAt(maxCol, minRow).x) / 2
      : entryCx;

  const tiles: ZoneTravelTile[] = others.map((zone) => {
    const bounds = tileAt(zone.col, zone.row);
    const cx = bounds.x + bounds.w / 2;
    return {
      zone,
      bounds,
      enterPoint: travelEnterPoint(bounds, cx <= midX ? 0 : 1),
      previewStalls: [],
      isActive: false,
    };
  });

  const branchYs = [...new Set(others.map((z) => tileAt(z.col, z.row).y + TRAVEL_TILE / 2))].sort(
    (a, b) => a - b,
  );
  const topBranchY = branchYs[0] ?? travelTop + TRAVEL_TILE / 2;
  const bottomBranchY = branchYs[branchYs.length - 1] ?? topBranchY;
  const leftMouth = leftCols.length
    ? tileAt(minCol, leftCols[0].row).x + TRAVEL_TILE
    : midX;
  const rightMouth = rightCols.length ? tileAt(maxCol, rightCols[0].row).x : midX;

  const aisleH: HallLayout["aisleH"] = [];
  const aisleV: HallLayout["aisleV"] = [];

  for (const y of branchYs) {
    aisleH.push({
      id: `travel-branch-${y}`,
      y,
      x0: Math.min(leftMouth, rightMouth, midX) - 4,
      x1: Math.max(leftMouth, rightMouth, midX) + 4,
      label: "",
    });
  }
  aisleV.push({ id: "travel-spine", x: midX, y0: topBranchY, y1: bottomBranchY });

  const linkY = travelTop - 24;
  aisleV.push({ id: "travel-from-booth", x: entryCx, y0: entryBottom - 2, y1: linkY });
  if (Math.abs(entryCx - midX) > 4) {
    aisleH.push({
      id: "travel-to-spine",
      y: linkY,
      x0: Math.min(entryCx, midX),
      x1: Math.max(entryCx, midX),
      label: "",
    });
  }
  aisleV.push({ id: "travel-spine-in", x: midX, y0: linkY, y1: bottomBranchY });

  for (const t of tiles) {
    aisleH.push({
      id: `travel-door-${t.zone.id}`,
      y: t.enterPoint.y,
      x0: Math.min(midX, t.enterPoint.x),
      x1: Math.max(midX, t.enterPoint.x),
      label: "",
    });
  }

  const portals: ZonePortal[] = tiles.map((t) => ({
    id: `portal-${active.id}-to-${t.zone.id}`,
    fromZoneId: active.id,
    toZoneId: t.zone.id,
    toLabel: t.zone.label,
    color: t.zone.color,
    x: t.enterPoint.x - DOOR_W / 2,
    y: t.enterPoint.y - DOOR_H / 2,
    w: DOOR_W,
    h: DOOR_H,
  }));

  const frame: ZoneBounds = {
    x: gridLeft - TRAVEL_FRAME_PAD,
    y: linkY - 40,
    w: gridW + TRAVEL_FRAME_PAD * 2,
    h: gridH + TRAVEL_FRAME_PAD * 2 + (travelTop - linkY) + 24,
  };

  return {
    frame,
    label: { x: frame.x + 16, y: frame.y + 12 },
    tiles,
    aisleH,
    aisleV,
    portals,
    blockedRects: tiles.map((t) => t.bounds),
    spawn: { x: midX, y: linkY + 20 },
    mapH: frame.y + frame.h + 80,
  };
}

export function getZoneByStallId(stallId: string, zones = ZONE_SECTIONS): ZoneSection | null {
  return zones.find((z) => z.stalls.some((s) => s.id === stallId)) ?? null;
}

export function pointInZone(x: number, y: number, zone: ZoneSection): boolean {
  return (
    x >= zone.bounds.x &&
    x <= zone.bounds.x + zone.bounds.w &&
    y >= zone.bounds.y &&
    y <= zone.bounds.y + zone.bounds.h
  );
}

export function pointInAnyZone(x: number, y: number, zones: ZoneSection[]): boolean {
  return zones.some((z) => pointInZone(x, y, z));
}

export function membersInZone(
  zone: ZoneSection,
  avatars: { x: number; y: number; stallId?: string | null }[],
): number {
  const stallIds = new Set(zone.stalls.map((s) => s.id));
  return avatars.filter(
    (a) =>
      (a.stallId && stallIds.has(a.stallId)) ||
      (!a.stallId && pointInZone(a.x, a.y, zone)),
  ).length;
}
