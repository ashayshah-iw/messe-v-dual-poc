"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { activateHallLayout, resetHallLayout } from "@/data/hall-layout";
import {
  buildZoneTravelMap,
  ZONE_MAP_LAYOUT,
  ZONE_SECTIONS,
} from "@/data/zone-sections";
import { HallScreen } from "@/components/hall/HallScreen";
import styles from "./hall.module.css";

const SHIFT_MS = 850;

export function ZonedHallScreen() {
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(
    () => ZONE_SECTIONS[0]?.id ?? null,
  );
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeZone = ZONE_SECTIONS.find((z) => z.id === activeZoneId) ?? null;

  const travelMap = useMemo(
    () => (activeZone ? buildZoneTravelMap(activeZone, ZONE_SECTIONS) : null),
    [activeZone],
  );

  useLayoutEffect(() => {
    if (activeZone && travelMap) {
      activateHallLayout({
        ...activeZone.layout,
        aisleH: [...activeZone.layout.aisleH, ...travelMap.aisleH],
        aisleV: [...activeZone.layout.aisleV, ...travelMap.aisleV],
        mapH: Math.max(activeZone.layout.mapH, travelMap.mapH),
      });
    } else if (activeZone) {
      activateHallLayout(activeZone.layout);
    } else {
      activateHallLayout(ZONE_MAP_LAYOUT);
    }
  }, [activeZone, travelMap]);

  useEffect(() => {
    activateHallLayout(ZONE_MAP_LAYOUT);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      resetHallLayout();
    };
  }, []);

  const enterZone = useCallback((id: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSelectedZoneId(id);
    if (activeZoneId === id) return;
    setTransitioning(true);
    setActiveZoneId(id);
    timerRef.current = setTimeout(() => setTransitioning(false), SHIFT_MS);
  }, [activeZoneId]);

  const exitZone = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTransitioning(true);
    setActiveZoneId(null);
    timerRef.current = setTimeout(() => setTransitioning(false), 700);
  }, []);

  if (activeZone) {
    return (
      <div className={styles.zoneFloorWrap}>
        <HallScreen
          key={activeZone.id}
          mode="flat"
          preserveLayout
          onBack={exitZone}
          backLabel="← Zone map"
          entryLabel={`Entry · ${activeZone.label}`}
          zoneTravel={
            travelMap
              ? {
                  map: travelMap,
                  onTravel: enterZone,
                }
              : undefined
          }
        />
        <div
          className={styles.zoneFloorBadge}
          style={{ borderColor: activeZone.color }}
        >
          <span style={{ background: activeZone.color }} />
          {activeZone.label}
          <em>{activeZone.stalls.length} booths</em>
        </div>
        {transitioning ? (
          <div className={styles.zoneLoader} role="status">
            <div className={styles.zoneSpinner} />
            <p>Entering {activeZone.label}…</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <HallScreen
        mode="flat"
        preserveLayout
        zoned={{
          zones: ZONE_SECTIONS,
          activeZoneId: null,
          selectedZoneId,
          transitioning,
          onSelectZone: setSelectedZoneId,
          onEnterZone: enterZone,
          onExitZone: exitZone,
        }}
      />
      {transitioning ? (
        <div className={styles.zoneLoader} role="status">
          <div className={styles.zoneSpinner} />
          <p>Loading zone map…</p>
        </div>
      ) : null}
    </>
  );
}
