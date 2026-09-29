const paths = {
  flame: <path d="M12 3c1 5 6 6 6 12a6 6 0 0 1-12 0c0-3 2-6 4-8 0 4 2 5 2 5s2-4 0-9Z" />,
  grain: <><path d="m5 21 14-18M9 16c-5 0-6-3-5-6 4 0 6 2 5 6Zm4-5c-4 0-5-3-4-6 4 0 6 3 4 6Zm-4 5c1 4 4 4 7 2-1-3-4-4-7-2Zm4-5c2 3 5 3 7 0-2-3-4-3-7 0Z" /></>,
  drop: <path d="M12 3c-2 4-7 8-7 12a7 7 0 0 0 14 0c0-4-5-8-7-12Z" />,
  bowl: <><path d="M3 11h18a9 9 0 0 1-18 0ZM9 21h6M7 7V4m5 3V2m5 5V4" /></>,
  egg: <path d="M19 14c0 5-3 7-7 7s-7-2-7-7S9 3 12 3s7 6 7 11Z" />,
  leaf: <><path d="M20 3C9 2 3 7 4 14c0 5 6 8 11 3s5-9 5-14ZM4 21 16 8" /></>,
  plate: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /><path d="M2 4v16M22 4v16" /></>,
  sparkles: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM3 3v4m-2-2h4" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.1" /></>,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeClosed: (
    <>
      <path d="M3 9c2 4 5 6 9 6s7-2 9-6M5 12l-2 3m6-1-1 4m7-4 1 4m3-6 2 3" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  edit: (
    <>
      <path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z" />
    </>
  ),
  stats: (
    <>
      <path d="M4 3v17h17M8 15l4-5 4 2 5-7" />
    </>
  ),
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  workout: (
    <>
      <path d="M7 12h10M3 10v4m18-4v4" />
      <rect x="4" y="7" width="3" height="10" rx="1" />
      <rect x="17" y="7" width="3" height="10" rx="1" />
    </>
  ),
  nutrition: (
    <>
      <path d="M12 7c-6-5-11 3-7 10 2 4 4 4 7 2 3 2 5 2 7-2 4-7-1-15-7-10Z" />
      <path d="M12 7c0-3 2-4 4-4" />
    </>
  ),
  goals: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  logout: <path d="M9 4H4v16h5m5-12 4 4-4 4m-5-4h12" />,
  plus: <path d="M12 5v14M5 12h14" />,
  undo: <path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 6 6v3" />,
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4m10-4v4M3 11h18m-13 5h1m6 0h1" />
    </>
  ),
};

export default function Icon({ name, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
