// Unified colour palette for the whole game so sprites, environment, effects,
// and UI stay cohesive. Values are packed 0xRRGGBB ints (Phaser style); a few
// CSS strings are provided for HUD text.

export const PAL = {
  // shared
  outline: 0x0b1226, // dark navy outline on every sprite for silhouette pop
  white: 0xffffff,

  // water / fog per biome (background + tint)
  water: {
    sunlight: { bg: 0x4fc3e8, fog: 0x86e0f2, deepEdge: 0x2f9fce },
    midsea: { bg: 0x1f6fbd, fog: 0x2f86c8, deepEdge: 0x144f80 },
    deepsea: { bg: 0x0a1f47, fog: 0x12305c, deepEdge: 0x06122e },
    abyss: { bg: 0x03061a, fog: 0x070d28, deepEdge: 0x01030d },
  },

  // knight diver
  armor: { lite: 0x7aa6d8, mid: 0x4a6f9c, dark: 0x2b466e },
  steel: { lite: 0xc3d0e2, mid: 0x9fb0c8, dark: 0x6f8098 },
  gold: { lite: 0xf4d98a, mid: 0xe7c97a, dark: 0xb9923f },
  glass: 0x8fe9ff,
  glassDark: 0x12435f,
  plume: { lite: 0xf06a6a, mid: 0xd64545 },
  tankRed: 0xc7503a,

  // flora
  kelp: { lite: 0x46c884, mid: 0x2f9e6a, dark: 0x1d6b48 },
  seagrass: { lite: 0x6fd29a, mid: 0x3a9e6e },
  glowPlant: 0x8cff9e,

  // coral
  coral: { pink: 0xff7a9c, pinkLite: 0xffb0c4, orange: 0xffb86b, purple: 0xb46bd8, tealLite: 0x9fe0d0 },

  // terrain
  sand: { lite: 0xe6d3a8, mid: 0xc9b07e, dark: 0x9c855a },
  rock: { lite: 0x4a5d82, mid: 0x36486a, dark: 0x222f49, deepLite: 0x2a3a5c, deepDark: 0x141d33 },
  wreck: { hull: 0x5a4632, hullDark: 0x3a2c1e, metal: 0x6b7480, rust: 0x9c5a32 },
  ruin: { stone: 0x6a7390, stoneDark: 0x444c66, moss: 0x3a8a64 },

  // bioluminescence / lights
  bio: { cyan: 0x6fe9ff, green: 0x8cff9e, magenta: 0xff7ad6, gold: 0xffe7a3 },

  // creatures (kept readable: friendly = warm/soft, hostile = cold/sharp + red eye)
  fishBlue: { lite: 0x8fe3ff, mid: 0x49b6ec, dark: 0x2b7fb8 },
  fishWarm: { lite: 0xffd98a, mid: 0xffb04d, dark: 0xd97e2a },
  predator: { lite: 0x7f8db0, mid: 0x515f86, dark: 0x303c5c },
  jellyBody: 0xff9de0,
  eyeRed: 0xff4d4d,
  eyeDark: 0x0a2030,

  // UI
  ui: {
    panel: 0x0a1a30,
    panelLite: 0x14304f,
    border: 0x2f5c86,
    borderLite: 0x4e86b8,
    hp: 0xff5d5d,
    hpDark: 0x7a1f28,
    o2: 0x49c8ff,
    o2Dark: 0x174a66,
    en: 0xffe14d,
    enDark: 0x7a6321,
    slot: 0x081523,
  },
};

// CSS strings for HUD text.
export const CSS = {
  text: "#eaf6ff",
  dim: "#7fb6dc",
  gold: "#ffd98a",
  hp: "#ff9d9d",
  o2: "#9be7ff",
  en: "#ffe89a",
  warn: "#ff7a7a",
};

// Convenience: "#rrggbb" from a packed int.
export const hex = (n) => "#" + n.toString(16).padStart(6, "0");
