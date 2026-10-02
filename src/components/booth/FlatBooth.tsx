"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import gsap from "gsap";
import {
  computeNearViewBox,
  FLAT_BOOTH_FULL,
  FLAT_BOOTH_ZONES,
  type FlatBoothZoneId,
  type ViewBox,
} from "@/lib/booth/flat-booth-frames";
import type { Stall } from "@/types/expo";
import styles from "./booth.module.css";

export interface FlatBoothHandle {
  focusZone: (id: string) => void;
  resetView: () => void;
}

interface FlatBoothProps {
  stall: Stall;
  onHotspot?: (id: string) => void;
}

function applyViewBox(svg: SVGSVGElement, vb: ViewBox) {
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
}

export const FlatBooth = forwardRef<FlatBoothHandle, FlatBoothProps>(function FlatBooth(
  { stall, onHotspot },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentVB = useRef<ViewBox>({ ...FLAT_BOOTH_FULL });
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  const [zoneLabel, setZoneLabel] = useState("Explore the stand");
  const [focused, setFocused] = useState(false);
  const [activeZone, setActiveZone] = useState<FlatBoothZoneId | null>(null);
  const uid = stall.id.replace(/[^a-z0-9]/gi, "");

  const stageAspect = useCallback(() => {
    const el = stageRef.current;
    if (!el) return 16 / 9;
    const { clientWidth, clientHeight } = el;
    return clientHeight > 0 ? clientWidth / clientHeight : 16 / 9;
  }, []);

  const animateViewBox = useCallback((target: ViewBox, onComplete?: () => void) => {
    const svg = svgRef.current;
    if (!svg) return;

    tweenRef.current?.kill();
    const proxy = { ...currentVB.current };

    tweenRef.current = gsap.to(proxy, {
      x: target.x,
      y: target.y,
      w: target.w,
      h: target.h,
      duration: 1.15,
      ease: "power3.inOut",
      onUpdate: () => {
        currentVB.current = { x: proxy.x, y: proxy.y, w: proxy.w, h: proxy.h };
        applyViewBox(svg, currentVB.current);
      },
      onComplete: () => {
        tweenRef.current = null;
        onComplete?.();
      },
    });
  }, []);

  const resetView = useCallback(() => {
    tweenRef.current?.kill();
    tweenRef.current = null;
    setActiveZone(null);
    setFocused(false);
    setZoneLabel("Explore the stand");
    videoRef.current?.pause();
    animateViewBox(FLAT_BOOTH_FULL);
  }, [animateViewBox]);

  const focusZone = useCallback(
    (id: string) => {
      if (!(id in FLAT_BOOTH_ZONES)) return;
      const zoneId = id as FlatBoothZoneId;
      const meta = FLAT_BOOTH_ZONES[zoneId];
      const target = computeNearViewBox(zoneId, stageAspect());

      setActiveZone(zoneId);
      setFocused(true);
      setZoneLabel(meta.label);
      animateViewBox(target, () => {
        if (zoneId === "video") videoRef.current?.play().catch(() => {});
      });
    },
    [animateViewBox, stageAspect],
  );

  const activateZone = useCallback(
    (id: FlatBoothZoneId) => {
      focusZone(id);
      onHotspot?.(id);
    },
    [focusZone, onHotspot],
  );

  useImperativeHandle(ref, () => ({ focusZone, resetView }), [focusZone, resetView]);

  useEffect(
    () => () => {
      tweenRef.current?.kill();
    },
    [],
  );

  const c = stall.color;
  const zoneClass = (id: FlatBoothZoneId) =>
    `${styles.vbZone} ${activeZone === id ? styles.active : ""}`;

  const standClass = [styles.vbStand, focused ? styles.vbFocused : ""].filter(Boolean).join(" ");

  return (
    <div className={styles.flatHost}>
      <div className={standClass}>
        <div className={styles.vbToolbar}>
          <button type="button" className={styles.vbReset} hidden={!focused} onClick={resetView}>
            ← Full booth view
          </button>
          <span className={styles.vbZoneLabel}>{zoneLabel}</span>
        </div>
        <div
          ref={stageRef}
          className={styles.vbStage}
          onClick={(ev) => {
            if (ev.target === svgRef.current || ev.target === stageRef.current) resetView();
          }}
        >
          <svg
            ref={svgRef}
            className={styles.vbSvg}
            viewBox="0 0 960 540"
            role="img"
            aria-label="Exhibition booth"
          >
            <defs>
              <linearGradient id={`vbFloor-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3a342e" />
                <stop offset="100%" stopColor="#1e1a16" />
              </linearGradient>
              <linearGradient id={`vbWall-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2a3142" />
                <stop offset="100%" stopColor="#1a1f2c" />
              </linearGradient>
              <linearGradient id={`vbScreenGlow-${uid}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity="0.35" />
                <stop offset="100%" stopColor="#0a0c14" stopOpacity="0" />
              </linearGradient>
            </defs>

            <g className={styles.vbBackdrop}>
              <polygon points="40,500 920,500 880,340 80,340" fill={`url(#vbFloor-${uid})`} stroke="#4a4038" strokeWidth="1" />
              <g opacity="0.25" stroke="#5a5048" strokeWidth="1">
                <line x1="120" y1="360" x2="840" y2="360" />
                <line x1="100" y1="400" x2="860" y2="400" />
                <line x1="90" y1="440" x2="870" y2="440" />
                <line x1="80" y1="480" x2="880" y2="480" />
              </g>
              <polygon points="80,340 40,500 40,120 120,100" fill="#1e2433" stroke="#2e3648" />
              <polygon points="880,340 920,500 920,120 840,100" fill="#1e2433" stroke="#2e3648" />
              <rect x="120" y="100" width="720" height="250" fill={`url(#vbWall-${uid})`} stroke="#3a4258" strokeWidth="1" />
              <g fill="#fff" opacity="0.06">
                <ellipse cx="200" cy="60" rx="80" ry="20" />
                <ellipse cx="480" cy="45" rx="120" ry="24" />
                <ellipse cx="760" cy="60" rx="80" ry="20" />
              </g>
            </g>

            <g
              className={zoneClass("products")}
              data-zone="products"
              role="button"
              tabIndex={0}
              onClick={(ev) => { ev.stopPropagation(); activateZone("products"); }}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); activateZone("products"); }
              }}
            >
              <rect x="48" y="128" width="200" height="268" rx="4" fill="#222836" stroke="#3a4258" strokeWidth="2" />
              <text x="148" y="152" textAnchor="middle" fill="#8a94a8" fontFamily="monospace" fontSize="10" letterSpacing="2">PRODUCTS</text>
              <rect x="68" y="168" width="160" height="44" rx="3" fill="#3a4560" stroke="#5a6880" />
              <rect x="68" y="222" width="160" height="44" rx="3" fill="#3a4560" stroke="#5a6880" />
              <rect x="68" y="276" width="160" height="44" rx="3" fill="#3a4560" stroke="#5a6880" />
              <rect x="68" y="330" width="72" height="48" rx="3" fill={c} opacity="0.85" />
              <rect x="156" y="330" width="72" height="48" rx="3" fill="#4a5568" />
            </g>

            <g
              className={zoneClass("video")}
              data-zone="video"
              role="button"
              tabIndex={0}
              onClick={(ev) => { ev.stopPropagation(); activateZone("video"); }}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); activateZone("video"); }
              }}
            >
              <rect x="288" y="118" width="384" height="228" rx="6" fill="#0a0c12" stroke="#4a5568" strokeWidth="3" />
              <rect x="298" y="128" width="364" height="208" rx="4" fill="#111520" />
              <rect x="298" y="128" width="364" height="208" rx="4" fill={`url(#vbScreenGlow-${uid})`} />
              <polygon className={styles.vbPlayIcon} points="468,208 468,248 508,228" fill={c} opacity="0.9" />
              <text className={styles.vbReelLabel} x="480" y="280" textAnchor="middle" fill="#6a7890" fontFamily="monospace" fontSize="11" letterSpacing="2">
                FACTORY REEL
              </text>
              <foreignObject x="298" y="128" width="364" height="208" className={styles.vbVideoFo} pointerEvents="none">
                <video ref={videoRef} className={styles.vbVideo} muted loop playsInline>
                  <source src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" type="video/mp4" />
                </video>
              </foreignObject>
            </g>

            <g
              className={zoneClass("brochures")}
              data-zone="brochures"
              role="button"
              tabIndex={0}
              onClick={(ev) => { ev.stopPropagation(); activateZone("brochures"); }}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); activateZone("brochures"); }
              }}
            >
              <rect x="712" y="138" width="200" height="258" rx="4" fill="#1a2820" stroke="#2a5840" strokeWidth="2" />
              <text x="812" y="162" textAnchor="middle" fill="#5a9870" fontFamily="monospace" fontSize="10" letterSpacing="2">BROCHURES</text>
              <rect x="732" y="178" width="36" height="52" rx="2" fill="#1a7a55" transform="rotate(-8 750 204)" />
              <rect x="778" y="172" width="36" height="52" rx="2" fill="#1e8a60" transform="rotate(4 796 198)" />
              <rect x="824" y="178" width="36" height="52" rx="2" fill="#1a7a55" transform="rotate(-5 842 204)" />
              <rect x="748" y="248" width="128" height="8" rx="2" fill="#2a4030" />
              <text x="812" y="290" textAnchor="middle" fill="#5a9870" fontFamily="monospace" fontSize="9">PDF · CATALOGUE · SPECS</text>
            </g>

            <g
              className={zoneClass("reception")}
              data-zone="reception"
              role="button"
              tabIndex={0}
              onClick={(ev) => { ev.stopPropagation(); activateZone("reception"); }}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); activateZone("reception"); }
              }}
            >
              <path d="M298,498 L298,368 Q298,348 318,348 L642,348 Q662,348 662,368 L662,498 Z" fill="#3d3428" stroke="#5a4e40" strokeWidth="2" />
              <rect x="318" y="358" width="324" height="14" rx="2" fill={c} opacity="0.9" />
              <circle cx="380" cy="420" r="28" fill="#4a5568" stroke="#6a7890" strokeWidth="2" />
              <text x="380" y="426" textAnchor="middle" fill="#fff" fontFamily="monospace" fontSize="10">YOU</text>
              <text x="520" y="410" textAnchor="middle" fill="#c8b8a0" fontFamily="Arial,sans-serif" fontSize="13" fontWeight="600">RECEPTION</text>
              <text x="520" y="432" textAnchor="middle" fill="#8a8070" fontFamily="monospace" fontSize="9" letterSpacing="1">VIDEO CALL · MEET TEAM</text>
            </g>

            <g className={styles.vbFascia} pointerEvents="none">
              <rect x="120" y="52" width="720" height="56" rx="2" fill={c} />
              <text
                x="480"
                y="76"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontFamily="Arial,sans-serif"
                fontWeight="700"
                fontSize={stall.company.length > 22 ? 17 : stall.company.length > 16 ? 19 : 22}
                letterSpacing="2"
              >
                {stall.company.toUpperCase()}
              </text>
              <text
                x="480"
                y="96"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.75)"
                fontFamily="monospace"
                fontSize="11"
                letterSpacing="3"
              >
                STALL {stall.code}
              </text>
            </g>
          </svg>
        </div>
        <p className={styles.vbFoot}>Click the screen, product wall, brochure rack, or reception desk</p>
      </div>
    </div>
  );
});
