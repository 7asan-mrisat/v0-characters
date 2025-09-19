local QBCore = QBCore or exports['qb-core']:GetCoreObject()
-- === Character Creator Front Camera ===
local V0_CharCam = -1
local V0_CharCamLoop = false

local function _v0_DestroyCharCam()
    if V0_CharCam ~= -1 then
        RenderScriptCams(false, true, 500, true, true)
        DestroyCam(V0_CharCam, false)
        V0_CharCam = -1
    end
    V0_CharCamLoop = false
end

local function _v0_CreateFrontCam()
    local ped = PlayerPedId()
    local pedPos = GetEntityCoords(ped)
    -- place camera ~1.6m in front and a little above chest height
    local camPos = GetOffsetFromEntityInWorldCoords(ped, 0.0, 1.6, 0.65)

    if V0_CharCam ~= -1 then _v0_DestroyCharCam() end

    V0_CharCam = CreateCamWithParams(
        "DEFAULT_SCRIPTED_CAMERA",
        camPos.x, camPos.y, camPos.z,
        0.0, 0.0, 0.0,
        45.0,      -- FOV
        false, 0
    )

    -- Look right at the ped’s upper body so it’s clearly “front”
    PointCamAtEntity(V0_CharCam, ped, 0.0, 0.0, 0.6, true)
    SetCamActive(V0_CharCam, true)
    RenderScriptCams(true, true, 500, true, true)

    -- Keep the game from snapping back to first person while UI is up
    V0_CharCamLoop = true
    CreateThread(function()
        -- third-person follow view for safety (harmless while scripted cam is active)
        SetFollowPedCamViewMode(1)
        while V0_CharCamLoop do
            DisableFirstPersonCamThisFrame()
            HideHudAndRadarThisFrame()
            Wait(0)
        end
    end)
end

-- =============================
-- Portrait / preview (unchanged)
-- =============================
local Portrait = { FOV=60.0, Distance=1.42, ZOffset=0.0, Side=0.08, AimBias=0.55 }
local function _dbg(msg) print(("^3[v0-characters]^7 %s"):format(msg)) end
-- debug / safety switch (set true to bypass apartment while testing)
local FORCE_FALLBACK = false
local _menuOpenPos = nil
local function _getPosH(ped) local c=GetEntityCoords(ped); return {x=c.x+0.0,y=c.y+0.0,z=c.z+0.0,heading=GetEntityHeading(ped)+0.0} end
local function _reqModel(hash) RequestModel(hash); local t=GetGameTimer()+6000; while not HasModelLoaded(hash) and GetGameTimer()<t do Wait(0) end; return HasModelLoaded(hash) end
local function _ensurePrefix(d) if not d or type(d)~="string" then return nil end; if d:find("^data:image",1,false) then return d end; return "data:image/jpeg;base64,"..d end

local _previewPed=nil
local function _destroyPreviewPed() if _previewPed and DoesEntityExist(_previewPed) then DeleteEntity(_previewPed) end; _previewPed=nil end
local function _ensurePreviewPed()
  if _previewPed and DoesEntityExist(_previewPed) then return _previewPed end
  local base=PlayerPedId(); if not DoesEntityExist(base) then return nil end
  local model=GetEntityModel(base); if not _reqModel(model) then return nil end
  local p=ClonePed(base,0.0,false,true); if not p or p==0 then return nil end
  NetworkSetEntityInvisibleToNetwork(p,true); FreezeEntityPosition(p,true); SetEntityInvincible(p,true); SetBlockingOfNonTemporaryEvents(p,true); ClearPedTasksImmediately(p)
  _previewPed=p; return p
end

local function _shootPed(ped,cb)
  if not DoesEntityExist(ped) then cb(nil) return end
  local head=GetPedBoneCoords(ped,31086,0.0,0.0,0.0); local pelvis=GetPedBoneCoords(ped,11816,0.0,0.0,0.0)
  local aimX=head.x+(pelvis.x-head.x)*Portrait.AimBias; local aimY=head.y+(pelvis.y-head.y)*Portrait.AimBias; local aimZ=head.z+(pelvis.z-head.z)*Portrait.AimBias
  local hr=math.rad(GetEntityHeading(ped)); local fwdx,fwdy=-math.sin(hr),math.cos(hr); local rgtx,rgty=fwdy,-fwdx
  local gapZ=math.abs(head.z-pelvis.z); local dist=math.max(1.22, math.min(1.60, Portrait.Distance+(gapZ-0.45)*0.35))
  local camx=aimX+fwdx*dist+rgtx*Portrait.Side; local camy=aimY+fwdy*dist+rgty*Portrait.Side; local camz=aimZ+Portrait.ZOffset
  local cam=CreateCamWithParams("DEFAULT_SCRIPTED_CAMERA", camx,camy,camz, 0.0,0.0,0.0, Portrait.FOV, true,2)
  SetCamFov(cam,Portrait.FOV); PointCamAtCoord(cam,aimX,aimY,aimZ-0.02); SetCamActive(cam,true); RenderScriptCams(true,false,0,true,true)
  local radarWasHidden = IsRadarHidden and IsRadarHidden() or false; DisplayRadar(false); Wait(50)
  if exports['screenshot-basic'] and exports['screenshot-basic'].requestScreenshot then
    exports['screenshot-basic']:requestScreenshot({encoding='jpg',quality=0.75}, function(data)
      RenderScriptCams(false,false,0,true,true); DestroyCam(cam,false); if not radarWasHidden then DisplayRadar(true) end; cb(_ensurePrefix(data))
    end)
  else
    RenderScriptCams(false,false,0,true,true); DestroyCam(cam,false); if not radarWasHidden then DisplayRadar(true) end; cb(nil)
  end
end

local function _capturePortraitAt(pos,cb)
  local p=_ensurePreviewPed(); if not p then cb(nil) return end
  SetEntityCoordsNoOffset(p, pos.x+0.0, pos.y+0.0, pos.z+0.0, false,false,false)
  SetEntityHeading(p, (pos.h or pos.heading or 0.0)+0.0); FreezeEntityPosition(p,true); SetEntityVisible(p,true,false); _shootPed(p,cb)
end

local function _refreshOwnPortrait()
  local pd=QBCore.Functions.GetPlayerData(); local cid=pd and pd.citizenid; if not cid then return end
  _shootPed(PlayerPedId(), function(img) if not img then return end; TriggerServerEvent("v0chars:savePortrait",cid,img); SendNUIMessage({action="v0chars:portrait",citizenid=cid,data=img}) end)
end
exports("RefreshPortrait", _refreshOwnPortrait)
RegisterNetEvent("v0chars:refreshPortrait", _refreshOwnPortrait)

-- ==========================================================
-- Premium CREATOR (Gender → Identity → Spawn) with apartment
-- ==========================================================
Creator = {
  active=false, slot=nil,
  gender=nil, firstname=nil, lastname=nil, birthdate=nil, spawn=nil,
  theme = { id='dark-orange', hex='#F05A28' },  -- Step 1 theme
  dnaHash=nil,                                   -- Step 3 DNA
  starterPerks={},                                -- Step 4 picks (ids)
  clothingSaved=false,                            -- Step 5 result
  cam=0, malePed=0, femalePed=0, chairL=0, chairR=0, focused=false,
}


-- === Apartment interior setup ===
-- We use the Online High-End Apartment shell. These IPLs/coords are stable.
local Apt = {
  ipl = "apa_v_mp_h_01_a",                                -- style variant (a-h). 'a' is clean + bright
  pos = vector3(-786.8663, 315.7642, 217.6385),           -- interior origin
  heading = 0.0,
  -- micro-set positions inside living room (safe, open area)
  left   = vector3(-789.20, 329.25, 217.6385),
  right  = vector3(-784.60, 329.25, 217.6385),
  camPos = vector3(-787.00, 332.60, 218.70),
  camLook= vector3(-787.00, 329.90, 218.00),
  fov    = 48.0,
}

-- outdoor fallback if IPL fails for any reason
local Fallback = {
  left   = vector3(1460.0-0.9, 654.0, 20.0),
  right  = vector3(1460.0+0.9, 654.0, 20.0),
  camPos = vector3(1460.0, 656.6, 21.0),
  camLook= vector3(1460.0, 654.0, 20.6),
  fov    = 45.0,
}

local function _reqIpls(ipls)
  for _,ipl in ipairs(ipls) do RequestIpl(ipl) end
end

local function _loadApartment()
  -- Try to request the apartment shell IPL
  RequestIpl(Apt.ipl)
  local int = GetInteriorAtCoords(Apt.pos.x, Apt.pos.y, Apt.pos.z)
  if int == 0 then
    _dbg("creator: apartment interior id=0 (coords invalid or IPL missing)")
    return false, 0
  end
  PinInteriorInMemory(int)
  LoadInterior(int)

  local deadline = GetGameTimer() + 6000
  while not IsInteriorReady(int) and GetGameTimer() < deadline do
    Wait(50)
  end
  local ok = IsInteriorReady(int)
  _dbg(("creator: apartment interior ready=%s id=%s"):format(ok and "true" or "false", int))
  return ok, int
end
local function _prewarmAt(camPos)
  -- Force stream around the camera position so we don't stare into the void.
  SetFocusPosAndVel(camPos.x, camPos.y, camPos.z, 0.0, 0.0, 0.0)
  RequestCollisionAtCoord(camPos.x, camPos.y, camPos.z)

  -- Kick a short loadsceen around the camera
  NewLoadSceneStart(camPos.x, camPos.y, camPos.z, 0.0, 0.0, 0.0, 50.0, 0)
  local deadline = GetGameTimer() + 3000
  while not IsNewLoadSceneLoaded() and GetGameTimer() < deadline do
    Wait(50)
  end
  NewLoadSceneStop()
end


local function _clearFocus()
  if Creator.focused then
    ClearFocus()
    Creator.focused = false
  end
end

local function _focusAt(vec)
  SetFocusPosAndVel(vec.x, vec.y, vec.z, 0.0, 0.0, 0.0)
  Creator.focused = true
end

local function _del(e) if e ~= 0 and DoesEntityExist(e) then DeleteEntity(e) end end

local function _spawnChairAt(v)
  local h = GetHashKey("prop_chair_01a")
  if not _reqModel(h) then return 0 end
  local obj = CreateObjectNoOffset(h, v.x, v.y, v.z, false, true, false)
  if obj ~= 0 then FreezeEntityPosition(obj, true) end
  return obj
end

local function _seatPedAt(modelName, v, heading)
  local h = GetHashKey(modelName)
  if not _reqModel(h) then return 0 end
  local p = CreatePed(4, h, v.x, v.y, v.z, heading, false, true)
  if p ~= 0 then
    NetworkSetEntityInvisibleToNetwork(p, true)
    SetEntityInvincible(p, true)
    SetBlockingOfNonTemporaryEvents(p, true)
    FreezeEntityPosition(p, false)
    ClearPedTasksImmediately(p)
    TaskStartScenarioAtPosition(p, "PROP_HUMAN_SEAT_CHAIR_MP", v.x, v.y, v.z, heading, 0, true, true)
  end
  return p
end

local function _startGenderScene()
  -- Decide apartment vs fallback
  local usingApt = false
  local interior = 0

  if not FORCE_FALLBACK then
    local ok, int = _loadApartment()
    usingApt = ok and int ~= 0
    interior = int or 0
  end

  local left, right, camPos, camLook, fov, heading
  if usingApt then
    left, right, camPos, camLook, fov, heading = Apt.left, Apt.right, Apt.camPos, Apt.camLook, Apt.fov, Apt.heading
    _dbg("creator: using apartment scene")
  else
    left, right, camPos, camLook, fov, heading = Fallback.left, Fallback.right, Fallback.camPos, Fallback.camLook, Fallback.fov, 0.0
    _dbg("creator: using OUTDOOR fallback scene")
  end

  -- Prewarm stream where the camera will be
  _prewarmAt(camPos)

  -- Build furniture + peds
  Creator.chairL = _spawnChairAt(left)
  Creator.chairR = _spawnChairAt(right)
  Creator.malePed   = _seatPedAt("a_m_m_business_01", left,  heading)
  Creator.femalePed = _seatPedAt("a_f_y_business_01", right, heading)

  -- Safety: if either ped failed (streaming hiccup), flip to fallback immediately
  if usingApt and (Creator.malePed == 0 or Creator.femalePed == 0) then
    _dbg("creator: apartment spawn failed; switching to fallback")
    -- Clean up partial
    _del(Creator.malePed);   Creator.malePed = 0
    _del(Creator.femalePed); Creator.femalePed = 0
    _del(Creator.chairL);    Creator.chairL = 0
    _del(Creator.chairR);    Creator.chairR = 0

    left, right, camPos, camLook, fov, heading = Fallback.left, Fallback.right, Fallback.camPos, Fallback.camLook, Fallback.fov, 0.0
    _prewarmAt(camPos)
    Creator.chairL = _spawnChairAt(left)
    Creator.chairR = _spawnChairAt(right)
    Creator.malePed   = _seatPedAt("a_m_m_business_01", left,  heading)
    Creator.femalePed = _seatPedAt("a_f_y_business_01", right, heading)
  end

  -- Camera
  if Creator.cam ~= 0 then DestroyCam(Creator.cam, false) end
  Creator.cam = CreateCamWithParams("DEFAULT_SCRIPTED_CAMERA", camPos.x, camPos.y, camPos.z, 0.0, 0.0, heading + 180.0, fov, true, 2)
  PointCamAtCoord(Creator.cam, camLook.x, camLook.y, camLook.z)
  SetCamActive(Creator.cam, true)
  RenderScriptCams(true, false, 0, true, true)
end


local function _cleanupScene()
  RenderScriptCams(false,false,0,true,true)
  if Creator.cam ~= 0 then DestroyCam(Creator.cam,false) end
  Creator.cam = 0
  _del(Creator.malePed);   Creator.malePed = 0
  _del(Creator.femalePed); Creator.femalePed = 0
  _del(Creator.chairL);    Creator.chairL = 0
  _del(Creator.chairR);    Creator.chairR = 0
  _clearFocus()
end

local function _openCreator(slot)
  if Creator.active then return end
  Creator.active = true
  Creator.slot = slot
  Creator.gender, Creator.firstname, Creator.lastname, Creator.birthdate, Creator.spawn = nil, nil, nil, nil, nil
-- Focus NUI (one-time when opening the creator)
SetNuiFocus(true, true)
SetNuiFocusKeepInput(false)
SetCursorLocation(0.5, 0.5)

-- Hide the select grid while the creator is on top
SendNUIMessage({ action = "closeSelect" })

-- Open creator overlay at Step 0 (gender)
SendNUIMessage({ action = "creator:open", step = "gender", slot = slot })

  -- Boot apartment / fallback scene + preview peds + cam
  _startGenderScene()
end


local function _closeCreator()
  if not Creator.active then return end
  Creator.active=false
  _cleanupScene()
  SendNUIMessage({ action="creator:close" })
end

-- =============================
-- Menu open/close + portraits
-- =============================
local uiOpen=false
local function toggleUi(state)
  if uiOpen == state then SetNuiFocus(state,state); SetNuiFocusKeepInput(false); return end
  uiOpen = state
  if state then
    local ped=PlayerPedId(); _menuOpenPos=_getPosH(ped); TriggerServerEvent("v0chars:updateLastPos", _menuOpenPos); TriggerServerEvent("v0chars:enterShell")
  else
    _menuOpenPos=nil; TriggerServerEvent("v0chars:exitShell")
  end
  SetNuiFocus(state,state); SetNuiFocusKeepInput(false); if state then SetCursorLocation(0.5,0.5) end
  local ped=PlayerPedId()
  FreezeEntityPosition(ped,state); DisplayRadar(not state); SetEntityCollision(ped,not state,not state); SetEntityVisible(ped,not state,false); SetPlayerControl(PlayerId(), not state, 0)
  if state then StartAudioScene("CHARACTER_CHANGE_IN_SKY_SCENE"); StartAudioScene("MP_LEADERBOARD_SCENE")
  else StopAudioScene("CHARACTER_CHANGE_IN_SKY_SCENE"); StopAudioScene("MP_LEADERBOARD_SCENE"); _destroyPreviewPed(); _closeCreator() end

  SendNUIMessage({ action = state and "open" or "close",
    flags = { allowDelete=Config.AllowDelete, confirmDelete=Config.ConfirmDelete, max=Config.MaxCharacters or 4, lockedSlots=Config.LockedSlots or {}, showChoose=Config.ShowChooseLocation and true or false, sounds=true } })

  if state then
    SendNUIMessage({action="refresh"}); Wait(50); SendNUIMessage({action="hydrate"}); SetTimeout(10,function() SendNUIMessage({action="v0chars:open"}) end)
    if _menuOpenPos then
      _capturePortraitAt(_menuOpenPos, function(img) if img then local pd=QBCore.Functions.GetPlayerData(); if pd and pd.citizenid then SendNUIMessage({action="v0chars:portrait", citizenid=pd.citizenid, data=img}) end end end)
    end
  end
end

RegisterNetEvent("v0chars:openUI", function()  toggleUi(true)  end)
RegisterNetEvent("v0chars:closeUI", function() toggleUi(false) end)
RegisterNetEvent("v0chars:refreshUI", function() SendNUIMessage({action="refresh"}) end)
RegisterNetEvent("v0chars:toast", function(msg,kind) SendNUIMessage({action="toast", msg=msg, kind=kind or "info"}) end)
RegisterCommand("char", function() toggleUi(true) end, false)

-- =============================
-- NUI callbacks (cards + creator)
-- =============================
RegisterNUICallback("close", function(_,cb) toggleUi(false); cb(true) end)
RegisterNUICallback("getCharacters", function(_,cb) QBCore.Functions.TriggerCallback("v0chars:getCharacters", function(p) cb(p or {}) end) end)
RegisterNUICallback("selectCharacter", function(payload,cb) TriggerServerEvent("v0chars:selectCharacter", payload.citizenid); cb({ok=true}) end)
RegisterNUICallback("deleteCharacter", function(payload,cb) TriggerServerEvent("v0chars:deleteCharacter", payload.citizenid); cb({ok=true}) end)

RegisterNUICallback("createCharacterStart", function(payload, cb)
    if cb then cb("ok") end
    local slot = payload and payload.slot or nil

    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(false)
    SetCursorLocation(0.5, 0.5)

    _openCreator(slot)
end)

-- step 1: gender picked (0 male / 1 female)
RegisterNUICallback("creator:gender", function(data, cb)
  if not Creator.active then cb(false) return end
  local g = tonumber(data and data.gender or -1) or -1
  if g ~= 0 and g ~= 1 then cb(false) return end
  Creator.gender = g
  _cleanupScene()  -- remove the gender set; identity/spawn are UI-only
    SendNUIMessage({ action="creator:setStep", step="pulse", gender=g })
  cb(true)
end)

-- step 2: identity submitted
RegisterNUICallback("creator:identity", function(data, cb)
  if not Creator.active then cb(false) return end
  Creator.firstname = tostring(data.firstname or ""):gsub("%s+"," ")
  Creator.lastname  = tostring(data.lastname  or ""):gsub("%s+"," ")
  Creator.birthdate = tostring(data.birthdate or "")
  if #Creator.firstname < 2 or #Creator.lastname < 2 then cb(false) return end
  SendNUIMessage({ action="creator:setStep", step="spawn" })
  cb(true)
end)

-- step 3: spawn chosen -> create character
RegisterNUICallback("creator:create", function(data, cb)
  if not Creator.active then cb(false) return end
  Creator.spawn = data and data.spawn or "legion"
    local payload = {
    slot = Creator.slot,
    gender = Creator.gender,
    firstname = Creator.firstname,
    lastname = Creator.lastname,
    dob = Creator.birthdate,
    spawn = data and data.spawn or "legion",
    theme = Creator.theme,              -- { id, hex }
    dnaHash = Creator.dnaHash,          -- string
    perks = Creator.starterPerks or {}, -- { 'c_xxx', ... }
  }
  TriggerServerEvent("v0chars:createCharacter", payload)
  _closeCreator()
  SendNUIMessage({ action="v0chars:refresh" })
  cb(true)
end)

-- portrait helpers
RegisterNUICallback("capturePortrait", function(_,cb) local pd=QBCore.Functions.GetPlayerData(); if pd and pd.citizenid then _refreshOwnPortrait() end; cb(true) end)
RegisterNUICallback("capturePortraitAt", function(data,cb)
  local pos=data and data.pos; local cid=data and data.citizenid; if not pos or not pos.x or not pos.y or not pos.z then cb(false) return end
  _capturePortraitAt(pos, function(img) if img and cid then SendNUIMessage({action="v0chars:portrait", citizenid=cid, data=img}) end; cb(img and true or false) end)
end)
-- Step 1 — Pulse (theme variant)
RegisterNUICallback("creator:pulse", function(data, cb)
  if not Creator.active then cb(false) return end
  local theme = data and data.theme or {}
  Creator.theme = { id = tostring(theme.id or 'dark-orange'), hex = tostring(theme.hex or '#F05A28') }
  SendNUIMessage({ action="creator:setStep", step="registry" })
  cb(true)
end)

-- Step 2 — Registry (Name & ID)
RegisterNUICallback("creator:registry", function(data, cb)
  if not Creator.active then cb(false) return end
  Creator.firstname = tostring(data.firstname or ""):gsub("%s+"," ")
  Creator.lastname  = tostring(data.lastname  or ""):gsub("%s+"," ")
  Creator.birthdate = tostring(data.birthdate or "")
  if #Creator.firstname < 2 or #Creator.lastname < 2 then cb(false) return end
  SendNUIMessage({ action="creator:setStep", step="dna" })
  cb(true)
end)

-- Back-compat alias (keep old identity callback working)
RegisterNUICallback("creator:identity", function(data, cb)
  if not Creator.active then cb(false) return end
  Creator.firstname = tostring(data.firstname or ""):gsub("%s+"," ")
  Creator.lastname  = tostring(data.lastname  or ""):gsub("%s+"," ")
  Creator.birthdate = tostring(data.birthdate or "")
  SendNUIMessage({ action="creator:setStep", step="spawn" }) -- unused in new flow, kept for safety
  cb(true)
end)

-- Step 3 — DNA (unique fingerprint)
RegisterNUICallback("creator:dna", function(data, cb)
  if not Creator.active then cb(false) return end
  local hash = tostring(data and data.dnaHash or "")
  if #hash < 6 then cb(false) return end
  Creator.dnaHash = hash
  SendNUIMessage({ action="creator:setStep", step="perks" })
  cb(true)
end)

-- Step 4 — Fetch citizen base perks (no deps) from v0-perks
RegisterNUICallback("creator:getCitizenPerks", function(_, cb)
  QBCore.Functions.TriggerCallback('v0-perks:server:getCitizenPerksBase', function(list)
    cb(list or {})
  end)
end)

-- Step 4 — Commit selected perks (ids)
RegisterNUICallback("creator:perks", function(data, cb)
  if not Creator.active then cb(false) return end
  local picks = data and data.picks or {}
  Creator.starterPerks = {}
  if type(picks) == "table" then
    for _, id in ipairs(picks) do
      if type(id) == "string" then Creator.starterPerks[#Creator.starterPerks+1] = id end
    end
  end
  SendNUIMessage({ action="creator:setStep", step="clothing" })
  cb(true)
end)

-- Step 5 — Open clothing (full)
RegisterNUICallback("creator:clothing", function(_, cb)
  local ped = PlayerPedId()
  -- Open your clothing resource; default to fivem-appearance
  if GetResourceState('fivem-appearance') == 'started' then
    exports['fivem-appearance']:startPlayerCustomization(function(appearance)
      if appearance then
        -- store in metadata via server if you want; creator flow will finalize anyway
        Creator.clothingSaved = true
        SendNUIMessage({ action="creator:clothingOk" })
      end
    end, { ped = true, headBlend = true, faceFeatures = true, components = true, props = true })
  elseif GetResourceState('qb-clothing') == 'started' then
    TriggerEvent('qb-clothing:client:openMenu')
  else
    -- fallback
    Creator.clothingSaved = true
    SendNUIMessage({ action="creator:clothingOk" })
  end
  cb(true)
end)

-- boot / spawn
CreateThread(function() while not NetworkIsSessionStarted() do Wait(500) end; TriggerServerEvent("v0chars:ready") end)
RegisterNetEvent("v0chars:spawnAt", function(lastpos)
  local ped = PlayerPedId()

  -- Positioning
  if type(lastpos) == "table" and lastpos.x and lastpos.y and lastpos.z then
    SetEntityCoordsNoOffset(ped, lastpos.x + 0.0, lastpos.y + 0.0, lastpos.z + 0.0, false, false, false)
    if lastpos.heading then SetEntityHeading(ped, lastpos.heading + 0.0) end
  else
    -- Fallback to your configured default
    local p = (Config.Spawn and (Config.Spawn.DefaultPosition or Config.Spawn.Default))
              or { x = -1037.71, y = -2737.86, z = 20.17, heading = 330.0 }
    SetEntityCoordsNoOffset(ped, p.x + 0.0, p.y + 0.0, p.z + 0.0, false, false, false)
    SetEntityHeading(ped, p.heading + 0.0)
  end

  -- Clean up creator state and show world
  ShutdownLoadingScreenNui()
  DoScreenFadeIn(800)
  DisplayRadar(true)
  FreezeEntityPosition(ped, false)

  -- Absolutely drop any NUI capture (fixes qb-target/HUD input being "dead")
  pcall(function() SetNuiFocus(false, false) end)
  pcall(function() SetNuiFocusKeepInput(false) end)

  -- Your existing helpers, keep using them
  toggleUi(false)
  _destroyPreviewPed()
  _closeCreator()
  _clearFocus()

  -- Re-enable qb-target after character spawn
  if GetResourceState('qb-target') == 'started' then
    pcall(function() exports['qb-target']:AllowTargeting(true) end)
    TriggerEvent('qb-target:playerSpawned')  -- harmless if not defined
  end

  -- In case OnPlayerLoaded already fired before we reached here, force HUD visible
  TriggerEvent('hud:client:ShowHud')

  -- keep your portrait refresh
  CreateThread(function() Wait(1500); _refreshOwnPortrait() end)
end)

-- Smart, defensive appearance applier (supports common fivem-appearance setups)
RegisterNetEvent("v0chars:applyAppearance", function(payload)
  local ped = PlayerPedId()
  local appearance = payload and payload.appearance or nil
  local gender = payload and payload.gender

  local function ensureModelFromPayload(app, g)
    -- Prefer explicit model if present (string name or hashable)
    local model = nil
    if app and type(app) == "table" and app.model then
      local m = app.model
      if type(m) == "string" then model = GetHashKey(m) else model = m end
    else
      -- fallback to freemode by gender (0/“male”/nil => male)
      local isFemale = (g == 1) or (g == "female") or (g == "f") or (g == true)
      model = isFemale and `mp_f_freemode_01` or `mp_m_freemode_01`
    end

    if model ~= 0 and GetEntityModel(ped) ~= model then
      RequestModel(model)
      local timeout = GetGameTimer() + 5000
      while not HasModelLoaded(model) and GetGameTimer() < timeout do Wait(0) end
      if HasModelLoaded(model) then
        SetPlayerModel(PlayerId(), model)
        SetModelAsNoLongerNeeded(model)
        ped = PlayerPedId()
      end
    end
  end

  ensureModelFromPayload(appearance, gender)

  local function trySetAppearance(app)
    if not app then return false end
    if not exports['fivem-appearance'] then return false end
    local ok = pcall(function()
      exports['fivem-appearance']:setPedAppearance(ped, app)
    end)
    return ok
  end

  -- 1) Direct apply if the metadata already contains a full appearance blob
  local applied = trySetAppearance(appearance)

  -- 2) Otherwise, poke common fivem-appearance client events so it pulls from DB by itself
  if not applied and GetResourceState('fivem-appearance') == 'started' then
    -- these events are harmless no-ops if not present in your build
    TriggerEvent('fivem-appearance:client:sync')
    TriggerEvent('fivem-appearance:client:reloadSkin')
  end
end)


AddEventHandler("onResourceStop", function(res)
  if res==GetCurrentResourceName() then _destroyPreviewPed(); _closeCreator(); SetNuiFocus(false,false); SetNuiFocusKeepInput(false); _clearFocus() end
end)
-- Server asks client to apply starter perks now that we're logged in
RegisterNetEvent('v0chars:applyStarterPerks', function(picks)
  local ids = type(picks) == 'table' and picks or {}
  if #ids > 0 then
    TriggerServerEvent('v0-perks:server:addPoints', 3)
    Wait(200)
    for _, id in ipairs(ids) do
      TriggerServerEvent('v0-perks:server:unlockPerk', id)
      Wait(120)
    end
    -- tell server we're done so it can clear the pending flag
    TriggerServerEvent('v0chars:starterPerksApplied')
  end
end)
