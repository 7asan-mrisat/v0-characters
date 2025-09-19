local QBCore = exports['qb-core']:GetCoreObject()

-- ========= schema detection =========
local HAS = { license2 = false, deleted = false, cid = false, metadata = false }
local lastCreateAt = {}
-- routing bucket storage (isolation while in menu)
local _v0_bucket = {}

local function logoutPlayer(src)
    if QBCore.Player and QBCore.Player.Logout then
        local ok = pcall(QBCore.Player.Logout, src)
        if ok then return true end
    end
    if exports['qb-core'] and exports['qb-core'].Logout then
        local ok = pcall(function() return exports['qb-core']:Logout(src) end)
        if ok then return true end
    end
    return false
end

local function detectSchema()
    local cols = MySQL.query.await("SHOW COLUMNS FROM players") or {}
    for _, c in ipairs(cols) do
        local name = c.Field or c.field
        if name == "license2" then HAS.license2 = true end
        if name == "deleted"   then HAS.deleted  = true end
        if name == "cid"       then HAS.cid      = true end
        if name == "metadata"  then HAS.metadata = true end
    end
    print(("^3[v0-characters]^7 schema: license2=%s, deleted=%s, cid=%s, metadata=%s")
        :format(HAS.license2 and "yes" or "no", HAS.deleted and "yes" or "no", HAS.cid and "yes" or "no", HAS.metadata and "yes" or "no"))
end
detectSchema()

-- ========= helpers =========

-- Identifier helper (license / license2 / steam / etc.)
local function idOf(src, which)
    if not src or src == 0 then return nil end

    if type(GetPlayerIdentifierByType) == "function" then
        local v = GetPlayerIdentifierByType(src, which)
        if v and v ~= "" then return v end
    end

    local prefix = tostring(which) .. ":"
    local count = GetNumPlayerIdentifiers(src) or 0
    for i = 0, count - 1 do
        local id = GetPlayerIdentifier(src, i)
        if id and id:sub(1, #prefix) == prefix then
            return id
        end
    end
    return nil
end

-- Parse JSON string -> table
local function jget(s)
    if type(s) == "table" then return s end
    if type(s) ~= "string" or s == "" then return {} end
    local ok, t = pcall(json.decode, s)
    return ok and type(t) == "table" and t or {}
end

-- Ownership guard
local function ownsCharacter(src, citizenid)
    if not citizenid or citizenid == "" then return false end
    local license  = idOf(src, "license") or ""
    local license2 = idOf(src, "license2") or ""
    local whereLic = HAS.license2 and "(license = ? OR license2 = ?)" or "(license = ?)"
    local params   = HAS.license2 and { license, license2, citizenid } or { license, citizenid }
    local sql      = ("SELECT 1 FROM players WHERE %s AND citizenid = ? LIMIT 1"):format(whereLic)
    return MySQL.scalar.await(sql, params) ~= nil
end

-- Login adapter
local function loginCharacter(src, citizenid)
    if QBCore.Player and QBCore.Player.Login then
        return QBCore.Player.Login(src, citizenid) and true or false
    end
    if exports['qb-core'] and exports['qb-core'].Login then
        local ok, res = pcall(function() return exports['qb-core']:Login(src, citizenid) end)
        return ok and res or false
    end
    return false
end

-- Citizenid generator
local function genCitizenId()
    local cfg = Config.CitizenId or {}
    local prefix  = cfg.Prefix or "V0"
    local length  = cfg.Length or 6
    local alpha   = cfg.Alphabet or "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    local upper   = cfg.Uppercase ~= false
    local out = {}
    for i = 1, length do
        local n = math.random(#alpha)
        out[#out+1] = alpha:sub(n, n)
    end
    local id = prefix .. "-" .. table.concat(out)
    return upper and string.upper(id) or id
end

-- SELECT builder honoring schema
local function buildSelectQuery()
    local cols = "citizenid, charinfo, job, gang, money, position, metadata"
    if HAS.cid then cols = "cid, " .. cols end

    local whereLic = HAS.license2 and "(license = ? OR license2 = ?)" or "(license = ?)"
    local whereDeleted = HAS.deleted and "(deleted = 0 OR deleted IS NULL)" or "1=1"
    local orderBy = HAS.cid and "ORDER BY cid" or "ORDER BY citizenid"

    local sql = ("SELECT %s FROM players WHERE %s AND %s %s"):format(cols, whereLic, whereDeleted, orderBy)
    return sql
end

-- Row -> UI payload
-- Row -> UI payload (safer nulls + robust labels)
local function jget(x) if type(x) == "string" then return json.decode(x) or {} end return x or {} end

function rowToChar(row, idx)
    local charinfo = jget(row.charinfo)
    local job      = jget(row.job)
    local gang     = jget(row.gang)
    local money    = jget(row.money)
    local pos      = jget(row.position)
    local meta     = jget(row.metadata)

    local firstname = tostring(charinfo.firstname or "")
    local lastname  = tostring(charinfo.lastname  or "")
    local genderVal = tonumber(charinfo.gender) or 0
    local genderTxt = (genderVal == 1 and "female") or (genderVal == 2 and "other") or "male"

    local jobName  = (type(job.name) == "string" and job.name ~= "") and job.name or "unemployed"
    local jobLabel = (type(job.label) == "string" and job.label ~= "") and job.label
                    or (jobName == "unemployed" and "Unemployed" or jobName:gsub("^%l", string.upper))

    local gangName  = (type(gang.name) == "string" and gang.name ~= "") and gang.name or "none"
    local gangLabel = (type(gang.label) == "string" and gang.label ~= "") and gang.label or gangName

    local cash = tonumber((money and money.cash) or 0) or 0
    local bank = tonumber((money and money.bank) or 0) or 0

    return {
        slot       = HAS.cid and tonumber(row.cid) or nil,
        citizenid  = row.citizenid,
        firstname  = firstname,
        lastname   = lastname,
        name       = (firstname .. " " .. lastname):gsub("%s+$",""),
        dob        = tostring(charinfo.birthdate or ""),
        gender     = genderTxt,
        jobLabel   = jobLabel,
        gangLabel  = gangLabel,
        cash       = cash,
        bank       = bank,
        lastpos    = pos,
        portrait   = meta and meta.portrait or nil,
        lastlogin  = meta and meta.last_played or nil,
        job        = job,
        gang       = gang,
        money      = { cash = cash, bank = bank },
        metadata   = meta or {}
    }
end


-- ========= callbacks =========
QBCore.Functions.CreateCallback("v0chars:getCharacters", function(src, cb)
    local license  = idOf(src, "license") or ""
    local license2 = idOf(src, "license2") or ""

    local sql = buildSelectQuery()
    local params = HAS.license2 and { license, license2 } or { license }
    local rows = MySQL.query.await(sql, params) or {}

    local list = {}
    for i, r in ipairs(rows) do
        list[#list+1] = rowToChar(r, i)
    end

    cb({ max = Config.MaxCharacters or 4, list = list })
end)

-- Create new character (V0 legacy-shaped row)
RegisterNetEvent("v0chars:createCharacter", function(data)
    local src = source
    local license  = idOf(src, "license")
    local license2 = idOf(src, "license2")
    local steam    = idOf(src, "steam")

    -- anti-spam
    local now = os.time()
    if lastCreateAt[src] and (now - lastCreateAt[src]) < 10 then
        TriggerClientEvent("v0chars:toast", src, "You're doing that too fast.", "error")
        return
    end
    lastCreateAt[src] = now

    if not license then
        TriggerClientEvent("v0chars:toast", src, "No license identifier found.", "error")
        return
    end

    -- identity fields
    local firstname = (data.firstname or "John"):sub(1, 16)
    local lastname  = (data.lastname  or "Doe"):sub(1, 16)
    local birthdate = data.dob or "1990-01-01"

    local g = data.gender
    local genderNum = tonumber(g)
    if genderNum == nil then
        local map = { male = 0, female = 1, other = 2 }
        genderNum = map[(tostring(g or ""):lower())] or 0
    end

    local requestedSlot = tonumber(data.slot or 0)
    if HAS.cid and requestedSlot and requestedSlot > 0 then
        local whereDeleted = HAS.deleted and "(deleted = 0 OR deleted IS NULL)" or "1=1"
        local occ = MySQL.scalar.await(
            ("SELECT 1 FROM players WHERE %s AND license = ? AND cid = ? LIMIT 1"):format(whereDeleted),
            { license, requestedSlot }
        )
        if occ then
            TriggerClientEvent("v0chars:toast", src, "Slot occupied.", "error")
            return
        end
    end

    -- charinfo (keep your extras)
    local charinfo = {
        firstname   = firstname,
        lastname    = lastname,
        birthdate   = birthdate,
        nationality = data.nationality or "USA",
        gender      = genderNum,
        account     = tostring(math.random(10000000, 99999999)),
        phone       = (QBCore.Functions.CreatePhoneNumber and QBCore.Functions.CreatePhoneNumber())
        or tostring(math.random(200000000, 999999999)),
        avatar      = data.avatar,
        theme      = data.theme or {},          -- { id, hex }
        dna        = data.dnaHash or nil,       -- string
        starter_perks = data.perks or {},       -- array of perk ids (applied on first login)
    }

    -- === V0 legacy defaults (mirror your old row) ===
    local money = { bank = 25000, coins = 0, cash = 5000, crypto = 0 }

    local job = {
        dutys   = { Dispatch=false, Busy=false, Break=false },
        payment = 250,
        type    = "leo",
        isboss  = false,
        onduty  = false,
        label   = "Law Enforcement",
        grade   = { level = 1, name = "Officer One" },
        name    = "police"
    }

    local company = {
        payment = 10, isboss=false, onduty=true, isowner=false,
        label   = "none",
        grade   = { level = 0, name = "worker" },
        name    = "none"
    }

    local gang = {
        isboss = false,
        spray  = { xp=0, sprayremovecount=0, spraycount=0 },
        label  = "No Gang Affiliaton", -- keeping your legacy spelling
        grade  = { level = 0, name = "none" },
        name   = "none"
    }

    -- downtown coords used by the legacy row; include both h & heading
    local pos = { x = -492.0791015625, y = -956.4395751953125, z = 23.6182861328125, h = 328.81890869140627, heading = 328.81890869140627 }

    -- starter items go into **metadata** (legacy did this; inventory stays NULL)
    local createdTs = os.time()
    local metadataItems = {
        { amount=1, name="id_card",        type="item", created=createdTs, slot=1, info={quality=100} },
        { amount=1, name="driver_license", type="item", created=createdTs, slot=2, info={quality=100} },
        { amount=1, name="phone",          type="item", created=createdTs, slot=3, info={quality=100} },
        { amount=1, name="lockpick",       type="item", created=createdTs, slot=4, info={quality=100} },
    }

    -- generate unique citizenid; keep your generator
    local citizenid
    repeat
        citizenid = genCitizenId()
    until not MySQL.scalar.await("SELECT 1 FROM players WHERE citizenid = ? LIMIT 1", { citizenid })

    -- assemble insert (match legacy column set)
    local cols, qs, args = {}, {}, {}
    local function add(col, val) cols[#cols+1]=col; qs[#qs+1]="?"; args[#args+1]=val end
    local function addRawNull(col) cols[#cols+1]=col; qs[#qs+1]="NULL" end

    add("citizenid", citizenid)
    if HAS.cid and requestedSlot and requestedSlot > 0 then add("cid", requestedSlot) end
    add("steam", steam or "")
    add("license", license)
    if HAS.license2 then add("license2", license2 or "") end
    add("name", (firstname .. " " .. lastname))
    add("money", json.encode(money))
    add("charinfo", json.encode(charinfo))
    add("job", json.encode(job))
    add("company", json.encode(company))
    add("gang", json.encode(gang))
    add("position", json.encode(pos))
    add("lastPlayed", "")           -- legacy row had empty string
    addRawNull("mugshot")           -- keep NULL like legacy
    add("metadata", json.encode(metadataItems))
    addRawNull("inventory")         -- keep NULL like legacy
    add("skillpoint", "0")          -- match legacy default

    local sql = ("INSERT INTO players (%s) VALUES (%s)"):format(table.concat(cols,","), table.concat(qs,","))
    local ok = MySQL.insert.await(sql, args)

    if not ok then
        TriggerClientEvent("v0chars:toast", src, "DB insert failed.", "error")
        return
    end

    TriggerClientEvent("v0chars:toast", src, "Character created.", "success")
    TriggerClientEvent("v0chars:refreshUI", src)
end)


-- Delete character (soft/hard)
RegisterNetEvent("v0chars:deleteCharacter", function(citizenid)
    local src = source
    if not ownsCharacter(src, citizenid) then
        TriggerClientEvent("v0chars:toast", src, "Invalid character.", "error")
        return
    end

    if Config.SoftDelete ~= false and HAS.deleted then
        MySQL.update.await("UPDATE players SET deleted = 1 WHERE citizenid = ?", { citizenid })
    else
        MySQL.update.await("DELETE FROM players WHERE citizenid = ?", { citizenid })
    end

    TriggerClientEvent("v0chars:toast", src, "Character deleted.", "success")
    TriggerClientEvent("v0chars:refreshUI", src)
end)

RegisterNetEvent("v0chars:selectCharacter", function(payload)
    local src = source
    local citizenid = (type(payload) == "string") and payload or (payload and payload.citizenid)

    if not ownsCharacter(src, citizenid) then
        TriggerClientEvent("v0chars:toast", src, "Invalid character.", "error")
        return
    end

    -- If already logged in on a different character, logout cleanly
    local ply = QBCore.Functions.GetPlayer(src)
    if ply then
        local cur = ply.PlayerData and ply.PlayerData.citizenid
        if cur ~= citizenid then
            logoutPlayer(src)
            Wait(200)
        end
    end

    -- Core login
    local ok = loginCharacter(src, citizenid)
    if not ok then
        TriggerClientEvent("v0chars:toast", src, "Failed to load character.", "error")
        return
    end

    -- Pull saved position + metadata for stamps/appearance
    local row = MySQL.single.await(
        "SELECT position, metadata, charinfo FROM players WHERE citizenid = ? LIMIT 1",
        { citizenid }
    )

    local pos = row and jget(row.position) or nil

    -- Stamp last played
    if row then
        local meta = jget(row.metadata) or {}
        meta.last_played = os.time() * 1000
        MySQL.update.await("UPDATE players SET metadata = ? WHERE citizenid = ?", { json.encode(meta), citizenid })
    end

    -- Notify dependent resources that the player is loaded (qb-hud, etc.)
    TriggerClientEvent("QBCore:Client:OnPlayerLoaded", src)
    TriggerClientEvent("hud:client:ShowHud", src)

    -- Spawn the player (teleport handled client-side)
    TriggerClientEvent("v0chars:spawnAt", src, pos or false)

    -- Send appearance payload down to client (for fivem-appearance)
    local appearance = nil
    local gender = nil
    if row then
        local meta = jget(row.metadata) or {}
        appearance = meta.appearance or meta.skin or nil   -- supports common keys
        local charinfo = jget(row.charinfo) or {}
        gender = charinfo.gender
            -- Apply pending starter perks (only once)
    local pendingPerks = {}
    if row then
        local ci = jget(row.charinfo) or {}
        if type(ci.starter_perks) == "table" and #ci.starter_perks > 0 then
            pendingPerks = ci.starter_perks
            -- send to client (client will award points + unlock)
            TriggerClientEvent('v0chars:applyStarterPerks', src, pendingPerks)
            -- mark for clearing on confirmation (per-source memo)
            _v0_pendingStarter = _v0_pendingStarter or {}
            _v0_pendingStarter[src] = tostring(citizenid)
        end
    end
    end
    TriggerClientEvent("v0chars:applyAppearance", src, { appearance = appearance, gender = gender })
end)
-- Client confirms starter perks applied; clear from DB
RegisterNetEvent('v0chars:starterPerksApplied', function()
    local src = source
    local citizenid = _v0_pendingStarter and _v0_pendingStarter[src]
    if not citizenid then return end
    local row = MySQL.single.await("SELECT charinfo FROM players WHERE citizenid = ? LIMIT 1", { citizenid })
    if not row then return end
    local ci = jget(row.charinfo) or {}
    ci.starter_perks = nil
    MySQL.update.await("UPDATE players SET charinfo = ? WHERE citizenid = ?", { json.encode(ci), citizenid })
    _v0_pendingStarter[src] = nil
end)

-- Open UI when ready
RegisterNetEvent("v0chars:ready", function()
    local src = source
    if Config.OpenOnFirstJoin then
        TriggerClientEvent("v0chars:openUI", src)
    end
end)

-- Save portrait into metadata
RegisterNetEvent("v0chars:savePortrait", function(citizenid, dataUrl)
    local src = source
    if ownsCharacter and not ownsCharacter(src, citizenid) then return end
    if not dataUrl or type(dataUrl) ~= "string" then return end
    if #dataUrl > 800000 then return end -- 800KB safety

    local row = MySQL.single.await("SELECT metadata FROM players WHERE citizenid = ? LIMIT 1", { citizenid })
    local meta = jget(row and row.metadata)
    meta.portrait = dataUrl
    MySQL.update.await("UPDATE players SET metadata = ? WHERE citizenid = ?", { json.encode(meta), citizenid })
end)
-- put player in a private routing bucket so the world doesn't stream in
RegisterNetEvent("v0chars:enterShell", function()
    local src = source
    if _v0_bucket[src] and _v0_bucket[src].inShell then return end
    local prev = GetPlayerRoutingBucket(src)
    local bucket = 200000 + src
    _v0_bucket[src] = { prev = prev, inShell = true }
    SetPlayerRoutingBucket(src, bucket)
end)

RegisterNetEvent("v0chars:exitShell", function()
    local src = source
    local info = _v0_bucket[src]
    if not info then return end
    SetPlayerRoutingBucket(src, info.prev or 0)
    _v0_bucket[src] = nil
end)
-- Update the player's saved position immediately when they open the menu
RegisterNetEvent("v0chars:updateLastPos", function(pos)
    local src = source
    local ply = QBCore.Functions.GetPlayer(src)
    if not ply then return end
    local cid = ply.PlayerData and ply.PlayerData.citizenid
    if not cid then return end
    if type(pos) ~= "table" or pos.x == nil or pos.y == nil or pos.z == nil then return end
    -- keep heading if provided
    MySQL.update.await("UPDATE players SET position = ? WHERE citizenid = ?", { json.encode(pos), cid })
end)
-- === V0 Legacy Row Builder (exactly like your old rows) ===

local function V0_RandomDigits(n)
    local t = {}
    for i=1,n do t[i] = tostring(math.random(0,9)) end
    return table.concat(t)
end

local function V0_RandomPhoneIL()
    -- Formats like 05XXXXXXXX (Israeli-style)
    return "05" .. V0_RandomDigits(8)
end

local function V0_RandomAccount()
    -- Keep it short & DB-friendly; your older row had longer strings but plain numeric works fine
    return V0_RandomDigits(8)
end

local function V0_LegacyDefaults()
    -- Defaults copied from your legacy row (police LEO, company/ gang “none”, money with coins/crypto)
    return {
        money = {
            bank  = 25000,
            coins = 0,
            cash  = 5000,
            crypto= 0,
        },
        job = {
            dutys   = { Dispatch=false, Busy=false, Break=false },
            payment = 250,
            type    = "leo",
            isboss  = false,
            onduty  = false,
            label   = "Law Enforcement",
            grade   = { level = 1, name = "Officer One" },
            name    = "police",
        },
        company = {
            payment = 10, isboss=false, onduty=true, isowner=false,
            label   = "none",
            grade   = { level = 0, name = "worker" },
            name    = "none",
        },
        gang = {
            isboss = false,
            spray  = { xp=0, sprayremovecount=0, spraycount=0 },
            label  = "No Gang Affiliaton", -- yes, matching your exact spelling
            grade  = { level = 0, name = "none" },
            name   = "none",
        },
        position = { x = -492.0791015625, y = -956.4395751953125, z = 23.6182861328125, h = 328.81890869140627 },
        starterItems = {
            { amount=1, name="id_card",        type="item", created=os.time(), slot=1, info={quality=100} },
            { amount=1, name="driver_license", type="item", created=os.time(), slot=2, info={quality=100} },
            { amount=1, name="phone",          type="item", created=os.time(), slot=3, info={quality=100} },
            { amount=1, name="lockpick",       type="item", created=os.time(), slot=4, info={quality=100} },
        },
    }
end

-- Safely encode any lua->json (qb-core provides json.encode; keep guard)
local function J(x) return json and json.encode and json.encode(x) or (type(x)=="string" and x or tostring(x)) end

-- Pull identifiers
local function GetIds(src)
    local ids = GetPlayerIdentifiers(src)
    local out = { steam=nil, license=nil }
    for _,id in ipairs(ids) do
        if id:find("^steam:") then out.steam = id end
        if id:find("^license:") then out.license = id end
    end
    return out
end

-- CitizenID generator fallback (uses your V0-* style)
local function GenerateCitizenId_V0()
    local alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    local len = 6
    local function pick()
        local i = math.random(1, #alphabet)
        return alphabet:sub(i,i)
    end
    local s = {}
    for i=1,len do s[i] = pick() end
    return ("V0-%s"):format(table.concat(s))
end

-- Build the full legacy payload your old SQL used
local function BuildLegacyRowForInsert(src, slot, identity)
    -- identity = { firstname, lastname, birthdate, gender (0/1), nationality? backstory? phone? account? }
    local defs = V0_LegacyDefaults()
    local phone   = identity.phone    or V0_RandomPhoneIL()
    local account = identity.account  or V0_RandomAccount()
    local nat     = identity.nationality or "USA"
    local back    = identity.backstory or "placeholder backstory"
    local gender  = tonumber(identity.gender) or 0

    local charinfo = {
        phone = phone,
        account = account,
        lastname = identity.lastname or "",
        birthdate = identity.birthdate or "",
        nationality = nat,
        backstory = back,
        gender = gender,
        firstname = identity.firstname or "",
    }

    local money = defs.money
    local job   = defs.job
    local company = defs.company
    local gang  = defs.gang
    local pos   = defs.position

    -- IMPORTANT: legacy row put starter items in **metadata** as an array (not in `inventory`)
    local metadata = defs.starterItems
    local inventory = nil  -- keep NULL to mirror the dump

    return {
        slot = slot,
        money = money,
        charinfo = charinfo,
        job = job,
        company = company,
        gang = gang,
        position = pos,
        metadata = metadata,
        inventory = inventory
    }
end
