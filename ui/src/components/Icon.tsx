import * as React from "react"

type Props = React.SVGProps<SVGSVGElement> & { size?: number }

/** Base icon wrapper with warm premium stroke */
const Svg = ({ size = 18, children, ...rest }: Props) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="url(#i-g)"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    <defs>
      <linearGradient id="i-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFE0C2" />
        <stop offset="100%" stopColor="#FF7A1A" />
      </linearGradient>
    </defs>
    {children}
  </svg>
)

/** User silhouette */
export const IconUser: React.FC<Props> = (p) => (
  <Svg {...p}>
    <path d="M4 20.5c0-3.5 3.6-5.5 8-5.5s8 2 8 5.5" />
    <circle cx="12" cy="8" r="4" />
  </Svg>
)

/** Calendar */
export const IconCalendar: React.FC<Props> = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M8 2v4M16 2v4M3 10h18" />
  </Svg>
)

/** Briefcase */
export const IconBriefcase: React.FC<Props> = (p) => (
  <Svg {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
  </Svg>
)

/** Money (card) */
export const IconMoney: React.FC<Props> = (p) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M7 10v4M17 10v4" />
  </Svg>
)

/** Play */
export const IconPlay: React.FC<Props> = (p) => (
  <Svg {...p}>
    <path d="M8 6l10 6-10 6V6z" fill="url(#i-g)" />
  </Svg>
)

/** Hourglass (last played chip) */
export const IconHourglass: React.FC<Props> = (p) => (
  <Svg {...p}>
    <path d="M7 3h10M7 21h10M7 3v5l5 4 5-4V3M7 21v-5l5-4 5 4v5" />
  </Svg>
)

/** Role glyphs */
export const IconShield: React.FC<Props> = (p) => (
  <Svg {...p}>
    <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3z" />
  </Svg>
)

export const IconCross: React.FC<Props> = (p) => (
  <Svg {...p}>
    <path d="M12 4v16M4 12h16" />
  </Svg>
)

export const IconScales: React.FC<Props> = (p) => (
  <Svg {...p}>
    <path d="M12 3v18M4 7h16M6 7l-2 6h6l-2-6M18 7l2 6h-6l2-6" />
  </Svg>
)

export const IconSkull: React.FC<Props> = (p) => (
  <Svg {...p}>
    <path d="M12 3c4.4 0 8 3.1 8 7v1.5a6.5 6.5 0 0 1-6.5 6.5h-3A6.5 6.5 0 0 1 4 11.5V10c0-3.9 3.6-7 8-7z" />
    <circle cx="9" cy="11" r="1.6" />
    <circle cx="15" cy="11" r="1.6" />
    <path d="M9 17h6" />
  </Svg>
)
