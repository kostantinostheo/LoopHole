// Same gradient ring as public/favicon.svg, so tab, PWA icon and auth screens match.
export default function BrandLogo({ tagline }) {
  return (
    <div className="brand">
      <svg className="brand__mark" width="56" height="56" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="brand-gradient" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#47bfff" />
            <stop offset="1" stopColor="#7e14ff" />
          </linearGradient>
        </defs>
        <path
          d="M24 4a20 20 0 1 1 0 40a20 20 0 1 1 0-40ZM24 13a11 11 0 1 0 0 22a11 11 0 1 0 0-22Z"
          fill="url(#brand-gradient)"
          fillRule="evenodd"
        />
      </svg>

      <div className="brand__name" role="img" aria-label="LoopHole">
        <span aria-hidden="true">Loop</span>
        <span className="brand__name-accent" aria-hidden="true">Hole</span>
      </div>

      {tagline && <p className="brand__tagline">{tagline}</p>}
    </div>
  );
}
