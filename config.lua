Config = {}

-- === Brand / Theme (accent drives all highlights) ===
Config.Brand = {
    Title = "PICK YOUR CHARACTER",
    Subtitle = "YOU MUST ABIDE BY THE RULES OF THE CHARACTERS.",
    Theme = {
        bg = "#0b0e11",
        panel = "#0f1317",
        card = "#11171d",
        accent = "#ff7a1a",        -- your dark orange accent
        accentSoft = "#ff7a1a1a",
        text = "#f2f3f5",
        textDim = "#b9c0cc",
        success = "#25c59e",
        danger = "#ff4757",
        frame = "#1b242c"          -- frame/border color
    },
    Rounding = { Card = 20, Button = 16, Input = 16 },
    BlurBackdrop = true
}

-- === Slots & UI ===
Config.MaxCharacters = 4                     -- 2x2 tall grid
Config.LockedSlots = { 4 }                   -- which slots show LOCKED (1..4). Empty = none locked
Config.AllowDelete = false                    -- show Delete on hover
Config.ConfirmDelete = true
Config.SoftDelete = true
Config.ShowChooseLocation = false            -- copy picture layout, but default to last-location only
Config.OpenOnFirstJoin = true
Config.CommandOpen = "charselect"
Config.OpenKey = "F6"

-- === Spawn behavior ===
Config.Spawn = {
    FadeOutMs = 900,
    FadeInMs  = 1200,
    DefaultPosition = { x = -1037.71, y = -2737.86, z = 20.17, heading = 330.0 }
}

-- === Defaults for newly created characters ===
Config.DefaultCash = 500
Config.DefaultBank = 5000

-- === CitizenID generation ===
Config.CitizenId = {
    Prefix    = "V0",
    Length    = 6,
    Alphabet  = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ",
    Uppercase = true
}

-- === Texts ===
Config.Text = {
    Create = "Create",
    Play = "Spawn",
    LastLocation = "Last Location",
    ChooseLocation = "Choose Location",
    Delete = "Delete",
    Confirm = "Confirm",
    Cancel = "Cancel",
    NewCharacter = "New Character",
    FirstName = "First name",
    LastName = "Last name",
    DateOfBirth = "Date of birth",
    Gender = "Gender",
    Characters = "Characters",
    Empty = "Empty Slot",
    Locked = "LOCKED"
}
-- === V0 Creator Scene (Gender Stage) ===
Config.CreatorScene = {
    MalePed = vec4(-444.13, -905.57, 69.63, 91.73),
    FemalePed = vec4(-444.17, -907.45, 69.64, 96.85),
    Camera = vec4(-446.41, -906.61, 69.17, 270.78),
    HoverAlpha      = 255,  -- bright on hover
    DimmedAlpha     = 120,  -- slightly dark otherwise
    LoadFadeMs      = 700,  -- fade during loading
    UseNuiCalendar  = false -- set true later when we wire a HTML calendar
}
