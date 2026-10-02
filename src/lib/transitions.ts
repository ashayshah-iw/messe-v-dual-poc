import gsap from "gsap";

export function withViewTransition(update: () => void): Promise<void> {
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    return (document as Document & { startViewTransition: (cb: () => void) => { finished: Promise<void> } })
      .startViewTransition(update)
      .finished.catch(() => {});
  }
  update();
  return Promise.resolve();
}

/** Curtain wipe — close, run mid callback, open (matches HTML demo). */
export async function runCurtainTransition(mid: () => void | Promise<void>): Promise<void> {
  if (typeof document === "undefined") {
    await mid();
    return;
  }
  const curtain = document.getElementById("curtain");
  const left = document.getElementById("curtainL");
  const right = document.getElementById("curtainR");
  if (!curtain || !left || !right) {
    await mid();
    return;
  }

  curtain.classList.add("show");
  gsap.set(left, { scaleX: 0, transformOrigin: "left center" });
  gsap.set(right, { scaleX: 0, transformOrigin: "right center" });

  await new Promise<void>((resolve) => {
    gsap
      .timeline({
        onComplete: () => {
          curtain.classList.remove("show");
          resolve();
        },
      })
      .to([left, right], { scaleX: 1, duration: 0.4, ease: "power2.in", stagger: 0.04 })
      .add(() => {
        void Promise.resolve(mid());
      })
      .to([left, right], { scaleX: 0, duration: 0.45, ease: "power2.out", stagger: 0.03 });
  });
}
