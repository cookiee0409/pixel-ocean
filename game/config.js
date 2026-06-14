// Shared constants for the deep-sea game. Keeping these in one place makes it
// easy to retune the world without hunting through scenes/systems.

export const VIEW_WIDTH = 800;
export const VIEW_HEIGHT = 450;

// Vertical map. Depth (meters) is derived from the player's y position so the
// rest of the game can reason in meters while physics stays in pixels.
export const PIXELS_PER_METER = 5;
export const START_Y = 120; // player spawn; depth 0m maps here
// The world is wider than the view so the cave can snake left/right while the
// player descends — a zig-zag switchback rather than a straight vertical shaft.
export const WORLD_WIDTH = 1600;
export const MAX_DEPTH = 1850; // meters
export const WORLD_HEIGHT = START_Y + MAX_DEPTH * PIXELS_PER_METER + 200;

// Winding cave channel. centerX snakes as a sum of two sines (organic, not a
// mechanical zig-zag); the player swims left/right (the base control) to follow
// it down. The tunnel also breathes wider/narrower — narrow passages open into
// wider chambers — via channelHalfAt(). Walls fill everything outside
// [center - half, center + half].
export const CHANNEL_HALF = 150; // nominal half-width (kept for reference)
export const CAVE_PERIOD = 1400; // px of descent per main left↔right swing
export const caveCenterX = (y) => {
  const w = (Math.PI * 2) / CAVE_PERIOD;
  return (
    WORLD_WIDTH / 2 +
    Math.sin(y * w) * 500 + // main switchback swing
    Math.sin(y * w * 2.7 + 1.3) * 78 // smaller organic wobble
  );
};
export const channelHalfAt = (y) =>
  150 + Math.sin(y * ((Math.PI * 2) / 900)) * 44 + Math.sin(y * 0.013 + 2.1) * 14;
// Gentle constant sink so "down" is the default and steering left/right is the
// active play, per the requested feel.
export const SINK_CURRENT = 70;

// Depth (m) <-> world y (px) helpers.
export const depthToY = (depth) => START_Y + depth * PIXELS_PER_METER;
export const yToDepth = (y) => Math.max(0, (y - START_Y) / PIXELS_PER_METER);

// Notable depth events.
export const BOSS_DEPTH = 1780; // giant-creature encounter

// Player base tuning.
export const PLAYER = {
  maxHp: 100,
  maxOxygen: 100,
  maxEnergy: 100,
  accel: 1100,
  drag: 900,
  maxSpeed: 150,
  attackCooldown: 320, // ms
  invulnMs: 900,
};

// Knight-themed skills.
//  dash  -> "돌격" : a charging lunge that rams (damages) enemies in its path.
//  lightBurst -> "성광" : a holy radiant burst that damages nearby foes and
//                lights up the dark deep.
export const SKILLS = {
  dash: { key: "Q", name: "돌격", energy: 28, cooldown: 1400, power: 480, durationMs: 240, damage: 24 },
  lightBurst: { key: "E", name: "성광", energy: 42, cooldown: 4200, radius: 155, damage: 36 },
};

export const ATTACK_NAME = "검기"; // basic attack: a thrown blade of sword-energy
