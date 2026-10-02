import type { Stall } from "@/types/expo";

/** Change this number — hall map expands and shows that many stalls. */
export const STALL_COUNT = 100;

export interface AisleH {
  id: string;
  y: number;
  x0: number;
  x1: number;
  label: string;
}

export interface AisleV {
  id: string;
  x: number;  
  y0: number;
  y1: number;
}

export interface HallLayout {
  mapW: number;
  mapH: number;
  aisleH: AisleH[];
  aisleV: AisleV[];
  spawn: { x: number; y: number };
  entryZone: { x: number; y: number; w: number; h: number };
  stalls: Stall[];
}

const COMPANY_POOL = [
  { company: "Tata Steel Tubes", about: "ERW & seamless tubes for process plants." },
  { company: "Jindal Stainless", about: "Architectural stainless sheets and coils." },
  { company: "Apollo Pipes", about: "Polymer & metal hybrid piping systems." },
  { company: "Ismt Seamless", about: "Precision seamless tubes for automotive OEMs." },
  { company: "Ratnamani Metals", about: "Large-diameter welded pipes." },
  { company: "Welspun Corp", about: "Line pipes & plates." },
  { company: "Surya Roshni", about: "Lighting + steel products pavilion." },
  { company: "Mahavir Rolling", about: "Hot-rolled sections." },
  { company: "Metal Craft Expo", about: "Premium pavilion with full media wall." },
  { company: "Bhushan Steel", about: "Cold-rolled coils and coated sheets." },
  { company: "Uttam Galva", about: "Galvanized & galvalume products." },
  { company: "Shah Alloys", about: "Stainless flat products." },
  { company: "Electrosteel", about: "Ductile iron pipes for utilities." },
  { company: "JSW Steel", about: "Flat and long steel products." },
  { company: "SAIL Plate Mill", about: "Heavy plates for fabrication." },
  { company: "Kirloskar Ferrous", about: "Pig iron and castings." },
  { company: "Mukand Ltd", about: "Alloy steel bars and wires." },
  { company: "Godawari Power", about: "Pellets and sponge iron." },
  { company: "APL Apollo", about: "Structural steel tubes." },
  { company: "Hindalco Extrusions", about: "Aluminium profiles for industry." },
];

const COLOR_POOL = [
  "#D1102F",
  "#3A3B9C",
  "#25C08B",
  "#FFB020",
  "#E0517B",
  "#4DA3FF",
  "#9B59B6",
  "#16A085",
  "#F0405E",
  "#E8A85A",
  "#3DD6C3",
  "#8899FF",
];

const STALL_W = 160;
const STALL_H = 110;
const COL_GAP = 40;
const ROW_AISLE = 90;
const MARGIN_X = 100;
const MARGIN_TOP = 90;
const ENTRY_PAD = 130;
const ROW_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function colsFor(count: number): number {
  if (count <= 3) return count;
  if (count <= 8) return 4;
  if (count <= 15) return 5;
  if (count <= 28) return 6;
  if (count <= 45) return 7;
  return 8;
}

export function buildHallLayout(count = STALL_COUNT): HallLayout {
  const n = Math.max(1, Math.floor(count));
  const cols = colsFor(n);
  const rows = Math.ceil(n / cols);

  const gridW = cols * STALL_W + (cols - 1) * COL_GAP;
  const aisleX0 = MARGIN_X - 20;
  const aisleX1 = MARGIN_X + gridW + 20;
  const mapW = Math.max(1600, aisleX1 + MARGIN_X + 80);

  const aisleH: AisleH[] = [];
  const stalls: Stall[] = [];

  for (let r = 0; r < rows; r++) {
    const stallY = MARGIN_TOP + r * (STALL_H + ROW_AISLE);
    const aisleY = stallY + STALL_H + ROW_AISLE / 2;
    const letter = ROW_LETTERS[r % ROW_LETTERS.length];
    aisleH.push({
      id: `h${letter}${r}`,
      y: aisleY,
      x0: aisleX0,
      x1: aisleX1,
      label: `Aisle ${letter}`,
    });

    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (i >= n) break;
      const seed = COMPANY_POOL[i % COMPANY_POOL.length];
      const batch = Math.floor(i / COMPANY_POOL.length);
      const num = String(10 + c * 2).padStart(2, "0");
      const id = `${letter.toLowerCase()}${num}${batch ? `-${batch}` : ""}`;
      const code = `${letter}-${num}${batch ? String.fromCharCode(97 + ((batch - 1) % 26)) : ""}`;
      stalls.push({
        id,
        code,
        company: batch ? `${seed.company} ${batch + 1}` : seed.company,
        color: COLOR_POOL[i % COLOR_POOL.length],
        live: (i * 3) % 6,
        x: MARGIN_X + c * (STALL_W + COL_GAP),
        y: stallY,
        w: STALL_W,
        h: STALL_H,
        about: seed.about,
      });
    }
  }

  const lastAisleY = aisleH[aisleH.length - 1]?.y ?? MARGIN_TOP + STALL_H;
  const entryY = lastAisleY + ENTRY_PAD * 0.55;
  aisleH.push({
    id: "hEntry",
    y: entryY,
    x0: aisleX0,
    x1: aisleX1,
    label: "Entry",
  });

  const firstAisleY = aisleH[0].y;
  const aisleV: AisleV[] = [
    { id: "vL", x: aisleX0 + 10, y0: firstAisleY, y1: entryY },
    { id: "vR", x: aisleX1 - 10, y0: firstAisleY, y1: entryY },
  ];
  for (let c = 1; c < cols; c++) {
    const x = MARGIN_X + c * (STALL_W + COL_GAP) - COL_GAP / 2;
    aisleV.push({ id: `v${c}`, x, y0: firstAisleY, y1: lastAisleY });
  }
  // Center spine down to entry
  aisleV.push({
    id: "vMid",
    x: (aisleX0 + aisleX1) / 2,
    y0: lastAisleY,
    y1: entryY,
  });

  const mapH = Math.max(900, entryY + ENTRY_PAD);

  return {
    mapW,
    mapH,
    aisleH,
    aisleV,
    spawn: { x: (aisleX0 + aisleX1) / 2, y: entryY },
    entryZone: {
      x: (aisleX0 + aisleX1) / 2 - 110,
      y: entryY - 27,
      w: 220,
      h: 54,
    },
    stalls,
  };
}

const HALL = buildHallLayout(STALL_COUNT);

/** Full-hall master layout (booth lookup / lobby Enter hall). */
export const MAP_W = HALL.mapW;
export const MAP_H = HALL.mapH;
export const AISLE_H = HALL.aisleH;
export const AISLE_V = HALL.aisleV;
export const PLAYER_SPAWN = HALL.spawn;
export const ENTRY_ZONE = HALL.entryZone;
export const STALLS = HALL.stalls;

/** Immutable snapshot of the full hall (zoned overview uses this). */
export const FULL_HALL: HallLayout = {
  mapW: HALL.mapW,
  mapH: HALL.mapH,
  aisleH: HALL.aisleH,
  aisleV: HALL.aisleV,
  spawn: HALL.spawn,
  entryZone: HALL.entryZone,
  stalls: HALL.stalls,
};

export const FIT_PAD = 0.98;
export const FIT_INSET = 6;
export const ENTER_RADIUS = 88;
export const CORNER_R = 48;
export const WALK_SPEED = 175;

/** Active layout for hall engine / geometry (full hall or a zone mini-hall). */
let activeLayout: HallLayout = HALL;

export function getActiveLayout(): HallLayout {
  return activeLayout;
}

export function activateHallLayout(layout: HallLayout): void {
  activeLayout = layout;
}

export function resetHallLayout(): void {
  activeLayout = HALL;
}

export function getMapW(): number {
  return activeLayout.mapW;
}

export function getMapH(): number {
  return activeLayout.mapH;
}

export function getAisleH(): AisleH[] {
  return activeLayout.aisleH;
}

export function getAisleV(): AisleV[] {
  return activeLayout.aisleV;
}

export function getSpawn(): { x: number; y: number } {
  return activeLayout.spawn;
}

export function getEntryZone(): { x: number; y: number; w: number; h: number } {
  return activeLayout.entryZone;
}

export function getActiveStalls(): Stall[] {
  return activeLayout.stalls;
}

/** Rebuild aisles/map for a subset of stalls, keeping company identity. */
export function buildHallLayoutFromStalls(source: Stall[]): HallLayout {
  const layout = buildHallLayout(source.length);
  return {
    ...layout,
    stalls: layout.stalls.map((placed, i) => ({
      ...source[i],
      x: placed.x,
      y: placed.y,
      w: placed.w,
      h: placed.h,
    })),
  };
}

export function getStallById(id: string): Stall | undefined {
  return STALLS.find((s) => s.id === id);
}
