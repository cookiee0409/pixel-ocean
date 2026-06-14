// Main gameplay loop. Owns the player, the entity groups, and every system,
// and exposes the small API the entities/systems call back into
// (fireProjectile, collectItem, onEnemyKilled, onZoneChanged, ...).
/* global Phaser */
import {
  VIEW_WIDTH,
  VIEW_HEIGHT,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  START_Y,
  MAX_DEPTH,
  BOSS_DEPTH,
  CHANNEL_HALF,
  caveCenterX,
  yToDepth,
} from "../config.js";
import { PAL } from "../data/palette.js";
import { ZONES } from "../data/zones.js";
import { CREATURES, creatureById } from "../data/creatures.js";
import Player from "../entities/Player.js";
import Projectile from "../entities/Projectile.js";
import Item from "../entities/Item.js";
import DepthSystem from "../systems/DepthSystem.js";
import OxygenSystem from "../systems/OxygenSystem.js";
import CombatSystem from "../systems/CombatSystem.js";
import SpawnSystem from "../systems/SpawnSystem.js";
import LightingSystem from "../systems/LightingSystem.js";
import AudioSystem from "../systems/AudioSystem.js";
import Hud from "../ui/Hud.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    this.paused = false;
    this.ending = false;
    this.bossTriggered = false;
    this.kills = 0;
    this.itemsCollected = 0;
    this.score = 0;
    this.codex = new Set();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.fadeIn(300, 2, 12, 28);

    this.buildBackdrop();
    this.buildCave();

    // Entity groups. Projectiles are a plain group used only for overlap
    // tracking; each Projectile owns its own physics body and lifecycle.
    this.projectiles = this.add.group();
    this.enemies = this.add.group();
    this.friendlies = this.add.group();
    this.items = this.add.group();

    // Player + camera. Spawn inside the cave mouth.
    this.player = new Player(this, caveCenterX(START_Y), START_Y);
    this.physics.add.collider(this.player, this.caveWalls);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    // Systems.
    this.depthSystem = new DepthSystem(this, this.player);
    this.oxygenSystem = new OxygenSystem(this, this.player, this.depthSystem);
    this.lighting = new LightingSystem(this, this.player, this.depthSystem);
    this.combat = new CombatSystem(this);
    this.combat.setup({
      player: this.player,
      projectiles: this.projectiles,
      enemies: this.enemies,
      friendlies: this.friendlies,
      items: this.items,
    });
    this.spawn = new SpawnSystem(this, this.depthSystem, {
      enemies: this.enemies,
      friendlies: this.friendlies,
      items: this.items,
    });

    // Audio (procedural SFX + ambient BGM). sfx() is the hook entities call.
    this.audio = new AudioSystem(this);
    this.sfx = (name) => this.audio.play(name);
    this.audio.startMusic();

    // HUD (reads this.depthSystem each frame).
    this.hud = new Hud(this, this.player);
    this.hud.showBanner(ZONES[0].name, "#9be7ff");

    this.setupInput();

    // Ambient bioluminescent motes (deep zones) — drift gently, additive glow.
    this.motes = this.add
      .particles(0, 0, "mote", {
        x: { min: 0, max: VIEW_WIDTH },
        y: { min: 0, max: VIEW_HEIGHT },
        lifespan: 4200,
        speedY: { min: -7, max: 7 },
        speedX: { min: -7, max: 7 },
        scale: { min: 0.4, max: 1.1 },
        alpha: { start: 0.6, end: 0 },
        frequency: 360,
        quantity: 1,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setScrollFactor(0)
      .setDepth(85);

    // Marine snow — fine flecks drifting downward through the deep.
    this.marineSnow = this.add
      .particles(0, -10, "marine_snow", {
        x: { min: 0, max: VIEW_WIDTH },
        y: -10,
        lifespan: 6000,
        speedY: { min: 10, max: 26 },
        speedX: { min: -6, max: 6 },
        scale: { min: 0.6, max: 1.4 },
        alpha: { start: 0.5, end: 0 },
        frequency: 240,
        quantity: 1,
        emitting: false,
      })
      .setScrollFactor(0)
      .setDepth(84);
  }

  // ---------------------------------------------------------------- input
  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,Q,E,F");
    this.input.keyboard.addCapture("SPACE,Q,E,F,TAB");

    this.input.keyboard.on("keydown-ESC", () => this.togglePause());
    this.input.keyboard.on("keydown-TAB", (e) => {
      e.preventDefault();
      this.hud.toggleCodex(this.codexEntryNames());
    });
  }

  gatherInput() {
    const c = this.cursors;
    const k = this.keys;
    const hud = this.hud;

    let x = (c.right.isDown || k.D.isDown ? 1 : 0) - (c.left.isDown || k.A.isDown ? 1 : 0);
    let y = (c.down.isDown || k.S.isDown ? 1 : 0) - (c.up.isDown || k.W.isDown ? 1 : 0);
    x = Phaser.Math.Clamp(x + hud.move.x, -1, 1);
    y = Phaser.Math.Clamp(y + hud.move.y, -1, 1);

    const t = hud.consumeTriggers();
    return {
      x,
      y,
      attack: c.space.isDown || hud.attackHeld,
      dash: Phaser.Input.Keyboard.JustDown(k.Q) || t.dash,
      light: Phaser.Input.Keyboard.JustDown(k.E) || t.light,
      interact: Phaser.Input.Keyboard.JustDown(k.F) || t.interact,
    };
  }

  togglePause() {
    if (this.ending) return;
    this.paused = !this.paused;
    if (this.paused) this.physics.pause();
    else this.physics.resume();
    this.hud.showPause(this.paused);
  }

  // ----------------------------------------------------------- main loop
  update(time, delta) {
    if (this.ending) return;
    if (this.paused) return;

    const input = this.gatherInput();
    this.player.drive(input, delta);

    this.depthSystem.update();
    this.oxygenSystem.update(delta);
    this.lighting.update();

    this.enemies.children.iterate((e) => e && e.active && e.think(this.player, time));
    this.friendlies.children.iterate((f) => f && f.active && f.think(this.player, time));

    this.spawn.update(time);
    this.handleInteraction(input.interact);
    this.updateAmbience(time);
    this.checkBoss();

    this.hud.update();

    if (!this.player.alive) this.endRun("death");
    else if (this.depthSystem.depth >= MAX_DEPTH) this.endRun("depth");
  }

  updateAmbience(time) {
    const depth = this.depthSystem.depth;
    // bioluminescent motes appear from the deep; marine snow from mid-deep on
    this.motes.emitting = depth > 750;
    this.marineSnow.emitting = depth > 450;

    // god rays only read near the surface — fade them out as you descend
    if (this.shafts) {
      const k = Phaser.Math.Clamp(1 - depth / 360, 0, 1);
      for (const s of this.shafts) s.setVisible(k > 0.02);
    }

    // gentle water drift on the camera (subtle, keeps the scene alive)
    const cam = this.cameras.main;
    cam.followOffset.x = Math.sin(time / 1500) * 3;
    cam.followOffset.y = Math.cos(time / 1900) * 2;
  }

  // --------------------------------------------------- interaction (F)
  handleInteraction(triggered) {
    const nearest = this.nearestFriendly(70);
    if (nearest && !nearest.interacted) {
      this.hud.setPrompt(`[F] ${nearest.def.name} 와 교감`);
    } else {
      this.hud.setPrompt("");
    }
    if (!triggered || !nearest) return;
    const heal = nearest.interact();
    if (heal) {
      this.player.heal(heal);
      this.registerCreature(nearest.def);
      this.spawnHitSpark(nearest.x, nearest.y, 0x9be7ff);
      const bits = [];
      if (heal.oxygen) bits.push(`산소 +${heal.oxygen}`);
      if (heal.hp) bits.push(`체력 +${heal.hp}`);
      this.hud.showToast(`${nearest.def.name}: ${nearest.def.dialog || "..."}  ${bits.join(" ")}`);
    }
  }

  nearestFriendly(range) {
    let best = null;
    let bestD = range;
    this.friendlies.children.iterate((f) => {
      if (!f || !f.active) return;
      const d = Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y);
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    });
    return best;
  }

  // ------------------------------------------------ entity/system callbacks
  fireProjectile(x, y, vx, vy, damage) {
    this.projectiles.add(new Projectile(this, x, y, vx, vy, damage));
  }

  triggerLightBurst(x, y, radius, damage) {
    this.lighting.burst();
    // expanding ring visual
    const ring = this.add.circle(x, y, 8, 0xffffff, 0).setStrokeStyle(3, 0xfff7c2, 0.9).setDepth(30);
    this.tweens.add({
      targets: ring,
      radius: radius,
      alpha: 0,
      duration: 380,
      onUpdate: () => ring.setRadius(ring.radius),
      onComplete: () => ring.destroy(),
    });
    // damage nearby enemies
    this.enemies.children.iterate((e) => {
      if (!e || !e.active) return;
      if (Phaser.Math.Distance.Between(e.x, e.y, x, y) <= radius) e.hurt(damage);
    });
  }

  spawnDashTrail(x, y) {
    const ghost = this.add
      .image(x, y, "sub")
      .setFlipX(this.player.flipX)
      .setAlpha(0.5)
      .setTint(0x9be7ff)
      .setDepth(19);
    this.tweens.add({ targets: ghost, alpha: 0, duration: 260, onComplete: () => ghost.destroy() });
  }

  spawnHitSpark(x, y, color = 0xffffff) {
    const s = this.add.image(x, y, "glow").setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(30).setScale(0.4);
    this.tweens.add({ targets: s, scale: 1.1, alpha: 0, duration: 260, onComplete: () => s.destroy() });
  }

  onEnemyKilled(enemy) {
    this.kills += 1;
    this.score += enemy.def.score || 0;
    this.registerCreature(enemy.def);
    this.spawnHitSpark(enemy.x, enemy.y, 0xfff2a8);
    this.sfx?.("hit");
    // drop a resource sometimes
    if (enemy.def.drop && Math.random() < 0.6) {
      this.items.add(new Item(this, enemy.x, enemy.y, enemy.def.drop).spawn());
    }
  }

  collectItem(item) {
    const def = item.def;
    this.player.heal(def.effect || {});
    this.itemsCollected += 1;
    this.score += def.score || 0;
    this.spawnHitSpark(item.x, item.y, 0xbff0ff);
    this.sfx?.("collect");
    this.hud.showToast(`${def.name} 획득`);
    item.destroy();
  }

  onZoneChanged(zone, prev) {
    const goingDeeper = ZONES.indexOf(zone) > ZONES.indexOf(prev);
    this.sfx?.("zone");
    this.hud.showBanner(zone.name, goingDeeper ? "#ffd34d" : "#9be7ff");
    if (goingDeeper && zone.id !== "sunlight") {
      this.hud.showToast("더 깊어진다 — 산소 소모가 빨라진다");
    }
  }

  registerCreature(def) {
    if (!def || this.codex.has(def.id)) return;
    this.codex.add(def.id);
  }

  codexEntryNames() {
    return [...this.codex].map((id) => CREATURES[id]?.name).filter(Boolean);
  }

  // --------------------------------------------------------- boss event
  checkBoss() {
    if (this.bossTriggered || this.depthSystem.depth < BOSS_DEPTH) return;
    this.bossTriggered = true;
    const def = creatureById("ancient_creature");
    const cam = this.cameras.main;
    const y = cam.scrollY + VIEW_HEIGHT * 0.55;
    const boss = this.add
      .image(-160, y, def.texture)
      .setDepth(3) // behind creatures; the dark overlay makes it a looming shadow
      .setAlpha(0.92);
    this.registerCreature(def);
    this.score += def.score;
    this.hud.showBanner("거대한 그림자가 다가온다…", "#ff7a7a");
    cam.shake(800, 0.006);
    this.tweens.add({
      targets: boss,
      x: WORLD_WIDTH + 200,
      y: y + 40,
      duration: 9000,
      ease: "Sine.inOut",
      onComplete: () => boss.destroy(),
    });
  }

  // ------------------------------------------------------------- run end
  endRun(reason) {
    if (this.ending) return;
    this.ending = true;
    this.physics.pause();
    this.audio?.stopMusic();
    this.hud.setPrompt("");
    const friendsMet = [...this.codex].filter((id) => CREATURES[id]?.kind === "friendly").length;
    const stats = {
      reason,
      maxDepth: this.depthSystem.maxDepth,
      kills: this.kills,
      friendsMet,
      itemsCollected: this.itemsCollected,
      codexCount: this.codex.size,
      score: this.score,
    };
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("ResultScene", stats));
  }

  // --------------------------------------------------------- backdrop
  // Per-biome prop palettes split into parallax layers (far/mid/near).
  static LAYERS = {
    sunlight: {
      far: ["kelp_tall"],
      mid: ["rock", "coral", "coral_fan", "coral2", "anemone", "sand_mound"],
      near: ["seaweed", "kelp", "anemone", "coral"],
    },
    midsea: {
      far: ["kelp_tall", "rock_big"],
      mid: ["rock", "rock2", "kelp", "coral2", "sand_mound", "shipwreck"],
      near: ["kelp", "seaweed", "rock2"],
    },
    deepsea: {
      far: ["rock_deep", "ruin_pillar"],
      mid: ["rock_deep", "rock_big", "glow_plant", "vent", "ruin_pillar"],
      near: ["glow_plant", "kelp_tall"],
    },
    abyss: {
      far: ["rock_deep", "ruin_pillar"],
      mid: ["rock_deep", "vent", "glow_plant"],
      near: ["rock_deep", "glow_plant"],
    },
  };

  biomeAtY(y) {
    const d = yToDepth(y);
    if (d < 300) return "sunlight";
    if (d < 800) return "midsea";
    if (d < 1500) return "deepsea";
    return "abyss";
  }

  // Per-biome stone tints for the cave walls (multiply: bright surface → dark deep).
  static WALL_TINT = {
    sunlight: 0xcfe0ea,
    midsea: 0x9fb6cc,
    deepsea: 0x5f7290,
    abyss: 0x39465f,
  };

  // Random x inside the navigable channel at depth y (for spawns/props).
  channelXAt(y, pad = 26) {
    const cx = caveCenterX(y);
    const half = Math.max(20, CHANNEL_HALF - pad);
    return cx + Phaser.Math.Between(-half, half);
  }

  // Build the winding cave: fill everything outside the channel with dense stone
  // wall tiles and matching static colliders, so the player must steer the
  // zig-zag tunnel downward.
  buildCave() {
    this.caveWalls = [];
    const BAND = 72;
    for (let y = 0; y < WORLD_HEIGHT; y += BAND) {
      const cx = caveCenterX(y + BAND / 2);
      const leftEdge = Math.round(cx - CHANNEL_HALF);
      const rightEdge = Math.round(cx + CHANNEL_HALF);
      const tint = GameScene.WALL_TINT[this.biomeAtY(y + BAND / 2)];
      if (leftEdge > 2) this.addWall(0, y, leftEdge, BAND, tint, "right");
      if (rightEdge < WORLD_WIDTH - 2) this.addWall(rightEdge, y, WORLD_WIDTH - rightEdge, BAND, tint, "left");
    }
  }

  addWall(x, y, w, h, tint, lipSide) {
    const key = (Math.floor(y / 72) + Math.floor(x / 200)) % 2 === 0 ? "cave_wall" : "cave_wall2";
    this.add.tileSprite(x, y, w, h, key).setOrigin(0, 0).setDepth(4).setTint(tint);
    // carved inner lip at the channel edge
    const lipX = lipSide === "right" ? x + w - 10 : x;
    this.add
      .image(lipX, y, "cave_edge")
      .setOrigin(0, 0)
      .setDisplaySize(10, h)
      .setDepth(5)
      .setFlipX(lipSide === "left")
      .setTint(tint);
    // invisible static collider for this wall block
    const zone = this.add.zone(x + w / 2, y + h / 2, w, h);
    this.physics.add.existing(zone, true);
    this.caveWalls.push(zone);
  }

  buildBackdrop() {
    this.buildLightShafts();

    const swayKeys = /kelp|seaweed|anemone|glow_plant/;
    const sway = (img) => {
      if (!swayKeys.test(img.texture.key)) return;
      this.tweens.add({
        targets: img,
        angle: { from: -4, to: 4 },
        duration: 2200 + Math.random() * 1600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    };

    // Props grow from the cave walls along the winding channel, with occasional
    // mid-water drifters (far, faded) and close foreground silhouettes for depth.
    for (let y = START_Y + 120; y < WORLD_HEIGHT - 90; y += Phaser.Math.Between(70, 130)) {
      const biome = this.biomeAtY(y);
      const set = GameScene.LAYERS[biome];
      const cx = caveCenterX(y);
      const onLeft = Math.random() < 0.5;
      const edge = onLeft ? cx - CHANNEL_HALF : cx + CHANNEL_HALF;
      const key = Phaser.Utils.Array.GetRandom(set.near.concat(set.mid));
      const x = edge + (onLeft ? Phaser.Math.Between(0, 24) : -Phaser.Math.Between(0, 24));
      const img = this.add
        .image(x, y, key)
        .setOrigin(0.5, 1)
        .setDepth(6)
        .setFlipX(!onLeft)
        .setScale(Phaser.Math.FloatBetween(0.85, 1.3));
      sway(img);

      // close foreground silhouette (over the player, faded) for parallax depth
      if (Math.random() < 0.16) {
        const fKey = Phaser.Utils.Array.GetRandom(set.near);
        const fEdge = onLeft ? cx + CHANNEL_HALF : cx - CHANNEL_HALF;
        const f = this.add
          .image(fEdge + (onLeft ? -10 : 10), y + 30, fKey)
          .setOrigin(0.5, 1)
          .setDepth(24)
          .setAlpha(0.45)
          .setFlipX(onLeft)
          .setScale(Phaser.Math.FloatBetween(1.5, 2.1));
        sway(f);
      }

      // faded mid-water drifter for far depth
      if (Math.random() < 0.22) {
        const dKey = Phaser.Utils.Array.GetRandom(set.far);
        this.add
          .image(this.channelXAt(y, 10), y + Phaser.Math.Between(-10, 20), dKey)
          .setOrigin(0.5, 1)
          .setDepth(3)
          .setAlpha(0.4)
          .setTint(PAL.water[biome].fog)
          .setScale(Phaser.Math.FloatBetween(0.8, 1.2));
      }
    }
  }

  // Near-surface god rays (sunlight biome). Parallax + slow shimmer.
  buildLightShafts() {
    const topMost = START_Y + 40;
    for (let i = 0; i < 6; i++) {
      const beam = this.add
        .image(60 + i * 130 + Phaser.Math.Between(-20, 20), topMost, "light_shaft")
        .setOrigin(0.5, 0)
        .setAngle(10 + Phaser.Math.Between(-3, 3))
        .setScrollFactor(0.45, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setDepth(3)
        .setScale(Phaser.Math.FloatBetween(0.8, 1.4), Phaser.Math.FloatBetween(1.4, 2.4));
      this.tweens.add({
        targets: beam,
        alpha: Phaser.Math.FloatBetween(0.1, 0.22),
        duration: 2600 + i * 350,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
      this.shafts = this.shafts || [];
      this.shafts.push(beam);
    }
  }
}
