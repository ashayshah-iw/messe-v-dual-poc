// @ts-nocheck — ported from virtual-trade-show-three-booth.js; gradual TS migration
import type { Stall, BoothHotspot } from "@/types/expo";
import type gsap from "gsap";
import * as THREE from "three";

export interface ThreeBoothState {
  three: ThreeBoothRuntime | null;
}

export interface ThreeBoothRuntime {
  renderer: THREE.WebGLRenderer;
  animId: number;
  host: HTMLElement;
  onResize: () => void;
  focusHotspot: (id: string) => void;
  camera: THREE.PerspectiveCamera;
  wallVideo: HTMLVideoElement | null;
  restartWallVideo: () => void;
}

export interface ThreeBoothUi {
  query: (sel: string) => HTMLElement | null;
  toast: (msg: string) => void;
  gsap: typeof gsap;
  onHotspot: (id: string) => void;
}

export function disposeThreeBooth(state: ThreeBoothState, g?: typeof gsap) {
    if (!state.three) return;
    cancelAnimationFrame(state.three.animId);
    window.removeEventListener('resize', state.three.onResize);
    try { if (g && state.three.camera) g.killTweensOf(state.three.camera.position); } catch (_) {}
    if (state.three.wallVideo) {
      try {
        state.three.wallVideo.pause();
        state.three.wallVideo.removeAttribute('src');
        state.three.wallVideo.load();
      } catch (_) {}
    }
    try { state.three.renderer.dispose(); } catch (_) {}
    state.three.host.querySelectorAll('canvas').forEach(function (c) { c.remove(); });
    state.three = null;
  }

export function initThreeBooth(
  state: ThreeBoothState,
  stall: Stall,
  hotspots: BoothHotspot[],
  host: HTMLElement,
  ui: ThreeBoothUi,
) {
  disposeThreeBooth(state, ui.gsap);
    const w = host.clientWidth || 640;
    const h = Math.max(host.clientHeight || 420, 360);
    const brand = new THREE.Color(stall.color);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07081a);
    scene.fog = new THREE.FogExp2(0x07081a, 0.045);

    const camera = new THREE.PerspectiveCamera(58, w / h, 0.08, 80);
    camera.rotation.order = 'YXZ';
    camera.position.set(0, 1.62, 4.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    host.appendChild(renderer.domElement);

    const lookState = { yaw: 0, pitch: -0.08 };
  const YAW_MIN = -1.25, YAW_MAX = 1.25, PITCH_MIN = -0.5, PITCH_MAX = 0.4;
    function applyLook() {
      lookState.yaw = Math.max(YAW_MIN, Math.min(YAW_MAX, lookState.yaw));
      lookState.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, lookState.pitch));
      camera.rotation.set(lookState.pitch, lookState.yaw, 0, 'YXZ');
    }
    function aimAt(x, y, z) {
      camera.lookAt(x, y, z);
      lookState.yaw = camera.rotation.y;
      lookState.pitch = camera.rotation.x;
      applyLook();
    }
    function clampStand() {
      camera.position.y = 1.62;
      if (camera.position.z < 0.85) camera.position.z = 0.85;
      if (camera.position.z > 5.5) camera.position.z = 5.5;
      if (camera.position.x > 2.6) camera.position.x = 2.6;
      if (camera.position.x < -2.6) camera.position.x = -2.6;
    }

    scene.add(new THREE.HemisphereLight(0xb8c0ff, 0x1a1020, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(3.5, 7, 4);
    key.castShadow = true;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8899ff, 0.35);
    fill.position.set(-4, 3, 2);
    scene.add(fill);
    const brandLamp = new THREE.PointLight(brand, 2.2, 12, 2);
    brandLamp.position.set(0, 2.8, -0.5);
    scene.add(brandLamp);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 11),
      new THREE.MeshStandardMaterial({ color: 0x12142e, metalness: 0.08, roughness: 0.88 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 5.2),
      new THREE.MeshStandardMaterial({
        color: brand.clone().multiplyScalar(0.22),
        emissive: brand,
        emissiveIntensity: 0.04,
        roughness: 0.92,
      })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.01, -0.2);
    scene.add(carpet);

    const wallMat = new THREE.MeshStandardMaterial({
      color: brand.clone().lerp(new THREE.Color(0x1a1b40), 0.35),
      metalness: 0.2,
      roughness: 0.45,
      emissive: brand,
      emissiveIntensity: 0.08,
    });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(7.4, 3.4, 0.16), wallMat);
    backWall.position.set(0, 1.7, -2.35);
    backWall.castShadow = true;
    scene.add(backWall);

    [-1, 1].forEach(function (side) {
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 3.4, 3.2),
        new THREE.MeshStandardMaterial({ color: 0x16183a, emissive: brand, emissiveIntensity: 0.05 })
      );
      wing.position.set(side * 3.7, 1.7, -0.8);
      scene.add(wing);
    });

    const fascia = new THREE.Mesh(
      new THREE.BoxGeometry(7.4, 0.42, 0.22),
      new THREE.MeshStandardMaterial({ color: brand, emissive: brand, emissiveIntensity: 0.35 })
    );
    fascia.position.set(0, 3.25, -2.2);
    scene.add(fascia);

    const cnv = document.createElement('canvas');
    cnv.width = 1024;
    cnv.height = 128;
    const ctx = cnv.getContext('2d');
    ctx.fillStyle = '#0B0C24';
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = '#F2F3FA';
    ctx.font = 'bold 56px Archivo, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stall.company.toUpperCase().slice(0, 26), 512, 64);
    const nameTex = new THREE.CanvasTexture(cnv);
    nameTex.colorSpace = THREE.SRGBColorSpace;
    const namePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 0.55),
      new THREE.MeshBasicMaterial({ map: nameTex, transparent: true })
    );
    namePlane.position.set(0, 3.25, -2.05);
    scene.add(namePlane);

    const hotMeshes = {};
    let wallVideo = null;
    let playBadge = null;

    function restartWallVideo() {
      if (!wallVideo) return;
      wallVideo.currentTime = 0;
      const p = wallVideo.play();
      if (p && p.catch) p.catch(function () {});
      if (playBadge) playBadge.visible = false;
      ui.toast('Factory walkthrough · restarted');
      ui.query("#hotLabel")!.textContent = "At · Factory walkthrough · playing";
      ui.query("#hotLabel")!.classList.add("hot");
    }

    const hotMeta = {
      video: {
        cam: { x: 0, y: 1.55, z: 1.35 },
        look: { x: 0, y: 1.55, z: -2.0 },
        build: function () {
          const frame = new THREE.Mesh(
            new THREE.BoxGeometry(3.1, 1.75, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x0a0b18 })
          );
          frame.position.set(0, 1.55, -2.18);
          scene.add(frame);

          wallVideo = document.createElement('video');
          wallVideo.crossOrigin = 'anonymous';
          wallVideo.loop = true;
          wallVideo.muted = true;
          wallVideo.playsInline = true;
          wallVideo.src = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

          const wallVideoTex = new THREE.VideoTexture(wallVideo);
          wallVideoTex.colorSpace = THREE.SRGBColorSpace;
          const screen = new THREE.Mesh(
            new THREE.PlaneGeometry(2.85, 1.5),
            new THREE.MeshBasicMaterial({ map: wallVideoTex, toneMapped: false })
          );
          screen.position.set(0, 1.55, -2.12);
          screen.userData.hotId = 'video';
          scene.add(screen);

          wallVideo.addEventListener('playing', function () {
            if (playBadge) playBadge.visible = false;
          });
          const p = wallVideo.play();
          if (p && p.catch) p.catch(function () { if (playBadge) playBadge.visible = true; });

          playBadge = new THREE.Mesh(
            new THREE.CircleGeometry(0.22, 3),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
          );
          playBadge.position.set(0.04, 1.55, -2.08);
          playBadge.rotation.z = -Math.PI / 2;
          playBadge.visible = false;
          scene.add(playBadge);
          return screen;
        },
      },
      products: {
        cam: { x: -1.55, y: 1.5, z: 1.35 },
        look: { x: -2.55, y: 1.2, z: -1.1 },
        build: function () {
          const unit = new THREE.Group();
          unit.position.set(-2.55, 0, -1.1);
          const shelf = new THREE.Mesh(
            new THREE.BoxGeometry(1.35, 2.1, 0.45),
            new THREE.MeshStandardMaterial({ color: 0x1c1e48 })
          );
          shelf.position.y = 1.15;
          unit.add(shelf);
          const hit = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 2.2, 0.5),
            new THREE.MeshBasicMaterial({ visible: false })
          );
          hit.position.y = 1.15;
          hit.userData.hotId = 'products';
          unit.add(hit);
          scene.add(unit);
          return hit;
        },
      },
      brochures: {
        cam: { x: 1.65, y: 1.45, z: 1.55 },
        look: { x: 2.45, y: 0.85, z: -0.35 },
        build: function () {
          const stand = new THREE.Group();
          stand.position.set(2.45, 0, -0.35);
          const rack = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 0.7, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x1a7a55 })
          );
          rack.position.set(0, 1.05, 0.05);
          stand.add(rack);
          const hit = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 1.3, 0.6),
            new THREE.MeshBasicMaterial({ visible: false })
          );
          hit.position.y = 0.7;
          hit.userData.hotId = 'brochures';
          stand.add(hit);
          scene.add(stand);
          return hit;
        },
      },
      reception: {
        cam: { x: 0, y: 1.55, z: 2.35 },
        look: { x: 0, y: 1.15, z: 0.55 },
        build: function () {
          const desk = new THREE.Group();
          desk.position.set(0, 0, 0.55);
          const body = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 0.95, 0.85),
            new THREE.MeshStandardMaterial({ color: 0x1a1c42 })
          );
          body.position.y = 0.48;
          desk.add(body);
          const top = new THREE.Mesh(
            new THREE.BoxGeometry(2.55, 0.08, 0.95),
            new THREE.MeshStandardMaterial({ color: brand, emissive: brand, emissiveIntensity: 0.2 })
          );
          top.position.y = 0.98;
          desk.add(top);
          const hit = new THREE.Mesh(
            new THREE.BoxGeometry(2.6, 1.4, 1.1),
            new THREE.MeshBasicMaterial({ visible: false })
          );
          hit.position.y = 0.7;
          hit.userData.hotId = 'reception';
          desk.add(hit);
          scene.add(desk);
          return hit;
        },
      },
    };

    Object.keys(hotMeta).forEach(function (id) {
      hotMeshes[id] = hotMeta[id].build();
    });

    let camTween = null;
    let moving = false;
    let dragging = false;
    let dragMoved = false;
    let lastPtr = { x: 0, y: 0 };
    let activeHot = null;

    function goFPP(id) {
      const meta = hotMeta[id];
      if (!meta) return;
      activeHot = id;
      ui.onHotspot(id);
      const label = hotspots.find(function (h) { return h.id === id; });
      ui.query("#hotLabel")!.textContent = label ? "At · " + label.label : id;
      ui.query("#hotLabel")!.classList.add("hot");
      if (id === 'video') restartWallVideo();

      moving = true;
      dragging = false;
      if (camTween) camTween.kill();

      const toPos = meta.cam;
      const toLook = meta.look;
      const pos = { x: camera.position.x, y: camera.position.y, z: Math.max(camera.position.z, 0.85) };
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const look = {
        x: camera.position.x + forward.x * 2.5,
        y: camera.position.y + forward.y * 2.5,
        z: camera.position.z + forward.z * 2.5,
      };

      camTween = ui.gsap.timeline({
        onComplete: function () {
          camera.position.set(toPos.x, toPos.y, toPos.z);
          clampStand();
          aimAt(toLook.x, toLook.y, toLook.z);
          moving = false;
          ui.query("#fppLabel")!.textContent = "Drag to look · click another hotspot to walk";
        },
      });
      camTween.to(pos, {
        x: toPos.x, y: toPos.y, z: toPos.z,
        duration: 1.15, ease: 'power3.inOut',
        onUpdate: function () { camera.position.set(pos.x, 1.62, Math.max(pos.z, 0.85)); },
      }, 0);
      camTween.to(look, {
        x: toLook.x, y: toLook.y, z: toLook.z,
        duration: 1.15, ease: 'power3.inOut',
        onUpdate: function () { aimAt(look.x, look.y, look.z); },
      }, 0);
    }

    camera.position.set(0, 1.62, 4.4);
    aimAt(0, 1.4, -1.2);
    ui.gsap.from(camera.position, { z: 5.6, duration: 1.0, ease: 'power2.out', onUpdate: clampStand });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered = null;
    const pickables = Object.keys(hotMeshes).map(function (k) { return hotMeshes[k]; });

    function pick(ev) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickables, true);
      if (!hits.length) return null;
      var obj = hits[0].object;
      while (obj && !obj.userData.hotId) obj = obj.parent;
      return obj;
    }

    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', function (ev) {
      if (moving) return;
      dragging = true;
      dragMoved = false;
      lastPtr.x = ev.clientX;
      lastPtr.y = ev.clientY;
      canvas.setPointerCapture(ev.pointerId);
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointerup', function (ev) {
      if (!dragging) return;
      dragging = false;
      canvas.style.cursor = hovered ? 'pointer' : 'grab';
      if (!dragMoved && !moving) {
        const obj = pick(ev);
        if (obj) {
          const id = obj.userData.hotId;
          goFPP(id);
          ui.query("#hotList")!.querySelectorAll("button").forEach(function (b) {
            b.classList.toggle("on", (b as HTMLButtonElement).dataset.hot === id);
          });
          const h = hotspots.find(function (x) { return x.id === id; });
          if (h) ui.toast('Moving to ' + h.label);
        }
      }
    });
    canvas.addEventListener('pointercancel', function () { dragging = false; });
    canvas.addEventListener('pointermove', function (ev) {
      if (moving) return;
      if (dragging) {
        const dx = ev.clientX - lastPtr.x;
        const dy = ev.clientY - lastPtr.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true;
        lastPtr.x = ev.clientX;
        lastPtr.y = ev.clientY;
        lookState.yaw -= dx * 0.0045;
        lookState.pitch -= dy * 0.0035;
        applyLook();
        return;
      }
      const obj = pick(ev);
      const id = obj ? obj.userData.hotId : null;
      if (id !== hovered) {
        hovered = id;
        const label = hotspots.find(function (h) { return h.id === id; });
        ui.query("#hotLabel")!.textContent = label ? label.label : activeHot ? "At · hotspot" : "Hover a hotspot";
        ui.query("#hotLabel")!.classList.toggle("hot", !!id || !!activeHot);
        canvas.style.cursor = id ? 'pointer' : 'grab';
      }
    });
    canvas.addEventListener('wheel', function (ev) {
      if (moving) return;
      ev.preventDefault();
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      dir.y = 0;
      if (dir.lengthSq() < 0.0001) return;
      dir.normalize();
      camera.position.addScaledVector(dir, ev.deltaY > 0 ? -0.28 : 0.28);
      clampStand();
    }, { passive: false });

    function onResize() {
      const nw = host.clientWidth;
      const nh = Math.max(host.clientHeight, 360);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    }
    window.addEventListener('resize', onResize);

    let animId = 0;
    (function tick() {
      animId = requestAnimationFrame(tick);
      if (!moving) clampStand();
      renderer.render(scene, camera);
      if (state.three) state.three.animId = animId;
    })();

    state.three = {
      renderer: renderer,
      animId: animId,
      host: host,
      onResize: onResize,
      focusHotspot: goFPP,
      camera: camera,
      wallVideo: wallVideo,
      restartWallVideo: restartWallVideo,
    };
}

