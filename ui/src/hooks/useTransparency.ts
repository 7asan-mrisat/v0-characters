import { useEffect } from "react"

function toggle(on: boolean) {
  const cls = "v0-transparent"
  const els = [
    document.documentElement,
    document.body,
    document.getElementById("root"),
    document.getElementById("app"),
  ].filter(Boolean) as HTMLElement[]

  els.forEach(el => (on ? el.classList.add(cls) : el.classList.remove(cls)))
}

export function useTransparency(enabled: boolean) {
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    if (enabled) {
      // See-through background, BUT keep clicks enabled for the creator
      root.style.background = 'transparent';
      root.style.pointerEvents = 'auto';
    } else {
      root.style.background = '';
      root.style.pointerEvents = '';
    }

    return () => {
      root.style.background = '';
      root.style.pointerEvents = '';
    };
  }, [enabled]);
}
export default useTransparency;
