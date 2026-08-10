import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
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
