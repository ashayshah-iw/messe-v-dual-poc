"use client";

import type { CSSProperties } from "react";
import type { Avatar } from "@/types/expo";
import {
  ZONE_COUNT,
  pointInZone,
  type ZoneSection,
} from "@/data/zone-sections";
import styles from "./zone-stats-panel.module.css";

interface ZoneStatsPanelProps {
  zones: ZoneSection[];
  avatars: Avatar[];
  selectedZoneId: string | null;
  onSelectZone: (id: string | null) => void;
}

export function ZoneStatsPanel({
  zones,
  avatars,
  selectedZoneId,
  onSelectZone,
}: ZoneStatsPanelProps) {
  const list = zones.slice(0, ZONE_COUNT);
  const totalBooths = list.reduce((n, z) => n + z.stalls.length, 0);
  const activeVisitors = avatars.filter((a) => !a.stallId).length;

  const perZone = list.map((zone) => {
    const visitors = avatars.filter(
      (a) => !a.stallId && pointInZone(a.x, a.y, zone),
    ).length;
    return { zone, visitors, booths: zone.stalls.length };
  });

  const selected =
    list.find((z) => z.id === selectedZoneId) ?? list[0] ?? null;

  return (
    <>
      <aside className={`${styles.panel} ${styles.panelLeft}`} aria-label="Zones">
        <header className={styles.head}>
          <span className={styles.eyebrow}>Zoned hall</span>
          <h2>Zones</h2>
        </header>

        <div className={styles.totals}>
          <div>
            <span>Zones</span>
            <b>{list.length}</b>
          </div>
          <div>
            <span>Booths</span>
            <b>{totalBooths}</b>
          </div>
          <div>
            <span>Active</span>
            <b>{activeVisitors}</b>
          </div>
        </div>

        <div className={styles.zoneList}>
          {perZone.map(({ zone, visitors, booths }) => {
            const active = selected?.id === zone.id;
            return (
              <button
                key={zone.id}
                type="button"
                className={`${styles.zoneRow} ${active ? styles.zoneRowActive : ""}`}
                style={{ "--zone": zone.color } as CSSProperties}
                onClick={() => onSelectZone(zone.id)}
              >
                <span className={styles.swatch} />
                <span className={styles.summaryMain}>
                  <span className={styles.name}>{zone.label}</span>
                  <span className={styles.counts}>
                    <em>{booths} booths</em>
                    <em>◉ {visitors} active</em>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <aside className={`${styles.panel} ${styles.panelRight}`} aria-label="Zone stalls">
        <header className={styles.head}>
          <span className={styles.eyebrow}>
            {selected ? selected.label : "Zone"}
          </span>
          <h2>Stalls</h2>
        </header>

        {selected ? (
          <>
            <div className={styles.stallMeta}>
              <span style={{ "--zone": selected.color } as CSSProperties} className={styles.stallMetaSwatch} />
              <div>
                <b>{selected.stalls.length}</b>
                <em>booths in this zone</em>
              </div>
            </div>
            <ul className={styles.companyList}>
              {selected.stalls.map((s) => (
                <li key={s.id}>
                  <span className={styles.dot} style={{ background: s.color }} />
                  <b>{s.code}</b>
                  <em>{s.company}</em>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className={styles.empty}>Select a zone to see its stalls.</p>
        )}
      </aside>
    </>
  );
}
