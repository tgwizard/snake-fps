import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { ARENA_OPTIONS, getArenaPreviewData } from '../src/arena.js';
import { createBotCharacter } from '../src/character.js';
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
