import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTransparency } from "./hooks/useTransparency"

/* ---------------------------------- Types ---------------------------------- */

type Step = "gender" | "pulse" | "registry" | "dna" | "perks" | "clothing" | "spawn"

type Theme = { id: string; name: string; hex: string }

type CitizenTree = {
  tree: string
  name: string
  perks: { id: string; name: string; icon?: string; description?: string; cost?: number }[]
}

/* ------------------------------- NUI helpers ------------------------------- */

const getResourceName = () =>
  (window as any).GetParentResourceName?.() || "v0-characters"

const postNui = async (action: string, data?: any) => {
  try {
    await fetch(`https://${getResourceName()}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(data || {}),
    })
  } catch {
    // ignore when not inside FiveM
  }
}

const onMessage = (fn: (data: any) => void) => {
  const handler = (e: MessageEvent) => fn(e.data)
  window.addEventListener("message", handler)
  return () => window.removeEventListener("message", handler)
}

/* --------------------------------- Styling --------------------------------- */

const card: React.CSSProperties = {
  borderRadius: 16,
  background: "rgba(14,15,18,0.96)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
  padding: 20,
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "auto",
  zIndex: 120,
}

const dimBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  backdropFilter: "blur(2px)",
  zIndex: 119,
}

const titleStyle: React.CSSProperties = {
  color: "white",
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: 0.4,
  textAlign: "center",
}

const btnPrimary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  background: "var(--accent, #F05A28)",
  color: "#0a0a0b",
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
}

const btnSecondary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  background: "transparent",
  color: "rgba(255,255,255,0.85)",
  fontWeight: 600,
  border: "1px solid rgba(255,255,255,0.12)",
  cursor: "pointer",
}

/* --------------------------------- Widgets -------------------------------- */

const StepHUD: React.FC<{ n: number; total: number; label: string }> = ({ n, total, label }) => (
  <div
    style={{
      position: "fixed",
      top: 18,
      left: "50%",
      transform: "translateX(-50%)",
      padding: "6px 10px",
      borderRadius: 999,
      background: "rgba(0,0,0,0.45)",
      border: "1px solid rgba(255,255,255,0.15)",
      color: "rgba(255,255,255,0.92)",
      fontSize: 12,
      fontWeight: 800,
      zIndex: 130,
      pointerEvents: "none",
      backdropFilter: "blur(2px)",
    }}
  >
    Step {n} / {total} — {label}
  </div>
)

const Step0Gender: React.FC<{ onPick: (g: 0 | 1) => void }> = ({ onPick }) => {
  useTransparency(true);
  const [hover, setHover] = useState<0 | 1 | null>(null);
  const [locked, setLocked] = useState(false);
  const [picked, setPicked] = useState<0 | 1 | null>(null);

  const handlePick = (g: 0 | 1) => {
    if (locked || picked !== null) return;
    setLocked(true);
    setPicked(g);
    onPick(g);
    // No timeout needed if Lua advances step fast; keep if you want debouncing
    // setTimeout(() => setLocked(false), 1200);
  };

  const onDown = (g: 0 | 1) => (e: React.SyntheticEvent) => {
    e.preventDefault();
    // stop both React and native bubbling
    // @ts-ignore
    e.nativeEvent?.stopImmediatePropagation?.();
    e.stopPropagation();
    handlePick(g);
  };

  const Z = 2147483000;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z,
        pointerEvents: "auto",
        userSelect: "none",
        touchAction: "none",
        cursor: "default",
        background: "transparent",
      }}
      // Kill any stray bubbling hitting the root
      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {/* Left half (e.g., Male = 0) */}
      <div
        onMouseEnter={() => setHover(0)} onMouseLeave={() => setHover(null)}
        onPointerDown={onDown(0)} onMouseDown={onDown(0)} onClick={(e) => e.preventDefault()}
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: "50%", cursor: "pointer" }}
      />

      {/* Right half (e.g., Female = 1) */}
      <div
        onMouseEnter={() => setHover(1)} onMouseLeave={() => setHover(null)}
        onPointerDown={onDown(1)} onMouseDown={onDown(1)} onClick={(e) => e.preventDefault()}
        style={{ position: "absolute", top: 0, bottom: 0, right: 0, left: "50%", cursor: "pointer" }}
      />
    </div>
  );
};


/** Step 1 — Pulse (theme color boxes; default Dark Orange) */
const THEMES: Theme[] = [
  { id: "dark-orange", name: "Dark Orange", hex: "#F05A28" }, // default
  { id: "royal-blue", name: "Royal Blue", hex: "#3559E0" },
  { id: "cyber-teal", name: "Cyber Teal", hex: "#10B8A6" },
  { id: "neon-lime", name: "Neon Lime", hex: "#73F59E" },
  { id: "ultra-violet", name: "Ultra Violet", hex: "#7D3AF2" },
  { id: "crimson", name: "Crimson", hex: "#D72638" },
  { id: "ghost-gold", name: "Ghost Gold", hex: "#E3A13B" },
]

function applyAccent(hex: string) {
  document.documentElement.style.setProperty("--accent", hex)
  const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
  if (meta) meta.content = hex
}

const Step1Pulse: React.FC<{ onNext: (t: Theme) => void; initial?: Theme }> = ({ onNext, initial }) => {
  const [pick, setPick] = useState<Theme>(initial || THEMES[0])
  useEffect(() => applyAccent(pick.hex), [pick])

  return (
    <>
      <div style={dimBackdrop} />
      <div style={overlay}>
        <div style={{ ...card, width: 880, maxWidth: "95vw" }}>
          <div style={{ ...titleStyle, marginBottom: 14 }}>Pulse Scan</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {THEMES.map((t) => {
              const active = t.id === pick.id
              return (
                <button
                  key={t.id}
                  onClick={() => setPick(t)}
                  style={{
                    position: "relative",
                    height: 88,
                    borderRadius: 14,
                    border: active ? "2px solid var(--accent, #F05A28)" : "1px solid rgba(255,255,255,0.10)",
                    boxShadow: active ? "0 0 0 2px rgba(255,255,255,0.04), 0 10px 36px rgba(0,0,0,0.55)" : "none",
                    overflow: "hidden",
                    cursor: "pointer",
                    background: t.hex,
                  }}
                  title={t.name}
                />
              )
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <button style={btnPrimary} onClick={() => onNext(pick)}>
              Next
            </button>
          </div>
        </div>
      </div>

      <StepHUD n={1} total={5} label="Pulse" />
    </>
  )
}

/** Step 2 — Registry (Name & ID preview) */
const Step2Registry: React.FC<{
  onNext: (p: { firstname: string; lastname: string; birthdate: string }) => void
  onCancel: () => void
}> = ({ onNext, onCancel }) => {
  const [firstname, setFirst] = useState("")
  const [lastname, setLast] = useState("")
  const [dob, setDob] = useState("")

  const idPreview = useMemo(() => {
    const s = (firstname + lastname + "-" + dob).trim() || String(Math.random())
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
    return "V0-" + (h.toString(16).toUpperCase().padStart(8, "0")).slice(0, 8)
  }, [firstname, lastname, dob])

  const valid =
    firstname.trim().length >= 2 &&
    lastname.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(dob || "")

  return (
    <>
      <div style={dimBackdrop} />
      <div style={overlay}>
        <div style={{ ...card, width: 520, maxWidth: "92vw" }}>
          <div style={{ ...titleStyle, marginBottom: 10 }}>City Registry</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4 }}>First name</div>
              <input
                placeholder="Hasan"
                value={firstname}
                onChange={(e) => setFirst(e.currentTarget.value)}
                style={inputStyle()}
              />
            </div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4 }}>Last name</div>
              <input
                placeholder="Mrisat"
                value={lastname}
                onChange={(e) => setLast(e.currentTarget.value)}
                style={inputStyle()}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4 }}>Date of birth</div>
              <input type="date" value={dob} onChange={(e) => setDob(e.currentTarget.value)} style={inputStyle()} />
            </div>
            <div style={{ gridColumn: "1 / -1", color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
              Citizen ID (auto): <span style={{ color: "white" }}>{idPreview}</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <button style={btnSecondary} onClick={onCancel}>
              Cancel
            </button>
            <button style={{ ...btnPrimary, opacity: valid ? 1 : 0.45 }} disabled={!valid} onClick={() => onNext({ firstname, lastname, birthdate: dob })}>
              Next
            </button>
          </div>
        </div>
      </div>

      <StepHUD n={2} total={5} label="Registry" />
    </>
  )
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "10px 12px",
    color: "white",
    outline: "none",
  }
}

/** Step 3 — DNA (click to mint fingerprint) */
function makeHash(seed: string) {
  let h1 = 0x811c9dc5 | 0,
    h2 = 0x1b873593 | 0
  for (let i = 0; i < seed.length; i++) {
    h1 ^= seed.charCodeAt(i)
    h1 = Math.imul(h1, 0x01000193)
    h2 ^= seed.charCodeAt(i)
    h2 = Math.imul(h2, 0x85ebca6b)
  }
  const x = ((h1 >>> 0).toString(16) + (h2 >>> 0).toString(16)).toUpperCase()
  return x.slice(0, 12)
}

const Fingerprint: React.FC = () => (
  <svg width="180" height="180" viewBox="0 0 100 100" fill="none" style={{ color: "rgba(255,255,255,0.95)" }}>
    <g stroke="currentColor" strokeWidth="1.2" fill="none">
      <path d="M50 10c18 0 30 12 30 30s-6 30-20 40" />
      <path d="M50 15c-14 0-25 9-25 25s8 28 18 36" />
      <path d="M50 20c10 0 20 7 20 20s-5 24-14 31" />
      <path d="M50 24c-8 0-15 6-15 15s6 20 12 26" />
      <path d="M50 30c5 0 10 4 10 10s-4 15-9 20" />
    </g>
  </svg>
)

const Step3DNA: React.FC<{ seed: string; onNext: (hash: string) => void; onBack: () => void }> = ({
  seed,
  onNext,
  onBack,
}) => {
  const [hash, setHash] = useState("")
  const [revealed, setRevealed] = useState(false)
  const mint = () => {
    const h = makeHash(seed + ":" + Date.now())
    setHash(h)
    setRevealed(true)
  }

  return (
    <>
      <div style={dimBackdrop} />
      <div style={overlay}>
        <div style={{ ...card, width: 520, maxWidth: "92vw", textAlign: "center" }}>
          <div style={{ ...titleStyle, marginBottom: 8 }}>DNA Imprint</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 14 }}>
            Click to mint a unique fingerprint for your character.
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
            <button
              onClick={mint}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                padding: 16,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <Fingerprint />
            </button>
          </div>
          {revealed && (
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>
              Fingerprint ID: <span style={{ color: "white", fontFamily: "monospace" }}>{hash}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <button style={btnSecondary} onClick={onBack}>
              Back
            </button>
            <button style={{ ...btnPrimary, opacity: revealed ? 1 : 0.45 }} disabled={!revealed} onClick={() => onNext(hash)}>
              Next
            </button>
          </div>
        </div>
      </div>

      <StepHUD n={3} total={5} label="DNA" />
    </>
  )
}

/** Step 4 — Perks (citizen base only, 3 points) */
async function fetchCitizenPerks(): Promise<CitizenTree[]> {
  const res = await fetch(`https://${getResourceName()}/creator:getCitizenPerks`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: "{}",
  })
  try {
    return await res.json()
  } catch {
    return []
  }
}

const Step4Perks: React.FC<{ onNext: (ids: string[]) => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const [trees, setTrees] = useState<CitizenTree[]>([])
  const [sel, setSel] = useState<string[]>([])

  useEffect(() => {
    fetchCitizenPerks().then(setTrees)
  }, [])

  const pointsUsed = useMemo(() => {
    let sum = 0
    for (const id of sel) {
      for (const t of trees) {
        for (const p of t.perks) if (p.id === id) sum += p.cost || 1
      }
    }
    return sum
  }, [sel, trees])

  const pointsLeft = Math.max(0, 3 - pointsUsed)

  const toggle = (perk: { id: string; cost?: number }) => {
    const cost = perk.cost || 1
    if (sel.includes(perk.id)) {
      setSel(sel.filter((x) => x !== perk.id))
    } else if (pointsLeft >= cost) {
      setSel([...sel, perk.id])
    }
  }

  return (
    <>
      <div style={dimBackdrop} />
      <div style={overlay}>
        <div style={{ ...card, width: 980, maxWidth: "96vw" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={titleStyle}>Starter Perks</div>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.85)",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Points: <span style={{ color: "white" }}>{pointsLeft}</span>/3
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              maxHeight: "54vh",
              overflowY: "auto",
              paddingRight: 6,
            }}
          >
            {trees.map((tr) => (
              <div key={tr.tree} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12, background: "rgba(255,255,255,0.05)" }}>
                <div style={{ color: "white", fontWeight: 700, marginBottom: 8 }}>{tr.name}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {tr.perks.map((p) => {
                    const active = sel.includes(p.id)
                    const blocked = !active && pointsLeft < (p.cost || 1)
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggle(p)}
                        style={{
                          textAlign: "left",
                          borderRadius: 12,
                          padding: 10,
                          cursor: blocked ? "not-allowed" : "pointer",
                          background: active ? "rgba(255,140,0,0.15)" : "rgba(255,255,255,0.06)",
                          border: active ? "1px solid var(--accent, #F05A28)" : "1px solid rgba(255,255,255,0.12)",
                          opacity: blocked ? 0.6 : 1,
                        }}
                        title={p.description || p.name}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 8, background: "var(--accent, #F05A28)" }} />
                          <div style={{ color: "white", fontWeight: 600 }}>{p.name}</div>
                          <div style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.75)" }}>Cost {p.cost || 1}</div>
                        </div>
                        {p.description && <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>{p.description}</div>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <button style={btnSecondary} onClick={onBack}>
              Back
            </button>
            <button style={{ ...btnPrimary, opacity: sel.length > 0 ? 1 : 0.45 }} disabled={sel.length === 0} onClick={() => onNext(sel)}>
              Next
            </button>
          </div>
        </div>
      </div>

      <StepHUD n={4} total={5} label="Perks" />
    </>
  )
}

/** Step 5 — Clothing (opens appearance menu; waits for confirm) */
const Step5Clothing: React.FC<{ onOpen: () => void; ready: boolean; onFinish: () => void; onBack: () => void }> = ({
  onOpen,
  ready,
  onFinish,
  onBack,
}) => {
  return (
    <>
      <div style={dimBackdrop} />
      <div style={overlay}>
        <div style={{ ...card, width: 520, maxWidth: "92vw" }}>
          <div style={{ ...titleStyle, marginBottom: 10 }}>Clothing & Appearance</div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, textAlign: "center", marginBottom: 12 }}>
            Open the full wardrobe. Save to continue.
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <button style={btnPrimary} onClick={onOpen}>
              Open Clothing
            </button>
            <button style={{ ...btnSecondary, opacity: ready ? 1 : 0.45 }} onClick={onFinish} disabled={!ready}>
              Finish
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 16 }}>
            <button style={btnSecondary} onClick={onBack}>
              Back
            </button>
          </div>
        </div>
      </div>

      <StepHUD n={5} total={5} label="Clothing" />
    </>
  )
}

/* --------------------------------- Orchestrator ----------------------------- */

const Creator: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("gender")
  const [slot, setSlot] = useState<number | null>(null)
  const [theme, setTheme] = useState<Theme>(THEMES[0])
  const [clothingOk, setClothingOk] = useState(false)

  // When Lua opens/sets/close steps
  useEffect(
    () =>
      onMessage((d) => {
        if (!d || typeof d !== "object") return
        if (d.action === "creator:open") {
          setOpen(true)
          setStep((d.step as Step) || "gender")
          setSlot(d.slot ?? null)
          setClothingOk(false)
        }
        if (d.action === "creator:setStep") {
          if (d.step) setStep(d.step as Step)
          if (d.step === "clothing") setClothingOk(false)
        }
        if (d.action === "creator:close") {
          setOpen(false)
        }
        if (d.action === "v0c:clothingConfirmed" || d.action === "creator:clothingOk") {
          setClothingOk(true)
        }
      }),
    []
  )

  // Keep accent in sync after Pulse
  useEffect(() => applyAccent(theme.hex), [theme])

  // Actions for each step
  const pickGender = useCallback((g: 0 | 1) => {
  postNui("creator:gender", { gender: g });
  setStep("pulse"); // advance immediately so we don’t sit on Gender
}, []);


  const pulseNext = useCallback((t: Theme) => {
    setTheme(t)
    postNui("creator:pulse", { theme: t })
    setStep("registry")
  }, [])

  const registryNext = useCallback((p: { firstname: string; lastname: string; birthdate: string }) => {
    postNui("creator:registry", p)
    setStep("dna")
  }, [])

  const dnaNext = useCallback((hash: string) => {
    postNui("creator:dna", { dnaHash: hash })
    setStep("perks")
  }, [])

  const perksNext = useCallback((ids: string[]) => {
    postNui("creator:perks", { picks: ids })
    setStep("clothing")
  }, [])

  const clothingOpen = useCallback(() => {
    setClothingOk(false)
    postNui("creator:clothing")
  }, [])

  const clothingFinish = useCallback(() => {
    // Final spawn target is handled by Lua create handler; we just ping finalize or spawn
    postNui("creator:create", { spawn: "legion" })
  }, [])

  const cancelCreate = useCallback(() => {
    // Send your own cancel if you want; for now just notify Lua you hit ESC/cancel
    postNui("creator:escape")
  }, [])

  if (!open) return null

  // Render the active step
  if (step === "gender") return <Step0Gender onPick={pickGender} />

  if (step === "pulse") return <Step1Pulse onNext={pulseNext} initial={theme} />

  if (step === "registry") return <Step2Registry onNext={registryNext} onCancel={cancelCreate} />

  if (step === "dna") return <Step3DNA seed="V0" onNext={dnaNext} onBack={() => setStep("registry")} />

  if (step === "perks") return <Step4Perks onNext={perksNext} onBack={() => setStep("dna")} />

  if (step === "clothing")
    return (
      <Step5Clothing
        onOpen={clothingOpen}
        ready={clothingOk}
        onFinish={clothingFinish}
        onBack={() => setStep("perks")}
      />
    )

  // spawn screen is not used in this flow; kept for safety
  return null
}

export default Creator
