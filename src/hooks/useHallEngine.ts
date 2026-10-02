"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import {
  ENTER_RADIUS,
  WALK_SPEED,
  getActiveStalls,
  getMapH,
  getMapW,
  getSpawn,
} from "@/data/hall-layout";
import {
  aislePath,
  clamp,
  nearestStallToPlayer,
  onAisle,
  pathLengthApprox,
  pathPts,
  randomAislePoint,
  snapToAisle,
} from "@/lib/hall/geometry";
import { clampPan, computeFitTransform } from "@/lib/hall/map-view";
import { connectSocket, type DummySocket } from "@/lib/socket/dummy-socket";
import { runCurtainTransition, withViewTransition } from "@/lib/transitions";
import type { Avatar, FeedEvent, HallView, PocMode, Point, Stall } from "@/types/expo";
import { useToast } from "@/components/providers/ToastProvider";

if (typeof window !== "undefined") {
  gsap.registerPlugin(MotionPathPlugin);
}

function createMe(): Avatar {
  const spawn = getSpawn();
  return {
    id: "me",
    label: "YOU",
    name: "You",
    color: "#FFB020",
    me: true,
    x: spawn.x,
    y: spawn.y,
    stallId: null,
    path: [],
    idle: 0,
    walkSpeed: WALK_SPEED,
  };
}

function cloneAvatars(list: Avatar[]): Avatar[] {
  return list.map((a) => ({ ...a, path: [...a.path] }));
}

export function useHallEngine(
  mode: PocMode,
  opts?: {
    autoFit?: boolean;
    /** When true, map cannot be panned or zoomed — view stays fitted. */
    lockView?: boolean;
    /** World rect to keep framed while lockView is on (re-fit on resize). */
    lockBounds?: { x: number; y: number; w: number; h: number } | null;
    /** Block walking into these rects (solid zone tiles on overview). */
    blockedRects?: { x: number; y: number; w: number; h: number }[];
  },
) {
  const autoFit = opts?.autoFit !== false;
  const lockView = Boolean(opts?.lockView);
  const lockBounds = opts?.lockBounds ?? null;
  const lockViewRef = useRef(lockView);
  lockViewRef.current = lockView;
  const lockBoundsRef = useRef(lockBounds);
  lockBoundsRef.current = lockBounds;
  const router = useRouter();
  const { showToast } = useToast();

  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<SVGPathElement>(null);

  const keysRef = useRef(new Set<string>());
  const hallViewRef = useRef<HallView>({ scale: 1, x: 0, y: 0 });
  const fitScaleRef = useRef(0.4);
  const followPlayerRef = useRef(false);
  const walkingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const socketRef = useRef<DummySocket | null>(null);
  const avatarsRef = useRef<Avatar[]>([createMe()]);
  const nearbyStallIdRef = useRef<string | null>(null);
  const allowedStallIdsRef = useRef<string[] | null>(null);
  const blockedRectsRef = useRef(opts?.blockedRects ?? []);
  blockedRectsRef.current = opts?.blockedRects ?? [];

  const isBlocked = useCallback((x: number, y: number) => {
    if (
      blockedRectsRef.current.some(
        (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h,
      )
    ) {
      return true;
    }
    // Stay out of booth interiors — walk aisles only (approach / Enter to go in)
    return getActiveStalls().some(
      (s) => x >= s.x + 4 && x <= s.x + s.w - 4 && y >= s.y + 4 && y <= s.y + s.h - 4,
    );
  }, []);

  const walkTweenRef = useRef<gsap.core.Tween | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const [avatars, setAvatars] = useState<Avatar[]>([createMe()]);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [hallView, setHallView] = useState<HallView>({ scale: 1, x: 0, y: 0 });
  const [nearbyStallId, setNearbyStallId] = useState<string | null>(null);
  const [keysDown, setKeysDown] = useState<Set<string>>(new Set());
  const [sockStatus, setSockStatus] = useState("offline");
  const [sockTick, setSockTick] = useState("—");
  const [entered, setEntered] = useState(false);
  const [walkPath, setWalkPath] = useState("");
  const [walkingStallId, setWalkingStallId] = useState<string | null>(null);

  const me = avatars.find((a) => a.me);

  const pushFeed = useCallback((ev: Omit<FeedEvent, "when"> & { when?: string }) => {
    setFeed((prev) => [{ ...ev, when: ev.when ?? "now" }, ...prev].slice(0, 18));
  }, []);

  const syncAvatarsToReact = useCallback(() => {
    setAvatars(cloneAvatars(avatarsRef.current));
  }, []);

  const applyView = useCallback((view: HallView) => {
    hallViewRef.current = view;
    setHallView(view);
  }, []);

  const fitHallView = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const fit = computeFitTransform(vp.clientWidth, vp.clientHeight);
    if (!fit) return;
    fitScaleRef.current = fit.scale;
    followPlayerRef.current = false;
    applyView(fit);
  }, [applyView]);

  const setMapTransform = useCallback(
    (panX: number, panY: number, scale: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const p = clampPan(panX, panY, scale, vp.clientWidth, vp.clientHeight);
      applyView({ x: p.x, y: p.y, scale });
    },
    [applyView],
  );

  const followCamera = useCallback(
    (x: number, y: number) => {
      if (lockViewRef.current) return;
      if (!followPlayerRef.current) return;
      const scale = hallViewRef.current.scale;
      if (scale < (fitScaleRef.current || 0.32) * 1.04) return;
      const vp = viewportRef.current;
      if (!vp) return;
      setMapTransform(-x * scale + vp.clientWidth / 2, -y * scale + vp.clientHeight * 0.55, scale);
    },
    [setMapTransform],
  );

  const hallZoomAt = useCallback(
    (factor: number, focusX?: number, focusY?: number) => {
      if (lockViewRef.current) return;
      const vp = viewportRef.current;
      if (!vp) return;
      const oldS = hallViewRef.current.scale;
      const minS = Math.min(0.12, (fitScaleRef.current || 0.2) * 0.9);
      const newS = clamp(oldS * factor, minS, 2.4);
      if (fitScaleRef.current && newS <= fitScaleRef.current * 1.02) {
        fitHallView();
        return;
      }
      const mx = focusX ?? vp.clientWidth / 2;
      const my = focusY ?? vp.clientHeight / 2;
      const wx = (mx - hallViewRef.current.x) / oldS;
      const wy = (my - hallViewRef.current.y) / oldS;
      setMapTransform(mx - wx * newS, my - wy * newS, newS);
    },
    [fitHallView, setMapTransform],
  );

  const cancelPlayerWalk = useCallback(() => {
    walkTweenRef.current?.kill();
    walkTweenRef.current = null;
    walkingRef.current = false;
    setWalkPath("");
    setWalkingStallId(null);
  }, []);

  const focusRect = useCallback(
    (
      rect: { x: number; y: number; w: number; h: number },
      opts?: { animate?: boolean; pad?: number; duration?: number; scaleMul?: number },
    ) => {
      const vp = viewportRef.current;
      if (!vp || !rect.w || !rect.h) return;
      const pad = opts?.pad ?? 56;
      const scaleMul = opts?.scaleMul ?? 1;
      const scale = clamp(
        Math.min(vp.clientWidth / (rect.w + pad * 2), vp.clientHeight / (rect.h + pad * 2)) * scaleMul,
        0.18,
        2.2,
      );
      const x = -rect.x * scale + (vp.clientWidth - rect.w * scale) / 2;
      const y = -rect.y * scale + (vp.clientHeight - rect.h * scale) / 2;
      const next = lockViewRef.current
        ? { x, y, scale }
        : (() => {
            const p = clampPan(x, y, scale, vp.clientWidth, vp.clientHeight);
            return { x: p.x, y: p.y, scale };
          })();
      followPlayerRef.current = false;
      fitScaleRef.current = scale;

      if (opts?.animate) {
        const from = { ...hallViewRef.current };
        const to = next;
        gsap.killTweensOf(from);
        gsap.to(from, {
          x: to.x,
          y: to.y,
          scale: to.scale,
          duration: opts.duration ?? 0.9,
          ease: "power2.inOut",
          onUpdate: () => applyView({ x: from.x, y: from.y, scale: from.scale }),
          onComplete: () => applyView(to),
        });
        return;
      }
      applyView(next);
    },
    [applyView],
  );

  const teleportMe = useCallback(
    (x: number, y: number) => {
      const meA = avatarsRef.current.find((a) => a.me);
      if (!meA) return;
      cancelPlayerWalk();
      const snapped = snapToAisle({ x, y });
      meA.x = snapped.x;
      meA.y = snapped.y;
      meA.path = [];
      meA.stallId = null;
      syncAvatarsToReact();
    },
    [cancelPlayerWalk, syncAvatarsToReact],
  );

  const enterBooth = useCallback(
    (stallId: string) => {
      const path = `/booth/${modeRef.current}/${stallId}`;
      void runCurtainTransition(() => {
        withViewTransition(() => router.push(path));
      });
    },
    [router],
  );

  const followAgentPath = (agent: Avatar, dt: number) => {
    if (!agent.path.length) return false;
    const t = agent.path[0];
    const dx = t.x - agent.x;
    const dy = t.y - agent.y;
    const d = Math.hypot(dx, dy);
    if (d < 2.4) {
      agent.x = t.x;
      agent.y = t.y;
      agent.path.shift();
      return true;
    }
    const sp = (agent.walkSpeed || 120) * (d < 24 ? Math.max(0.4, d / 24) : 1);
    agent.x += (dx / d) * sp * dt;
    agent.y += (dy / d) * sp * dt;
    return true;
  };

  const walkToStall = useCallback(
    (stall: Stall) => {
      if (walkingRef.current) return;
      const meA = avatarsRef.current.find((a) => a.me);
      if (!meA) return;

      cancelPlayerWalk();
      meA.path = [];
      walkingRef.current = true;
      followPlayerRef.current = true;
      setWalkingStallId(stall.id);

      const from = { x: meA.x, y: meA.y };
      const to = { x: stall.x + stall.w / 2, y: stall.y + stall.h / 2 };
      const d = aislePath(from, to, stall);
      const dur = Math.min(5, Math.max(2.4, pathLengthApprox(from, to, stall) / 180));
      setWalkPath(d);
      pushFeed({ label: "YOU", name: "You", color: "#FFB020", me: true, action: `walking to ${stall.code}` });

      requestAnimationFrame(() => {
        const trail = trailRef.current;
        if (trail?.getTotalLength) {
          const len = trail.getTotalLength();
          trail.style.strokeDasharray = String(len);
          trail.style.strokeDashoffset = String(len);
          gsap.to(trail, { strokeDashoffset: 0, duration: dur, ease: "power2.inOut" });
        }
      });

      followCamera(from.x, from.y);
      const proxy = { x: from.x, y: from.y };
      walkTweenRef.current = gsap.to(proxy, {
        duration: dur,
        ease: "power2.inOut",
        motionPath: { path: d },
        onUpdate: () => {
          meA.x = proxy.x;
          meA.y = proxy.y;
          meA.stallId = null;
          syncAvatarsToReact();
          followCamera(proxy.x, proxy.y);
        },
        onComplete: () => {
          meA.x = to.x;
          meA.y = to.y;
          meA.stallId = stall.id;
          walkingRef.current = false;
          walkTweenRef.current = null;
          setWalkPath("");
          setWalkingStallId(null);
          syncAvatarsToReact();
          enterBooth(stall.id);
        },
      });
    },
    [cancelPlayerWalk, enterBooth, followCamera, pushFeed, syncAvatarsToReact],
  );

  const handleEnterStall = useCallback(
    (stallId: string) => {
      const allowed = allowedStallIdsRef.current;
      if (allowed && !allowed.includes(stallId)) return;
      const stalls = getActiveStalls();
      const stall = stalls.find((s) => s.id === stallId);
      if (!stall || walkingRef.current) return;
      const meA = avatarsRef.current.find((a) => a.me);
      if (!meA) return;
      const pool = allowed ? stalls.filter((s) => allowed.includes(s.id)) : stalls;
      const near = nearestStallToPlayer(meA, pool, ENTER_RADIUS);
      if (near?.id === stall.id) {
        showToast(`Entering ${stall.code}…`);
        enterBooth(stall.id);
        return;
      }
      showToast(`Walking to ${stall.code}…`);
      walkToStall(stall);
    },
    [enterBooth, showToast, walkToStall],
  );

  const walkToPoint = useCallback(
    (dest: Point) => {
      if (walkingRef.current) return;
      const meA = avatarsRef.current.find((a) => a.me);
      if (!meA) return;
      const snapped = snapToAisle(dest);
      if (isBlocked(snapped.x, snapped.y)) return;
      cancelPlayerWalk();
      meA.path = pathPts({ x: meA.x, y: meA.y }, snapped).filter(
        (p) => !isBlocked(p.x, p.y),
      );
      if (!meA.path.length) return;
      followPlayerRef.current = true;
      syncAvatarsToReact();
      pushFeed({ label: "YOU", name: "You", color: "#FFB020", me: true, action: "is walking the aisle" });
    },
    [cancelPlayerWalk, isBlocked, pushFeed, syncAvatarsToReact],
  );

  const worldFromEvent = useCallback((ev: React.MouseEvent) => {
    const world = worldRef.current;
    if (!world) return null;
    const r = world.getBoundingClientRect();
    const mapW = getMapW();
    const mapH = getMapH();
    return {
      x: clamp((ev.clientX - r.left) * (mapW / r.width), 40, mapW - 40),
      y: clamp((ev.clientY - r.top) * (mapH / r.height), 40, mapH - 40),
    };
  }, []);

  const onViewportClick = useCallback(
    (ev: React.MouseEvent) => {
      if (walkingRef.current || dragMovedRef.current) return;
      if ((ev.target as HTMLElement).closest("[data-stall-id]")) return;
      const pt = worldFromEvent(ev);
      if (pt) walkToPoint(snapToAisle(pt));
    },
    [walkToPoint, worldFromEvent],
  );

  const handleEnterStallRef = useRef(handleEnterStall);
  handleEnterStallRef.current = handleEnterStall;

  // Socket + game loop — mount once per mode
  useEffect(() => {
    avatarsRef.current = [createMe()];
    syncAvatarsToReact();

    const socket = connectSocket({
      stalls: getActiveStalls(),
      snapToAisle,
      pathPts,
      randomAislePoint,
    });
    socketRef.current = socket;

    socket.on("status", (ev) => {
      const e = ev as { state: string };
      setSockStatus(e.state === "open" ? "simulated · live" : e.state === "connecting" ? "connecting…" : "offline");
    });

    socket.on("presence", (frame) => {
      const f = frame as { type: string; users?: Avatar[]; ts?: number };
      if (f.type !== "snapshot" || !f.users) return;
      const meA = avatarsRef.current.find((a) => a.me) ?? createMe();
      avatarsRef.current = [
        meA,
        ...f.users.map((u) => ({
          ...u,
          path: [],
          idle: 0,
          walkSpeed: 80,
        })),
      ];
      if (f.ts) setSockTick(new Date(f.ts).toLocaleTimeString());
      syncAvatarsToReact();
    });

    pushFeed({ label: "YOU", name: "You", color: "#FFB020", me: true, action: "entered Hall 1", when: "just now" });

    void runCurtainTransition(() => setEntered(true)).then(() => {
      showToast(
        mode === "threejs"
          ? "3JS hall — copper floor · socket avatars live"
          : "Nexus floor — WASD or click aisles · socket avatars live",
      );
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Enter" && nearbyStallIdRef.current) {
        e.preventDefault();
        const stall = getActiveStalls().find((s) => s.id === nearbyStallIdRef.current);
        if (stall) handleEnterStallRef.current(stall.id);
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
        e.preventDefault();
        keysRef.current.add(e.code);
        setKeysDown(new Set(keysRef.current));
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
      setKeysDown(new Set(keysRef.current));
    };
    const onBlur = () => {
      keysRef.current.clear();
      setKeysDown(new Set());
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const list = avatarsRef.current;
      const meA = list.find((a) => a.me);

      if (!walkingRef.current && meA) {
        let ax = 0;
        let ay = 0;
        if (keysRef.current.has("KeyA") || keysRef.current.has("ArrowLeft")) ax -= 1;
        if (keysRef.current.has("KeyD") || keysRef.current.has("ArrowRight")) ax += 1;
        if (keysRef.current.has("KeyW") || keysRef.current.has("ArrowUp")) ay -= 1;
        if (keysRef.current.has("KeyS") || keysRef.current.has("ArrowDown")) ay += 1;

        if (ax || ay) {
          cancelPlayerWalk();
          meA.path = [];
          const len = Math.hypot(ax, ay) || 1;
          const nx = meA.x + (ax / len) * WALK_SPEED * dt;
          const ny = meA.y + (ay / len) * WALK_SPEED * dt;
          const tx = onAisle(nx, meA.y) ? nx : meA.x;
          const ty = onAisle(meA.x, ny) ? ny : meA.y;
          if (onAisle(tx, ty) && !isBlocked(tx, ty)) {
            meA.x = tx;
            meA.y = ty;
            meA.stallId = null;
          }
          followPlayerRef.current = true;
          followCamera(meA.x, meA.y);
        } else if (followAgentPath(meA, dt)) {
          followCamera(meA.x, meA.y);
        }

        if (socketRef.current?.connected) {
          socketRef.current.sendPresence({
            x: meA.x,
            y: meA.y,
            direction: keysRef.current.has("KeyA")
              ? "left"
              : keysRef.current.has("KeyD")
                ? "right"
                : keysRef.current.has("KeyW")
                  ? "up"
                  : keysRef.current.has("KeyS")
                    ? "down"
                    : "down",
            stallId: meA.stallId,
          });
        }

        const near = nearestStallToPlayer(
          meA,
          (() => {
            const stalls = getActiveStalls();
            const allowed = allowedStallIdsRef.current;
            return allowed ? stalls.filter((s) => allowed.includes(s.id)) : stalls;
          })(),
          ENTER_RADIUS,
        );
        nearbyStallIdRef.current = near?.id ?? null;
        setNearbyStallId(near?.id ?? null);
      } else if (walkingRef.current && meA) {
        followCamera(meA.x, meA.y);
      }

      syncAvatarsToReact();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const fitTimers = autoFit
      ? [0, 80, 200, 500].map((ms) => setTimeout(fitHallView, ms))
      : [];
    const ro = new ResizeObserver(() => {
      if (!followPlayerRef.current && autoFit) fitHallView();
    });
    if (viewportRef.current) ro.observe(viewportRef.current);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      cancelAnimationFrame(raf);
      fitTimers.forEach(clearTimeout);
      ro.disconnect();
      cancelPlayerWalk();
    };
  }, [mode, autoFit, cancelPlayerWalk, fitHallView, followCamera, pushFeed, showToast, syncAvatarsToReact]);

  // Pan / zoom bindings (disabled when view is locked)
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || lockView) return;

    const drag = { on: false, sx: 0, sy: 0, ox: 0, oy: 0 };

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      followPlayerRef.current = false;
      const rect = vp.getBoundingClientRect();
      hallZoomAt(ev.deltaY > 0 ? 0.9 : 1.1, ev.clientX - rect.left, ev.clientY - rect.top);
    };
    const onPointerDown = (ev: PointerEvent) => {
      if (ev.button !== 0 || (ev.target as HTMLElement).closest("[data-stall-id]")) return;
      followPlayerRef.current = false;
      dragMovedRef.current = false;
      drag.on = true;
      drag.sx = ev.clientX;
      drag.sy = ev.clientY;
      drag.ox = hallViewRef.current.x;
      drag.oy = hallViewRef.current.y;
      vp.setPointerCapture(ev.pointerId);
    };
    const onPointerMove = (ev: PointerEvent) => {
      if (!drag.on) return;
      if (Math.abs(ev.clientX - drag.sx) + Math.abs(ev.clientY - drag.sy) > 4) dragMovedRef.current = true;
      const p = clampPan(
        drag.ox + (ev.clientX - drag.sx),
        drag.oy + (ev.clientY - drag.sy),
        hallViewRef.current.scale,
        vp.clientWidth,
        vp.clientHeight,
      );
      applyView({ ...hallViewRef.current, x: p.x, y: p.y });
    };
    const onPointerUp = () => { drag.on = false; };

    vp.addEventListener("wheel", onWheel, { passive: false });
    vp.addEventListener("pointerdown", onPointerDown);
    vp.addEventListener("pointermove", onPointerMove);
    vp.addEventListener("pointerup", onPointerUp);
    vp.addEventListener("pointercancel", onPointerUp);

    return () => {
      vp.removeEventListener("wheel", onWheel);
      vp.removeEventListener("pointerdown", onPointerDown);
      vp.removeEventListener("pointermove", onPointerMove);
      vp.removeEventListener("pointerup", onPointerUp);
      vp.removeEventListener("pointercancel", onPointerUp);
    };
  }, [applyView, hallZoomAt, lockView]);

  // Keep locked view framed to lockBounds on resize
  useEffect(() => {
    if (!lockView || !lockBounds) return;
    const vp = viewportRef.current;
    if (!vp) return;

    const applyLock = () => {
      const b = lockBoundsRef.current;
      if (!b) return;
      focusRect(b, { pad: 48, scaleMul: 0.94 });
    };

    applyLock();
    const ro = new ResizeObserver(() => applyLock());
    ro.observe(vp);
    return () => ro.disconnect();
  }, [lockView, lockBounds, focusRect]);

  const setAllowedStallIds = useCallback((ids: string[] | null) => {
    allowedStallIdsRef.current = ids;
  }, []);

  const onFloor = avatars.filter((a) => !a.stallId).length;
  const inBooths = avatars.filter((a) => a.stallId).length;
  const stalls = getActiveStalls();
  const nearbyStall = stalls.find((s) => s.id === nearbyStallId);

  const stallLive = stalls.reduce<Record<string, number>>((acc, s) => {
    const remotes = avatars.filter((a) => !a.me && a.stallId === s.id).length;
    acc[s.id] = s.live + remotes;
    return acc;
  }, {});

  return {
    mode,
    viewportRef,
    worldRef,
    trailRef,
    hallView,
    avatars,
    feed,
    keysDown,
    sockStatus,
    sockTick,
    walkPath,
    walkingStallId,
    nearbyStall,
    stallLive,
    entered,
    me,
    onFloor,
    inBooths,
    fitHallView,
    hallZoomAt,
    focusRect,
    teleportMe,
    setAllowedStallIds,
    handleEnterStall,
    onViewportClick,
  };
}
