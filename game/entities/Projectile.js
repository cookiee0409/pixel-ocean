// Player attack projectile. Created fresh per shot and self-managed (no object
// pooling) so the lifecycle is simple and crash-proof. It adds itself to the
// scene (so preUpdate runs and culls it off-screen) and is destroyed on hit by
// CombatSystem. Avoiding the classType pool fixed a freeze where a recycled,
// non-Projectile group member threw inside the physics overlap and broke the
// requestAnimationFrame loop.
/* global Phaser */
import { VIEW_HEIGHT } from "../config.js";

export default class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, vx, vy, damage) {
    super(scene, x, y, "proj");
    scene.add.existing(this); // adds to display + update list -> preUpdate runs
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.damage = damage;
    this.setDepth(15);
    this.setVelocity(vx, vy);
    this.setRotation(Math.atan2(vy, vx));
    this.spawnTime = scene.time.now;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    const cam = this.scene.cameras.main;
    if (
      time - this.spawnTime > 1200 ||
      this.y < cam.scrollY - 60 ||
      this.y > cam.scrollY + VIEW_HEIGHT + 60 ||
      this.x < -40 ||
      this.x > this.scene.physics.world.bounds.width + 40
    ) {
      this.destroy();
    }
  }
}
