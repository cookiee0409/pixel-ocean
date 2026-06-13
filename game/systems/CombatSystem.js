// Registers all the physics overlaps and resolves their outcomes. Keeping the
// damage rules here keeps entities and the scene lean.
/* global Phaser */

export default class CombatSystem {
  constructor(scene) {
    this.scene = scene;
  }

  setup({ player, projectiles, enemies, friendlies, items }) {
    const scene = this.scene;

    // Projectiles damage enemies/neutrals, then are destroyed.
    scene.physics.add.overlap(projectiles, enemies, (proj, enemy) => {
      if (!proj.active || !enemy.active) return;
      scene.spawnHitSpark(proj.x, proj.y, 0xfff2a8);
      enemy.hurt(proj.damage);
      proj.destroy();
    });

    // Enemies (and neutrals) damage the player on contact — unless the knight
    // is mid-charge (돌격), in which case the player rams them instead.
    scene.physics.add.overlap(player, enemies, (_p, enemy) => {
      if (!enemy.active) return;
      if (player.isDashing()) {
        const now = scene.time.now;
        if (now > (enemy.lastChargeHit || 0)) {
          enemy.lastChargeHit = now + 300; // avoid multi-hit per frame
          scene.spawnHitSpark(enemy.x, enemy.y, 0xbfe9ff);
          enemy.hurt(player.dashDamage);
        }
        return;
      }
      const dealt = player.takeDamage(enemy.contactDamage, enemy.x, enemy.y);
      // Charging predators get briefly stunned after landing a hit.
      if (dealt && enemy.def.ai === "charge") {
        enemy.state2 = "idle";
        enemy.nextChargeReady = scene.time.now + 1200;
      }
    });

    // Items are picked up on overlap.
    scene.physics.add.overlap(player, items, (_p, item) => {
      if (!item.active) return;
      scene.collectItem(item);
    });

    // Friendlies do nothing on contact; interaction is handled via the F key
    // in the scene (range check), not a physics overlap.
    this.friendlies = friendlies;
  }
}
