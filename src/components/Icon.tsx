// Classic line-icon set — inline SVGs, no dependency.
// stroke="currentColor" so every icon inherits the monochrome palette.

export type IconName =
  | 'spa' | 'scissors' | 'nails' | 'massage' | 'sparkle' | 'razor'
  | 'stethoscope' | 'home' | 'leaf' | 'star'
  | 'pin' | 'calendar' | 'chart' | 'users' | 'user' | 'bell' | 'chat'
  | 'search' | 'clock' | 'locate' | 'check' | 'x' | 'arrow' | 'settings' | 'lock';

const PATHS: Record<IconName, JSX.Element> = {
  // ── Category icons ──────────────────────────────────────────
  spa: ( // hammam — steam over water
    <>
      <path d="M7 15.5c-2 0-3.5-1.4-3.5-3s1.5-3 3.5-3c.3-2.5 2.5-4.5 5-4.5s4.7 2 5 4.5c2 0 3.5 1.4 3.5 3s-1.5 3-3.5 3" fill="none"/>
      <path d="M6 19h12M8.5 21.5h7" fill="none"/>
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="2.5" fill="none"/>
      <circle cx="6" cy="18" r="2.5" fill="none"/>
      <path d="M8.3 7.5 20 19M8.3 16.5 20 5" fill="none"/>
    </>
  ),
  nails: ( // nail polish bottle
    <>
      <rect x="8" y="11" width="8" height="9" rx="2" fill="none"/>
      <path d="M10.5 11V8h3v3M11 5h2v3h-2z" fill="none"/>
    </>
  ),
  massage: ( // two hands / waves
    <>
      <path d="M4 10c2-2.5 5-2.5 8 0s6 2.5 8 0" fill="none"/>
      <path d="M4 15c2-2.5 5-2.5 8 0s6 2.5 8 0" fill="none"/>
      <path d="M4 20c2-2.5 5-2.5 8 0s6 2.5 8 0" fill="none"/>
    </>
  ),
  sparkle: (
    <path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9L12 3zM19 16.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" fill="none"/>
  ),
  razor: ( // barber razor
    <>
      <path d="M4 20 14 10" fill="none"/>
      <path d="M13 5l6 6-4 4-6-6 4-4z" fill="none"/>
      <path d="M15 7l2 2" fill="none"/>
    </>
  ),
  stethoscope: (
    <>
      <path d="M6 3v6a4 4 0 0 0 8 0V3" fill="none"/>
      <path d="M10 13v3a5 5 0 0 0 10 0v-2" fill="none"/>
      <circle cx="20" cy="12" r="1.8" fill="none"/>
    </>
  ),
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" fill="none"/>
      <path d="M5.5 9.5V20h13V9.5" fill="none"/>
      <path d="M10 20v-6h4v6" fill="none"/>
    </>
  ),
  leaf: (
    <>
      <path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z" fill="none"/>
      <path d="M5 19c3-6 7-9 11-11" fill="none"/>
    </>
  ),
  // ── UI icons ────────────────────────────────────────────────
  star: (
    <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9L12 3.5z" fill="none"/>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" fill="none"/>
      <circle cx="12" cy="10" r="2.5" fill="none"/>
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" fill="none"/>
      <path d="M3.5 10h17M8 3v4M16 3v4" fill="none"/>
    </>
  ),
  chart: (
    <path d="M4 20V10M10 20V4M16 20v-8M20.5 20H3.5" fill="none"/>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" fill="none"/>
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none"/>
      <path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18.5 14.6c1.6.9 2.5 2.6 2.5 5.4" fill="none"/>
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.8" fill="none"/>
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" fill="none"/>
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" fill="none"/>
      <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" fill="none"/>
    </>
  ),
  bell: (
    <>
      <path d="M6 16v-6a6 6 0 0 1 12 0v6l1.5 2.5H4.5L6 16z" fill="none"/>
      <path d="M10 21a2.2 2.2 0 0 0 4 0" fill="none"/>
    </>
  ),
  chat: (
    <path d="M4 5h16v11H9l-5 4V5z" fill="none"/>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" fill="none"/>
      <path d="M16 16l4.5 4.5" fill="none"/>
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" fill="none"/>
      <path d="M12 7v5l3.5 2" fill="none"/>
    </>
  ),
  locate: (
    <>
      <circle cx="12" cy="12" r="6.5" fill="none"/>
      <circle cx="12" cy="12" r="1.5"/>
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" fill="none"/>
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" fill="none"/>
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none"/>
    </>
  ),
  check: <path d="M4.5 12.5l5 5L20 7" fill="none"/>,
  x: <path d="M6 6l12 12M18 6L6 18" fill="none"/>,
  arrow: <path d="M4 12h16M13.5 5.5 20 12l-6.5 6.5" fill="none"/>,
};

export default function Icon({
  name, size = 20, strokeWidth = 1.7, style,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      style={style} aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
