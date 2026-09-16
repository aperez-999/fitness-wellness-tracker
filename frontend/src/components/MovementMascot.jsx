import { useEffect, useRef } from "react";

export default function MovementMascot({ count }) {
  const body = useRef(null);
  const previousCount = useRef(count);

  useEffect(() => {
    const increased = count > previousCount.current;
    previousCount.current = count;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!increased || preference.matches) return;

    const animation = body.current.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(-9deg)", offset: 0.45 },
        { transform: "rotate(0deg)" },
      ],
      { duration: 850, easing: "cubic-bezier(.2,.7,.2,1)" },
    );
    const stop = () => animation.cancel();
    preference.addEventListener("change", stop);
    return () => {
      stop();
      preference.removeEventListener("change", stop);
    };
  }, [count]);

  return (
    <svg
      className="movement-mascot"
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="105" cy="178" rx="70" ry="12" fill="#e1e7d7" />
      <path d="M164 164c-12-18-7-32 7-43 10 20 10 34-7 43Z" fill="#a6baa2" />
      <path d="M160 168c-16-3-22-13-20-26 17 3 25 12 20 26Z" fill="#c6d3b8" />
      <path
        d="m84 142-9 28m40-28 12 26"
        stroke="#d6a150"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="M77 163c-8-3-14 1-19 6l-8 3c-4 2-4 8 2 9h30c5-5 3-13-5-18Zm45 1c8-3 13 0 17 5l12 3c5 2 5 8-1 9h-30c-5-6-5-12 2-17Z"
        fill="#593849"
      />
      <path
        d="M53 180h28m40 0h29"
        stroke="#fffcf8"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g ref={body} className="mascot-body">
        <path
          d="M77 85C55 65 47 43 61 29c11-12 27-14 45-10"
          stroke="#efc77e"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M121 83c14-23 10-51-7-64"
          stroke="#e6b762"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M58 98c-2-33 11-53 34-57 29-6 43 16 47 45l8 30c4 22-14 40-43 40-31 0-49-16-46-40Z"
          fill="#efc77e"
        />
        <path
          d="M128 64c8 19 7 47-6 61-12 13-34 18-54 14 8 11 21 17 39 17 29 0 44-18 40-40l-8-30c-2-9-6-17-11-22Z"
          fill="#e6b762"
        />
        <path
          d="m96 18 15 1"
          stroke="#f6d796"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M77 80v5m23-9v5"
          stroke="#593849"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M84 92c5 5 11 4 15-1"
          stroke="#593849"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <ellipse cx="70" cy="93" rx="6" ry="3" fill="#d99678" opacity=".7" />
        <ellipse cx="110" cy="88" rx="6" ry="3" fill="#d99678" opacity=".7" />
      </g>
    </svg>
  );
}
