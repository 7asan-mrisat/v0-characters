import React, { useMemo, useRef, useState } from "react"
import { IconUser, IconCalendar, IconBriefcase, IconMoney, IconPlay, IconHourglass, IconShield, IconCross, IconScales, IconSkull } from "./Icon"
import { playHover, playClick } from "../useSound"

export type V0Char = {
  citizenid: string
  firstname: string
  lastname: string
  gender?: string
  birthdate?: string
  job?: { name?: string; label?: string }
  gang?: { name?: string }
  money?: { cash?: number; bank?: number }
  slot?: number
  portrait?: string | null // Drop 2 will populate
  lastPlayed?: string | number | null
}

type Props = {
  ch: V0Char | null
  slot: number
  showChoose?: boolean
  onPlay?: (citizenid: string) => void
  onCreate?: (slot: number) => void
  soundsEnabled?: boolean
}

const money = (v?: number) => (typeof v === "number" ? `$${(v / 1000).toFixed(1)}k` : "$0")

/* ------------------------------- helpers ------------------------------- */
const capitalize = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)
const msAgo = (ts: any) => {
  const n = typeof ts === "number" ? ts : Date.parse(ts)
  if (!Number.isFinite(n)) return null
  const diff = Date.now() - n
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  return { d, h }
}
type Role = "LSPD" | "EMS" | "DOJ" | "Gang" | "Civil"
const roleOf = (ch: V0Char): Role => {
  const g = ch.gang?.name?.toLowerCase()
  const j = ch.job?.name?.toLowerCase() || ch.job?.label?.toLowerCase()
  if (j?.includes("police") || j === "lspd" || j === "pd" || j === "sasp") return "LSPD"
  if (j?.includes("ambulance") || j?.includes("ems") || j === "ems") return "EMS"
  if (j?.includes("doj") || j?.includes("law") || j?.includes("judge")) return "DOJ"
  if (g && g !== "none") return "Gang"
  return "Civil"
}
const roleStyle = (r: Role) => {
  switch (r) {
    case "LSPD": return { label: "LSPD", class: "from-blue-300 to-blue-500", glyph: <IconShield size={14}/> }
    case "EMS":  return { label: "EMS",  class: "from-teal-300 to-teal-500",   glyph: <IconCross  size={14}/> }
    case "DOJ":  return { label: "DOJ",  class: "from-amber-200 to-orange-400",glyph: <IconScales size={14}/> }
    case "Gang": return { label: "GANG", class: "from-violet-300 to-violet-500",glyph: <IconSkull size={14}/> }
    default:     return { label: "CIVIL",class: "from-slate-200 to-slate-400",  glyph: <IconUser   size={14}/> }
  }
}

/* ------------------------------ component ------------------------------ */
export const CharCard: React.FC<Props> = ({
  ch,
  slot,
  showChoose,
  onPlay,
  onCreate,
  soundsEnabled = true,
}) => {
  const [copyIdx, setCopyIdx] = useState(() => Math.floor(Math.random() * 3))
  const copies = useMemo(() => ["Start your story", "New identity", "Fresh slate"], [])
  const [animPlay, setAnimPlay] = useState(false)
  const hoverArmed = useRef(false)

  // ---- Empty slot ----
  if (!ch) {
    return (
      <button
        onMouseEnter={() => { if (soundsEnabled) playHover() ; setCopyIdx((v) => (v + 1) % copies.length) }}
        onClick={() => { if (soundsEnabled) playClick(); onCreate?.(slot) }}
        className="
          group relative overflow-hidden rounded-2xl
          h-[72vh] min-h-[620px]
          bg-[#121417]/80 ring-1 ring-white/5
          transition-transform duration-200 ease-out transform-gpu will-change-transform
          hover:-translate-y-1.5 hover:scale-[1.01] focus:outline-none
        "
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,120,40,0.07),transparent_60%)]" />
        <div className="h-full w-full flex flex-col items-center justify-center gap-3">
          <div
            className="
              flex items-center justify-center
              h-28 w-28 rounded-xl border border-dashed border-orange-500/60
              bg-black/30
            "
          >
            <span className="text-5xl leading-none text-orange-400 select-none">+</span>
          </div>
          <div className="text-lg font-semibold text-white/90">{copies[copyIdx]}</div>
          <div className="text-sm text-white/50">Create a new character</div>
        </div>
      </button>
    )
  }

  // ---- Filled slot ----
  const fullName = `${ch.firstname ?? ""} ${ch.lastname ?? ""}`.trim()
  const [first, last] = fullName.split(/ (.*)/) // split first + rest
  const jobLabel = ch.job?.label || ch.job?.name || "Unemployed"
  const r = roleOf(ch)
  const rs = roleStyle(r)
  const time = msAgo(ch.lastPlayed)

  const handleCardEnter = () => {
    if (!hoverArmed.current) { hoverArmed.current = true; if (soundsEnabled) playHover() }
  }
  const handlePlay = () => {
    if (animPlay) return
    setAnimPlay(true)
    if (soundsEnabled) playClick()
    setTimeout(() => onPlay?.(ch.citizenid), 140) // let animation start before NUI
  }

  return (
    <div
      onMouseEnter={handleCardEnter}
      className={`
        group relative overflow-hidden rounded-2xl
        h-[72vh] min-h-[620px]
        bg-[#121417]/80 ring-1 ring-white/5
        transition-transform duration-200 ease-out transform-gpu will-change-transform
        ${animPlay ? "card-playing" : "hover:-translate-y-1.5 hover:scale-[1.01]"}
      `}
    >
      {/* Base layer: portrait (Drop 2 will populate). Fallback: vignette oval */}
      {ch.portrait ? (
        <div
          className="absolute inset-0 bg-center bg-cover opacity-[0.92] scale-[1.02] will-change-transform"
          style={{ backgroundImage: `url("${ch.portrait}")` }}
        />
      ) : (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,120,40,0.06),transparent_60%)]" />
      )}

      {/* Top-left role pill */}
      <div className="absolute left-4 top-4 z-10">
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-black 
          bg-gradient-to-r ${rs.class} shadow-[0_4px_18px_rgba(255,122,26,0.22)]`}>
          <span className="opacity-90">{rs.glyph}</span>
          <span className="tracking-wide">{rs.label}</span>
        </div>
      </div>

      {/* Top-right last played chip (icon-only) */}
      <div className="absolute right-4 top-4 z-10">
        <div
          className="h-8 w-8 rounded-lg bg-white/8 ring-1 ring-white/10 flex items-center justify-center text-white/90"
          title={time ? `Last played ${time.d}d ${time.h}h ago` : "Last played —"}
        >
          <IconHourglass size={16} />
        </div>
      </div>

      {/* Slight dark mask to keep text readable over portrait */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,13,17,0)_0%,rgba(11,13,17,0.25)_45%,rgba(11,13,17,0.66)_100%)] pointer-events-none" />

      {/* Bottom content that lifts on hover to make room for Play */}
      <div
        className={`
          absolute inset-x-0 bottom-0 p-6 pb-16
          transition-transform duration-200 ease-out transform-gpu will-change-transform
          group-hover:-translate-y-6 ${animPlay ? "-translate-y-8" : ""}
        `}
      >
        {/* Centered premium name */}
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-black drop-shadow-sm">
            <span className="bg-gradient-to-br from-[#FFE0C2] to-[#FF7A1A] bg-clip-text text-transparent">
              {first}
            </span>{" "}
            <span className="bg-gradient-to-br from-[#FFE0C2] to-[#FF7A1A] bg-clip-text text-transparent tracking-wider">
              {last ?? ""}
            </span>
          </div>
        </div>

        {/* Info badges */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
          <Badge icon={<IconUser />} label={ch.gender ? capitalize(ch.gender) ?? "Unknown" : "Unknown"} />
          <Badge icon={<IconCalendar />} label={ch.birthdate || "—"} />
          <Badge icon={<IconBriefcase />} label={jobLabel} />
          <Badge icon={<IconMoney />} label={`${money(ch.money?.cash)} · ${money(ch.money?.bank)}`} />
        </div>
      </div>

      {/* Hover-only Play with sweep animation */}
      {showChoose !== false && (
        <div
          className={`
            absolute inset-x-0 bottom-4 flex justify-center
            ${animPlay ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0"}
            transition-all duration-180 ease-out transform-gpu will-change-transform
            pointer-events-none group-hover:pointer-events-auto
          `}
        >
          <button
            onClick={handlePlay}
            className="
              relative inline-flex items-center gap-2 px-5 py-2 rounded-xl
              bg-orange-500/95 hover:bg-orange-500 text-black font-semibold
              shadow-[0_8px_24px_rgba(255,122,26,0.3)] focus:outline-none overflow-hidden
            "
          >
            {/* Sweep highlight */}
            <span className={`absolute inset-0 translate-x-[-120%] ${animPlay ? "sweep" : ""} pointer-events-none`} />
            <IconPlay size={18} />
            <span>Play</span>
          </button>
        </div>
      )}
    </div>
  )
}

const Badge: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div
    className="
      inline-flex items-center gap-2 rounded-lg
      bg-black/30 px-3 py-2 text-white/85 ring-1 ring-white/10 backdrop-blur-[1px]
    "
  >
    <span className="shrink-0">{icon}</span>
    <span className="truncate">{label}</span>
  </div>
)
