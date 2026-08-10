import * as THREE from '../vendor/three.module.js';

const GREEN = 0x71c83c;
const GREEN_DARK = 0x2f7f3b;
const BELLY = 0xffe9a4;
const BLUE = 0x176fc0;
const ORANGE = 0xff6a24;
const healthParentQuaternion = new THREE.Quaternion();

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

function makeEye(parent, x, y, z) {
  const white = mesh(new THREE.SphereGeometry(0.12, 14, 9), toon(0xffffff), parent, [x, y, z], null, [1, 1.2, 0.58]);
  mesh(new THREE.SphereGeometry(0.058, 10, 7), toon(0x09202a), white, [0, 0, -0.098]);
  mesh(new THREE.SphereGeometry(0.018, 7, 5), toon(0xffffff), white, [-0.016, 0.02, -0.148]);
}

function makeHood(parent, skin, darkSkin, teamColor) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.84);
  shape.bezierCurveTo(-0.46, 0.9, -1.02, 0.58, -1, 0.05);
  shape.bezierCurveTo(-0.98, -0.4, -0.63, -0.73, -0.25, -0.58);
  shape.quadraticCurveTo(0, -0.47, 0.25, -0.58);
  shape.bezierCurveTo(0.63, -0.73, 0.98, -0.4, 1, 0.05);
  shape.bezierCurveTo(1.02, 0.58, 0.46, 0.9, 0, 0.84);

  const outline = mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.055, bevelThickness: 0.045, bevelSegments: 2, curveSegments: 18 }),
    darkSkin,
    parent,
    [0, 2.6, 0.08],
    null,
    [0.83, 0.83, 0.72],
  );
  outline.castShadow = true;

  const faceMaterial = skin.clone();
  faceMaterial.side = THREE.DoubleSide;
  mesh(new THREE.ShapeGeometry(shape, 18), faceMaterial, parent, [0, 2.6, -0.005], [0, Math.PI, 0], [0.765, 0.765, 1]);

  const innerDark = toon(0x175f55);
  mesh(new THREE.SphereGeometry(0.48, 16, 10), innerDark, parent, [-0.48, 2.72, -0.065], null, [0.82, 1.05, 0.12]);
  mesh(new THREE.SphereGeometry(0.48, 16, 10), innerDark, parent, [0.48, 2.72, -0.065], null, [0.82, 1.05, 0.12]);
  mesh(new THREE.SphereGeometry(0.31, 16, 10), toon(ORANGE), parent, [-0.5, 2.73, -0.115], null, [0.74, 1.04, 0.1]);
  mesh(new THREE.SphereGeometry(0.31, 16, 10), toon(teamColor), parent, [0.5, 2.73, -0.115], null, [0.74, 1.04, 0.1]);
}

function makeArm(parent, side, skin, glove) {
  const arm = new THREE.Group();
  arm.position.set(side * 0.52, 2.01, -0.02);
  parent.add(arm);
  mesh(new THREE.SphereGeometry(0.235, 12, 9), skin, arm, [0, -0.03, 0], null, [1, 1.06, 0.92]);
  mesh(new THREE.CapsuleGeometry(0.19, 0.3, 5, 10), skin, arm, [side * 0.06, -0.25, -0.05], [0.32, 0, side * -0.18]);
  mesh(new THREE.CapsuleGeometry(0.155, 0.36, 5, 10), skin, arm, [-side * 0.12, -0.48, -0.28], [0.72, 0, side * 0.12]);
  mesh(new THREE.SphereGeometry(0.19, 10, 8), glove, arm, [-side * 0.2, -0.51, -0.49], null, [1.05, 0.9, 1.05]);
  mesh(new THREE.BoxGeometry(0.24, 0.08, 0.22), toon(0xffbd31), arm, [-side * 0.2, -0.43, -0.46]);
  return arm;
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
  const background = mesh(new THREE.PlaneGeometry(1.3, 0.14), new THREE.MeshBasicMaterial({ color: 0x062530, transparent: true, opacity: 0.82, depthWrite: false }), group, [0, 0, 0]);
  background.castShadow = false;
  const fill = mesh(new THREE.PlaneGeometry(1.18, 0.078), new THREE.MeshBasicMaterial({ color: 0xb9ef43, depthWrite: false }), group, [0, 0, 0.006]);
  fill.castShadow = false;
  group.position.y = 3.72;
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

  // The concept's defining cobra silhouette: broad hood, long neck and a warm smile.
  makeHood(group, skin, darkSkin, teamColor);
  mesh(new THREE.CylinderGeometry(0.29, 0.4, 0.92, 14), skin, group, [0, 2.36, 0]);
  for (let plate = 0; plate < 5; plate += 1) {
    mesh(
      new THREE.BoxGeometry(0.43 + plate * 0.025, 0.085, 0.055),
      belly,
      group,
      [0, 2.08 + plate * 0.135, -0.345],
    );
  }

  mesh(new THREE.SphereGeometry(0.42, 20, 14), skin, group, [0, 2.98, -0.24], null, [1.02, 0.9, 1.08]);
  mesh(new THREE.SphereGeometry(0.31, 18, 12), skin, group, [0, 2.84, -0.5], null, [1.18, 0.62, 0.82]);
  mesh(new THREE.SphereGeometry(0.25, 16, 10), belly, group, [0, 2.76, -0.49], null, [1.14, 0.36, 0.72]);
  makeEye(group, -0.18, 3.08, -0.54);
  makeEye(group, 0.18, 3.08, -0.54);
  mesh(new THREE.SphereGeometry(0.025, 8, 6), toon(0x17352a), group, [-0.12, 2.91, -0.715], null, [1, 0.55, 0.5]);
  mesh(new THREE.SphereGeometry(0.025, 8, 6), toon(0x17352a), group, [0.12, 2.91, -0.715], null, [1, 0.55, 0.5]);
  mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 18, Math.PI), toon(0x4b2030), group, [0, 2.78, -0.695], [0, 0, Math.PI]);
  mesh(new THREE.ConeGeometry(0.035, 0.15, 8), toon(0xffffff), group, [-0.17, 2.76, -0.695], [0, 0, Math.PI]);
  mesh(new THREE.ConeGeometry(0.035, 0.15, 8), toon(0xffffff), group, [0.17, 2.76, -0.695], [0, 0, Math.PI]);

  // Athletic jersey with the blue piping and pale belly panel from the concept.
  mesh(new THREE.CapsuleGeometry(0.46, 0.5, 6, 14), jersey, group, [0, 1.7, 0], null, [1.08, 1, 0.75]);
  mesh(new THREE.BoxGeometry(0.38, 0.65, 0.05), belly, group, [0, 1.68, -0.365]);
  mesh(new THREE.BoxGeometry(0.085, 0.4, 0.055), shoe, group, [-0.12, 2.12, -0.36], [0, 0, -0.52]);
  mesh(new THREE.BoxGeometry(0.085, 0.4, 0.055), shoe, group, [0.12, 2.12, -0.36], [0, 0, 0.52]);
  mesh(new THREE.BoxGeometry(0.08, 0.77, 0.06), shoe, group, [-0.44, 1.68, -0.17]);
  mesh(new THREE.BoxGeometry(0.08, 0.77, 0.06), shoe, group, [0.44, 1.68, -0.17]);
  mesh(new THREE.BoxGeometry(0.96, 0.08, 0.66), toon(0x082f48), group, [0, 1.28, 0]);

  // Separate upper and lower arm masses make the bots read as the buff mascots in the concept.
  const leftArm = makeArm(group, -1, skin, shoe);
  const rightArm = makeArm(group, 1, skin, shoe);

  // Shorts, muscular legs, and large multi-color basketball shoes.
  mesh(new THREE.BoxGeometry(0.96, 0.43, 0.64), shorts, group, [0, 1.04, 0]);
  mesh(new THREE.BoxGeometry(0.98, 0.065, 0.66), toon(ORANGE), group, [0, 1.24, 0]);
  const leftLeg = mesh(new THREE.CapsuleGeometry(0.19, 0.42, 5, 10), skin, group, [-0.27, 0.57, 0], [0, 0, -0.05]);
  const rightLeg = mesh(new THREE.CapsuleGeometry(0.19, 0.42, 5, 10), skin, group, [0.27, 0.57, 0], [0, 0, 0.05]);
  for (const side of [-1, 1]) {
    mesh(new THREE.BoxGeometry(0.45, 0.29, 0.69), shoe, group, [side * 0.27, 0.2, -0.12]);
    mesh(new THREE.BoxGeometry(0.36, 0.19, 0.23), toon(ORANGE), group, [side * 0.27, 0.21, -0.43]);
    mesh(new THREE.BoxGeometry(0.45, 0.08, 0.72), toon(0xffffff), group, [side * 0.27, 0.065, -0.13]);
    for (let lace = 0; lace < 2; lace += 1) {
      mesh(new THREE.BoxGeometry(0.28, 0.025, 0.035), toon(0xffcf37), group, [side * 0.27, 0.355, -0.2 + lace * 0.08]);
    }
  }

  // A thick, curling, banded tail stays visible from side and rear angles.
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.02, 0.24),
    new THREE.Vector3(-0.22, 0.82, 0.5),
    new THREE.Vector3(0.45, 0.62, 0.73),
    new THREE.Vector3(1.12, 0.4, 0.57),
    new THREE.Vector3(1.38, 0.34, 0.03),
    new THREE.Vector3(1.15, 0.52, -0.4),
  ]);
  mesh(new THREE.TubeGeometry(tailCurve, 28, 0.19, 10, false), darkSkin, group, [0, 0, 0]);
  mesh(new THREE.TubeGeometry(tailCurve, 28, 0.15, 10, false), skin, group, [0, 0, 0]);
  for (const position of [0.36, 0.57, 0.76]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.158, 0.032, 7, 12), belly);
    ring.position.copy(tailCurve.getPointAt(position));
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tailCurve.getTangentAt(position).normalize());
    ring.castShadow = true;
    group.add(ring);
  }

  const { gun, muzzle } = makeBlaster(group, true);
  gun.position.set(0, 1.52, -0.52);
  gun.rotation.x = -0.06;

  const hitboxes = [
    hitbox(group, new THREE.BoxGeometry(1.62, 1.25, 0.82), [0, 2.72, -0.02], 'head'),
    hitbox(group, new THREE.BoxGeometry(1.05, 1.2, 0.74), [0, 1.66, 0], 'torso'),
    hitbox(group, new THREE.BoxGeometry(1.58, 0.56, 0.68), [0, 1.75, -0.16], 'limb'),
    hitbox(group, new THREE.BoxGeometry(0.94, 0.95, 0.62), [0, 0.56, 0], 'limb'),
  ];

  const bar = healthBar();
  group.add(bar.group);

  const shield = mesh(
    new THREE.SphereGeometry(1.08, 18, 12),
    new THREE.MeshBasicMaterial({
      color: 0x61efff,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    group,
    [0, 1.7, 0],
    null,
    [1, 1.63, 1],
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

export function updateCharacterPose(character, elapsed, speed, healthRatio, camera, shielded = false, healthVisible = true) {
  const pace = Math.min(1, speed / 4.5);
  const step = Math.sin(elapsed * (5 + pace * 5));
  character.parts.leftLeg.rotation.z = -0.05 + step * 0.32 * pace;
  character.parts.rightLeg.rotation.z = 0.05 - step * 0.32 * pace;
  character.parts.leftArm.rotation.z = -0.055 - step * 0.035 * pace;
  character.parts.rightArm.rotation.z = 0.055 + step * 0.035 * pace;
  character.parts.gun.position.y = 1.52 + Math.abs(step) * 0.02;
  character.healthFill.scale.x = Math.max(0.001, healthRatio);
  character.healthFill.position.x = (healthRatio - 1) * 0.59;
  character.healthBar.visible = healthRatio < 0.999 && healthVisible;
  if (camera) {
    character.group.getWorldQuaternion(healthParentQuaternion).invert();
    character.healthBar.quaternion.copy(healthParentQuaternion).multiply(camera.quaternion);
  }
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
