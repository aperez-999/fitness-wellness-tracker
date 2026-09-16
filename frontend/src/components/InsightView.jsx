import { useEffect, useState } from "react";

// Keep outgoing content during its close transition, then release its subscriptions.
export default function InsightView({ active, children }) {
  const [present, setPresent] = useState(active);

  useEffect(() => {
    if (active) {
      setPresent(true);
      return;
    }
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 0
      : 360;
    const timer = setTimeout(() => setPresent(false), duration);
    return () => clearTimeout(timer);
  }, [active]);

  return (
    <div
      className={`insight-view${active ? " is-active" : ""}`}
      inert={!active}
      aria-hidden={!active}
    >
      <div className="insight-view-clip">
        {(active || present) && (
          <div className="insight-view-content">{children}</div>
        )}
      </div>
    </div>
  );
}
