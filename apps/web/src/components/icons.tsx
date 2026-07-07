export function DollarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M5 4.5C5 3.4 6.3 2.5 8 2.5C9.7 2.5 11 3.4 11 4.5C11 5.6 9.7 6.5 8 6.5C6.3 6.5 5 7.4 5 8.5C5 9.6 6.3 10.5 8 10.5C9.7 10.5 11 9.6 11 8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PhoneIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 2h2.5L7 5.5 5.5 6.5C6.3 8.2 7.8 9.7 9.5 10.5L10.5 9 14 10.5V13C14 13.6 13.6 14 13 14C6.9 14 2 9.1 2 3 2 2.4 2.4 2 3 2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TrendArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <polyline
        points="2,11 6,7 9,9 14,4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="10,4 14,4 14,8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function DashboardGridIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1"/>
      <rect x="9.5" y="1.5" width="5" height="5" rx="1"/>
      <rect x="1.5" y="9.5" width="5" height="5" rx="1"/>
      <rect x="9.5" y="9.5" width="5" height="5" rx="1"/>
    </svg>
  )
}

export function BarChartIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="9" width="3" height="5.5" rx="0.75"/>
      <rect x="6.5" y="5" width="3" height="9.5" rx="0.75"/>
      <rect x="11.5" y="1.5" width="3" height="13" rx="0.75"/>
    </svg>
  )
}

export function TargetIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5"/>
      <circle cx="8" cy="8" r="3.5"/>
      <circle cx="8" cy="8" r="0.75" fill="currentColor" stroke="none"/>
    </svg>
  )
}

export function CalendarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="2.5" width="13" height="12" rx="1.5"/>
      <line x1="1.5" y1="6.5" x2="14.5" y2="6.5"/>
      <line x1="5" y1="1" x2="5" y2="4"/>
      <line x1="11" y1="1" x2="11" y2="4"/>
    </svg>
  )
}

export function BookmarkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2.5C3 1.95 3.45 1.5 4 1.5h8c.55 0 1 .45 1 1V14l-5-3-5 3V2.5z"/>
    </svg>
  )
}

export function SettingsGearIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42"/>
    </svg>
  )
}

export function LogoutIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 14H3.5C2.7 14 2 13.3 2 12.5v-9C2 2.7 2.7 2 3.5 2H6" />
      <polyline points="10,11 13.5,8 10,5" />
      <line x1="13.5" y1="8" x2="6.5" y2="8" />
    </svg>
  )
}

export function BoltIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M9.5 1.5L3.5 9H8L6.5 14.5L13 7H8.5L9.5 1.5Z"/>
    </svg>
  )
}

// NEW SZN brand mark — isometric cube with a play triangle. Vector so it stays
// razor-sharp at any size (replaces the 69×49 raster logo.png, whose edges blurred
// when scaled). Size via className (e.g. "h-6 w-auto"); aspect ratio is 69:49.
export function LogoMark({ className, title = 'NEW SZN' }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 69 49"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <path fill="#FC044E" d="M36 10 49 2 67 10 67 30 51 38 50 20Z" />
      <path fill="#B20F68" d="M18 39 50 20 51 38 39 47 33 48Z" />
      <path fill="#ED0B7E" d="M1 10 18 1 18 39 1 30Z" />
      <path fill="#FFD128" d="M18 1 50 20 18 39Z" />
    </svg>
  )
}

export function UsersIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="5" r="2.25"/>
      <path d="M1.75 13.5c0-2.35 1.9-4 4.25-4s4.25 1.65 4.25 4"/>
      <path d="M10.25 3.1c1.05.35 1.8 1.35 1.8 2.5 0 1.15-.75 2.15-1.8 2.5"/>
      <path d="M11.75 9.6c1.7.4 3 1.85 3 3.9"/>
    </svg>
  )
}

export function BuildingIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="1.5" width="7" height="13" rx="0.75"/>
      <rect x="9.5" y="6.5" width="4" height="8" rx="0.75"/>
      <line x1="4.5" y1="4" x2="4.5" y2="4.01"/>
      <line x1="7.5" y1="4" x2="7.5" y2="4.01"/>
      <line x1="4.5" y1="7" x2="4.5" y2="7.01"/>
      <line x1="7.5" y1="7" x2="7.5" y2="7.01"/>
      <line x1="4.5" y1="10" x2="4.5" y2="10.01"/>
      <line x1="7.5" y1="10" x2="7.5" y2="10.01"/>
    </svg>
  )
}

export function ChatBubbleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 4.5c0-1.1.9-2 2-2h9c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2H6.5L3 14.5V11.5h-0c-1.1 0-2-.9-2-2v-5Z"/>
    </svg>
  )
}

export function FileTextIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1.5H3.5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1H12.5a1 1 0 0 0 1-1V6.5L9 1.5z"/>
      <path d="M9 1.5V6.5H13.5"/>
      <line x1="5" y1="9" x2="11" y2="9"/>
      <line x1="5" y1="11.5" x2="9" y2="11.5"/>
    </svg>
  )
}

export function InfoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5"/>
      <line x1="8" y1="5.5" x2="8" y2="5.51"/>
      <path d="M8 8v3.5"/>
    </svg>
  )
}

export function SailIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <line x1="14" y1="4" x2="14" y2="22" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 5L5 18H14V5Z" fill="white" fillOpacity="0.75" />
      <path d="M14 9L22 17H14V9Z" fill="white" fillOpacity="0.4" />
      <line x1="6" y1="22" x2="22" y2="22" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M4 25C6.5 23.2 10 22.2 14 22.2C18 22.2 21.5 23.2 24 25"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
