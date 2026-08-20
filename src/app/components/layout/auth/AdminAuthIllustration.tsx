// components/layout/auth/AdminAuthIllustration.tsx
// Store-management themed illustration for the admin login panel — replaces
// the old generic finance/analytics stock art with imagery that actually
// reads as "running an online store" (orders, packages, sales growth), in
// the app's own teal brand color (chart-2) instead of an unrelated palette.
//
// viewBox is landscape (matches the real panel: ~2/3 viewport width by full
// viewport height, which is wide, not tall) and every element sits inside a
// centered safe zone so `slice` cropping on odd aspect ratios trims only
// background, never icons.
function PackageBox({
  transform,
  size = 120,
}: {
  transform: string;
  size?: number;
}) {
  const s = size;
  const depth = s * 0.32;
  return (
    <g transform={transform}>
      {/* top face */}
      <path
        d={`M0 ${depth} L${s / 2} 0 L${s} ${depth} L${s / 2} ${depth * 2} Z`}
        fill="#5eead4"
        opacity="0.85"
      />
      {/* left face */}
      <path
        d={`M0 ${depth} L${s / 2} ${depth * 2} V${depth * 2 + s * 0.6} L0 ${depth + s * 0.6} Z`}
        fill="#0f766e"
      />
      {/* right face */}
      <path
        d={`M${s} ${depth} L${s / 2} ${depth * 2} V${depth * 2 + s * 0.6} L${s} ${depth + s * 0.6} Z`}
        fill="#115e59"
      />
      {/* tape seam */}
      <path
        d={`M${s / 2} ${depth * 2} V${depth * 2 + s * 0.6}`}
        stroke="#a7f3d0"
        strokeWidth="3"
        opacity="0.8"
      />
      <path
        d={`M0 ${depth} L${s / 2} 0 L${s} ${depth}`}
        stroke="#a7f3d0"
        strokeWidth="2.5"
        fill="none"
        opacity="0.6"
      />
    </g>
  );
}

export function AdminAuthIllustration() {
  return (
    <svg
      viewBox="0 0 1400 1100"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      role="img"
      aria-label="Illustration of a store dashboard with orders, packages, and rising sales"
    >
      <defs>
        <linearGradient id="admin-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#04312c" />
          <stop offset="55%" stopColor="#075e54" />
          <stop offset="100%" stopColor="#0c7a63" />
        </linearGradient>
        <radialGradient id="admin-glow" cx="80%" cy="10%" r="60%">
          <stop offset="0%" stopColor="#5eead4" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="card-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="bar-fill" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#5eead4" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="1400" height="1100" fill="url(#admin-bg)" />
      <rect width="1400" height="1100" fill="url(#admin-glow)" />

      {/* Soft wave accents, kept low so they never collide with the card */}
      <path
        d="M-50 980 C 250 900, 450 1050, 700 970 S 1150 890, 1450 950"
        fill="none"
        stroke="#5eead4"
        strokeOpacity="0.18"
        strokeWidth="3"
      />
      <path
        d="M-50 1040 C 280 970, 480 1100, 740 1030 S 1180 960, 1450 1020"
        fill="none"
        stroke="#5eead4"
        strokeOpacity="0.12"
        strokeWidth="2"
      />

      {/* Scattered particles, kept near edges */}
      {[
        [70, 90], [1330, 70], [60, 520], [1340, 480], [90, 1000],
        [1300, 1030], [1360, 260],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i % 2 === 0 ? 4 : 3} fill="#5eead4" opacity="0.5" />
      ))}

      {/* Floating packages — safely inset corners */}
      <PackageBox transform="translate(120 130) rotate(-6)" size={110} />
      <PackageBox transform="translate(1140 760) rotate(8)" size={130} />

      {/* Shopping bag glyph (top-right) — two distinct handles, not one arch */}
      <g transform="translate(1170 140)">
        <path d="M8 26 Q8 4 26 4 Q44 4 44 26" fill="none" stroke="#a7f3d0" strokeWidth="6" strokeLinecap="round" />
        <rect x="0" y="26" width="96" height="86" rx="10" fill="#0f766e" />
        <path d="M0 50 H96" stroke="#5eead4" strokeWidth="3" opacity="0.5" />
      </g>

      {/* Growth arrow badge (bottom-left) */}
      <g transform="translate(140 900)">
        <circle cx="44" cy="44" r="44" fill="#0f766e" opacity="0.9" />
        <path
          d="M24 52 L40 34 L54 48 L68 24"
          fill="none"
          stroke="#a7f3d0"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M56 24 H68 V36" fill="none" stroke="#a7f3d0" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Central dashboard card — always centered, generous margin from edges */}
      <g transform="translate(430 300)">
        <rect x="0" y="0" width="540" height="400" rx="26" fill="url(#card-fill)" stroke="#5eead4" strokeOpacity="0.35" strokeWidth="1.5" />

        {/* Store glyph + label */}
        <g transform="translate(36 34)">
          <rect x="0" y="12" width="38" height="28" rx="4" fill="#5eead4" opacity="0.9" />
          <path d="M-5 12 L19 -9 L43 12 Z" fill="#5eead4" opacity="0.9" />
          <rect x="16" y="22" width="7" height="18" fill="#0f766e" />
        </g>
        <text x="90" y="52" fill="#ecfdf5" fontSize="24" fontFamily="sans-serif" fontWeight="700">
          Store Overview
        </text>

        {/* Stat tiles */}
        {[
          { x: 36, label: "Orders", value: "128" },
          { x: 200, label: "Revenue", value: "৳ 42k" },
          { x: 364, label: "Customers", value: "76" },
        ].map((tile, i) => (
          <g key={i} transform={`translate(${tile.x} 88)`}>
            <rect width="140" height="78" rx="12" fill="#ffffff" fillOpacity="0.08" />
            <text x="16" y="30" fill="#a7f3d0" fontSize="14" fontFamily="sans-serif">
              {tile.label}
            </text>
            <text x="16" y="58" fill="#ffffff" fontSize="22" fontFamily="sans-serif" fontWeight="700">
              {tile.value}
            </text>
          </g>
        ))}

        {/* Bar chart trending up */}
        <g transform="translate(36 198)">
          <text x="0" y="0" fill="#a7f3d0" fontSize="14" fontFamily="sans-serif">
            Sales this week
          </text>
          {[38, 54, 46, 70, 84, 100, 124].map((h, i) => (
            <rect
              key={i}
              x={i * 68}
              y={140 - h}
              width="40"
              height={h}
              rx="6"
              fill="url(#bar-fill)"
            />
          ))}
          <path
            d="M20 104 L88 90 L156 98 L224 70 L292 52 L360 36 L428 12"
            fill="none"
            stroke="#ecfdf5"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}
