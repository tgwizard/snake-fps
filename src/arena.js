import * as THREE from '../vendor/three.module.js';
import { CONFIG } from './config.js';
import { circleIntersectsBox } from './math.js';

const MAT = {
  wall: 0x123c4d,
  wallTop: 0x1e6070,
  teal: 0x27c8b5,
  orange: 0xff6b2d,
  lime: 0xa6df3a,
  blue: 0x267cc8,
  cream: 0xffe7b0,
};

function canvasTexture(label, color, accent = '#b9ef43') {
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
  ctx.font = '900 62px Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,.35)';
  ctx.shadowOffsetY = 6;
  ctx.fillText(label, 256, 92);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSky() {
  const geometry = new THREE.SphereGeometry(85, 24, 14);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x37bcd0) },
      bottomColor: { value: new THREE.Color(0xf7e5a0) },
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

export function createArena(scene) {
  const root = new THREE.Group();
  root.name = 'Sunset Sports Court';
  scene.add(root);
  scene.add(createSky());

  const colliders = [];
  const shotBlockers = [];
  const animated = [];

  scene.fog = new THREE.Fog(0x7fced0, 27, 68);
  const hemi = new THREE.HemisphereLight(0xdafcff, 0x715b35, 2.6);
  root.add(hemi);
  const sun = new THREE.DirectionalLight(0xffefc4, 3.1);
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
    new THREE.MeshStandardMaterial({ color: 0x51a8a2, roughness: 0.88, metalness: 0.03 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.surface = 'floor';
  root.add(floor);
  shotBlockers.push(floor);

  const court = new THREE.Mesh(
    new THREE.CircleGeometry(18.5, 64),
    new THREE.MeshStandardMaterial({ color: 0xe4c87a, roughness: 0.93 }),
  );
  court.rotation.x = -Math.PI / 2;
  court.position.y = 0.012;
  court.receiveShadow = true;
  root.add(court);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(17.5, 18.2, 64),
    new THREE.MeshBasicMaterial({ color: MAT.orange, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.023;
  root.add(ring);

  const linesMaterial = new THREE.MeshBasicMaterial({ color: 0xfff1c2 });
  for (let i = -2; i <= 2; i += 1) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 35), linesMaterial);
    line.rotation.x = -Math.PI / 2;
    line.position.set(i * 6.4, 0.026, 0);
    root.add(line);
  }

  function addBox(x, z, width, depth, height, color, options = {}) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({ color, roughness: 0.73, metalness: options.metalness ?? 0.02 }),
    );
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    shotBlockers.push(mesh);
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
      stripe.position.set(x, Math.min(height - 0.2, height * 0.68), z);
      root.add(stripe);
    }
    return mesh;
  }

  const h = CONFIG.arenaHalfSize;
  addBox(0, -h - 0.45, h * 2 + 1.8, 0.9, 4.2, MAT.wall, { stripe: MAT.lime });
  addBox(0, h + 0.45, h * 2 + 1.8, 0.9, 4.2, MAT.wall, { stripe: MAT.lime });
  addBox(-h - 0.45, 0, 0.9, h * 2, 4.2, MAT.wall, { stripe: MAT.orange });
  addBox(h + 0.45, 0, 0.9, h * 2, 4.2, MAT.wall, { stripe: MAT.orange });

  // Low, colorful cover arranged to make circular routes through the court.
  addBox(-9.5, -10.5, 5.2, 1.35, 1.5, MAT.blue, { stripe: MAT.cream });
  addBox(10.5, -8.5, 1.35, 5.2, 1.5, MAT.teal, { stripe: MAT.cream });
  addBox(9.5, 10.5, 5.2, 1.35, 1.5, MAT.orange, { stripe: MAT.cream });
  addBox(-10.5, 8.5, 1.35, 5.2, 1.5, MAT.lime, { stripe: MAT.cream });
  addBox(-3.8, -3.2, 2.4, 4.8, 2.35, MAT.wallTop, { stripe: MAT.orange });
  addBox(3.8, 3.2, 2.4, 4.8, 2.35, MAT.wallTop, { stripe: MAT.teal });
  addBox(5.1, -3.9, 3.4, 1.25, 1.1, MAT.orange, { stripe: MAT.cream });
  addBox(-5.1, 3.9, 3.4, 1.25, 1.1, MAT.teal, { stripe: MAT.cream });

  for (const [x, z, color] of [[-17, -15, MAT.orange], [17, -15, MAT.teal], [-17, 15, MAT.lime], [17, 15, MAT.blue]]) {
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
      new THREE.MeshStandardMaterial({ color: MAT.cream, emissive: color, emissiveIntensity: 0.15 }),
    );
    crown.position.set(x, 4.75, z);
    crown.rotation.x = Math.PI / 2;
    root.add(crown);
    animated.push(crown);
  }

  const bannerMaterial = new THREE.MeshBasicMaterial({ map: canvasTexture('COBRA CLASH', '#0b5667'), side: THREE.DoubleSide });
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

  return { root, colliders, shotBlockers, spawnPoints, collides, update };
}
