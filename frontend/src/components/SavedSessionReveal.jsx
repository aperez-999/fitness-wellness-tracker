import { useEffect, useRef } from "react";

export default function SavedSessionReveal({ message, onFinished }) {
  const element = useRef(null);

  useEffect(() => {
    // Start only once the confirmed record is in the list, even after a slow refresh.
    element.current?.closest("li")?.scrollIntoView({ block: "nearest" });
    const timer = window.setTimeout(onFinished, 1500);
    return () => window.clearTimeout(timer);
  }, [onFinished]);

  return (
    <span ref={element} className="session-saved-reveal" aria-hidden="true">
      {message}
    </span>
  );
}
