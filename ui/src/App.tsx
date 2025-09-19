import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CharCard, type V0Char } from "./components/CharCard"
import { initSounds } from "./useSound"
import Creator from "./Creator"
import Cursor from "./Cursor"

const postNui = async (action: string, data?: unknown) => {
  const rn = (window as any).GetParentResourceName?.() || "v0-characters"
  try {
    await fetch(`https://${rn}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(data ?? {})
    })
  } catch {}
}
const callNui = async <T = any>(action: string, data?: unknown): Promise<T | null> => {
  const rn = (window as any).GetParentResourceName?.() || "v0-characters"
  try {
    const r = await fetch(`https://${rn}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(data ?? {})
    })
    return await r.json()
  } catch { return null }
}

type Flags = { allowDelete?: boolean; showChoose?: boolean; sounds?: boolean }
export type Pos = { x:number;y:number;z:number;heading?:number;h?:number }

const isObj = (v:any)=>v&&typeof v==="object"&&!Array.isArray(v)
const keyIn = (o:any,k:string)=>Object.prototype.hasOwnProperty.call(o??{},k)
const toNum = (v:any,d=0)=>(Number.isFinite(Number(v))?Number(v):d)

const collectLists=(root:any,depth=0,out:any[]=[]):any[]=>{
  if(!root||depth>6) return out
  if(Array.isArray(root)){ if(root.length&&root.every(isObj)) out.push(root) }
  else if(isObj(root)){
    const vals=Object.values(root)
    if(vals.length&&vals.every((v)=>isObj(v)&&!Array.isArray(v))){
      const mapped=vals.map((v,i)=>({__slotKey:Object.keys(root)[i],...v as any})); out.push(mapped)
    }
    for(const v of vals) collectLists(v,depth+1,out)
  }
  return out
}
const scoreCharArray=(arr:any[]):number=>{
  if(!arr.length) return 0
  let s=0
  for(const r of arr.slice(0,10)){
    if(!isObj(r)) continue
    const hasCid=keyIn(r,"citizenid"), hasInfo=keyIn(r,"charinfo")
    const hasName=keyIn(r,"firstname")||keyIn(r,"lastname")||keyIn(r,"name")
    const hasJob=keyIn(r,"job")||keyIn(r,"jobLabel")
    const hasMoney=keyIn(r,"money")||keyIn(r,"cash")||keyIn(r,"bank")
    const hasSlot=keyIn(r,"slot")||keyIn(r,"cid")||keyIn(r,"__slotKey")
    s+=(hasCid?3:0)+(hasInfo?2:0)+(hasName?2:0)+(hasJob?1:0)+(hasMoney?1:0)+(hasSlot?1:0)
  }
  return s
}
const normalizeChars=(arr:any[]):V0Char[]=>arr.map((r:any,i:number)=>{
  const parse=(x:any)=>{ if(typeof x==="string"){ try{return JSON.parse(x)}catch{return{}} } return isObj(x)?x:{} }
  const ci=parse(r.charinfo), job=parse(r.job), money=parse(r.money), meta=parse(r.metadata), pos=parse(r.lastpos||r.position)
  const firstname=r.firstname??ci.firstname??ci.first??(typeof r.name==="string"?String(r.name).split(" ")[0]:"")
  const lastname=r.lastname??ci.lastname??ci.last??(typeof r.name==="string"?String(r.name).split(" ").slice(1).join(" "):"")
  const birthdate=r.birthdate??r.dob??ci.birthdate??ci.dob??""
  const gender=r.gender??ci.gender
  const slotFromKey=r.__slotKey&&/^\d+$/.test(String(r.__slotKey))?Number(r.__slotKey):undefined
  const slot=r.slot??r.cid??slotFromKey??(i+1)
  const jobLabel=r.jobLabel||job.label||job.name
  const cash=toNum(r.cash??money.cash), bank=toNum(r.bank??money.bank)
  const portrait=r.portrait||r.portraitUrl||meta.portrait
  const lastPlayed=r.last_played??r.lastPlayed??r.lastlogin??r.lastLogin??meta.last_played??meta.lastLogin
  const gang=parse(r.gang)
  return {
    citizenid:String(r.citizenid??r.citizenId??r.id??""),
    firstname,lastname,gender,birthdate,
    job:{name:job.name,label:jobLabel},
    gang:gang.name?{name:gang.name}:undefined,
    money:{cash,bank},
    slot,portrait,lastPlayed,
    lastpos: pos && typeof pos.x==="number" ? pos : undefined,
  } as V0Char
}).filter(c=>c.citizenid)
const extractMeta=(raw:any)=>{ const c=[raw,raw?.data,raw?.payload,raw?.state,raw?.flags]; let max=4; let flags:Flags={}
  for(const o of c){ if(!o) continue; const m=o.max??o.maxCharacters??o.max_slots; if(typeof m==="number") max=m; if(isObj(o.flags)) flags={...flags,...o.flags} }
  return {max,flags}
}

const App: React.FC = () => {
  const [open,setOpen]=useState(false)
  const [chars,setChars]=useState<V0Char[]>([])
  const [flags,setFlags]=useState<Flags>({})
  const [max,setMax]=useState<number>(4)
  const [menuEpoch,setMenuEpoch]=useState(0)
  const [creator,setCreator]=useState<{on:boolean, step?:string, slot?:number, gender?:0|1}>({on:false})
  const refreshTimer=useRef<number|null>(null)

  useEffect(()=>{ initSounds() },[])

  const hydrateAny=useCallback((raw:any)=>{
    if(!raw) return
    const lists=collectLists(raw).sort((a,b)=>scoreCharArray(b)-scoreCharArray(a))
    const best=lists[0]
    const {max:m,flags:f}=extractMeta(raw)
    setMax(m??4); setFlags(p=>({...p,...f}))
    if(Array.isArray(best)&&best.length) setChars(normalizeChars(best))
  },[])
  const fetchChars=useCallback(async()=>{ const p=await callNui<any>("getCharacters"); if(p) hydrateAny(p) },[hydrateAny])

  useEffect(()=>{
    if(!open) return
    let cancelled=false
    const list=chars.filter(c=>!c.portrait && (c as any).lastpos && (c as any).lastpos.x!=null)
    if(!list.length) return
    const run=async()=>{ for(const c of list){ if(cancelled) break; await postNui("capturePortraitAt",{citizenid:c.citizenid,pos:(c as any).lastpos}); await new Promise(r=>setTimeout(r,180)) } }
    run(); return()=>{cancelled=true}
  },[open,menuEpoch,chars])

  useEffect(()=>{
    const onMsg=(e:MessageEvent)=>{
      const d=e.data||{}; const a=d.action||d.type||d.event
      if(a==="open"||a==="v0chars:open"||a==="openUI"||a==="characters:open"){ setMenuEpoch(v=>v+1); setOpen(true); hydrateAny(d); fetchChars(); return }
      if(a==="close"||a==="v0chars:close"||a==="closeUI"||a==="characters:close"){ setOpen(false); setCreator({on:false}); return }
      if(a==="creator:open"){ setCreator({on:true, step:d.step||"gender", slot:d.slot}); return }
      if(a==="creator:close"){ setCreator({on:false}); return }
      if(a==="creator:setStep"){ setCreator(c=>({...c, step:d.step, gender:d.gender ?? c.gender })); return }
      if(a==="refresh"||a==="v0chars:refresh"||a==="characters:list"){
        if(refreshTimer.current) window.clearTimeout(refreshTimer.current)
        refreshTimer.current = window.setTimeout(()=>fetchChars(),150); return
      }
      if(a==="hydrate"||a==="setData"||a==="setState"||a==="v0chars:set"){ hydrateAny(d); return }
      if(a==="portrait"||a==="v0chars:portrait"){
        const cid=String(d.citizenid||""); const img=d.data
        if(cid && img) setChars(prev=>prev.map(c=>String(c.citizenid)===cid?{...c,portrait:img} as V0Char:c))
        return
      }
      if(!a) hydrateAny(d)
    }
    window.addEventListener("message", onMsg)
    return ()=>window.removeEventListener("message", onMsg)
  },[hydrateAny,fetchChars])

  const onPlay = useCallback((citizenid:string)=>{ postNui("selectCharacter",{citizenid}); setTimeout(()=>postNui("close"),240) },[])
  const onCreateStart = useCallback((slot:number)=>{ postNui("createCharacterStart",{slot}) },[])
  const onGender   = useCallback((g:0|1)=>postNui("creator:gender",{gender:g}),[])
  const onIdentity = useCallback((p:{firstname:string,lastname:string,birthdate:string})=>postNui("creator:registry",p),[])
  const onSpawn    = useCallback((s:string)=>postNui("creator:create",{spawn:s}),[])
  const onCancel   = useCallback(()=>postNui("creator:close",{}),[])

  const layout = useMemo(()=>{
    const total=max||4; const out:(V0Char|null)[]=new Array(total).fill(null); let f=0
    for(const c of chars){ const s=(c as any).slot; const idx=typeof s==="number"&&s>=1&&s<=total?s-1:f++; if(idx<total && !out[idx]) out[idx]=c }
    return out.map((v,i)=>({slot:i+1,v}))
  },[chars,max])

  const wrapperVisible = open
  const contentVisible = open && !creator.on

  // 🔶 Only Step 0 (gender) should be transparent so the world/peds show through
  const transparentDuringGender = creator.on && (creator.step === "gender" || !creator.step)

  return (
    <div
      className={[
        wrapperVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        "transition-opacity duration-150 ease-out",
        "min-h-screen w-full select-none relative",
        transparentDuringGender ? "bg-transparent" : "bg-[#0b0d11]",
      ].join(" ")}
    >
      {/* Character cards grid (hidden while creator overlay is open) */}
      <div className={[contentVisible ? "opacity-100" : "opacity-0","transition-opacity duration-150 ease-out"].join(" ")}>
        <div className="mx-auto max-w-[1600px] px-6 md:px-10 pt-8 md:pt-12">
          <h1 className="text-center text-[40px] md:text-[56px] font-extrabold tracking-tight text-orange-500">PICK YOUR CHARACTER</h1>
          <p className="mt-2 text-center text-sm md:text-base text-white/60">YOU MUST ABIDE BY THE RULES OF THE CHARACTERS.</p>
        </div>
        <div className="mx-auto w-full max-w-[1920px] px-6 md:px-10 mt-6 md:mt-8">
          <div className="grid grid-cols-4 gap-6 md:gap-8 items-stretch min-h-[78vh]">
            {layout.map(({slot,v})=>(
              <CharCard
                key={`${slot}-${menuEpoch}`}
                ch={v}
                slot={slot}
                showChoose={true}
                onCreate={onCreateStart}
                onPlay={onPlay}
                soundsEnabled={flags.sounds!==false}
              />
            ))}
          </div>
        </div>
      </div>

      {/* premium cursor while menu open */}
      <Cursor enabled={open} accent="#ff8a4c" soundsEnabled />

      {/* Creator overlay (runs the 6-step flow) */}
      {creator.on ? (
        <Creator
          step={creator.step||"gender"}
          onGender={onGender}
          onIdentity={onIdentity}
          onSpawn={onSpawn}
          onCancel={onCancel}
        />
      ) : null}
    </div>
  )
}

export default App
