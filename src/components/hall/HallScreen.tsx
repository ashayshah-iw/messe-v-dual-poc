"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import Link from "next/link";
import {
  getActiveStalls,
  getAisleH,
  getAisleV,
  getEntryZone,
  getMapH,
  getMapW,
  resetHallLayout,
} from "@/data/hall-layout";
import { membersInZone, type ZoneSection, type ZoneTravelMap } from "@/data/zone-sections";
import { dist2 } from "@/lib/hall/geometry";
import { useHallEngine } from "@/hooks/useHallEngine";
import type { PocMode } from "@/types/expo";
import { ZoneStatsPanel } from "@/components/hall/ZoneStatsPanel";
import styles from "./hall.module.css";

const ZONE_ENTER_RADIUS = 110;
/** Flat-hall style enter marker (same feel as Entry · Hall 1). */
const ZONE_DOOR_W = 120;
const ZONE_DOOR_H = 36;
const PORTAL_RADIUS = 100;

export interface HallZonedConfig {
  zones: ZoneSection[];
  activeZoneId: string | null;
  selectedZoneId: string | null;
  onSelectZone: (id: string | null) => void;
  onEnterZone: (id: string) => void;
  onExitZone: () => void;
  transitioning?: boolean;
}

export interface HallZoneTravel {
  map: ZoneTravelMap;
  onTravel: (toZoneId: string) => void;
}

interface HallScreenProps {
  mode: PocMode;
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
  preserveLayout?: boolean;
  entryLabel?: string;
  zoned?: HallZonedConfig;
  zoneTravel?: HallZoneTravel;
}

export function HallScreen({
  mode,
  backHref = "/",
  backLabel = "\u2190 Lobby",
  onBack,
  preserveLayout = false,
  entryLabel = "Entry \u00b7 Hall 1",
  zoned,
  zoneTravel,
}: HallScreenProps) {
  useLayoutEffect(() => {
    if (!preserveLayout && !zoned) resetHallLayout();
  }, [preserveLayout, zoned]);

  const blockedRects = useMemo(() => {
    // Overview uses the real hall — never block aisles with zone rects
    if (zoneTravel) return zoneTravel.map.blockedRects;
    return undefined;
  }, [zoneTravel]);

  const zoneClusterBounds = useMemo(() => {
    if (!zoned?.zones.length) return null;
    const entry = getEntryZone();
    let minX = entry.x;
    let minY = entry.y;
    let maxX = entry.x + entry.w;
    let maxY = entry.y + entry.h;
    for (const z of zoned.zones) {
      minX = Math.min(minX, z.bounds.x, z.enterPoint.x - 40);
      minY = Math.min(minY, z.bounds.y, z.enterPoint.y - 40);
      maxX = Math.max(maxX, z.bounds.x + z.bounds.w, z.enterPoint.x + 40);
      maxY = Math.max(maxY, z.bounds.y + z.bounds.h, z.enterPoint.y + 40);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, [zoned]);

  const h = useHallEngine(mode, {
    autoFit: !zoned,
    lockView: Boolean(zoned),
    lockBounds: zoneClusterBounds,
    blockedRects,
  });

  const themeClass = mode === "threejs" ? styles.floorNavMode : styles.pocFlat;
  const mapW = getMapW();
  const mapH = getMapH();
  const entryZone = getEntryZone();
  const aisleH = getAisleH();
  const aisleV = getAisleV();
  const stalls = getActiveStalls();
  const isZoneMap = Boolean(zoned);
  const travelMap = zoneTravel?.map;
  const portals = travelMap?.portals ?? [];

  const nearbyZone = useMemo(() => {
    if (!isZoneMap || !zoned || !h.me) return null;
    let best: ZoneSection | null = null;
    let bestD = Infinity;
    for (const z of zoned.zones) {
      const toDoor = dist2(h.me, z.enterPoint);
      // Also treat “along the zone’s aisle edge” as near
      const edgeX =
        z.col === 0 ? z.bounds.x + z.bounds.w : z.bounds.x;
      const edgeY = Math.max(
        z.bounds.y,
        Math.min(h.me.y, z.bounds.y + z.bounds.h),
      );
      const toEdge = dist2(h.me, { x: edgeX, y: edgeY });
      const d = Math.min(toDoor, toEdge);
      if (d < bestD) {
        bestD = d;
        best = z;
      }
    }
    return bestD <= ZONE_ENTER_RADIUS ? best : null;
  }, [isZoneMap, zoned, h.me]);

  const nearbyPortal = useMemo(() => {
    if (!zoneTravel || !h.me || !portals.length) return null;
    let best: (typeof portals)[number] | null = null;
    let bestD = Infinity;
    for (const p of portals) {
      const d = dist2(h.me, { x: p.x + p.w / 2, y: p.y + p.h / 2 });
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return bestD <= PORTAL_RADIUS ? best : null;
  }, [zoneTravel, portals, h.me]);

  const spawnedZoneMap = useRef(false);
  useEffect(() => {
    if (!isZoneMap || spawnedZoneMap.current) return;
    spawnedZoneMap.current = true;
    const entry = getEntryZone();
    h.teleportMe(entry.x + entry.w / 2, entry.y + entry.h / 2);
  }, [isZoneMap, h.teleportMe]);

  const lastTravelSpawn = useRef<string | null>(null);
  useEffect(() => {
    if (!travelMap) {
      lastTravelSpawn.current = null;
      return;
    }
    const key = `${travelMap.spawn.x},${travelMap.spawn.y}`;
    if (lastTravelSpawn.current === key) return;
    lastTravelSpawn.current = key;
    // Start at booth entry; player walks down into the zone map
    const entry = getEntryZone();
    h.teleportMe(entry.x + entry.w / 2, entry.y + entry.h / 2);
    const t = window.setTimeout(() => h.fitHallView(), 80);
    return () => clearTimeout(t);
  }, [travelMap, h.teleportMe, h.fitHallView]);

  useEffect(() => {
    if (isZoneMap) h.setAllowedStallIds([]);
    else h.setAllowedStallIds(null);
  }, [isZoneMap, h.setAllowedStallIds]);

  useEffect(() => {
    if (!isZoneMap || !zoned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Enter" || !nearbyZone) return;
      e.preventDefault();
      zoned.onSelectZone(nearbyZone.id);
      zoned.onEnterZone(nearbyZone.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isZoneMap, zoned, nearbyZone]);

  useEffect(() => {
    if (!zoneTravel || !nearbyPortal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Enter") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      zoneTravel.onTravel(nearbyPortal.toZoneId);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [zoneTravel, nearbyPortal]);

  useEffect(() => {
    if (nearbyZone) zoned?.onSelectZone(nearbyZone.id);
  }, [nearbyZone?.id]);

  const visibleAvatars = isZoneMap
    ? h.avatars.filter((a) => a.me)
    : h.avatars;

  const zoneMemberCounts = useMemo(() => {
    if (!zoned) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const z of zoned.zones) map[z.id] = membersInZone(z, h.avatars);
    return map;
  }, [zoned, h.avatars]);

  const showZoneEnter = Boolean(isZoneMap && nearbyZone);
  const showPortalEnter = Boolean(zoneTravel && nearbyPortal);
  const showBoothEnter = Boolean(!isZoneMap && !zoneTravel && h.nearbyStall);

  return (
    <section
      className={`${styles.hall} ${themeClass} ${h.entered ? styles.ready : ""} ${zoned ? styles.zonedHall : ""} ${zoneTravel ? styles.inZoneFloor : ""}`}
      aria-label="Exhibition hall"
    >
      <div className={styles.hallChrome}>
        {isZoneMap ? (
          <div className="chip">WASD on center aisle · approach a zone for Enter</div>
        ) : (
          <div className="chip">
            {zoneTravel
              ? "Walk the path · enter another zone"
              : "WASD / click aisle · drag map · ⟲ shows full hall"}
          </div>
        )}
        <div className={styles.moveHud} aria-hidden>
          <span className={styles.mhLabel}>Move</span>
          <div className={styles.mhKeys}>
            {(["w", "a", "s", "d"] as const).map((k) => (
              <span key={k} data-k={k} className={h.keysDown.has(`Key${k.toUpperCase()}`) ? styles.on : ""}>
                {k.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
        {!isZoneMap ? (
          <div className={styles.zoomBtns}>
            <button type="button" onClick={() => h.hallZoomAt(0.86)} title="Zoom out">−</button>
            <button type="button" onClick={() => { h.hallZoomAt(1.18); }} title="Zoom in">+</button>
            <button type="button" onClick={() => h.fitHallView()} title="Fit map">⟲</button>
          </div>
        ) : null}
      </div>

      <div id="floorStats" className={styles.floorStats}>
        {isZoneMap ? (
          <div className="chip">{zoned!.zones.length} zones</div>
        ) : (
          <>
            <div className="chip">◉ {h.onFloor} on floor</div>
            <div className="chip">{h.inBooths} in booths</div>
            {h.me ? <div className="chip">X {Math.round(h.me.x)} · Y {Math.round(h.me.y)}</div> : null}
          </>
        )}
      </div>

      {!isZoneMap && !zoneTravel ? (
        <aside className={styles.hallRail}>
          <details className={styles.hallAcc} open>
            <summary><span className={styles.pulse} /> Live floor feed</summary>
            <div className={styles.hallAccBody}>
              {h.feed.map((ev, i) => (
                <div key={i} className={`${styles.lfItem} ${ev.me ? styles.meEv : ""}`}>
                  <div className={styles.av} style={{ background: ev.color }}>{ev.label}</div>
                  <div className={styles.txt}>
                    <b>{ev.name}</b> {ev.action}
                    <div className={styles.when}>{ev.when}</div>
                  </div>
                </div>
              ))}
            </div>
          </details>
          <details className={styles.hallAcc} open>
            <summary>Socket · presence</summary>
            <div className={styles.hallAccBody}>
              <div className={styles.sockGrid}>
                <div><span>Connection</span><b>{h.sockStatus}</b></div>
                <div><span>Last tick</span><b>{h.sockTick}</b></div>
                <div><span>Remote users</span><b>{h.avatars.filter((a) => !a.me).length}</b></div>
              </div>
            </div>
          </details>
        </aside>
      ) : null}

      {zoned ? (
        <ZoneStatsPanel
          zones={zoned.zones}
          avatars={h.avatars}
          selectedZoneId={zoned.selectedZoneId}
          onSelectZone={zoned.onSelectZone}
        />
      ) : null}

      <div
        ref={h.viewportRef}
        className={styles.hallViewport}
        onClick={h.onViewportClick}
      >
        <div
          ref={h.worldRef}
          className={styles.hallWorld}
          style={{
            width: mapW,
            height: mapH,
            left: h.hallView.x,
            top: h.hallView.y,
            transform: `scale(${h.hallView.scale})`,
          }}
        >
          <svg className={styles.walkPath} aria-hidden>
            {h.walkPath ? (
              <>
                <path className={styles.trailGlow} d={h.walkPath} />
                <path ref={h.trailRef} className={styles.trail} d={h.walkPath} />
              </>
            ) : null}
          </svg>

          {!isZoneMap ? (
            <div
              className={styles.entranceZone}
              style={{
                left: entryZone.x,
                top: entryZone.y,
                width: entryZone.w,
                height: entryZone.h,
                bottom: "auto",
                transform: "none",
              }}
            >
              {entryLabel}
            </div>
          ) : (
            <div
              className={styles.entranceZone}
              style={{
                left: entryZone.x,
                top: entryZone.y,
                width: entryZone.w,
                height: entryZone.h,
                bottom: "auto",
                transform: "none",
                opacity: 0.55,
                pointerEvents: "none",
              }}
              aria-hidden
            >
              Entry
            </div>
          )}

          {/* Overview: center aisle only · inside zone / flat: full aisles */}
          {isZoneMap ? (
            <div aria-hidden className={styles.zonePathOnly}>
              {aisleH.map((a) => (
                <div key={a.id}>
                  <div
                    className={`${styles.aisleBand} ${styles.h} ${styles.zonePath}`}
                    style={{ left: a.x0, top: a.y, width: a.x1 - a.x0 }}
                  />
                  {a.label ? (
                    <span
                      className={styles.zonePathLabel}
                      style={{ left: a.x0 + 10, top: a.y - 20 }}
                    >
                      {a.label}
                    </span>
                  ) : null}
                </div>
              ))}
              {aisleV.map((v) => (
                <div
                  key={v.id}
                  className={`${styles.aisleBand} ${styles.v} ${styles.zonePath}`}
                  style={{ left: v.x, top: v.y0, height: v.y1 - v.y0 }}
                />
              ))}
            </div>
          ) : (
            <div aria-hidden className={travelMap ? styles.zonePathOnly : undefined}>
              {aisleH.map((a) => {
                const pathClass = a.id.startsWith("travel-") ? styles.zonePath : "";
                return (
                  <div key={a.id}>
                    <div className={`${styles.aisleBand} ${styles.h} ${pathClass}`} style={{ left: a.x0, top: a.y, width: a.x1 - a.x0 }} />
                    {a.label && !a.id.startsWith("travel-") ? (
                      <span className={styles.aisleLabel} style={{ left: a.x0 + 12, top: a.y - 28 }}>{a.label}</span>
                    ) : null}
                  </div>
                );
              })}
              {aisleV.map((v) => {
                const pathClass = v.id.startsWith("travel-") ? styles.zonePath : "";
                return (
                  <div
                    key={v.id}
                    className={`${styles.aisleBand} ${styles.v} ${pathClass}`}
                    style={{ left: v.x, top: v.y0, height: v.y1 - v.y0 }}
                  />
                );
              })}
            </div>
          )}

          {/* Overview: blurred stalls behind zone cards */}
          {isZoneMap
            ? zoned!.zones.map((zone) => {
                const isSelected = zoned!.selectedZoneId === zone.id;
                const isNear = nearbyZone?.id === zone.id;
                const members = zoneMemberCounts[zone.id] ?? 0;
                const enterZone = () => {
                  zoned!.onSelectZone(zone.id);
                  zoned!.onEnterZone(zone.id);
                };
                const cardW = Math.min(200, zone.bounds.w * 0.58);
                const cardH = 92;
                const cx = zone.bounds.x + zone.bounds.w / 2;
                const cy = zone.bounds.y + zone.bounds.h / 2;
                return (
                  <div key={zone.id}>
                    <div
                      className={styles.zoneStallClip}
                      style={{
                        left: zone.bounds.x,
                        top: zone.bounds.y,
                        width: zone.bounds.w,
                        height: zone.bounds.h,
                      }}
                      aria-hidden
                    >
                      {zone.previewStalls.map((s) => (
                        <div
                          key={s.id}
                          className={styles.stallPreview}
                          style={{
                            left: s.x - zone.bounds.x,
                            top: s.y - zone.bounds.y,
                            width: s.w,
                            height: s.h,
                          }}
                        >
                          <span className={styles.swatch} style={{ background: s.color }} />
                          <span className={styles.code}>{s.code}</span>
                          <span className={styles.nm}>{s.company}</span>
                        </div>
                      ))}
                    </div>
                    <div
                      className={`${styles.zoneOutline} ${isSelected ? styles.zoneSelected : ""} ${isNear ? styles.zoneNearby : ""}`}
                      style={{
                        left: zone.bounds.x,
                        top: zone.bounds.y,
                        width: zone.bounds.w,
                        height: zone.bounds.h,
                        "--zone": zone.color,
                      } as CSSProperties}
                      aria-hidden
                    />
                    <button
                      type="button"
                      className={`${styles.zoneCard} ${isNear ? styles.zoneCardNear : ""}`}
                      style={{
                        left: cx - cardW / 2,
                        top: cy - cardH / 2,
                        width: cardW,
                        height: cardH,
                        "--zone": zone.color,
                      } as CSSProperties}
                      onClick={(e) => {
                        e.stopPropagation();
                        enterZone();
                      }}
                    >
                      <span className={styles.zoneCardName}>{zone.label}</span>
                      <span className={styles.zoneCardStat}>
                        <b>{zone.stalls.length}</b> booths
                      </span>
                      <span className={styles.zoneCardStat}>
                        <b>{members}</b> members
                      </span>
                    </button>
                  </div>
                );
              })
            : null}

          {/* Inside zone: same map topology to reach other zones */}
          {travelMap ? (
            <>
              <div
                className={styles.zoneTravelFrame}
                style={{
                  left: travelMap.frame.x,
                  top: travelMap.frame.y,
                  width: travelMap.frame.w,
                  height: travelMap.frame.h,
                }}
                aria-hidden
              />
              <span
                className={styles.zoneTravelLabel}
                style={{ left: travelMap.label.x, top: travelMap.label.y }}
              >
                Zone map
              </span>
              {travelMap.tiles.map((t) => (
                <button
                  key={t.zone.id}
                  type="button"
                  className={styles.zoneHallRegion}
                  style={{
                    left: t.bounds.x,
                    top: t.bounds.y,
                    width: t.bounds.w,
                    height: t.bounds.h,
                    "--zone": t.zone.color,
                  } as CSSProperties}
                  onClick={(e) => {
                    e.stopPropagation();
                    zoneTravel!.onTravel(t.zone.id);
                  }}
                >
                  <span className={styles.zoneChip}>
                    <b style={{ color: t.zone.color }}>{t.zone.label}</b>
                    <em>{t.zone.stalls.length} booths</em>
                  </span>
                </button>
              ))}
              {portals.map((p) => {
                const isNear = nearbyPortal?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`${styles.entranceZone} ${styles.zoneEnterMarker} ${isNear ? styles.zoneDoorNear : ""}`}
                    style={{
                      left: p.x,
                      top: p.y,
                      width: p.w,
                      height: p.h,
                      bottom: "auto",
                      transform: "none",
                      borderColor: p.color,
                      color: p.color,
                      background: `color-mix(in srgb, ${p.color} 10%, rgba(8, 16, 24, 0.55))`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      zoneTravel!.onTravel(p.toZoneId);
                    }}
                  >
                    Enter · {p.toLabel}
                  </button>
                );
              })}
            </>
          ) : null}

          {!isZoneMap
            ? stalls.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  data-stall-id={s.id}
                  className={`${styles.stallTile} ${h.nearbyStall?.id === s.id ? styles.nearby : ""} ${h.walkingStallId === s.id ? styles.walking : ""}`}
                  style={{ left: s.x, top: s.y, width: s.w, height: s.h }}
                  onClick={(e) => {
                    e.stopPropagation();
                    h.handleEnterStall(s.id);
                  }}
                >
                  <span className={styles.swatch} style={{ background: s.color }} />
                  <span className={styles.code}>{s.code}</span>
                  <span className={styles.nm}>{s.company}</span>
                  <span className={styles.live}>{h.stallLive[s.id] ? `◉ ${h.stallLive[s.id]}` : "quiet"}</span>
                </button>
              ))
            : null}

          {visibleAvatars.map((a) => (
            <div
              key={a.id}
              className={`${styles.avatarDot} ${a.me ? styles.me : ""}`}
              style={{
                left: a.x,
                top: a.y,
                background: a.color,
                opacity: a.stallId && !a.me ? 0.35 : 1,
              }}
            >
              {a.me ? "YOU" : a.label}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.hallFooter}>
        <div className={styles.legendBar}>
          {isZoneMap ? (
            <>
              <span><i className={styles.legendZone} />Zones</span>
              <span><i className={styles.legendAisles} />Center aisle</span>
              <span><i className={styles.legendYou} />You</span>
            </>
          ) : travelMap ? (
            <>
              <span><i className={styles.legendZone} />Zones</span>
              <span><i className={styles.legendAisles} />Path</span>
              <span><i className={styles.legendYou} />You</span>
            </>
          ) : (
            <>
              <span><i className={styles.legendBooth} />Booth</span>
              <span><i className={styles.legendYou} />You</span>
              <span><i className={styles.legendOthers} />Others</span>
              <span><i className={styles.legendAisles} />Aisles</span>
            </>
          )}
        </div>
      </div>

      <div className={`${styles.enterPrompt} ${showZoneEnter || showPortalEnter || showBoothEnter ? styles.show : ""}`}>
        {showZoneEnter && nearbyZone ? (
          <button
            type="button"
            onClick={() => {
              zoned!.onSelectZone(nearbyZone.id);
              zoned!.onEnterZone(nearbyZone.id);
            }}
          >
            Enter {nearbyZone.label} <kbd>↵ Enter</kbd>
          </button>
        ) : showPortalEnter && nearbyPortal ? (
          <button type="button" onClick={() => zoneTravel!.onTravel(nearbyPortal.toZoneId)}>
            Enter {nearbyPortal.toLabel} <kbd>↵ Enter</kbd>
          </button>
        ) : (
          <button type="button" onClick={() => h.nearbyStall && h.handleEnterStall(h.nearbyStall.id)}>
            Enter {h.nearbyStall?.code ?? "booth"} <kbd>↵ Enter</kbd>
          </button>
        )}
      </div>

      {onBack ? (
        <button type="button" className={styles.backLink} onClick={onBack}>
          {backLabel}
        </button>
      ) : (
        <Link href={backHref} className={styles.backLink}>{backLabel}</Link>
      )}
    </section>
  );
}
