let hoverEl: HTMLAudioElement | null = null
let clickEl: HTMLAudioElement | null = null

export const initSounds = () => {
  if (!hoverEl) {
    hoverEl = new Audio("/sounds/hover.mp3")
    hoverEl.preload = "auto"
    hoverEl.volume = 0.65
  }
  if (!clickEl) {
    clickEl = new Audio("/sounds/click.mp3")
    clickEl.preload = "auto"
    clickEl.volume = 0.85
  }
}

export const playHover = () => {
  try {
    if (!hoverEl) initSounds()
    if (!hoverEl) return
    hoverEl.currentTime = 0
    // Avoid overlap: if playing, slightly rewind instead of stacking.
    if (!hoverEl.paused) { hoverEl.currentTime = Math.min(hoverEl.currentTime, 0.02) }
    hoverEl.play().catch(() => {})
  } catch {}
}

export const playClick = () => {
  try {
    if (!clickEl) initSounds()
    if (!clickEl) return
    clickEl.currentTime = 0
    clickEl.play().catch(() => {})
  } catch {}
}
