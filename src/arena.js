import * as THREE from '../vendor/three.module.js';
import { CONFIG } from './config.js';
import { circleIntersectsBox } from './math.js';

export const ARENA_OPTIONS = Object.freeze([
  Object.freeze({ id: 'sunset', name: 'Sunset Court', detail: 'Balanced routes' }),
  Object.freeze({ id: 'ice', name: 'Ice Pop Plaza', detail: 'Long sight lines' }),
  Object.freeze({ id: 'jungle', name: 'Jungle Gym', detail: 'Tight flanks' }),
]);

const THEMES = Object.freeze({
  sunset: Object.freeze({
    id: 'sunset', name: 'Sunset Sports Court', banner: 'SUNSET COURT',
    skyTop: 0x37bcd0, skyBottom: 0xf7e5a0, fog: 0x7fced0,
    hemiSky: 0xdafcff, hemiGround: 0x715b35, sun: 0xffefc4,
    floor: 0x51a8a2, court: 0xe4c87a, line: 0xfff1c2,
    wall: 0x123c4d, wallTop: 0x1e6070,
    a: 0xff6b2d, b: 0x27c8b5, c: 0xa6df3a, d: 0x267cc8, cream: 0xffe7b0,
    bannerColor: '#0b5667', bannerAccent: '#b9ef43',
  }),
  ice: Object.freeze({
    id: 'ice', name: 'Ice Pop Plaza', banner: 'ICE POP PLAZA',
    skyTop: 0x3785ce, skyBottom: 0xdffbff, fog: 0xb8e5ef,
    hemiSky: 0xecffff, hemiGround: 0x47729a, sun: 0xffffff,
    floor: 0x65bfd0, court: 0xe9f6ed, line: 0x7fdce6,
    wall: 0x294d78, wallTop: 0x536fa4,
    a: 0xf177b4, b: 0x59d9e8, c: 0x7694ef, d: 0xf3fbff, cream: 0xdfffff,
    bannerColor: '#2359a0', bannerAccent: '#80edf1',
  }),
  jungle: Object.freeze({
    id: 'jungle', name: 'Jungle Gym', banner: 'JUNGLE GYM',
    skyTop: 0x3cb8a1, skyBottom: 0xf5e596, fog: 0x92cfa1,
    hemiSky: 0xe2ffe3, hemiGround: 0x4c663c, sun: 0xffe8a6,
    floor: 0x5ca855, court: 0xd8c66b, line: 0xffe6a1,
    wall: 0x285d3c, wallTop: 0x397d4c,
    a: 0xf3872a, b: 0x1aa18a, c: 0x8fd043, d: 0xffca3c, cream: 0xffe3a1,
    bannerColor: '#255d3a', bannerAccent: '#ff9a2f',
  }),
});

const LAYOUTS = Object.freeze({
  sunset: Object.freeze([
    [-9.5, -10.5, 5.2, 1.35, 1.5, 'd', 'cream'],
    [10.5, -8.5, 1.35, 5.2, 1.5, 'b', 'cream'],
    [9.5, 10.5, 5.2, 1.35, 1.5, 'a', 'cream'],
    [-10.5, 8.5, 1.35, 5.2, 1.5, 'c', 'cream'],
    [-3.8, -3.2, 2.4, 4.8, 2.35, 'wallTop', 'a'],
    [3.8, 3.2, 2.4, 4.8, 2.35, 'wallTop', 'b'],
    [5.1, -3.9, 3.4, 1.25, 1.1, 'a', 'cream'],
    [-5.1, 3.9, 3.4, 1.25, 1.1, 'b', 'cream'],
    [-15, 0, 0.6, 6, 3.6, 'wall', 'c'],
    [-13, -2.7, 4.5, 0.6, 3.6, 'wallTop', 'a'],
    [-13, 2.7, 4.5, 0.6, 3.6, 'wallTop', 'a'],
    [-13, 0, 4.6, 6, 0.3, 'c', 'cream', { y: 3.65, collide: false }],
    [15, 0, 0.6, 6, 3.6, 'wall', 'c'],
    [13, -2.7, 4.5, 0.6, 3.6, 'wallTop', 'b'],
    [13, 2.7, 4.5, 0.6, 3.6, 'wallTop', 'b'],
    [13, 0, 4.6, 6, 0.3, 'c', 'cream', { y: 3.65, collide: false }],
  ]),
  ice: Object.freeze([
    [-8, -6, 1.35, 8.2, 2.1, 'wallTop', 'b'],
    [8, 6, 1.35, 8.2, 2.1, 'wallTop', 'a'],
    [-8, 9, 6.2, 1.35, 1.35, 'd', 'c'],
    [8, -9, 6.2, 1.35, 1.35, 'd', 'a'],
    [0, 0, 4.4, 4.4, 1.2, 'c', 'cream'],
    [-13.5, 1.5, 3.1, 1.25, 1.05, 'a', 'cream'],
    [13.5, -1.5, 3.1, 1.25, 1.05, 'b', 'cream'],
    [0, 15, 5.4, 0.6, 3.7, 'wallTop', 'b'],
    [-2.45, 12.8, 0.6, 4.7, 3.7, 'wallTop', 'a'],
    [2.45, 12.8, 0.6, 4.7, 3.7, 'wallTop', 'a'],
    [0, 12.8, 5.5, 4.8, 0.32, 'd', 'c', { y: 3.75, collide: false }],
    [0, -15, 5.4, 0.6, 3.7, 'wallTop', 'b'],
    [-2.45, -12.8, 0.6, 4.7, 3.7, 'wallTop', 'a'],
    [2.45, -12.8, 0.6, 4.7, 3.7, 'wallTop', 'a'],
    [0, -12.8, 5.5, 4.8, 0.32, 'd', 'c', { y: 3.75, collide: false }],
  ]),
  jungle: Object.freeze([
    [-9, -8, 7.2, 1.35, 1.6, 'a', 'cream'],
    [9, 8, 7.2, 1.35, 1.6, 'b', 'cream'],
    [-7.5, 7.2, 1.35, 7.2, 2.2, 'wallTop', 'd'],
    [7.5, -7.2, 1.35, 7.2, 2.2, 'wallTop', 'c'],
    [0, -4.3, 5.4, 1.25, 1.15, 'd', 'a'],
    [0, 4.3, 5.4, 1.25, 1.15, 'c', 'b'],
    [-14, 0, 1.2, 4.2, 1.4, 'b', 'cream'],
    [14, 0, 1.2, 4.2, 1.4, 'a', 'cream'],
    [0, -2.1, 9.2, 0.65, 3.55, 'wallTop', 'd'],
    [0, 2.1, 9.2, 0.65, 3.55, 'wallTop', 'c'],
    [0, 0, 9.4, 4.85, 0.34, 'wall', 'a', { y: 3.63, collide: false }],
  ]),
});

export function getArenaPreviewData(arenaId) {
  const theme = THEMES[arenaId] ?? THEMES.sunset;
  return {
    id: theme.id,
    skyTop: theme.skyTop,
    skyBottom: theme.skyBottom,
    floor: theme.floor,
    court: theme.court,
    ring: theme.a,
    wall: theme.wall,
    obstacles: LAYOUTS[theme.id].map(([x, z, width, depth, height, color, stripe, options = {}]) => ({
      x, z, width, depth, height, y: options.y ?? height / 2,
      color: theme[color], stripe: theme[stripe], collide: options.collide !== false,
    })),
  };
}

function canvasTexture(label, color, accent) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(0, 145);
  ctx.lineTo(512, 70);
  ctx.lineTo(512, 192);
  ctx.lineTo(0, 192);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.25)';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 492, 172);
  ctx.fillStyle = '#fff8db';
  ctx.font = `900 ${label.length > 11 ? 46 : 58}px Arial Black, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,.35)';
  ctx.shadowOffsetY = 6;
  ctx.fillText(label, 256, 92);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSky(theme) {
  const geometry = new THREE.SphereGeometry(85, 24, 14);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(theme.skyTop) },
      bottomColor: { value: new THREE.Color(theme.skyBottom) },
      offset: { value: 8 },
      exponent: { value: 0.65 },
    },
    vertexShader: `varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor;
      uniform float offset; uniform float exponent; varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }`,
  });
  return new THREE.Mesh(geometry, material);
}

export function createArena(scene, arenaId = 'sunset') {
  const theme = THEMES[arenaId] ?? THEMES.sunset;
  const root = new THREE.Group();
  root.name = theme.name;
  scene.add(root);
  root.add(createSky(theme));

  const colliders = [];
  const shotBlockers = [];
  const animated = [];

  scene.fog = new THREE.Fog(theme.fog, 27, 68);
  root.add(new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, 2.6));
  const sun = new THREE.DirectionalLight(theme.sun, 3.1);
  sun.position.set(-13, 23, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -28;
  sun.shadow.camera.right = 28;
  sun.shadow.camera.top = 28;
  sun.shadow.camera.bottom = -28;
  sun.shadow.bias = -0.00045;
  root.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.arenaHalfSize * 2, CONFIG.arenaHalfSize * 2),
    new THREE.MeshStandardMaterial({ color: theme.floor, roughness: 0.88, metalness: 0.03 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.surface = 'floor';
  root.add(floor);
  shotBlockers.push(floor);

  const court = new THREE.Mesh(
    new THREE.CircleGeometry(18.5, 64),
    new THREE.MeshStandardMaterial({ color: theme.court, roughness: 0.93 }),
  );
  court.rotation.x = -Math.PI / 2;
  court.position.y = 0.012;
  court.receiveShadow = true;
  root.add(court);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(17.5, 18.2, 64),
    new THREE.MeshBasicMaterial({ color: theme.a, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.023;
  root.add(ring);

  const linesMaterial = new THREE.MeshBasicMaterial({ color: theme.line });
  for (let i = -2; i <= 2; i += 1) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 35), linesMaterial);
    line.rotation.x = -Math.PI / 2;
    line.position.set(i * 6.4, 0.026, 0);
    root.add(line);
  }

  function addBox(x, z, width, depth, height, color, options = {}) {
    const object = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({ color, roughness: 0.73, metalness: options.metalness ?? 0.02 }),
    );
    object.position.set(x, options.y ?? height / 2, z);
    object.castShadow = true;
    object.receiveShadow = true;
    root.add(object);
    shotBlockers.push(object);
    if (options.collide !== false) {
      colliders.push({
        minX: x - width / 2,
        maxX: x + width / 2,
        minZ: z - depth / 2,
        maxZ: z + depth / 2,
        height,
      });
    }
    if (options.stripe) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.025, Math.min(0.18, height / 4), depth + 0.025),
        new THREE.MeshBasicMaterial({ color: options.stripe }),
      );
      const bottomY = object.position.y - height / 2;
      stripe.position.set(x, bottomY + Math.min(height - 0.2, height * 0.68), z);
      root.add(stripe);
    }
    return object;
  }

  const h = CONFIG.arenaHalfSize;
  addBox(0, -h - 0.45, h * 2 + 1.8, 0.9, 4.2, theme.wall, { stripe: theme.c });
  addBox(0, h + 0.45, h * 2 + 1.8, 0.9, 4.2, theme.wall, { stripe: theme.c });
  addBox(-h - 0.45, 0, 0.9, h * 2, 4.2, theme.wall, { stripe: theme.a });
  addBox(h + 0.45, 0, 0.9, h * 2, 4.2, theme.wall, { stripe: theme.a });

  for (const [x, z, width, depth, height, color, stripe, options = {}] of LAYOUTS[theme.id]) {
    addBox(x, z, width, depth, height, theme[color], { ...options, stripe: theme[stripe] });
  }

  for (const [x, z, color] of [[-17, -15, theme.a], [17, -15, theme.b], [-17, 15, theme.c], [17, 15, theme.d]]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.78, 4.8, 10),
      new THREE.MeshStandardMaterial({ color, roughness: 0.65 }),
    );
    post.position.set(x, 2.4, z);
    post.castShadow = true;
    root.add(post);
    shotBlockers.push(post);
    colliders.push({ minX: x - 0.72, maxX: x + 0.72, minZ: z - 0.72, maxZ: z + 0.72, height: 4.8 });
    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.15, 8, 18),
      new THREE.MeshStandardMaterial({ color: theme.cream, emissive: color, emissiveIntensity: 0.15 }),
    );
    crown.position.set(x, 4.75, z);
    crown.rotation.x = Math.PI / 2;
    root.add(crown);
    animated.push(crown);
  }

  const bannerMaterial = new THREE.MeshBasicMaterial({
    map: canvasTexture(theme.banner, theme.bannerColor, theme.bannerAccent),
    side: THREE.DoubleSide,
  });
  for (const [x, y, z, ry] of [[0, 2.7, -22.93, 0], [0, 2.7, 22.93, Math.PI], [-22.93, 2.7, 0, Math.PI / 2], [22.93, 2.7, 0, -Math.PI / 2]]) {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.7), bannerMaterial);
    banner.position.set(x, y, z);
    banner.rotation.y = ry;
    root.add(banner);
  }

  const spawnPoints = [
    new THREE.Vector3(0, 0, 17.2),
    new THREE.Vector3(0, 0, -17.2),
    new THREE.Vector3(17.2, 0, 0),
    new THREE.Vector3(-17.2, 0, 0),
    new THREE.Vector3(13.5, 0, 13.5),
    new THREE.Vector3(-13.5, 0, -13.5),
    new THREE.Vector3(13.5, 0, -13.5),
    new THREE.Vector3(-13.5, 0, 13.5),
  ];

  function collides(x, z, radius) {
    if (Math.abs(x) + radius > h || Math.abs(z) + radius > h) return true;
    return colliders.some((box) => circleIntersectsBox(x, z, radius, box));
  }

  function update(dt, elapsed) {
    animated.forEach((object, index) => {
      object.rotation.z += dt * (index % 2 ? 0.8 : -0.8);
      object.position.y = 4.75 + Math.sin(elapsed * 1.4 + index) * 0.08;
    });
  }

  function dispose() {
    scene.remove(root);
    root.traverse((object) => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        material?.map?.dispose();
        material?.dispose?.();
      }
    });
  }

  return { id: theme.id, name: theme.name, root, colliders, shotBlockers, spawnPoints, collides, update, dispose };
}
