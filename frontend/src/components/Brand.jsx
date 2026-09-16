import { Link } from "react-router-dom";

export function BrandMark() {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 34 38"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="1" y="15" width="8" height="21" rx="4" />
      <rect x="13" y="2" width="8" height="34" rx="4" />
      <rect x="25" y="9" width="8" height="27" rx="4" />
    </svg>
  );
}

export default function Brand({ to = "/dashboard" }) {
  return (
    <Link to={to} className="brand-link" aria-label="Dayform home">
      <BrandMark />
      <span>Dayform</span>
    </Link>
  );
}
