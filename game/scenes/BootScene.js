// Generates every texture procedurally (no binary assets) — now in a richer,
// outlined pixel-art style using the shared palette. Texture KEYS are unchanged
// so all game logic/spawning keeps working; only the art got an upgrade.
// To swap in real PNG sprites later, load them in preload() under the same keys.
/* global Phaser */
import { PAL } from "../data/palette.js";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this.makeCaveTiles();
    this.makeProps();
    this.makePlayer();
    this.makeCreatures();
    this.makeItems();
    this.makeLightAndParticles();
    this.defineAnims();
    // Defer one tick so this scene is fully RUNNING before we hand off — calling
    // scene.start synchronously during BootScene's own boot can leave the next
    // scene stuck at INIT.
    this.time.delayedCall(0, () => this.scene.start("MenuScene"));
  }

  // ----------------------------------------------------------- helpers
  draw(key, width, height, paint) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    paint(g);
    g.generateTexture(key, width, height);
    g.destroy();
  }

  rect(g, color, x, y, w, h, a = 1) {
    g.fillStyle(color, a);
    g.fillRect(x, y, w, h);
  }

  // filled rect with a 1px dark outline (the signature of the new look)
  oRect(g, fill, x, y, w, h, a = 1) {
    g.fillStyle(PAL.outline, 1);
    g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(fill, a);
    g.fillRect(x, y, w, h);
  }

  oEllipse(g, fill, cx, cy, w, h, a = 1) {
    g.fillStyle(PAL.outline, 1);
    g.fillEllipse(cx, cy, w + 2, h + 2);
    g.fillStyle(fill, a);
    g.fillEllipse(cx, cy, w, h);
  }

  // -------------------------------------------------------- cave tiles
  // Dense, fine-pixel stone tiles for the cave walls (the dominant surface of
  // the new descent). Drawn neutral grey-blue so the per-biome tint reads, with
  // 1px mortar, per-brick top/bottom shading, speckle noise, cracks and moss —
  // a much higher dot density than the chunky props. 32x32, seamlessly tiling.
  makeCaveTiles() {
    const TS = 32;
    // Drawn light (tint can only darken in Phaser), so per-biome tint takes it
    // from bright surface stone down to near-black abyss rock.
    const stone = { base: 0x97a3bd, lite: 0xb8c4da, dark: 0x6f7b96, edge: 0x586480, mortar: 0x49536f };
    const mossC = 0x4f9e74;

    const paintStone = (g, variant) => {
      // base fill + fine speckle noise for texture density
      this.rect(g, stone.base, 0, 0, TS, TS);
      for (let i = 0; i < 130; i++) {
        const x = (i * 7 + variant * 13) % TS;
        const y = (i * 11 + variant * 5) % TS;
        const c = (i + variant) % 3 === 0 ? stone.lite : (i % 4 === 0 ? stone.dark : stone.base);
        this.rect(g, c, x, y, 1, 1, 0.5);
      }
      // brick courses (offset every other row) with 1px mortar + shading
      const rowH = 8;
      for (let row = 0, ry = 0; ry < TS; row++, ry += rowH) {
        const offset = row % 2 === 0 ? 0 : 8;
        for (let bx = -16; bx < TS; bx += 16) {
          const x = bx + offset;
          // brick body
          this.rect(g, stone.base, x + 1, ry + 1, 14, rowH - 1);
          this.rect(g, stone.lite, x + 1, ry + 1, 14, 1, 0.8); // top highlight
          this.rect(g, stone.dark, x + 1, ry + rowH - 1, 14, 1, 0.8); // bottom shade
          this.rect(g, stone.edge, x + 13, ry + 1, 1, rowH - 1, 0.6); // right edge
        }
        // mortar line under the course
        this.rect(g, stone.mortar, 0, ry + rowH - 1, TS, 1, 0.9);
      }
      // vertical mortar seams
      for (let row = 0, ry = 0; ry < TS; row++, ry += rowH) {
        const offset = row % 2 === 0 ? 0 : 8;
        for (let bx = 0; bx <= TS; bx += 16) {
          this.rect(g, stone.mortar, bx + offset - 1, ry, 1, rowH, 0.8);
        }
      }
      // a crack + a moss patch (variant-dependent placement)
      if (variant === 0) {
        this.rect(g, stone.edge, 6, 4, 1, 6, 0.7);
        this.rect(g, stone.edge, 7, 9, 1, 5, 0.6);
        this.rect(g, mossC, 22, 24, 6, 3, 0.55);
        this.rect(g, 0x4f9a72, 23, 24, 3, 1, 0.6);
      } else {
        this.rect(g, stone.edge, 25, 14, 1, 7, 0.7);
        this.rect(g, mossC, 3, 6, 5, 3, 0.5);
      }
    };

    this.draw("cave_wall", TS, TS, (g) => paintStone(g, 0));
    this.draw("cave_wall2", TS, TS, (g) => paintStone(g, 1));

    // Inner-edge lip: a darker carved rim drawn over the channel edge so the
    // tunnel mouth reads cleanly against the open water.
    this.draw("cave_edge", 10, TS, (g) => {
      this.rect(g, stone.dark, 0, 0, 10, TS);
      this.rect(g, stone.edge, 0, 0, 3, TS, 0.9);
      for (let y = 0; y < TS; y += 3) this.rect(g, stone.base, 3 + (y % 6 === 0 ? 1 : 0), y, 4, 2, 0.6);
    });

    // Rounded stone boulder clump that blends into the wall (tinted in scene).
    this.draw("cave_boulder", 30, 26, (g) => {
      g.fillStyle(stone.edge, 1);
      g.fillEllipse(15, 15, 28, 22);
      g.fillStyle(stone.base, 1);
      g.fillEllipse(15, 14, 24, 18);
      g.fillStyle(stone.lite, 0.75);
      g.fillEllipse(11, 10, 12, 7);
      g.fillStyle(stone.dark, 0.7);
      g.fillEllipse(20, 18, 12, 8);
      for (let i = 0; i < 44; i++) {
        const x = ((i * 7) % 26) + 2;
        const y = ((i * 11) % 20) + 3;
        this.rect(g, i % 3 ? stone.dark : stone.lite, x, y, 1, 1, 0.5);
      }
      this.rect(g, stone.edge, 12, 8, 1, 8, 0.6);
      this.rect(g, stone.edge, 18, 13, 1, 6, 0.5);
    });

    // Tapered rock spike (stalactite/stalagmite — origin flips it in GameScene).
    this.draw("cave_spike", 16, 46, (g) => {
      g.fillStyle(stone.edge, 1);
      g.fillTriangle(1, 0, 15, 0, 8, 46);
      g.fillStyle(stone.base, 1);
      g.fillTriangle(3, 0, 13, 0, 8, 42);
      g.fillStyle(stone.lite, 0.7);
      g.fillTriangle(5, 0, 8, 0, 7, 26);
      for (let i = 0; i < 12; i++) this.rect(g, i % 2 ? stone.dark : stone.lite, 4 + ((i * 3) % 8), i * 4, 1, 1, 0.6);
    });
  }

  // ---------------------------------------------------------------- props
  makeProps() {
    const P = PAL;

    // Slim seagrass blade — many fine segments with a midrib and tiny fronds.
    this.draw("seaweed", 20, 76, (g) => {
      let px = 10;
      for (let i = 0; i < 24; i++) {
        const y = 72 - i * 3;
        const x = 8 + Math.sin(i * 0.5) * 5;
        const w = 5 - (i / 24) * 2.5;
        this.oRect(g, P.seagrass.mid, x, y, w, 4);
        this.rect(g, P.seagrass.lite, x + 0.5, y, 1, 4, 0.85); // midrib highlight
        this.rect(g, P.kelp.dark, x + w - 1, y + 1, 1, 3, 0.5); // edge shade
        if (i % 4 === 1) this.rect(g, P.seagrass.lite, x - 2, y + 1, 2, 2, 0.7); // tiny frond
        px = x;
      }
      void px;
    });

    // Thick kelp stalk — fine segmented stem, leaf blades, gradient shading.
    this.draw("kelp", 28, 100, (g) => {
      for (let i = 0; i < 30; i++) {
        const y = 94 - i * 3;
        const x = 11 + Math.sin(i * 0.45) * 6;
        const w = 6 - (i / 30) * 2;
        this.oRect(g, P.kelp.mid, x, y, w, 4);
        this.rect(g, P.kelp.lite, x + 1, y, 1, 4, 0.9); // bright midrib
        this.rect(g, P.kelp.dark, x + w - 1, y + 1, 1, 3, 0.6); // shade edge
        if (i % 3 === 0) {
          const left = (i / 3) % 2 === 0;
          const lx = left ? x - 6 : x + w;
          // small leaf blade (2 stacked pixels tapering)
          this.oRect(g, P.kelp.dark, lx, y + 1, 6, 3);
          this.rect(g, P.kelp.mid, lx + (left ? 1 : 0), y + 1, 4, 1, 0.8);
        }
      }
    });

    // Very tall background kelp (parallax far layer) — dense fine stem.
    this.draw("kelp_tall", 24, 156, (g) => {
      for (let i = 0; i < 50; i++) {
        const y = 150 - i * 3;
        const x = 10 + Math.sin(i * 0.32) * 7;
        this.oRect(g, P.kelp.dark, x, y, 5, 4);
        this.rect(g, P.kelp.mid, x + 1, y, 2, 4, 0.7);
        if (i % 5 === 0) this.rect(g, P.kelp.dark, x + (i % 10 === 0 ? -3 : 5), y + 1, 3, 2, 0.7);
      }
    });

    // Branching coral.
    this.draw("coral", 46, 40, (g) => {
      this.oRect(g, P.coral.pink, 8, 16, 7, 22);
      this.oRect(g, P.coral.pink, 6, 8, 5, 14);
      this.oRect(g, P.coral.orange, 20, 20, 8, 18);
      this.oRect(g, P.coral.pink, 31, 12, 7, 26);
      this.oRect(g, P.coral.purple, 26, 6, 5, 12);
      this.rect(g, P.coral.pinkLite, 7, 9, 2, 24, 0.85);
      this.rect(g, P.coral.pinkLite, 33, 13, 2, 22, 0.85);
      // polyp dots
      this.rect(g, P.coral.tealLite, 22, 22, 2, 2, 0.9);
      this.rect(g, P.coral.tealLite, 9, 18, 2, 2, 0.9);
    });

    // Sea fan coral.
    this.draw("coral_fan", 40, 40, (g) => {
      this.oRect(g, P.coral.purple, 18, 22, 4, 16); // stem
      g.fillStyle(P.outline, 1);
      g.fillTriangle(20, 6, 4, 30, 36, 30);
      g.fillStyle(P.coral.purple, 1);
      g.fillTriangle(20, 8, 7, 28, 33, 28);
      for (let i = 0; i < 6; i++) {
        this.rect(g, P.coral.pinkLite, 8 + i * 4, 12 + i, 2, 16 - i, 0.7);
      }
    });

    // Round brain coral.
    this.draw("coral2", 34, 22, (g) => {
      this.oEllipse(g, P.coral.orange, 17, 14, 28, 14);
      this.rect(g, P.coral.pinkLite, 8, 9, 18, 2, 0.7);
      for (let i = 0; i < 5; i++) this.rect(g, P.coral.pink, 7 + i * 5, 12, 2, 6, 0.6);
    });

    // Anemone with glowing tips.
    this.draw("anemone", 30, 28, (g) => {
      this.oEllipse(g, P.coral.purple, 15, 24, 18, 8);
      for (let i = 0; i < 7; i++) {
        const x = 5 + i * 3;
        const h = 12 + (i % 3) * 4;
        this.oRect(g, P.coral.pink, x, 24 - h, 2, h);
        this.rect(g, P.bio.magenta, x, 24 - h, 2, 2, 0.95); // glowing tip
      }
    });

    // Rocks (shallow/mid) — three variants.
    this.draw("rock", 50, 26, (g) => {
      this.oRect(g, P.rock.mid, 2, 10, 46, 16);
      this.rect(g, P.rock.lite, 6, 8, 22, 6, 0.9);
      this.rect(g, P.rock.dark, 30, 14, 16, 10, 0.9);
      this.rect(g, P.kelp.mid, 10, 6, 4, 4, 0.7); // moss patch
    });
    this.draw("rock2", 38, 22, (g) => {
      this.oRect(g, P.rock.mid, 2, 8, 34, 14);
      this.rect(g, P.rock.lite, 5, 7, 14, 5, 0.9);
      this.rect(g, P.rock.dark, 22, 12, 12, 8, 0.9);
    });
    this.draw("rock_big", 88, 46, (g) => {
      this.oRect(g, P.rock.mid, 4, 16, 80, 30);
      this.oRect(g, P.rock.mid, 18, 6, 34, 18);
      this.rect(g, P.rock.lite, 10, 14, 30, 8, 0.85);
      this.rect(g, P.rock.dark, 50, 24, 28, 16, 0.9);
      this.rect(g, P.kelp.dark, 20, 10, 6, 4, 0.7);
    });
    // Deep, jagged rock.
    this.draw("rock_deep", 70, 56, (g) => {
      g.fillStyle(P.outline, 1);
      g.fillTriangle(2, 56, 34, 4, 68, 56);
      g.fillStyle(P.rock.deepDark, 1);
      g.fillTriangle(6, 56, 34, 10, 64, 56);
      g.fillStyle(P.rock.deepLite, 0.8);
      g.fillTriangle(20, 40, 34, 14, 40, 40);
      this.rect(g, P.bio.cyan, 30, 30, 2, 2, 0.8); // faint glow vein
      this.rect(g, P.bio.cyan, 44, 44, 2, 2, 0.7);
    });

    // Sand mound (sea floor decor).
    this.draw("sand_mound", 60, 18, (g) => {
      this.oEllipse(g, P.sand.mid, 30, 16, 56, 16);
      this.rect(g, P.sand.lite, 10, 8, 30, 3, 0.8);
      this.rect(g, P.sand.dark, 34, 13, 20, 3, 0.7);
    });

    // Sunken shipwreck (mid biome landmark).
    this.draw("shipwreck", 150, 80, (g) => {
      // hull
      g.fillStyle(P.outline, 1);
      g.fillTriangle(6, 40, 150, 18, 150, 78);
      g.fillTriangle(6, 40, 110, 76, 150, 78);
      g.fillStyle(P.wreck.hull, 1);
      g.fillTriangle(12, 42, 144, 24, 144, 72);
      g.fillTriangle(12, 42, 112, 70, 144, 72);
      // planks
      for (let i = 0; i < 5; i++) this.rect(g, P.wreck.hullDark, 20, 36 + i * 7, 118 - i * 6, 2, 0.7);
      // broken mast
      this.oRect(g, P.wreck.hullDark, 70, 2, 6, 40);
      this.rect(g, P.wreck.metal, 60, 14, 30, 3, 0.8); // spar
      // portholes
      this.rect(g, P.glassDark, 40, 48, 6, 6);
      this.rect(g, P.glassDark, 64, 50, 6, 6);
      this.rect(g, P.bio.cyan, 41, 49, 2, 2, 0.6);
      // seaweed reclaiming it
      this.oRect(g, P.kelp.mid, 100, 28, 4, 16);
      this.oRect(g, P.kelp.mid, 120, 34, 4, 14);
      this.rect(g, P.wreck.rust, 30, 60, 40, 4, 0.6);
    });

    // Ruined pillar (deep biome landmark).
    this.draw("ruin_pillar", 36, 130, (g) => {
      this.oRect(g, P.ruin.stoneDark, 4, 0, 26, 124);
      this.rect(g, P.ruin.stone, 6, 2, 10, 120, 0.9);
      this.oRect(g, P.ruin.stone, 0, 116, 36, 14); // base
      this.oRect(g, P.ruin.stone, 2, 0, 32, 10); // capital
      // cracks + moss
      this.rect(g, P.outline, 16, 30, 2, 40, 0.7);
      this.rect(g, P.ruin.moss, 6, 60, 18, 4, 0.5);
      this.rect(g, P.bio.cyan, 12, 40, 2, 2, 0.8); // glyph glow
    });

    // Bioluminescent deep plant.
    this.draw("glow_plant", 26, 50, (g) => {
      this.oRect(g, P.rock.deepDark, 10, 30, 6, 20); // dark stalk
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI - 0.4;
        const x = 13 + Math.cos(a) * 9;
        const y = 28 - Math.sin(a) * 18;
        this.oRect(g, P.rock.deepLite, x - 1, y, 3, 8);
        this.rect(g, P.glowPlant, x - 1, y - 1, 3, 3, 0.95); // glowing bulb
      }
    });

    // Bubble vent rock.
    this.draw("vent", 24, 16, (g) => {
      this.oRect(g, P.rock.deepDark, 2, 6, 20, 10);
      this.rect(g, P.rock.deepLite, 4, 5, 8, 3, 0.8);
      this.rect(g, P.bio.cyan, 10, 4, 4, 3, 0.6);
    });

    // Ambient glow mote.
    this.draw("mote", 5, 5, (g) => {
      this.rect(g, P.bio.cyan, 1, 1, 3, 3, 0.9);
      this.rect(g, P.white, 2, 2, 1, 1);
    });
    // Marine snow speck (deep particle).
    this.draw("marine_snow", 4, 4, (g) => {
      this.rect(g, 0xcfe6f2, 1, 1, 2, 2, 0.8);
    });
  }

  // -------------------------------------------------- player (knight diver)
  // A single helper draws the diver in different poses; each pose becomes an
  // animation frame so the knight idles, swims, attacks, and dashes.
  drawKnight(g, fin, lean, sword) {
    const P = PAL;
    const lx = lean;
    // --- oxygen tank on the back + hose ---
    this.oRect(g, P.tankRed, 3, 14, 7, 17);
    this.rect(g, 0xe8916a, 4, 15, 2, 14, 0.85);
    this.rect(g, 0x8f3a2a, 8, 15, 1, 14, 0.6);
    this.rect(g, P.steel.mid, 4, 10, 4, 5); // valve
    this.rect(g, P.steel.lite, 4, 10, 2, 1, 0.85);
    this.rect(g, P.outline, 8, 13, 7, 2); // air hose
    this.rect(g, P.steel.dark, 9, 12, 5, 1, 0.7);
    // --- back fin (flaps with fin) ---
    this.oRect(g, P.armor.dark, 0, 27 + fin * 2, 10, 5);
    this.rect(g, P.armor.mid, 1, 28 + fin * 2, 7, 2, 0.8);
    // --- torso armour ---
    const tx = 12 + lx;
    this.oRect(g, P.armor.mid, tx, 13, 16, 17);
    this.rect(g, P.armor.lite, tx + 1, 14, 12, 3, 0.9); // top sheen
    this.rect(g, P.armor.dark, tx + 1, 27, 14, 2, 0.85); // bottom shade
    this.rect(g, P.gold.mid, tx + 1, 21, 14, 2); // belt
    this.rect(g, P.gold.lite, tx + 1, 21, 14, 1, 0.7);
    this.rect(g, P.armor.dark, tx + 1, 18, 14, 1, 0.6); // plate seam
    // rivets
    this.rect(g, P.steel.lite, tx + 2, 15, 1, 1, 0.9);
    this.rect(g, P.steel.lite, tx + 12, 15, 1, 1, 0.9);
    this.rect(g, P.steel.lite, tx + 2, 25, 1, 1, 0.9);
    this.rect(g, P.steel.lite, tx + 12, 25, 1, 1, 0.9);
    // --- legs / front flipper (animated) ---
    this.oRect(g, P.armor.dark, tx + 1, 30, 6, 5);
    this.oRect(g, P.armor.dark, tx + 8, 30, 8, 5 - fin);
    this.rect(g, P.steel.dark, tx + 9, 31, 7, 2, 0.8);
    this.rect(g, P.armor.mid, tx + 2, 31, 3, 1, 0.7);
    // --- shield on front arm ---
    this.oRect(g, P.armor.lite, tx - 3, 17, 5, 11);
    this.rect(g, P.gold.mid, tx - 2, 18, 3, 9, 0.85);
    this.rect(g, P.gold.lite, tx - 1, 19, 1, 7, 0.8);
    this.rect(g, P.plume.mid, tx - 2, 21, 3, 3, 0.85); // emblem
    // --- helmet ---
    const hx = 26 + lx;
    this.oRect(g, P.steel.mid, hx, 6, 15, 16);
    this.rect(g, P.steel.lite, hx + 1, 7, 12, 3, 0.9);
    this.rect(g, P.steel.dark, hx + 1, 18, 12, 2, 0.85);
    this.rect(g, P.gold.mid, hx, 8, 15, 1, 0.8); // brow band
    this.rect(g, P.steel.lite, hx + 1, 7, 1, 1, 0.9); // rivets
    this.rect(g, P.steel.lite, hx + 12, 7, 1, 1, 0.9);
    // porthole visor
    this.rect(g, P.outline, hx + 3, 10, 10, 8);
    this.rect(g, P.glassDark, hx + 4, 11, 8, 6);
    this.rect(g, P.glass, hx + 5, 11, 5, 3, 0.95);
    this.rect(g, P.white, hx + 5, 11, 2, 1, 0.9); // glint
    this.rect(g, P.gold.mid, hx + 3, 10, 10, 1, 0.7); // visor rim
    // crest plume
    this.oRect(g, P.plume.mid, hx + 3, 1, 9, 5);
    this.rect(g, P.plume.lite, hx + 3, 1, 9, 1, 0.9);
    this.rect(g, P.plume.mid, hx + 6, 0, 3, 2, 0.8);
    // --- glowing sword ---
    if (sword === "thrust") {
      this.rect(g, P.gold.mid, hx + 12, 13, 4, 2); // hilt
      this.rect(g, P.outline, hx + 15, 12, 11, 4);
      this.rect(g, P.bio.cyan, hx + 16, 13, 10, 2, 0.95);
      this.rect(g, P.white, hx + 17, 13, 7, 1, 0.95);
    } else {
      this.rect(g, P.gold.mid, hx + 9, 20, 4, 2); // hilt at side
      this.rect(g, P.outline, hx + 11, 3, 4, 18);
      this.rect(g, P.bio.cyan, hx + 11, 4, 2, 16, 0.9);
      this.rect(g, P.white, hx + 11, 4, 1, 16, 0.6);
    }
  }

  makePlayer() {
    const W = 46;
    const H = 40;
    this.draw("knight_idle1", W, H, (g) => this.drawKnight(g, 0, 0, "rest"));
    this.draw("knight_idle2", W, H, (g) => this.drawKnight(g, 1, 0, "rest"));
    this.draw("knight_swim1", W, H, (g) => this.drawKnight(g, 0, 1, "rest"));
    this.draw("knight_swim2", W, H, (g) => this.drawKnight(g, 1, 2, "rest"));
    this.draw("knight_attack", W, H, (g) => this.drawKnight(g, 0, 1, "thrust"));
    this.draw("knight_dash", W, H, (g) => {
      this.drawKnight(g, 0, 2, "rest");
      // speed streaks
      this.rect(g, PAL.bio.cyan, 0, 12, 8, 1, 0.7);
      this.rect(g, PAL.white, 0, 16, 6, 1, 0.6);
      this.rect(g, PAL.bio.cyan, 0, 20, 9, 1, 0.7);
    });
    // base key used by the dash afterimage ghost
    this.draw("sub", W, H, (g) => this.drawKnight(g, 0, 0, "rest"));

    // Bubble.
    this.draw("bubble", 8, 8, (g) => {
      g.fillStyle(0xbfefff, 0.85);
      g.fillCircle(4, 4, 3);
      this.rect(g, PAL.white, 3, 2, 2, 2, 0.9);
    });

    // Basic attack: thrown crescent blade of sword-energy (검기).
    this.draw("proj", 16, 9, (g) => {
      g.fillStyle(PAL.outline, 1);
      g.fillTriangle(0, 4, 14, 0, 14, 9);
      g.fillStyle(PAL.bio.cyan, 0.9);
      g.fillTriangle(1, 4, 12, 1, 12, 8);
      this.rect(g, 0xeaffff, 6, 3, 7, 2);
      this.rect(g, PAL.white, 11, 1, 3, 6, 0.95);
    });
  }

  // ---------------------------------------------------------- creatures
  makeCreatures() {
    const P = PAL;

    // friendly small fish (warm, soft, round eye)
    this.draw("small_fish", 22, 14, (g) => {
      g.fillStyle(P.outline, 1);
      g.fillTriangle(12, 7, 21, 1, 21, 13);
      g.fillStyle(P.fishWarm.dark, 1);
      g.fillTriangle(12, 7, 19, 3, 19, 11);
      this.oEllipse(g, P.fishWarm.mid, 9, 7, 15, 9);
      this.rect(g, P.fishWarm.lite, 4, 4, 8, 2, 0.85);
      g.fillStyle(P.fishWarm.dark, 1);
      g.fillTriangle(8, 11, 12, 11, 10, 14);
      this.rect(g, P.white, 4, 5, 3, 3);
      this.rect(g, P.eyeDark, 5, 6, 2, 2);
    });

    // friendly sea turtle
    this.draw("turtle", 28, 20, (g) => {
      this.oEllipse(g, P.kelp.dark, 15, 11, 18, 12); // shell
      this.rect(g, P.kelp.mid, 8, 6, 14, 3, 0.8);
      for (let i = 0; i < 3; i++) this.rect(g, P.kelp.lite, 9 + i * 5, 9, 3, 3, 0.7); // scutes
      this.oRect(g, P.seagrass.mid, 0, 9, 7, 5); // head
      this.rect(g, P.white, 1, 10, 2, 2);
      this.rect(g, P.eyeDark, 1, 10, 1, 1);
      this.oRect(g, P.kelp.dark, 5, 16, 6, 4); // flippers
      this.oRect(g, P.kelp.dark, 18, 16, 6, 4);
    });

    // hostile fast predator fish (sleek, cold, red eye, forked tail)
    this.draw("fast_fish", 30, 16, (g) => {
      // forked tail
      g.fillStyle(P.outline, 1);
      g.fillTriangle(20, 8, 30, 1, 30, 15);
      g.fillStyle(P.predator.dark, 1);
      g.fillTriangle(21, 8, 28, 3, 28, 13);
      g.fillStyle(P.water.midsea.bg, 1);
      g.fillTriangle(27, 8, 30, 5, 30, 11); // notch (fork)
      // streamlined body
      this.oEllipse(g, P.predator.mid, 13, 8, 22, 10);
      this.rect(g, P.predator.lite, 6, 5, 12, 2, 0.8); // top sheen
      this.rect(g, P.predator.dark, 8, 11, 12, 2, 0.7); // belly shade
      this.rect(g, P.predator.lite, 9, 8, 8, 1, 0.5); // lateral line
      // dorsal + pelvic fins
      g.fillStyle(P.predator.dark, 1);
      g.fillTriangle(11, 3, 17, 3, 14, -1);
      g.fillTriangle(10, 13, 15, 13, 12, 17);
      // snout + red eye + small teeth
      g.fillStyle(P.predator.dark, 1);
      g.fillTriangle(3, 6, 3, 10, 0, 8);
      this.rect(g, P.eyeRed, 5, 6, 3, 3);
      this.rect(g, P.white, 5, 6, 1, 1, 0.8);
      for (let i = 0; i < 3; i++) g.fillTriangle(2 + i * 2, 10, 4 + i * 2, 10, 3 + i * 2, 12);
    });

    // neutral jellyfish (glow)
    this.draw("jelly", 22, 28, (g) => {
      this.oEllipse(g, P.jellyBody, 11, 9, 18, 14, 0.92);
      this.rect(g, 0xffd3f2, 6, 4, 9, 3, 0.85);
      this.rect(g, P.bio.magenta, 7, 12, 8, 1, 0.6);
      for (let i = 0; i < 5; i++) {
        const x = 4 + i * 3.5;
        this.rect(g, P.jellyBody, x, 15, 2, 10 + (i % 2) * 3, 0.7);
        this.rect(g, P.bio.magenta, x, 22, 2, 3, 0.6);
      }
    });

    // neutral ray
    this.draw("ray", 32, 16, (g) => {
      g.fillStyle(P.outline, 1);
      g.fillTriangle(2, 8, 28, 1, 28, 15);
      g.fillStyle(P.predator.mid, 1);
      g.fillTriangle(5, 8, 26, 3, 26, 13);
      this.rect(g, P.predator.lite, 9, 6, 12, 2, 0.7);
      this.rect(g, P.outline, 27, 7, 5, 2); // tail
      this.rect(g, P.eyeDark, 22, 6, 2, 2);
      this.rect(g, P.eyeDark, 22, 9, 2, 2);
    });

    // friendly dolphin
    this.draw("dolphin", 36, 16, (g) => {
      this.oEllipse(g, P.fishBlue.mid, 17, 8, 30, 9);
      this.rect(g, P.fishBlue.lite, 8, 4, 18, 2, 0.85);
      this.rect(g, 0xeaf6ff, 8, 10, 16, 2, 0.8); // belly
      g.fillStyle(P.outline, 1);
      g.fillTriangle(26, 8, 36, 1, 36, 14);
      g.fillStyle(P.fishBlue.dark, 1);
      g.fillTriangle(26, 8, 34, 3, 34, 13);
      g.fillStyle(P.fishBlue.dark, 1);
      g.fillTriangle(12, 2, 18, 2, 14, -3); // dorsal (clipped ok)
      this.rect(g, P.fishBlue.dark, 12, 0, 5, 3);
      this.rect(g, P.white, 6, 6, 3, 3);
      this.rect(g, P.eyeDark, 7, 7, 2, 2);
    });

    // friendly glowing whale (large)
    this.draw("glow_whale", 84, 38, (g) => {
      this.oEllipse(g, P.fishBlue.dark, 42, 20, 70, 26);
      this.rect(g, P.fishBlue.mid, 14, 8, 50, 5, 0.7);
      this.rect(g, 0xbfe9ff, 16, 28, 48, 3, 0.6); // belly glow line
      g.fillStyle(P.outline, 1);
      g.fillTriangle(70, 20, 84, 6, 84, 34);
      g.fillStyle(P.fishBlue.dark, 1);
      g.fillTriangle(70, 20, 82, 9, 82, 31);
      for (let i = 0; i < 6; i++) this.rect(g, P.bio.cyan, 20 + i * 9, 14 + (i % 2) * 6, 3, 3, 0.95); // glow spots
      this.rect(g, P.white, 14, 15, 4, 4);
      this.rect(g, P.eyeDark, 15, 16, 2, 2);
    });

    // hostile anglerfish (red eye, teeth, lure)
    this.draw("angler", 32, 26, (g) => {
      this.oEllipse(g, P.predator.dark, 16, 14, 24, 18);
      this.rect(g, P.predator.mid, 8, 7, 14, 4, 0.7);
      // mouth + teeth
      this.rect(g, P.outline, 2, 13, 8, 6);
      for (let i = 0; i < 4; i++) {
        g.fillStyle(0xe7d24a, 1);
        g.fillTriangle(3 + i * 2, 13, 5 + i * 2, 13, 4 + i * 2, 17);
      }
      // lure
      this.rect(g, 0x6a4a3a, 16, 2, 2, 6);
      g.fillStyle(P.bio.gold, 0.95);
      g.fillCircle(17, 2, 3);
      this.rect(g, P.white, 16, 1, 1, 1, 0.9);
      // red eye
      this.rect(g, P.eyeRed, 11, 11, 3, 3);
      this.rect(g, P.white, 11, 11, 1, 1, 0.8);
      // spiny back fin
      for (let i = 0; i < 4; i++) g.fillTriangle(14 + i * 4, 5, 18 + i * 4, 5, 16 + i * 4, 0);
    });

    // hostile deep squid (red eyes, tentacles)
    this.draw("deep_squid", 24, 30, (g) => {
      this.oEllipse(g, 0x7a2f55, 12, 9, 16, 16); // mantle
      this.rect(g, 0xa8466f, 6, 3, 9, 3, 0.8);
      // fin ears
      g.fillStyle(P.outline, 1);
      g.fillTriangle(2, 6, 7, 4, 6, 12);
      g.fillStyle(0x933a63, 1);
      g.fillTriangle(22, 6, 17, 4, 18, 12);
      // red eyes
      this.rect(g, P.eyeRed, 7, 9, 3, 3);
      this.rect(g, P.eyeRed, 14, 9, 3, 3);
      this.rect(g, P.white, 7, 9, 1, 1, 0.8);
      // tentacles
      for (let i = 0; i < 6; i++) {
        const x = 3 + i * 3;
        this.rect(g, 0x933a63, x, 16, 2, 12 + (i % 2) * 2, 0.9);
        this.rect(g, P.bio.magenta, x, 26, 2, 2, 0.6);
      }
    });

    // hostile armoured crab (red eyes, claws)
    this.draw("crab", 28, 20, (g) => {
      this.oEllipse(g, 0xc24b3a, 14, 11, 22, 11); // shell
      this.rect(g, 0xe06b57, 6, 7, 16, 3, 0.8);
      this.rect(g, 0x9e3527, 6, 13, 16, 3, 0.7);
      // claws
      this.oRect(g, 0x9e3527, 0, 5, 6, 5);
      this.oRect(g, 0x9e3527, 22, 5, 6, 5);
      this.rect(g, 0xc24b3a, 1, 6, 3, 1, 0.8);
      // eyes on stalks
      this.rect(g, P.outline, 10, 3, 2, 4);
      this.rect(g, P.outline, 16, 3, 2, 4);
      this.rect(g, P.eyeRed, 9, 1, 3, 3);
      this.rect(g, P.eyeRed, 15, 1, 3, 3);
      // legs
      for (let i = 0; i < 3; i++) {
        this.rect(g, 0x9e3527, 5 + i * 6, 16, 2, 4);
        this.rect(g, 0x9e3527, 17 + i * 4, 16, 2, 4);
      }
    });

    // boss-class ancient giant (silhouette + bioluminescence + red eye)
    this.draw("ancient", 240, 120, (g) => {
      g.fillStyle(P.outline, 1);
      g.fillEllipse(120, 60, 224, 74);
      g.fillStyle(0x0a1d3a, 1);
      g.fillEllipse(120, 60, 216, 66);
      g.fillStyle(0x12305c, 1);
      g.fillTriangle(206, 60, 240, 28, 240, 92); // tail
      g.fillStyle(0x0a1d3a, 1);
      g.fillTriangle(88, 28, 132, 28, 110, 2); // dorsal
      // bioluminescent spots
      g.fillStyle(P.bio.cyan, 0.9);
      for (let i = 0; i < 11; i++) g.fillCircle(40 + i * 17, 50 + Math.sin(i) * 16, 3);
      // jaw line + red eye
      this.rect(g, 0x1a3a66, 30, 64, 70, 3, 0.6);
      g.fillStyle(P.eyeRed, 0.95);
      g.fillCircle(44, 50, 6);
      g.fillStyle(P.white, 0.8);
      g.fillCircle(43, 49, 2);
    });
  }

  // -------------------------------------------------------------- items
  makeItems() {
    const P = PAL;
    this.draw("item_oxygen", 14, 14, (g) => {
      this.oRect(g, 0x3fc9ff, 4, 2, 6, 10);
      this.rect(g, 0xbff0ff, 5, 3, 2, 8, 0.9);
      this.rect(g, P.steel.lite, 5, 0, 4, 2);
      this.rect(g, P.white, 6, 4, 1, 3, 0.8);
    });
    this.draw("item_energy", 14, 14, (g) => {
      g.fillStyle(P.outline, 1);
      g.fillTriangle(7, 0, 13, 8, 1, 8);
      g.fillStyle(0xffe14d, 1);
      g.fillTriangle(7, 1, 12, 7, 2, 7);
      g.fillStyle(0xffe14d, 1);
      g.fillTriangle(2, 6, 12, 6, 7, 13);
      this.rect(g, 0xfff7c2, 6, 3, 2, 5, 0.9);
    });
    this.draw("item_mineral", 14, 14, (g) => {
      g.fillStyle(P.outline, 1);
      g.fillTriangle(7, 0, 13, 7, 1, 7);
      g.fillStyle(0x7ad6ff, 1);
      g.fillTriangle(7, 1, 12, 6, 2, 6);
      this.oRect(g, 0x4aa6e0, 2, 6, 10, 6);
      this.rect(g, 0xdcf4ff, 5, 2, 2, 8, 0.85);
    });
    this.draw("item_specimen", 14, 14, (g) => {
      this.oEllipse(g, 0xbfeaff, 7, 8, 10, 10, 0.55);
      this.rect(g, P.jellyBody, 5, 6, 4, 4);
      this.rect(g, P.steel.lite, 4, 0, 6, 3);
      this.rect(g, P.white, 5, 4, 1, 1, 0.8);
    });
    this.draw("item_relic", 14, 14, (g) => {
      this.oRect(g, P.gold.mid, 2, 2, 10, 10);
      this.rect(g, P.gold.lite, 3, 3, 8, 2, 0.9);
      this.rect(g, P.ruin.stoneDark, 5, 5, 4, 4);
      this.rect(g, P.bio.gold, 6, 6, 2, 2);
    });
  }

  // -------------------------------------------- lighting + particles
  makeLightAndParticles() {
    // Radial darkness mask (transparent hole over the player).
    const size = 512;
    const canvasTex = this.textures.createCanvas("light", size, size);
    const ctx = canvasTex.getContext();
    const grd = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    grd.addColorStop(0.0, "rgba(0,0,0,0)");
    grd.addColorStop(0.1, "rgba(0,0,0,0)");
    grd.addColorStop(0.24, "rgba(0,0,0,0.72)");
    grd.addColorStop(0.34, "rgba(0,0,0,1)");
    grd.addColorStop(1.0, "rgba(0,0,0,1)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    canvasTex.refresh();

    // Soft white glow (additive): bioluminescence + light burst.
    const gsize = 128;
    const glowTex = this.textures.createCanvas("glow", gsize, gsize);
    const gctx = glowTex.getContext();
    const gg = gctx.createRadialGradient(gsize / 2, gsize / 2, 2, gsize / 2, gsize / 2, gsize / 2);
    gg.addColorStop(0.0, "rgba(255,255,255,1)");
    gg.addColorStop(0.4, "rgba(255,255,255,0.45)");
    gg.addColorStop(1.0, "rgba(255,255,255,0)");
    gctx.fillStyle = gg;
    gctx.fillRect(0, 0, gsize, gsize);
    glowTex.refresh();

    // Vertical light shaft (near-surface god rays).
    const sw = 48;
    const sh = 320;
    const shaftTex = this.textures.createCanvas("light_shaft", sw, sh);
    const sctx = shaftTex.getContext();
    const sg = sctx.createLinearGradient(0, 0, 0, sh);
    sg.addColorStop(0, "rgba(255,255,255,0.5)");
    sg.addColorStop(0.5, "rgba(255,255,255,0.16)");
    sg.addColorStop(1, "rgba(255,255,255,0)");
    sctx.fillStyle = sg;
    sctx.beginPath();
    sctx.moveTo(sw * 0.3, 0);
    sctx.lineTo(sw * 0.7, 0);
    sctx.lineTo(sw, sh);
    sctx.lineTo(0, sh);
    sctx.closePath();
    sctx.fill();
    shaftTex.refresh();

    // Hit spark.
    this.draw("spark", 10, 10, (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(5, 5, 4);
    });
  }

  // ------------------------------------------------------------- anims
  defineAnims() {
    const mk = (key, frames, frameRate, repeat = -1) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: frames.map((k) => ({ key: k })),
        frameRate,
        repeat,
      });
    };
    mk("knight_idle", ["knight_idle1", "knight_idle2"], 2.5);
    mk("knight_swim", ["knight_swim1", "knight_swim2"], 7);
    mk("knight_attack", ["knight_attack"], 1, 0);
    mk("knight_dash", ["knight_dash"], 1, 0);
  }
}
