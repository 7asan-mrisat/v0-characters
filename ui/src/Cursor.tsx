import React, { useEffect, useMemo, useRef, useState } from "react"

type CursorProps = {
  enabled?: boolean
  accent?: string          // premium orange
  soundsEnabled?: boolean  // default true
  hoverSrc?: string        // "/sounds/hover.mp3"
  clickSrc?: string        // "/sounds/click.mp3"
}

/* --- helpers --- */
const lerp = (a:number,b:number,t:number)=>a+(b-a)*t
const pickInteractive = (node: Element | null) => {
  // Only consider truly interactive things; ignore generic onClick containers.
  const SEL = "button, a, input, select, textarea, [role='button'], [data-cursor-interactive]"
  let n: Element | null = node
  while (n) {
    if ((n as HTMLElement).dataset?.cursor === "ignore") return {el:null as Element|null, color:undefined}
    if ((n as HTMLElement).matches?.(SEL)) {
      const color = (n as HTMLElement).dataset?.cursorColor || undefined
      return { el: n, color }
    }
    // must also respect CSS pointer style
    const cur = getComputedStyle(n).cursor
    if (cur === "pointer") {
      const color = (n as HTMLElement).dataset?.cursorColor || undefined
      return { el: n, color }
    }
    n = n.parentElement
  }
  return { el: null as Element|null, color: undefined }
}

const useAudio = (src?: string, enabled = true) => {
  const a = useRef<HTMLAudioElement | null>(null)
  const ready = useRef(false)
  const last = useRef(0)
  useEffect(() => {
    if (!src || !enabled) return
    const el = new Audio(src)
    el.preload = "auto"
    a.current = el
    const onCanPlay = () => { ready.current = true }
    el.addEventListener("canplaythrough", onCanPlay, { once: true })
    return () => { el.pause(); a.current = null }
  }, [src, enabled])
  return {
    play: (rateLimitMs = 60) => {
      if (!enabled || !a.current) return
      const now = performance.now()
      if (now - last.current < rateLimitMs) return
      last.current = now
      try { a.current.currentTime = 0; a.current.play().catch(()=>{}) } catch {}
    }
  }
}

/* --- component --- */
const Cursor: React.FC<CursorProps> = ({
  enabled = true,
  accent = "#ff8a4c",
  soundsEnabled = true,
  hoverSrc = "/sounds/hover.mp3",
  clickSrc = "/sounds/click.mp3",
}) => {
  const raf = useRef<number | null>(null)
  const pos = useRef({ x: window.innerWidth/2, y: window.innerHeight/2 })
  const target = useRef({ x: pos.current.x, y: pos.current.y })
  const pressed = useRef(false)
  const [$ring, setRing] = useState<HTMLDivElement | null>(null)
  const [$dot,  setDot]  = useState<HTMLDivElement | null>(null)
  const [hovering, setHovering] = useState(false)
  const [hoverAccent, setHoverAccent] = useState<string | null>(null)

  // sound hooks
  const hoverSnd = useAudio(hoverSrc, soundsEnabled)
  const clickSnd = useAudio(clickSrc, soundsEnabled)

  // hide OS cursor while ours is active (only inside this document)
  useEffect(() => {
    const cls = "v0-cursor-hide"
    if (enabled) document.documentElement.classList.add(cls)
    return () => document.documentElement.classList.remove(cls)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    let lastHover = false
    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX
      target.current.y = e.clientY
      // detect interactivity (only within this DOM)
      const under = document.elementFromPoint(e.clientX, e.clientY)
      const { el, color } = pickInteractive(under)
      const isHover = Boolean(el)
      setHovering(isHover)
      setHoverAccent(color || null)
      if (isHover && !lastHover) hoverSnd.play(90)
      lastHover = isHover
    }
    const onDown = () => { pressed.current = true; clickSnd.play(0) }
    const onUp   = () => { pressed.current = false }
    const onLeave = () => setHovering(false)

    window.addEventListener("mousemove", onMove, { passive: true })
    window.addEventListener("mousedown", onDown)
    window.addEventListener("mouseup", onUp)
    window.addEventListener("mouseleave", onLeave)

    const loop = () => {
      pos.current.x = lerp(pos.current.x, target.current.x, 0.22)
      pos.current.y = lerp(pos.current.y, target.current.y, 0.22)

      const tx = pos.current.x, ty = pos.current.y
      const ring = $ring, dot = $dot
      const base = 22
      const scale = (hovering ? 1.1 : 1) * (pressed.current ? 0.93 : 1)

      if (ring) {
        ring.style.transform = `translate3d(${tx - base/2}px, ${ty - base/2}px, 0) scale(${scale})`
        const color = hovering ? (hoverAccent || accent) : "rgba(255,255,255,0.9)"
        const border = hovering ? color : "rgba(255,255,255,0.28)"
        const shadow = hovering ? `${color}40` : "rgba(0,0,0,0.25)"
        ring.style.borderColor = border
        ring.style.boxShadow = `0 0 18px 2px ${shadow}`
        ring.style.background = hovering ? `${(hoverAccent || accent)}14` : "rgba(255,255,255,0.06)"
      }
      if (dot) {
        const d = hovering ? 6 : 0
        dot.style.transform = `translate3d(${tx - d/2}px, ${ty - d/2}px, 0) scale(${pressed.current?0.85:1})`
        dot.style.opacity = hovering ? "1" : "0"
        dot.style.background = hoverAccent || accent
      }

      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mousedown", onDown)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("mouseleave", onLeave)
    }
  }, [enabled, accent, hoverSrc, clickSrc, soundsEnabled, hovering, hoverAccent, $ring, $dot])

  if (!enabled) return null

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none select-none" aria-hidden>
      <div
        ref={setRing}
        style={{
          position: "absolute",
          width: 22, height: 22, borderRadius: 9999,
          border: "2px solid rgba(255,255,255,0.28)",
          background: "rgba(255,255,255,0.06)",
          transition: "box-shadow 120ms ease, background 120ms ease, border-color 120ms ease",
          willChange: "transform, box-shadow, background, border-color",
        }}
      />
      <div
        ref={setDot}
        style={{
          position: "absolute",
          width: 6, height: 6, borderRadius: 9999,
          background: accent, opacity: 0,
          transition: "opacity 120ms ease, background 120ms ease",
          willChange: "transform, opacity, background",
        }}
      />
    </div>
  )
}

export default Cursor
