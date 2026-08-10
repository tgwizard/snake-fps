import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { CONFIG } from '../src/config.js';
import { ARENA_OPTIONS, getArenaPreviewData } from '../src/arena.js';
import { createBotCharacter, updateCharacterPose } from '../src/character.js';
import { CobraClashGame } from '../src/game.js';
import { circleIntersectsBox, damageForZone, formatTime, seededRandom } from '../src/math.js';

test('match timer is formatted for the HUD', () => {
  assert.equal(formatTime(120), '2:00');
  assert.equal(formatTime(61.01), '1:02');
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(-10), '0:00');
});

test('body zones use the documented damage values', () => {
  assert.equal(damageForZone('head', CONFIG.zoneDamage), 52);
  assert.equal(damageForZone('torso', CONFIG.zoneDamage), 31);
  assert.equal(damageForZone('limb', CONFIG.zoneDamage), 19);
  assert.equal(damageForZone('unknown', CONFIG.zoneDamage), 31);
});

test('circle versus box collision catches edges and clears open space', () => {
  const box = { minX: -1, maxX: 1, minZ: -2, maxZ: 2 };
  assert.equal(circleIntersectsBox(0, 0, 0.5, box), true);
  assert.equal(circleIntersectsBox(1.3, 0, 0.5, box), true);
  assert.equal(circleIntersectsBox(2, 0, 0.5, box), false);
});

test('seeded random sequences are repeatable', () => {
  const first = seededRandom(42);
  const second = seededRandom(42);
  assert.deepEqual([first(), first(), first()], [second(), second(), second()]);
});

test('the launch build exposes three distinct arenas', () => {
  assert.deepEqual(ARENA_OPTIONS.map((arena) => arena.id), ['sunset', 'ice', 'jungle']);
  assert.equal(new Set(ARENA_OPTIONS.map((arena) => arena.name)).size, 3);
  const layouts = ARENA_OPTIONS.map((arena) => getArenaPreviewData(arena.id));
  assert.ok(layouts.every((layout) => layout.obstacles.length >= 7));
  assert.ok(layouts.every((layout) => layout.obstacles.some((obstacle) => !obstacle.collide && obstacle.y > obstacle.height)));
  assert.equal(new Set(layouts.map((layout) => JSON.stringify(layout.obstacles))).size, 3);
});

test('cobra models keep the concept-art silhouette and matching hit zones', () => {
  const character = createBotCharacter(0xff6b35);
  let visibleMeshes = 0;
  character.group.traverse((object) => {
    if (object.isMesh && !object.userData.hitZone) visibleMeshes += 1;
  });
  assert.ok(visibleMeshes >= 50);
  assert.ok(character.hitboxes[0].geometry.parameters.width >= 1.5);
  assert.equal(character.parts.leftArm.type, 'Group');
  assert.equal(character.parts.rightArm.type, 'Group');
  assert.ok(character.healthBar.position.y >= 3.7);
});

test('opponent health bars face the camera and never render through cover', () => {
  const character = createBotCharacter(0x34d1bf);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  scene.add(character.group, camera);
  character.group.rotation.y = 1.1;
  camera.rotation.set(0.12, -0.7, 0);
  scene.updateMatrixWorld(true);
  updateCharacterPose(character, 1, 0, 0.5, camera, false, true);

  const worldBar = character.healthBar.getWorldQuaternion(new THREE.Quaternion());
  const worldCamera = camera.getWorldQuaternion(new THREE.Quaternion());
  assert.ok(Math.abs(worldBar.dot(worldCamera)) > 0.9999);
  assert.equal(character.healthFill.material.depthTest, true);
  assert.equal(character.healthBar.visible, true);

  updateCharacterPose(character, 1, 0, 0.5, camera, false, false);
  assert.equal(character.healthBar.visible, false);
});

test('quitting while tagged out clears the respawn overlay and countdown', () => {
  const removed = [];
  const stateChanges = [];
  const fakeGame = {
    state: 'playing',
    player: { respawnTimer: 4.2 },
    clearBots() {},
    clearEffects() {},
    ui: {
      respawn: { classList: { remove: (name) => removed.push(name) } },
      damageFlash: { classList: { remove: (name) => removed.push(name) } },
    },
    placeMenuCamera() {},
    onStateChange: (state) => stateChanges.push(state),
  };

  CobraClashGame.prototype.quitToMenu.call(fakeGame);
  assert.equal(fakeGame.player.respawnTimer, 0);
  assert.deepEqual(removed, ['is-visible', 'active']);
  assert.deepEqual(stateChanges, ['menu']);
});
