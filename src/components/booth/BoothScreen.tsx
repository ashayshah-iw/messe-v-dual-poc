"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { BROCHURE_ASSETS, getBoothHotspots, PRODUCT_ASSETS } from "@/data/booth-assets";
import { STALLS, getStallById } from "@/data/stalls";
import { runCurtainTransition, withViewTransition } from "@/lib/transitions";
import type { PocMode } from "@/types/expo";
import { useToast } from "@/components/providers/ToastProvider";
import { FlatBooth, type FlatBoothHandle } from "./FlatBooth";
import { ThreeBooth, type ThreeBoothHandle } from "./ThreeBooth";
import styles from "./booth.module.css";

interface BoothScreenProps {
  mode: PocMode;
  stallId: string;
}

export function BoothScreen({ mode, stallId }: BoothScreenProps) {
  const stall = getStallById(stallId) ?? STALLS[0];
  const router = useRouter();
  const { showToast } = useToast();
  const rootRef = useRef<HTMLElement>(null);
  const flatRef = useRef<FlatBoothHandle>(null);
  const threeRef = useRef<ThreeBoothHandle>(null);
  const [activeHot, setActiveHot] = useState<string | null>(null);
  const hotspots = getBoothHotspots(stall);
  const isThree = mode === "threejs";

  const syncHot = useCallback((id: string) => {
    setActiveHot(id);
  }, []);

  const onCanvasHotspot = useCallback(
    (id: string) => {
      syncHot(id);
      const label = hotspots.find((h) => h.id === id)?.label ?? id;
      showToast(label);
    },
    [hotspots, showToast, syncHot],
  );

  const focusHot = useCallback(
    (id: string) => {
      syncHot(id);
      const label = hotspots.find((h) => h.id === id)?.label ?? id;
      if (isThree) {
        showToast(`Moving to ${label}`);
        threeRef.current?.focusHotspot(id);
      } else {
        showToast(label);
        flatRef.current?.focusZone(id);
      }
    },
    [hotspots, isThree, showToast, syncHot],
  );

  const switchStall = (dir: number) => {
    const idx = STALLS.findIndex((s) => s.id === stall.id);
    const next = STALLS[(idx + dir + STALLS.length) % STALLS.length];
    const path = `/booth/${mode}/${next.id}`;
    void runCurtainTransition(() => withViewTransition(() => router.push(path)));
  };

  const backToHall = () => {
    void runCurtainTransition(() => withViewTransition(() => router.push(`/hall/${mode}`)));
  };

  const mediaKind = activeHot === "products" || activeHot === "brochures" ? activeHot : null;
  const mediaItems = mediaKind === "products" ? PRODUCT_ASSETS : mediaKind === "brochures" ? BROCHURE_ASSETS : [];

  const sideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setActiveHot(null);
  }, [stall.id, mode]);

  useEffect(() => {
    if (!sideRef.current) return;
    gsap.fromTo(
      sideRef.current.querySelectorAll(`.${styles.panel}`),
      { opacity: 0, x: 16 },
      { opacity: 1, x: 0, duration: 0.35, stagger: 0.06, ease: "power2.out" },
    );
  }, [stall.id, mode]);

  return (
    <section ref={rootRef} className={styles.booth} aria-label="Exhibitor booth">
      <div className={styles.boothHead}>
        <div className={styles.boothLogo} style={{ background: stall.color }}>{stall.code.split("-")[0]}</div>
        <div>
          <h2>{stall.company}</h2>
          <div className={styles.boothSub}>
            {isThree ? `Stall ${stall.code} · Three.js FPP booth` : `Stall ${stall.code} · CSS interactive booth`}
          </div>
        </div>
        <div className={styles.boothActions}>
          <button type="button" className="btn ghost" onClick={() => switchStall(-1)}>← Prev</button>
          <button type="button" className="btn ghost" onClick={() => switchStall(1)}>Next →</button>
          <button type="button" className="btn ghost" onClick={backToHall}>Floor plan</button>
        </div>
      </div>
      <div className={styles.boothBody}>
        {isThree ? (
          <ThreeBooth ref={threeRef} stall={stall} onHotspot={onCanvasHotspot} rootRef={rootRef} />
        ) : (
          <FlatBooth ref={flatRef} stall={stall} onHotspot={onCanvasHotspot} />
        )}
        <aside ref={sideRef} className={styles.boothSide}>
          <div className={styles.panel}>
            <h3>Booth zones</h3>
            <p className="eyebrow" style={{ marginBottom: 10, display: "block" }}>
              {isThree ? "Three.js raycast targets" : "Click booth fixtures · sidebar syncs"}
            </p>
            <div className={styles.hotspotList} id="hotList">
              {hotspots.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  data-hot={h.id}
                  className={activeHot === h.id ? styles.on : ""}
                  onClick={() => focusHot(h.id)}
                >
                  <span className={styles.ic} style={{ background: h.color }}>{h.id.slice(0, 2).toUpperCase()}</span>
                  <span><b>{h.label}</b><small>{h.desc}</small></span>
                </button>
              ))}
            </div>
          </div>
          <div className={`${styles.panel} ${styles.mediaPanel} ${mediaKind ? styles.show : ""}`}>
            <h3>{mediaKind === "products" ? "Products" : "Brochures"}</h3>
            <p className="eyebrow">{mediaKind === "products" ? "Download datasheets" : "Take a digital copy"}</p>
            <div className={styles.mediaList}>
              {mediaItems.map((it) => (
                <div key={it.name} className={styles.mediaRow}>
                  <div className={styles.thumb} style={{ background: mediaKind === "products" ? stall.color : "#1a7a55" }}>
                    {mediaKind === "products" ? "PRD" : "PDF"}
                  </div>
                  <div className={styles.info}>
                    <b>{it.name}</b>
                    <small>{it.kind}</small>
                  </div>
                  <button type="button" className={`btn ${styles.dl}`} onClick={() => showToast(`Downloaded · ${it.name}`)}>
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.panel}>
            <h3>About</h3>
            <p style={{ color: "var(--fg-2)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>{stall.about}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
