import * as THREE from '../vendor/three.module.js';

const GREEN = 0x71c83c;
const GREEN_DARK = 0x2f7f3b;
const BELLY = 0xffe9a4;
const BLUE = 0x176fc0;
const ORANGE = 0xff6a24;

function toon(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.7,
    metalness: options.metalness ?? 0.02,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
  });
}

function mesh(geometry, material, parent, position, rotation = null, scale = null) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  if (rotation) object.rotation.set(...rotation);
  if (scale) object.scale.set(...scale);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function hitbox(parent, geometry, position, zone, rotation = null) {
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
  });
  const object = mesh(geometry, material, parent, position, rotation);
  object.castShadow = false;
  object.receiveShadow = false;
  object.userData.hitZone = zone;
  return object;
}

function makeEye(parent, x) {
  const white = mesh(new THREE.SphereGeometry(0.105, 12, 8), toon(0xffffff), parent, [x, 2.75, -0.302], null, [1, 1.18, 0.55]);
  mesh(new THREE.SphereGeometry(0.052, 10, 7), toon(0x09202a), white, [0, 0, -0.085]);
}

function makeBlaster(parent, compact = false) {
  const gun = new THREE.Group();
  const s = compact ? 0.78 : 1;
  gun.scale.setScalar(s);
  parent.add(gun);
  mesh(new THREE.BoxGeometry(0.28, 0.25, 1.05), toon(BLUE), gun, [0, 0, -0.3]);
  mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.42, 10), toon(ORANGE), gun, [0, 0, -0.97], [Math.PI / 2, 0, 0]);
  mesh(new THREE.BoxGeometry(0.2, 0.43, 0.24), toon(0x174e8c), gun, [0, -0.27, -0.1], [-0.22, 0, 0]);
  mesh(new THREE.BoxGeometry(0.18, 0.1, 0.52), toon(0xffb52f), gun, [0, 0.17, -0.32]);
  const tank = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 10), toon(0x7ed7d0), gun, [0, -0.02, 0.18], [Math.PI / 2, 0, 0]);
  tank.material.transparent = true;
  tank.material.opacity = 0.92;
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, -1.2);
  gun.add(muzzle);
  return { gun, muzzle };
}

function healthBar() {
  const group = new THREE.Group();
  const background = mesh(new THREE.PlaneGeometry(1.05, 0.12), new THREE.MeshBasicMaterial({ color: 0x062530, transparent: true, opacity: 0.82 }), group, [0, 0, 0]);
  background.castShadow = false;
  const fill = mesh(new THREE.PlaneGeometry(0.96, 0.067), new THREE.MeshBasicMaterial({ color: 0xb9ef43, depthTest: false }), group, [0, 0, 0.006]);
  fill.castShadow = false;
  fill.renderOrder = 4;
  group.position.y = 3.48;
  group.visible = false;
  return { group, fill };
}

export function createBotCharacter(teamColor) {
  const group = new THREE.Group();
  group.rotation.order = 'YXZ';

  const skin = toon(GREEN);
  const darkSkin = toon(GREEN_DARK);
  const belly = toon(BELLY);
  const jersey = toon(teamColor);
  const shorts = toon(0x169c95);
  const shoe = toon(BLUE);

  // Hood and head.
  mesh(new THREE.SphereGeometry(0.62, 18, 12), darkSkin, group, [0, 2.58, 0], null, [1.2, 1.08, 0.38]);
  mesh(new THREE.SphereGeometry(0.37, 18, 12), skin, group, [0, 2.65, -0.17], null, [1, 0.88, 1.08]);
  mesh(new THREE.SphereGeometry(0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), belly, group, [0, 2.55, -0.39], [Math.PI / 2, 0, 0], [0.92, 0.42, 0.48]);
  makeEye(group, -0.16);
  makeEye(group, 0.16);
  mesh(new THREE.BoxGeometry(0.21, 0.025, 0.025), toon(0x1c3b2b), group, [0, 2.52, -0.515]);

  // Jersey torso and belly stripe.
  mesh(new THREE.CapsuleGeometry(0.43, 0.72, 6, 12), jersey, group, [0, 1.68, 0], null, [1.1, 1, 0.72]);
  mesh(new THREE.BoxGeometry(0.34, 0.74, 0.04), belly, group, [0, 1.72, -0.36]);
  mesh(new THREE.BoxGeometry(0.88, 0.075, 0.64), toon(0x082f48), group, [0, 1.32, 0]);

  // Arms and gloves, angled toward the blaster.
  const leftArm = mesh(new THREE.CapsuleGeometry(0.13, 0.52, 5, 10), skin, group, [-0.51, 1.78, -0.13], [0.55, 0, -0.44]);
  const rightArm = mesh(new THREE.CapsuleGeometry(0.13, 0.52, 5, 10), skin, group, [0.5, 1.77, -0.13], [0.55, 0, 0.44]);
  mesh(new THREE.SphereGeometry(0.18, 10, 8), shoe, group, [-0.35, 1.49, -0.42]);
  mesh(new THREE.SphereGeometry(0.18, 10, 8), shoe, group, [0.35, 1.49, -0.42]);

  // Shorts, legs, and oversized sneakers.
  mesh(new THREE.BoxGeometry(0.88, 0.42, 0.62), shorts, group, [0, 1.05, 0]);
  const leftLeg = mesh(new THREE.CapsuleGeometry(0.16, 0.43, 5, 9), skin, group, [-0.26, 0.56, 0], [0, 0, -0.05]);
  const rightLeg = mesh(new THREE.CapsuleGeometry(0.16, 0.43, 5, 9), skin, group, [0.26, 0.56, 0], [0, 0, 0.05]);
  mesh(new THREE.BoxGeometry(0.39, 0.25, 0.63), shoe, group, [-0.26, 0.19, -0.12]);
  mesh(new THREE.BoxGeometry(0.39, 0.25, 0.63), shoe, group, [0.26, 0.19, -0.12]);
  mesh(new THREE.BoxGeometry(0.39, 0.08, 0.66), toon(0xffffff), group, [-0.26, 0.08, -0.13]);
  mesh(new THREE.BoxGeometry(0.39, 0.08, 0.66), toon(0xffffff), group, [0.26, 0.08, -0.13]);

  // Curved tail reads clearly from the side and reinforces the snake silhouette.
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.9, 0.18),
    new THREE.Vector3(0.48, 0.7, 0.48),
    new THREE.Vector3(0.69, 0.4, 0.55),
    new THREE.Vector3(0.86, 0.22, 0.25),
  ]);
  mesh(new THREE.TubeGeometry(tailCurve, 16, 0.13, 8, false), darkSkin, group, [0, 0, 0]);

  const { gun, muzzle } = makeBlaster(group, true);
  gun.position.set(0, 1.52, -0.52);
  gun.rotation.x = -0.06;

  const hitboxes = [
    hitbox(group, new THREE.SphereGeometry(0.5, 8, 6), [0, 2.62, -0.05], 'head'),
    hitbox(group, new THREE.BoxGeometry(0.98, 1.18, 0.72), [0, 1.64, 0], 'torso'),
    hitbox(group, new THREE.BoxGeometry(1.4, 0.42, 0.52), [0, 1.75, -0.1], 'limb'),
    hitbox(group, new THREE.BoxGeometry(0.88, 0.92, 0.58), [0, 0.55, 0], 'limb'),
  ];

  const bar = healthBar();
  group.add(bar.group);

  const shield = mesh(
    new THREE.SphereGeometry(0.98, 18, 12),
    new THREE.MeshBasicMaterial({
      color: 0x61efff,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    group,
    [0, 1.52, 0],
    null,
    [1, 1.58, 1],
  );
  shield.castShadow = false;
  shield.visible = false;

  return {
    group,
    hitboxes,
    muzzle,
    healthBar: bar.group,
    healthFill: bar.fill,
    shield,
    parts: { leftArm, rightArm, leftLeg, rightLeg, gun },
  };
}

export function bindBot(character, bot) {
  for (const box of character.hitboxes) box.userData.bot = bot;
}

export function updateCharacterPose(character, elapsed, speed, healthRatio, camera, shielded = false) {
  const pace = Math.min(1, speed / 4.5);
  const step = Math.sin(elapsed * (5 + pace * 5));
  character.parts.leftLeg.rotation.z = -0.05 + step * 0.32 * pace;
  character.parts.rightLeg.rotation.z = 0.05 - step * 0.32 * pace;
  character.parts.leftArm.rotation.z = -0.44 - step * 0.05 * pace;
  character.parts.rightArm.rotation.z = 0.44 + step * 0.05 * pace;
  character.parts.gun.position.y = 1.52 + Math.abs(step) * 0.02;
  character.healthFill.scale.x = Math.max(0.001, healthRatio);
  character.healthFill.position.x = (healthRatio - 1) * 0.48;
  character.healthBar.visible = healthRatio < 0.999;
  if (camera) character.healthBar.lookAt(camera.position);
  character.shield.visible = shielded;
  if (shielded) {
    character.shield.material.opacity = 0.1 + Math.sin(elapsed * 8) * 0.035;
    character.shield.rotation.y = elapsed * 0.7;
  }
}

export function createPlayerBlaster(camera) {
  const anchor = new THREE.Group();
  anchor.position.set(0.37, -0.34, -0.57);
  camera.add(anchor);
  const { gun, muzzle } = makeBlaster(anchor, 0.72);
  gun.rotation.set(-0.07, 0.12, -0.02);
  const leftHand = mesh(new THREE.SphereGeometry(0.12, 10, 7), toon(GREEN), anchor, [-0.2, -0.1, -0.25]);
  const rightHand = mesh(new THREE.SphereGeometry(0.13, 10, 7), toon(GREEN), anchor, [0.18, -0.14, -0.05]);
  anchor.traverse((object) => {
    object.frustumCulled = false;
    object.renderOrder = 10;
    if (object.material) {
      object.material.depthTest = false;
      object.material.depthWrite = false;
    }
  });
  return { anchor, gun, muzzle, leftHand, rightHand, recoil: 0, bob: 0 };
}

export function updatePlayerBlaster(blaster, dt, elapsed, movementAmount, crouching) {
  blaster.recoil = Math.max(0, blaster.recoil - dt * 8.5);
  blaster.bob += dt * (movementAmount > 0.1 ? 9 : 3);
  const bob = Math.sin(blaster.bob) * 0.016 * movementAmount;
  const sway = Math.cos(blaster.bob * 0.5) * 0.014 * movementAmount;
  const targetY = (crouching ? -0.41 : -0.34) + bob - blaster.recoil * 0.09;
  blaster.anchor.position.y += (targetY - blaster.anchor.position.y) * Math.min(1, dt * 12);
  blaster.anchor.position.x = 0.37 + sway;
  blaster.gun.rotation.x = -0.07 + blaster.recoil * 0.16;
  blaster.anchor.rotation.z = Math.sin(elapsed * 1.7) * 0.003;
}
