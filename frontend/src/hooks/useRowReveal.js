import { useLayoutEffect, useRef, useState } from "react";

const easing = "cubic-bezier(0.22, 1, 0.36, 1)";
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function useRowReveal(root, origin, onCancel) {
  const animations = useRef([]);
  const closing = useRef(false);
  const [isClosing, setClosing] = useState(false);

  useLayoutEffect(() => {
    const panel = root.current;
    const row = panel.closest(".session-row");
    const bounds = panel.getBoundingClientRect();
    const rowBounds = row.getBoundingClientRect();
    const x = origin.x - (bounds.x - rowBounds.x);
    const y = origin.y - (bounds.y - rowBounds.y);
    // Reveal the surface from the control; text keeps its natural size.
    const start = `circle(19px at ${x}px ${y}px)`;
    const end = `circle(${Math.hypot(bounds.width, bounds.height)}px at ${x}px ${y}px)`;
    panel.dataset.revealStart = start;
    panel.dataset.revealEnd = end;
    if (!reducedMotion()) {
      animations.current = [
        row.animate(
          [
            { height: `${origin.height}px` },
            { height: `${rowBounds.height}px` },
          ],
          { duration: 360, easing },
        ),
        panel.animate(
          [
            { clipPath: start, opacity: 0.35 },
            { clipPath: end, opacity: 1 },
          ],
          { duration: 360, easing },
        ),
      ];
    }
    return () => animations.current.forEach((animation) => animation.cancel());
  }, [root, origin]);

  async function dismiss() {
    if (closing.current) return;
    closing.current = true;
    setClosing(true);
    const panel = root.current;
    if (!reducedMotion()) {
      const row = panel.closest(".session-row");
      const height = row.getBoundingClientRect().height;
      const clipPath = getComputedStyle(panel).clipPath;
      animations.current.forEach((animation) => animation.cancel());
      animations.current = [
        row.animate(
          [{ height: `${height}px` }, { height: `${origin.height}px` }],
          { duration: 260, easing, fill: "forwards" },
        ),
        panel.animate(
          [
            {
              clipPath:
                clipPath === "none" ? panel.dataset.revealEnd : clipPath,
              opacity: 1,
            },
            { clipPath: panel.dataset.revealStart, opacity: 0 },
          ],
          { duration: 260, easing, fill: "forwards" },
        ),
      ];
      try {
        await Promise.all(
          animations.current.map((animation) => animation.finished),
        );
      } catch {
        return; // Switching rows or leaving the page cancels the pending close.
      }
    }
    onCancel();
  }

  return { dismiss, isClosing };
}
