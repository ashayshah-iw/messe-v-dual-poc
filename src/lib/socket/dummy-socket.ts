import type { Point, PresenceUser, Stall } from "@/types/expo";
import { buildAisleWaypoints, snapToAisle } from "@/lib/hall/geometry";

/** Change this number to spawn that many dummy remote visitors. */
export const DUMMY_REMOTE_COUNT = 30;

const NAME_POOL = [
  { label: "RK", name: "Riya Kapoor" },
  { label: "AM", name: "Arjun Mehta" },
  { label: "PS", name: "Priya Shah" },
  { label: "VK", name: "Vikram Khan" },
  { label: "NS", name: "Neha Singh" },
  { label: "JD", name: "Jay Desai" },
  { label: "SR", name: "Sana Reddy" },
  { label: "KT", name: "Kabir Thakur" },
  { label: "IM", name: "Isha Malhotra" },
  { label: "DN", name: "Dev Nair" },
  { label: "AL", name: "Ananya Lal" },
  { label: "RB", name: "Rohan Bhat" },
  { label: "MG", name: "Meera Gupta" },
  { label: "HJ", name: "Harsh Joshi" },
  { label: "TP", name: "Tara Patel" },
  { label: "YC", name: "Yash Chauhan" },
  { label: "LF", name: "Leena Fernandes" },
  { label: "OV", name: "Om Verma" },
  { label: "ZD", name: "Zara D'Souza" },
  { label: "PK", name: "Parth Kulkarni" },
];

const COLOR_POOL = [
  "#4DA3FF",
  "#25C08B",
  "#E0517B",
  "#9B59B6",
  "#16A085",
  "#F0405E",
  "#FFB020",
  "#3A3B9C",
  "#D1102F",
  "#E8A85A",
  "#3DD6C3",
  "#8899FF",
];

function buildRemoteSeeds(count: number) {
  const n = Math.max(0, Math.floor(count));
  return Array.from({ length: n }, (_, i) => {
    const person = NAME_POOL[i % NAME_POOL.length];
    const suffix = i >= NAME_POOL.length ? String(Math.floor(i / NAME_POOL.length) + 1) : "";
    return {
      id: `u-${person.label.toLowerCase()}${suffix || i}`,
      label: person.label,
      name: suffix ? `${person.name} ${suffix}` : person.name,
      color: COLOR_POOL[i % COLOR_POOL.length],
    };
  });
}

export interface HallSocketConfig {
  stalls: Stall[];
  snapToAisle: (p: Point) => Point;
  pathPts: (from: Point, to: Point) => Point[];
  randomAislePoint: () => Point;
  /** Override default dummy visitor count */
  remoteCount?: number;
}

type SocketEvent = "open" | "close" | "presence" | "status";

interface RemoteUser {
  id: string;
  label: string;
  name: string;
  color: string;
  x: number;
  y: number;
  direction: string;
  stallId: string | null;
  path: Point[];
  idle: number;
  walkSpeed: number;
  target: { x: number; y: number; stallId: string | null; stall: Stall | null } | null;
}

export class DummySocket {
  private listeners: Record<SocketEvent, Array<(p: unknown) => void>> = {
    open: [],
    close: [],
    presence: [],
    status: [],
  };
  connected = false;
  private remotes: Record<string, RemoteUser> = {};
  private timer: ReturnType<typeof setInterval> | null = null;
  private openDelay: ReturnType<typeof setTimeout> | null = null;
  private lastSent = 0;

  constructor(private hall: HallSocketConfig) {}

  on(event: SocketEvent, fn: (payload: unknown) => void) {
    this.listeners[event].push(fn);
    return this;
  }

  private emit(event: SocketEvent, payload: unknown) {
    this.listeners[event].forEach((fn) => fn(payload));
  }

  connect() {
    this.emit("status", { state: "connecting" });
    this.spawnRemotes();
    this.openDelay = setTimeout(() => {
      this.connected = true;
      this.emit("status", { state: "open", simulated: true });
      this.emit("open", {});
      this.broadcast();
      this.timer = setInterval(() => this.tick(), 120);
    }, 380);
    return this;
  }

  disconnect() {
    if (this.openDelay) clearTimeout(this.openDelay);
    if (this.timer) clearInterval(this.timer);
    this.openDelay = null;
    this.timer = null;
    this.connected = false;
    this.emit("status", { state: "closed" });
    this.emit("close", {});
  }

  sendPresence(payload: { x: number; y: number; direction?: string; stallId?: string | null }) {
    if (!this.connected) return;
    const now = Date.now();
    if (now - this.lastSent < 50) return;
    this.lastSent = now;
    this.emit("presence", {
      type: "local",
      user: {
        id: "u-me",
        label: "YOU",
        name: "You",
        color: "#FFB020",
        x: payload.x,
        y: payload.y,
        direction: payload.direction || "down",
        stallId: payload.stallId || null,
        me: true,
      },
      ts: now,
    });
  }

  private spawnRemotes() {
    const { stalls, randomAislePoint } = this.hall;
    const count = this.hall.remoteCount ?? DUMMY_REMOTE_COUNT;
    const seeds = buildRemoteSeeds(count);
    this.remotes = {};
    seeds.forEach((seed, i) => {
      const stall = stalls.length ? stalls[i % stalls.length] : null;
      const inBooth = Boolean(stall) && Math.random() > 0.5;
      const p = snapToAisle(randomAislePoint());
      this.remotes[seed.id] = {
        ...seed,
        // Floor spawns stay on aisles; booth spawns sit at stall center until they leave
        x: inBooth && stall ? stall.x + stall.w / 2 : p.x,
        y: inBooth && stall ? stall.y + stall.h / 2 : p.y,
        direction: "down",
        stallId: inBooth && stall ? stall.id : null,
        path: [],
        idle: 0.4 + Math.random() * 1.2,
        walkSpeed: 65 + Math.random() * 45,
        target: null,
      };
    });
  }

  private pickTarget(_user: RemoteUser) {
    const { stalls, randomAislePoint } = this.hall;
    if (stalls.length && Math.random() > 0.42) {
      const stall = stalls[Math.floor(Math.random() * stalls.length)];
      return {
        x: stall.x + stall.w / 2,
        y: stall.y + stall.h / 2,
        stallId: stall.id,
        stall,
      };
    }
    const p = snapToAisle(randomAislePoint());
    return { x: p.x, y: p.y, stallId: null, stall: null };
  }

  private stepRemote(user: RemoteUser, dt: number) {
    if (user.path.length) {
      const t = user.path[0];
      const dx = t.x - user.x;
      const dy = t.y - user.y;
      const d = Math.hypot(dx, dy);
      if (d < 2.5) {
        user.x = t.x;
        user.y = t.y;
        user.path.shift();
        return;
      }
      const sp = user.walkSpeed * (d < 22 ? Math.max(0.35, d / 22) : 1);
      user.x += (dx / d) * sp * dt;
      user.y += (dy / d) * sp * dt;
      user.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      // While traveling between waypoints, clear booth occupancy until final stall enter
      if (user.target?.stallId) user.stallId = null;
      return;
    }
    user.idle -= dt;
    if (user.idle > 0) return;
    const target = this.pickTarget(user);
    user.target = target;
    // Same aisle routing as the player — via H/V aisles, then short step into booth if needed
    user.path = buildAisleWaypoints(
      { x: user.x, y: user.y },
      { x: target.x, y: target.y },
      target.stall,
    );
    user.idle = 0.9 + Math.random() * 2.5;
    if (!user.path.length) user.stallId = target.stallId;
  }

  private tick() {
    const dt = 0.12;
    Object.values(this.remotes).forEach((u) => {
      const hadPath = u.path.length > 0;
      this.stepRemote(u, dt);
      if (hadPath && !u.path.length && u.target) {
        u.stallId = u.target.stallId;
        u.target = null;
      }
    });
    this.broadcast();
  }

  private broadcast() {
    const users: PresenceUser[] = Object.values(this.remotes).map((u) => ({
      id: u.id,
      label: u.label,
      name: u.name,
      color: u.color,
      x: u.x,
      y: u.y,
      direction: u.direction,
      stallId: u.stallId,
      me: false,
    }));
    this.emit("presence", { type: "snapshot", users, ts: Date.now() });
  }
}

export function connectSocket(hall: HallSocketConfig) {
  return new DummySocket(hall).connect();
}
