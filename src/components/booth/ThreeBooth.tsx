"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import gsap from "gsap";
import { disposeThreeBooth, initThreeBooth, type ThreeBoothState } from "@/lib/booth/three-booth-engine";
import { getBoothHotspots } from "@/data/booth-assets";
import type { Stall } from "@/types/expo";
import { useToast } from "@/components/providers/ToastProvider";
import styles from "./booth.module.css";

export interface ThreeBoothHandle {
  focusHotspot: (id: string) => void;
}

interface ThreeBoothProps {
  stall: Stall;
  onHotspot: (id: string) => void;
  rootRef: React.RefObject<HTMLElement | null>;
}

export const ThreeBooth = forwardRef<ThreeBoothHandle, ThreeBoothProps>(function ThreeBooth(
  { stall, onHotspot, rootRef },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ThreeBoothState>({ three: null });
  const onHotspotRef = useRef(onHotspot);
  const { showToast } = useToast();

  onHotspotRef.current = onHotspot;

  useImperativeHandle(ref, () => ({
    focusHotspot: (id: string) => {
      stateRef.current.three?.focusHotspot(id);
    },
  }));

  useEffect(() => {
    const host = hostRef.current;
    const root = rootRef.current;
    if (!host || !root) return;

    const hotspots = getBoothHotspots(stall);

    initThreeBooth(stateRef.current, stall, hotspots, host, {
      query: (sel) => root.querySelector(sel),
      toast: showToast,
      gsap,
      onHotspot: (id) => onHotspotRef.current(id),
    });

    return () => disposeThreeBooth(stateRef.current, gsap);
    // Only re-init when stall changes — never on sidebar/hotspot state updates
  }, [stall.id, rootRef, showToast]);

  return (
    <div ref={hostRef} className={styles.threeHost}>
      <div className={styles.boothHud}>
        <span id="fppLabel" className={styles.fpp}>Drag to look · click hotspot to walk</span>
        <span id="hotLabel">Hover a hotspot</span>
      </div>
    </div>
  );
});
