import * as THREE from '../vendor/three.module.js';

const GREEN = 0x70cb3e;
const GREEN_LIGHT = 0xa7eb43;
const GREEN_DARK = 0x24653d;
const INK = 0x102f3b;
const BELLY = 0xffe9a6;
const BELLY_SHADE = 0xe4b85a;
const BLUE = 0x176fc0;
const BLUE_DARK = 0x164478;
const ORANGE = 0xff6a24;
const YELLOW = 0xffc936;
const healthParentQuaternion = new THREE.Quaternion();
const localUp = new THREE.Vector3(0, 1, 0);

function surface(color, options = {}) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.68,
    metalness: options.metalness ?? 0.01,
    emissive: options.emissive ?? color,
    emissiveIntensity: options.emissiveIntensity ?? 0.018,
    side: options.side ?? THREE.FrontSide,
  });
  if (options.transparent) {
    material.transparent = true;
    material.opacity = options.opacity ?? 1;
  }
  return material;
}

function makeMaterials(teamColor) {
  return {
    skin: surface(GREEN),
    skinLight: surface(GREEN_LIGHT),
    skinDark: surface(GREEN_DARK),
    ink: new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }),
    faceInk: surface(INK, { emissiveIntensity: 0 }),
    belly: surface(BELLY),
    bellyShade: surface(BELLY_SHADE),
    team: surface(teamColor),
    teamDark: surface(new THREE.Color(teamColor).multiplyScalar(0.58)),
    blue: surface(BLUE),
    blueDark: surface(BLUE_DARK),
    orange: surface(ORANGE),
    yellow: surface(YELLOW),
    white: surface(0xffffff),
    tongue: surface(0xf26b7a),
    shorts: surface(0x169c95),
  };
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

function outlinedMesh(geometry, material, ink, parent, position, rotation = null, scale = null, outlineScale = 1.045) {
  const object = mesh(geometry, material, parent, position, rotation, scale);
  const outline = new THREE.Mesh(geometry, ink);
  outline.scale.setScalar(outlineScale);
  outline.castShadow = false;
  outline.receiveShadow = false;
  outline.renderOrder = -1;
  object.add(outline);
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

function capsuleBetween(parent, start, end, radius, material, ink = null, outlineScale = 1.045) {
  const direction = end.clone().sub(start);
  const totalLength = direction.length();
  const geometry = new THREE.CapsuleGeometry(radius, Math.max(0.025, totalLength - radius * 2), 5, 10);
  const object = ink
    ? outlinedMesh(geometry, material, ink, parent, [0, 0, 0], null, null, outlineScale)
    : mesh(geometry, material, parent, [0, 0, 0]);
  object.position.copy(start).add(end).multiplyScalar(0.5);
  object.quaternion.setFromUnitVectors(localUp, direction.normalize());
  return object;
}

function tube(parent, points, radius, material, segments = 18) {
  const curve = new THREE.CatmullRomCurve3(points);
  return mesh(new THREE.TubeGeometry(curve, segments, radius, 7, false), material, parent, [0, 0, 0]);
}

function makeEye(parent, x, y, z, materials) {
  const eye = new THREE.Group();
  eye.position.set(x, y, z);
  parent.add(eye);
  outlinedMesh(
    new THREE.SphereGeometry(0.135, 14, 10),
    materials.white,
    materials.ink,
    eye,
    [0, 0, 0],
    null,
    [1, 1.22, 0.62],
    1.08,
  );
  mesh(new THREE.SphereGeometry(0.069, 11, 8), materials.skinLight, eye, [0, -0.006, -0.083], null, [0.9, 1.1, 0.38]);
  mesh(new THREE.SphereGeometry(0.038, 9, 7), materials.faceInk, eye, [0, -0.004, -0.108], null, [0.82, 1.12, 0.35]);
  mesh(new THREE.SphereGeometry(0.013, 7, 5), materials.white, eye, [-0.012, 0.026, -0.124]);
  return eye;
}

function hoodShape(inset = 0) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.86 - inset);
  shape.bezierCurveTo(-0.5 + inset, 0.88 - inset, -1.03 + inset, 0.6 - inset, -1.01 + inset, 0.05);
  shape.bezierCurveTo(-0.99 + inset, -0.4 + inset, -0.66 + inset, -0.69 + inset, -0.28 + inset, -0.59 + inset);
  shape.quadraticCurveTo(0, -0.5 + inset, 0.28 - inset, -0.59 + inset);
  shape.bezierCurveTo(0.66 - inset, -0.69 + inset, 0.99 - inset, -0.4 + inset, 1.01 - inset, 0.05);
  shape.bezierCurveTo(1.03 - inset, 0.6 - inset, 0.5 - inset, 0.88 - inset, 0, 0.86 - inset);
  return shape;
}

function makeHoodAndHead(parent, materials) {
  const head = new THREE.Group();
  head.position.set(0, 2.59, 0);
  parent.add(head);

  const hoodBack = new THREE.ExtrudeGeometry(hoodShape(), {
    depth: 0.18,
    bevelEnabled: true,
    bevelSize: 0.05,
    bevelThickness: 0.045,
    bevelSegments: 2,
    curveSegments: 20,
  });
  mesh(hoodBack, materials.skinDark, head, [0, 0, -0.005], null, [0.86, 0.86, 0.74]);

  const hoodFaceMaterial = materials.skin.clone();
  hoodFaceMaterial.side = THREE.DoubleSide;
  mesh(new THREE.ShapeGeometry(hoodShape(0.07), 20), hoodFaceMaterial, head, [0, 0, -0.065], [0, Math.PI, 0], [0.86, 0.86, 1]);

  // The inner hood markings are recessed layers, with asymmetry from the team color.
  for (const side of [-1, 1]) {
    outlinedMesh(
      new THREE.SphereGeometry(0.43, 14, 9),
      materials.faceInk,
      materials.ink,
      head,
      [side * 0.48, 0.13, -0.09],
      null,
      [0.78, 1.16, 0.1],
      1.04,
    );
    mesh(
      new THREE.SphereGeometry(0.31, 14, 9),
      side < 0 ? materials.orange : materials.team,
      head,
      [side * 0.5, 0.13, -0.112],
      null,
      [0.74, 1.13, 0.08],
    );
    mesh(
      new THREE.SphereGeometry(0.18, 12, 8),
      materials.blue,
      head,
      [side * 0.51, 0.1, -0.124],
      [0, 0, side * -0.35],
      [0.72, 1.25, 0.065],
    );
  }

  // A raised top ridge and small side highlights make the hood feel grown, not cut from a card.
  tube(head, [
    new THREE.Vector3(-0.48, 0.62, -0.105),
    new THREE.Vector3(0, 0.78, -0.12),
    new THREE.Vector3(0.48, 0.62, -0.105),
  ], 0.042, materials.skinLight, 16);
  for (const side of [-1, 1]) {
    tube(head, [
      new THREE.Vector3(side * 0.73, 0.43, -0.11),
      new THREE.Vector3(side * 0.83, 0.12, -0.12),
      new THREE.Vector3(side * 0.7, -0.19, -0.11),
    ], 0.025, materials.skinLight, 12);
  }

  // Overlapping skull, cheeks, snout and jaw create the rounded friendly face from the concept.
  outlinedMesh(new THREE.SphereGeometry(0.43, 18, 13), materials.skin, materials.ink, head, [0, 0.34, -0.24], null, [1.03, 0.9, 1.03], 1.035);
  mesh(new THREE.SphereGeometry(0.25, 14, 10), materials.skinLight, head, [0, 0.48, -0.48], null, [1.17, 0.38, 0.5]);
  outlinedMesh(new THREE.SphereGeometry(0.31, 18, 12), materials.skin, materials.ink, head, [0, 0.17, -0.52], null, [1.23, 0.62, 0.84], 1.04);
  mesh(new THREE.SphereGeometry(0.29, 16, 10), materials.belly, head, [0, -0.035, -0.5], null, [1.14, 0.48, 0.78]);

  const leftEye = makeEye(head, -0.18, 0.48, -0.53, materials);
  const rightEye = makeEye(head, 0.18, 0.48, -0.53, materials);
  for (const side of [-1, 1]) {
    tube(head, [
      new THREE.Vector3(side * 0.31, 0.57, -0.57),
      new THREE.Vector3(side * 0.18, 0.62, -0.61),
      new THREE.Vector3(side * 0.08, 0.58, -0.6),
    ], 0.024, materials.skinDark, 10);
    mesh(new THREE.SphereGeometry(0.023, 8, 6), materials.faceInk, head, [side * 0.115, 0.23, -0.755], null, [1, 0.52, 0.42]);
  }

  // A dark mouth cavity sits behind the jaw, with a curved smile, tongue and little foam-safe fangs.
  mesh(new THREE.SphereGeometry(0.25, 16, 10), materials.faceInk, head, [0, 0.01, -0.718], null, [1.23, 0.43, 0.28]);
  mesh(new THREE.SphereGeometry(0.12, 12, 8), materials.tongue, head, [0, -0.055, -0.792], null, [1.15, 0.28, 0.22]);
  tube(head, [
    new THREE.Vector3(-0.28, 0.075, -0.745),
    new THREE.Vector3(0, -0.045, -0.79),
    new THREE.Vector3(0.28, 0.075, -0.745),
  ], 0.02, materials.bellyShade, 16);
  for (const side of [-1, 1]) {
    mesh(new THREE.ConeGeometry(0.041, 0.155, 8), materials.white, head, [side * 0.18, 0.04, -0.78], [0, 0, Math.PI]);
    mesh(new THREE.SphereGeometry(0.075, 10, 7), materials.belly, head, [side * 0.265, 0.055, -0.65], null, [0.7, 0.52, 0.28]);
  }

  return { head, eyes: [leftEye, rightEye] };
}

function makeNeck(parent, materials) {
  const neck = new THREE.Group();
  parent.add(neck);
  outlinedMesh(new THREE.CylinderGeometry(0.29, 0.41, 0.96, 14), materials.skin, materials.ink, neck, [0, 2.28, 0], null, null, 1.035);
  mesh(new THREE.CylinderGeometry(0.21, 0.28, 0.87, 12, 1, false, Math.PI * 0.58, Math.PI * 0.84), materials.belly, neck, [0, 2.25, -0.245], [0, 0, Math.PI]);
  for (let plate = 0; plate < 6; plate += 1) {
    const width = 0.39 + plate * 0.025;
    mesh(new THREE.BoxGeometry(width, 0.044, 0.045), materials.bellyShade, neck, [0, 1.96 + plate * 0.132, -0.368]);
  }
  return neck;
}

function makeChestBadge(parent, materials) {
  outlinedMesh(new THREE.SphereGeometry(0.115, 12, 8), materials.orange, materials.ink, parent, [0, 1.64, -0.438], null, [1, 1.12, 0.18], 1.08);
  mesh(new THREE.SphereGeometry(0.055, 9, 6), materials.skin, parent, [0, 1.675, -0.462], null, [1.3, 0.9, 0.2]);
  mesh(new THREE.SphereGeometry(0.012, 6, 5), materials.faceInk, parent, [-0.022, 1.685, -0.478]);
  mesh(new THREE.SphereGeometry(0.012, 6, 5), materials.faceInk, parent, [0.022, 1.685, -0.478]);
  mesh(new THREE.BoxGeometry(0.055, 0.025, 0.018), materials.white, parent, [0, 1.615, -0.47]);
}

function makeTorso(parent, materials) {
  const torso = new THREE.Group();
  parent.add(torso);
  outlinedMesh(new THREE.CapsuleGeometry(0.47, 0.54, 6, 14), materials.team, materials.ink, torso, [0, 1.66, 0], null, [1.08, 1, 0.77], 1.035);
  mesh(new THREE.SphereGeometry(0.31, 14, 10), materials.teamDark, torso, [0, 1.43, 0.25], null, [1.35, 0.72, 0.65]);
  mesh(new THREE.BoxGeometry(0.34, 0.52, 0.035), materials.belly, torso, [0, 1.55, -0.385]);
  for (let plate = 0; plate < 3; plate += 1) {
    mesh(new THREE.BoxGeometry(0.31 - plate * 0.025, 0.026, 0.018), materials.bellyShade, torso, [0, 1.42 + plate * 0.14, -0.411]);
  }

  // Double-layer V neck and side piping give the jersey a readable sportswear construction.
  const collarPoints = [
    new THREE.Vector3(-0.32, 1.94, -0.37),
    new THREE.Vector3(0, 1.76, -0.44),
    new THREE.Vector3(0.32, 1.94, -0.37),
  ];
  tube(torso, collarPoints, 0.055, materials.blueDark, 14);
  tube(torso, collarPoints, 0.028, materials.white, 14);
  for (const side of [-1, 1]) {
    tube(torso, [
      new THREE.Vector3(side * 0.43, 1.9, -0.2),
      new THREE.Vector3(side * 0.5, 1.64, -0.18),
      new THREE.Vector3(side * 0.43, 1.35, -0.2),
    ], 0.035, materials.blue, 12);
  }
  mesh(new THREE.BoxGeometry(0.93, 0.075, 0.66), materials.blueDark, torso, [0, 1.27, 0]);
  mesh(new THREE.BoxGeometry(0.92, 0.026, 0.68), materials.white, torso, [0, 1.315, 0]);
  makeChestBadge(torso, materials);
  return torso;
}

function makeArm(parent, side, materials) {
  const arm = new THREE.Group();
  arm.position.set(side * 0.53, 1.94, -0.01);
  parent.add(arm);

  const shoulder = new THREE.Vector3(0, 0, 0);
  const elbow = new THREE.Vector3(side * 0.09, -0.36, -0.13);
  const wrist = new THREE.Vector3(-side * 0.34, -0.42, -0.51);
  outlinedMesh(new THREE.SphereGeometry(0.255, 13, 9), materials.skin, materials.ink, arm, shoulder.toArray(), null, [1.04, 1.08, 0.96], 1.045);
  capsuleBetween(arm, shoulder.clone().add(new THREE.Vector3(0, -0.06, 0)), elbow, 0.19, materials.skin, materials.ink);
  outlinedMesh(new THREE.SphereGeometry(0.19, 11, 8), materials.skin, materials.ink, arm, elbow.toArray(), null, [1.05, 0.94, 1], 1.04);
  capsuleBetween(arm, elbow, wrist, 0.155, materials.skin, materials.ink);

  // Simple raised muscle/scales keep the arm readable in the game's mid-distance view.
  mesh(new THREE.SphereGeometry(0.105, 10, 7), materials.skinLight, arm, [side * 0.025, -0.16, -0.19], [0.25, 0, side * -0.3], [0.45, 1.18, 0.24]);
  mesh(new THREE.SphereGeometry(0.095, 10, 7), materials.skinDark, arm, [-side * 0.15, -0.39, -0.39], [0.55, 0, side * 0.45], [0.38, 1.25, 0.22]);

  capsuleBetween(arm, wrist.clone().add(new THREE.Vector3(side * 0.03, 0.05, 0.08)), wrist.clone().add(new THREE.Vector3(side * 0.03, -0.04, -0.04)), 0.155, materials.blueDark, materials.ink);
  outlinedMesh(new THREE.SphereGeometry(0.18, 11, 8), materials.blue, materials.ink, arm, wrist.toArray(), null, [1.05, 0.82, 1.05], 1.05);
  mesh(new THREE.BoxGeometry(0.17, 0.12, 0.025), materials.yellow, arm, [-side * 0.31, -0.4, -0.68]);
  for (let finger = 0; finger < 3; finger += 1) {
    capsuleBetween(
      arm,
      new THREE.Vector3(-side * (0.27 + finger * 0.035), -0.43 + finger * 0.018, -0.58),
      new THREE.Vector3(-side * (0.25 + finger * 0.03), -0.43 + finger * 0.018, -0.71),
      0.035,
      materials.skinLight,
    );
  }
  return arm;
}

function makeBlaster(parent, compact = false) {
  const materials = makeMaterials(ORANGE);
  const gun = new THREE.Group();
  const s = compact ? 0.78 : 1;
  gun.scale.setScalar(s);
  parent.add(gun);

  outlinedMesh(new THREE.BoxGeometry(0.36, 0.28, 1.02), materials.blue, materials.ink, gun, [0, 0, -0.3], null, null, 1.055);
  mesh(new THREE.BoxGeometry(0.4, 0.09, 0.7), materials.orange, gun, [0, 0.18, -0.32]);
  mesh(new THREE.BoxGeometry(0.26, 0.055, 0.48), materials.yellow, gun, [0, 0.245, -0.35]);
  mesh(new THREE.BoxGeometry(0.14, 0.055, 0.32), materials.faceInk, gun, [0, 0.275, -0.29]);

  outlinedMesh(new THREE.CylinderGeometry(0.17, 0.19, 0.36, 12), materials.orange, materials.ink, gun, [0, 0, -0.985], [Math.PI / 2, 0, 0], null, 1.06);
  mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.375, 12), materials.faceInk, gun, [0, 0, -1.04], [Math.PI / 2, 0, 0]);
  mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.387, 10), materials.orange, gun, [0, 0, -1.055], [Math.PI / 2, 0, 0]);

  outlinedMesh(new THREE.BoxGeometry(0.21, 0.44, 0.25), materials.blueDark, materials.ink, gun, [0, -0.29, -0.08], [-0.2, 0, 0], null, 1.06);
  const tank = outlinedMesh(new THREE.CylinderGeometry(0.15, 0.15, 0.48, 11), surface(0x7ed7d0, { transparent: true, opacity: 0.9 }), materials.ink, gun, [0, -0.03, 0.19], [Math.PI / 2, 0, 0], null, 1.05);
  tank.material.depthWrite = false;
  mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.065, 11), materials.orange, gun, [0, -0.03, -0.04], [Math.PI / 2, 0, 0]);

  for (let dart = 0; dart < 3; dart += 1) {
    const y = 0.105 - dart * 0.09;
    mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.45, 8), materials.skinLight, gun, [0.205, y, -0.24], [Math.PI / 2, 0, 0]);
    mesh(new THREE.CylinderGeometry(0.048, 0.034, 0.06, 8), materials.orange, gun, [0.205, y, -0.49], [Math.PI / 2, 0, 0]);
  }

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, -1.27);
  gun.add(muzzle);
  return { gun, muzzle };
}

function makeShortsAndLeg(parent, side, materials) {
  const leg = new THREE.Group();
  leg.position.set(side * 0.27, 1.07, 0);
  parent.add(leg);

  outlinedMesh(new THREE.CylinderGeometry(0.3, 0.32, 0.42, 10), materials.shorts, materials.ink, leg, [0, -0.12, 0], null, [1, 1, 0.92], 1.04);
  mesh(new THREE.BoxGeometry(0.55, 0.045, 0.59), materials.orange, leg, [0, -0.32, -0.01]);
  mesh(new THREE.BoxGeometry(0.04, 0.31, 0.03), materials.blueDark, leg, [-side * 0.25, -0.12, -0.29]);

  capsuleBetween(leg, new THREE.Vector3(0, -0.31, 0), new THREE.Vector3(side * 0.015, -0.65, -0.015), 0.18, materials.skin, materials.ink);
  outlinedMesh(new THREE.SphereGeometry(0.18, 11, 8), materials.skin, materials.ink, leg, [side * 0.015, -0.63, -0.04], null, [1, 0.86, 0.94], 1.04);
  capsuleBetween(leg, new THREE.Vector3(side * 0.015, -0.64, -0.01), new THREE.Vector3(0, -0.9, -0.02), 0.145, materials.skin, materials.ink);
  mesh(new THREE.SphereGeometry(0.1, 9, 7), materials.skinLight, leg, [side * -0.04, -0.78, -0.15], [0.2, 0, side * 0.4], [0.42, 1.05, 0.2]);

  // Layered high-top sneakers replace the old cuboids with soft toe and ankle volumes.
  outlinedMesh(new THREE.SphereGeometry(0.25, 14, 9), materials.blue, materials.ink, leg, [0, -0.865, -0.13], null, [0.95, 0.72, 1.38], 1.055);
  outlinedMesh(new THREE.SphereGeometry(0.23, 14, 9), materials.orange, materials.ink, leg, [0, -0.915, -0.36], null, [1.04, 0.54, 1.06], 1.045);
  mesh(new THREE.BoxGeometry(0.46, 0.07, 0.69), materials.white, leg, [0, -1.035, -0.18]);
  mesh(new THREE.BoxGeometry(0.3, 0.15, 0.045), materials.yellow, leg, [0, -0.785, -0.39], [-0.16, 0, 0]);
  for (let lace = 0; lace < 3; lace += 1) {
    mesh(new THREE.CapsuleGeometry(0.018, 0.22, 3, 6), materials.yellow, leg, [0, -0.855 - lace * 0.047, -0.49 + lace * 0.035], [0, 0, Math.PI / 2]);
  }
  return leg;
}

function makeTail(parent, materials) {
  const tail = new THREE.Group();
  parent.add(tail);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.13, 0.2),
    new THREE.Vector3(-0.25, 0.94, 0.49),
    new THREE.Vector3(0.38, 0.69, 0.78),
    new THREE.Vector3(1.05, 0.47, 0.68),
    new THREE.Vector3(1.43, 0.35, 0.2),
    new THREE.Vector3(1.35, 0.48, -0.3),
    new THREE.Vector3(1.08, 0.72, -0.49),
  ]);
  mesh(new THREE.TubeGeometry(tailCurve, 34, 0.225, 11, false), materials.skinDark, tail, [0, 0, 0]);
  mesh(new THREE.TubeGeometry(tailCurve, 34, 0.18, 11, false), materials.skin, tail, [0, 0, 0]);

  for (const position of [0.22, 0.38, 0.55, 0.7, 0.84]) {
    const point = tailCurve.getPointAt(position);
    const tangent = tailCurve.getTangentAt(position).normalize();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.027, 7, 13), position % 0.2 > 0.08 ? materials.belly : materials.skinLight);
    ring.position.copy(point);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    ring.castShadow = true;
    tail.add(ring);
  }
  for (const position of [0.3, 0.48, 0.65]) {
    const point = tailCurve.getPointAt(position);
    mesh(new THREE.SphereGeometry(0.07, 8, 6), materials.skinLight, tail, [point.x, point.y + 0.15, point.z], null, [1.5, 0.42, 0.5]);
  }
  return tail;
}

function healthBar() {
  const group = new THREE.Group();
  const background = mesh(new THREE.PlaneGeometry(1.3, 0.14), new THREE.MeshBasicMaterial({ color: 0x062530, transparent: true, opacity: 0.82, depthWrite: false }), group, [0, 0, 0]);
  background.castShadow = false;
  const fill = mesh(new THREE.PlaneGeometry(1.18, 0.078), new THREE.MeshBasicMaterial({ color: 0xb9ef43, depthWrite: false }), group, [0, 0, 0.006]);
  fill.castShadow = false;
  group.position.y = 3.82;
  group.visible = false;
  return { group, fill };
}

export function createBotCharacter(teamColor) {
  const group = new THREE.Group();
  group.rotation.order = 'YXZ';
  const materials = makeMaterials(teamColor);

  const neck = makeNeck(group, materials);
  const { head, eyes } = makeHoodAndHead(group, materials);
  const torso = makeTorso(group, materials);
  const leftArm = makeArm(group, -1, materials);
  const rightArm = makeArm(group, 1, materials);

  outlinedMesh(new THREE.CapsuleGeometry(0.44, 0.18, 5, 12), materials.shorts, materials.ink, group, [0, 1.11, 0], null, [1.08, 1, 0.8], 1.04);
  mesh(new THREE.BoxGeometry(0.94, 0.07, 0.67), materials.orange, group, [0, 1.24, 0]);
  mesh(new THREE.BoxGeometry(0.3, 0.2, 0.035), materials.blueDark, group, [0, 1.04, -0.35]);
  const leftLeg = makeShortsAndLeg(group, -1, materials);
  const rightLeg = makeShortsAndLeg(group, 1, materials);
  const tail = makeTail(group, materials);

  const { gun, muzzle } = makeBlaster(group, true);
  gun.position.set(0, 1.52, -0.61);
  gun.rotation.x = -0.025;

  const hitboxes = [
    hitbox(group, new THREE.BoxGeometry(1.9, 1.32, 0.9), [0, 2.74, -0.03], 'head'),
    hitbox(group, new THREE.BoxGeometry(1.12, 1.2, 0.78), [0, 1.65, 0], 'torso'),
    hitbox(group, new THREE.BoxGeometry(1.58, 0.64, 0.86), [0, 1.66, -0.2], 'limb'),
    hitbox(group, new THREE.BoxGeometry(1.02, 1.05, 0.78), [0, 0.58, -0.05], 'limb'),
    hitbox(group, new THREE.BoxGeometry(1.42, 0.5, 0.66), [0.58, 0.69, 0.53], 'limb', [0, -0.18, -0.12]),
    hitbox(group, new THREE.BoxGeometry(0.72, 0.42, 0.58), [1.2, 0.49, 0.03], 'limb', [0, -0.52, 0]),
  ];

  const bar = healthBar();
  group.add(bar.group);

  const shield = mesh(
    new THREE.SphereGeometry(1.14, 18, 12),
    new THREE.MeshBasicMaterial({
      color: 0x61efff,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    group,
    [0, 1.72, 0],
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
    animationOffset: ((teamColor & 0xff) / 255) * Math.PI * 2,
    parts: { head, eyes, neck, torso, tail, leftArm, rightArm, leftLeg, rightLeg, gun },
  };
}

export function bindBot(character, bot) {
  for (const box of character.hitboxes) box.userData.bot = bot;
}

export function updateCharacterPose(character, elapsed, speed, healthRatio, camera, shielded = false, healthVisible = true) {
  const pace = Math.min(1, speed / 4.5);
  const offsetTime = elapsed + character.animationOffset;
  const step = Math.sin(elapsed * (5 + pace * 5) + character.animationOffset);
  const breath = Math.sin(offsetTime * 2.1);

  character.parts.leftLeg.rotation.x = step * 0.47 * pace;
  character.parts.rightLeg.rotation.x = -step * 0.47 * pace;
  character.parts.leftLeg.rotation.z = -0.025;
  character.parts.rightLeg.rotation.z = 0.025;
  character.parts.leftArm.rotation.z = -0.025 - step * 0.018 * pace;
  character.parts.rightArm.rotation.z = 0.025 + step * 0.018 * pace;
  character.parts.leftArm.rotation.x = breath * 0.012;
  character.parts.rightArm.rotation.x = breath * 0.012;
  character.parts.torso.scale.y = 1 + breath * 0.008;
  character.parts.head.position.y = 2.59 + breath * 0.018 + Math.abs(step) * 0.018 * pace;
  character.parts.head.rotation.z = Math.sin(offsetTime * 1.2) * 0.012;
  character.parts.head.rotation.y = Math.sin(offsetTime * 0.7) * 0.025;
  character.parts.tail.rotation.y = Math.sin(offsetTime * 1.6) * 0.085 + step * 0.028 * pace;
  character.parts.tail.rotation.z = Math.sin(offsetTime * 1.1) * 0.018;
  character.parts.gun.position.y = 1.52 + breath * 0.008 + Math.abs(step) * 0.018 * pace;

  const blinkWave = Math.sin(offsetTime * 0.83) > 0.965 ? 0.14 : 1;
  for (const eye of character.parts.eyes) eye.scale.y = blinkWave;

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
  const playerMaterials = makeMaterials(ORANGE);
  const leftHand = outlinedMesh(new THREE.SphereGeometry(0.12, 10, 7), playerMaterials.skin, playerMaterials.ink, anchor, [-0.2, -0.1, -0.25], null, null, 1.05);
  const rightHand = outlinedMesh(new THREE.SphereGeometry(0.13, 10, 7), playerMaterials.skin, playerMaterials.ink, anchor, [0.18, -0.14, -0.05], null, null, 1.05);
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
