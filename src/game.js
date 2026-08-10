import * as THREE from '../vendor/three.module.js';
import { CONFIG } from './config.js';
import { clamp, damp, damageForZone, formatTime } from './math.js';
import { createArena } from './arena.js';
import {
  bindBot,
  createBotCharacter,
  createPlayerBlaster,
  updateCharacterPose,
  updatePlayerBlaster,
} from './character.js';

const UP = new THREE.Vector3(0, 1, 0);
const tempA = new THREE.Vector3();
const tempB = new THREE.Vector3();
const tempC = new THREE.Vector3();

export class CobraClashGame {
  constructor(canvas, input, audio, ui) {
    this.canvas = canvas;
    this.input = input;
    this.audio = audio;
    this.ui = ui;
    this.state = 'menu';
    this.elapsed = 0;
    this.matchTime = CONFIG.matchSeconds;
    this.difficulty = 2;
    this.bots = [];
    this.effects = [];
    this.feedTimers = [];
    this.nextBotId = 1;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.06, 120);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.arena = createArena(this.scene);
    this.blaster = createPlayerBlaster(this.camera);
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 55;

    this.player = {
      name: 'You',
      color: 0xb8f43d,
      position: new THREE.Vector3(0, 0, 16),
      velocityY: 0,
      grounded: true,
      yaw: Math.PI,
      pitch: 0,
      health: CONFIG.maxHealth,
      ammo: CONFIG.maxAmmo,
      score: 0,
      deaths: 0,
      alive: true,
      respawnTimer: 0,
      lastDamageAt: -99,
      shieldUntil: 0,
      fireCooldown: 0,
      reloadTimer: 0,
      crouchAmount: 0,
      movementAmount: 0,
    };

    this.onStateChange = () => {};
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.placeMenuCamera();
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  placeMenuCamera() {
    this.camera.position.set(14, 8.6, 15);
    this.camera.lookAt(0, 1.7, 0);
    this.camera.rotation.order = 'YXZ';
    this.blaster.anchor.visible = false;
  }

  startMatch(botCount, difficulty, arenaId = 'sunset') {
    this.clearBots();
    this.clearEffects();
    if (this.arena.id !== arenaId) {
      this.arena.dispose();
      this.arena = createArena(this.scene, arenaId);
    }
    this.difficulty = clamp(difficulty, 1, 5);
    this.matchTime = CONFIG.matchSeconds;
    this.elapsed = 0;
    this.player.score = 0;
    this.player.deaths = 0;
    this.player.alive = true;
    this.player.health = CONFIG.maxHealth;
    this.player.ammo = CONFIG.maxAmmo;
    this.player.reloadTimer = 0;
    this.player.fireCooldown = 0;

    for (let index = 0; index < botCount; index += 1) this.addBot(index);
    this.respawnPlayer(true);
    for (let index = 0; index < this.bots.length; index += 1) this.respawnBot(this.bots[index], index + 1);

    this.state = 'playing';
    this.blaster.anchor.visible = true;
    this.buildScoreboard();
    this.updateHud();
    this.announce('READY!');
    this.onStateChange('playing');
  }

  addBot(index) {
    const bot = {
      id: this.nextBotId++,
      name: CONFIG.botNames[index],
      color: CONFIG.botColors[index],
      character: createBotCharacter(CONFIG.botColors[index]),
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      health: CONFIG.maxHealth,
      alive: true,
      respawnTimer: 0,
      score: 0,
      deaths: 0,
      lastDamageAt: -99,
      shieldUntil: 0,
      nextShot: 0.5 + Math.random(),
      strafe: index % 2 ? 1 : -1,
      rethinkAt: 0,
      stuckTime: 0,
      target: null,
    };
    bindBot(bot.character, bot);
    this.scene.add(bot.character.group);
    this.bots.push(bot);
  }

  clearBots() {
    for (const bot of this.bots) this.scene.remove(bot.character.group);
    this.bots.length = 0;
  }

  startReload() {
    const player = this.player;
    if (!player.alive || player.reloadTimer > 0 || player.ammo === CONFIG.maxAmmo) return;
    player.reloadTimer = CONFIG.reloadSeconds;
    this.audio.reload();
  }

  update(dt) {
    const safeDt = Math.min(dt, 1 / 20);
    this.elapsed += safeDt;
    this.arena.update(safeDt, this.elapsed);

    if (this.state === 'menu') {
      const radius = 20;
      this.camera.position.set(Math.cos(this.elapsed * 0.09) * radius, 8.3, Math.sin(this.elapsed * 0.09) * radius);
      this.camera.lookAt(0, 1.7, 0);
    } else if (this.state === 'playing') {
      this.matchTime = Math.max(0, this.matchTime - safeDt);
      this.updatePlayer(safeDt);
      this.updateBots(safeDt);
      if (this.matchTime <= 0) this.endMatch();
    } else if (this.state === 'results') {
      this.updateBots(safeDt, true);
    }

    this.updateEffects(safeDt);
    this.updateHud();
    this.renderer.render(this.scene, this.camera);
  }

  updatePlayer(dt) {
    const player = this.player;
    player.fireCooldown = Math.max(0, player.fireCooldown - dt);

    if (!player.alive) {
      player.respawnTimer -= dt;
      this.ui.respawnCount.textContent = Math.max(1, Math.ceil(player.respawnTimer));
      if (player.respawnTimer <= 0) this.respawnPlayer();
      return;
    }

    const look = this.input.consumeLook();
    player.yaw -= look.x * 0.00175;
    player.pitch = clamp(player.pitch - look.y * 0.00155, -1.36, 1.36);
    this.camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');

    const crouching = this.input.down('KeyC', 'ControlLeft', 'ControlRight');
    player.crouchAmount = damp(player.crouchAmount, crouching ? 1 : 0, 14, dt);
    const sprinting = this.input.down('ShiftLeft', 'ShiftRight') && !crouching;
    const inputX = Number(this.input.down('KeyD')) - Number(this.input.down('KeyA'));
    const inputZ = Number(this.input.down('KeyW')) - Number(this.input.down('KeyS'));
    const inputLength = Math.hypot(inputX, inputZ);
    const speed = crouching ? CONFIG.crouchSpeed : sprinting ? CONFIG.sprintSpeed : CONFIG.walkSpeed;
    const moveScale = inputLength > 0 ? speed / inputLength : 0;

    const sin = Math.sin(player.yaw);
    const cos = Math.cos(player.yaw);
    const dx = (inputX * cos - inputZ * sin) * moveScale * dt;
    const dz = (-inputX * sin - inputZ * cos) * moveScale * dt;
    this.moveWithCollisions(player.position, dx, dz, CONFIG.playerRadius);
    player.movementAmount = damp(player.movementAmount, inputLength > 0 ? (sprinting ? 1 : 0.65) : 0, 10, dt);

    if (this.input.consume('Space') && player.grounded && !crouching) {
      player.velocityY = CONFIG.jumpSpeed;
      player.grounded = false;
    }
    player.velocityY -= CONFIG.gravity * dt;
    player.position.y += player.velocityY * dt;
    if (player.position.y <= 0) {
      player.position.y = 0;
      player.velocityY = 0;
      player.grounded = true;
    }

    const eye = CONFIG.eyeHeight + (CONFIG.crouchEyeHeight - CONFIG.eyeHeight) * player.crouchAmount;
    this.camera.position.set(player.position.x, player.position.y + eye, player.position.z);

    if (this.input.consume('KeyR')) this.startReload();
    if (player.reloadTimer > 0) {
      player.reloadTimer -= dt;
      if (player.reloadTimer <= 0) {
        player.reloadTimer = 0;
        player.ammo = CONFIG.maxAmmo;
      }
    } else if ((this.input.consumeFire() || this.input.fireHeld) && player.fireCooldown <= 0) {
      this.firePlayerShot();
    }

    if (player.ammo === 0 && player.reloadTimer <= 0) this.startReload();
    if (this.elapsed - player.lastDamageAt > CONFIG.regenDelay && player.health < CONFIG.maxHealth) {
      player.health = Math.min(CONFIG.maxHealth, player.health + CONFIG.regenPerSecond * dt);
    }

    updatePlayerBlaster(this.blaster, dt, this.elapsed, player.movementAmount, crouching);
  }

  moveWithCollisions(position, dx, dz, radius) {
    if (!this.arena.collides(position.x + dx, position.z, radius)) position.x += dx;
    if (!this.arena.collides(position.x, position.z + dz, radius)) position.z += dz;
  }

  firePlayerShot() {
    const player = this.player;
    if (player.ammo <= 0 || player.reloadTimer > 0) return;
    player.ammo -= 1;
    player.fireCooldown = 0.16;
    this.blaster.recoil = 1;
    this.audio.shoot();

    const origin = this.camera.getWorldPosition(tempA).clone();
    const direction = this.camera.getWorldDirection(tempB).normalize();
    this.raycaster.set(origin, direction);
    this.raycaster.near = 0.12;
    this.raycaster.far = 55;
    const hitboxes = this.bots.filter((bot) => bot.alive).flatMap((bot) => bot.character.hitboxes);
    const hits = this.raycaster.intersectObjects([...hitboxes, ...this.arena.shotBlockers], false);
    const hit = hits[0];
    const end = hit ? hit.point.clone() : origin.clone().addScaledVector(direction, 50);
    const muzzle = this.blaster.muzzle.getWorldPosition(tempC).clone();
    this.spawnTracer(muzzle, end, 0xffbb35);

    if (hit?.object.userData.bot) {
      const bot = hit.object.userData.bot;
      const zone = hit.object.userData.hitZone;
      const damage = damageForZone(zone, CONFIG.zoneDamage);
      this.damageBot(bot, damage, this.player, zone);
      this.showHitMarker(zone);
      this.audio.hit(zone === 'head');
      this.spawnImpact(hit.point, zone === 'head' ? 0xffd33a : 0xcaff55);
    } else if (hit) {
      this.spawnImpact(hit.point, 0x8de5ee, 4);
    }
  }

  updateBots(dt, passive = false) {
    for (const bot of this.bots) {
      if (!bot.alive) {
        bot.respawnTimer -= dt;
        if (bot.respawnTimer <= 0 && this.state === 'playing') this.respawnBot(bot);
        continue;
      }

      if (this.elapsed - bot.lastDamageAt > CONFIG.regenDelay && bot.health < CONFIG.maxHealth) {
        bot.health = Math.min(CONFIG.maxHealth, bot.health + CONFIG.regenPerSecond * dt * 0.7);
      }

      let speed = 0;
      if (!passive) {
        if (this.elapsed >= bot.rethinkAt || !bot.target || !bot.target.alive) {
          bot.target = this.findBotTarget(bot);
          bot.rethinkAt = this.elapsed + 0.28 + Math.random() * (0.7 - this.difficulty * 0.08);
          if (Math.random() < 0.24) bot.strafe *= -1;
        }

        if (bot.target) {
          const targetPos = this.actorPosition(bot.target, tempA);
          const dx = targetPos.x - bot.position.x;
          const dz = targetPos.z - bot.position.z;
          const distance = Math.max(0.01, Math.hypot(dx, dz));
          const nx = dx / distance;
          const nz = dz / distance;
          let toward = distance > 8 ? 1 : distance < 4.8 ? -0.65 : 0.12;
          if (!this.hasLineOfSight(bot.position, targetPos, distance)) toward = 1;
          const strafeAmount = distance < 15 ? bot.strafe * 0.78 : bot.strafe * 0.25;
          const moveX = nx * toward + nz * strafeAmount;
          const moveZ = nz * toward - nx * strafeAmount;
          const botSpeed = 2.7 + this.difficulty * 0.42;
          const moveLength = Math.max(1, Math.hypot(moveX, moveZ));
          const oldX = bot.position.x;
          const oldZ = bot.position.z;
          this.moveWithCollisions(bot.position, moveX / moveLength * botSpeed * dt, moveZ / moveLength * botSpeed * dt, 0.48);
          speed = Math.hypot(bot.position.x - oldX, bot.position.z - oldZ) / Math.max(dt, 0.001);
          if (speed < 0.1) {
            bot.stuckTime += dt;
            if (bot.stuckTime > 0.3) {
              bot.strafe *= -1;
              bot.rethinkAt = 0;
              bot.stuckTime = 0;
            }
          } else {
            bot.stuckTime = 0;
          }

          const desiredYaw = Math.atan2(-dx, -dz);
          let deltaYaw = desiredYaw - bot.character.group.rotation.y;
          deltaYaw = Math.atan2(Math.sin(deltaYaw), Math.cos(deltaYaw));
          bot.character.group.rotation.y += deltaYaw * Math.min(1, dt * 8);

          bot.nextShot -= dt;
          if (bot.nextShot <= 0 && distance < 27 && this.hasLineOfSight(bot.position, targetPos, distance)) {
            this.fireBotShot(bot, bot.target, distance);
            bot.nextShot = Math.max(0.38, 1.46 - this.difficulty * 0.15) + Math.random() * 0.55;
          }
        }
      }

      bot.character.group.position.set(bot.position.x, 0, bot.position.z);
      updateCharacterPose(
        bot.character,
        this.elapsed + bot.id,
        speed,
        bot.health / CONFIG.maxHealth,
        this.camera,
        bot.shieldUntil > this.elapsed,
      );
    }
  }

  actorPosition(actor, target = new THREE.Vector3()) {
    if (actor === this.player) return target.set(actor.position.x, actor.position.y + 1.25, actor.position.z);
    return target.set(actor.position.x, 1.4, actor.position.z);
  }

  findBotTarget(bot) {
    const candidates = [];
    if (this.player.alive) candidates.push(this.player);
    for (const other of this.bots) if (other !== bot && other.alive) candidates.push(other);
    let closest = null;
    let closestDistance = Infinity;
    for (const actor of candidates) {
      const pos = this.actorPosition(actor, tempA);
      const distance = bot.position.distanceToSquared(pos);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = actor;
      }
    }
    return closest;
  }

  hasLineOfSight(from, to, distance) {
    const origin = tempB.set(from.x, 1.75, from.z);
    const direction = tempC.copy(to).sub(origin).normalize();
    this.raycaster.set(origin, direction);
    this.raycaster.near = 0.1;
    this.raycaster.far = distance;
    const hits = this.raycaster.intersectObjects(this.arena.shotBlockers, false);
    return hits.length === 0 || hits[0].distance >= distance - 0.55;
  }

  fireBotShot(bot, target, distance) {
    const targetPos = this.actorPosition(target, tempA).clone();
    const origin = bot.character.muzzle.getWorldPosition(tempB).clone();
    const accuracy = 0.42 + this.difficulty * 0.105;
    const hits = Math.random() < accuracy * clamp(1.18 - distance / 60, 0.58, 1);
    const spread = hits ? 0.18 : 1.25 + distance * 0.035;
    targetPos.x += (Math.random() - 0.5) * spread;
    targetPos.y += (Math.random() - 0.5) * spread * 0.45;
    targetPos.z += (Math.random() - 0.5) * spread;
    this.spawnTracer(origin, targetPos, bot.color);
    this.audio.botShoot(distance);
    if (!hits) return;

    const damage = 10 + this.difficulty * 1.5 + Math.random() * 4;
    if (target === this.player) {
      this.damagePlayer(damage, bot);
    } else {
      this.damageBot(target, damage, bot, 'torso');
    }
  }

  damagePlayer(amount, attacker) {
    const player = this.player;
    if (!player.alive || this.state !== 'playing' || player.shieldUntil > this.elapsed) return;
    player.health = Math.max(0, player.health - amount);
    player.lastDamageAt = this.elapsed;
    this.audio.hurt();
    this.ui.damageFlash.classList.add('active');
    clearTimeout(this.damageFlashTimer);
    this.damageFlashTimer = setTimeout(() => this.ui.damageFlash.classList.remove('active'), 150);
    if (player.health <= 0) this.tagActor(player, attacker);
  }

  damageBot(bot, amount, attacker, zone) {
    if (!bot.alive || this.state !== 'playing' || bot.shieldUntil > this.elapsed) return;
    bot.health = Math.max(0, bot.health - amount);
    bot.lastDamageAt = this.elapsed;
    if (bot.health <= 0) this.tagActor(bot, attacker, zone);
  }

  tagActor(victim, attacker, zone = 'torso') {
    victim.alive = false;
    victim.deaths += 1;
    victim.respawnTimer = CONFIG.respawnSeconds;
    if (attacker && attacker !== victim) attacker.score += 1;

    const attackerName = attacker?.name ?? 'Arena';
    this.addFeed(`${attackerName} tagged ${victim.name}${zone === 'head' ? ' — bullseye!' : ''}`);
    if (attacker === this.player) {
      this.audio.tagged();
      this.announce(zone === 'head' ? 'BULLSEYE!' : 'TAGGED!');
    }

    if (victim === this.player) {
      this.blaster.anchor.visible = false;
      this.ui.respawn.classList.add('is-visible');
    } else {
      victim.character.group.visible = false;
      this.spawnBurst(victim.position, victim.color);
    }
    this.buildScoreboard();
  }

  respawnPlayer(initial = false) {
    const spawn = this.pickSpawn(initial ? 0 : null);
    const player = this.player;
    player.position.copy(spawn);
    player.position.y = 0;
    player.velocityY = 0;
    player.grounded = true;
    player.health = CONFIG.maxHealth;
    player.ammo = CONFIG.maxAmmo;
    player.reloadTimer = 0;
    player.alive = true;
    player.lastDamageAt = this.elapsed;
    player.shieldUntil = this.elapsed + CONFIG.spawnShieldSeconds;
    player.yaw = Math.atan2(player.position.x, player.position.z);
    player.pitch = 0;
    this.camera.position.set(player.position.x, CONFIG.eyeHeight, player.position.z);
    this.camera.rotation.set(0, player.yaw, 0, 'YXZ');
    this.blaster.anchor.visible = true;
    this.ui.respawn.classList.remove('is-visible');
    if (!initial) this.announce('BACK IN!');
  }

  respawnBot(bot, preferredIndex = null) {
    const spawn = this.pickSpawn(preferredIndex);
    bot.position.copy(spawn);
    bot.health = CONFIG.maxHealth;
    bot.alive = true;
    bot.nextShot = 0.65 + Math.random();
    bot.lastDamageAt = this.elapsed;
    bot.shieldUntil = this.elapsed + CONFIG.spawnShieldSeconds;
    bot.character.group.position.copy(spawn);
    bot.character.group.visible = true;
    bot.target = null;
  }

  pickSpawn(preferredIndex = null) {
    if (preferredIndex != null) return this.arena.spawnPoints[preferredIndex % this.arena.spawnPoints.length].clone();
    const opponents = this.bots.filter((bot) => bot.alive).map((bot) => bot.position);
    let best = this.arena.spawnPoints[0];
    let bestDistance = -1;
    for (const spawn of this.arena.spawnPoints) {
      const nearest = opponents.reduce((distance, position) => Math.min(distance, spawn.distanceToSquared(position)), Infinity);
      if (nearest > bestDistance) {
        bestDistance = nearest;
        best = spawn;
      }
    }
    return best.clone();
  }

  spawnTracer(start, end, color) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 8;
    this.scene.add(line);
    this.effects.push({ object: line, life: 0.085, maxLife: 0.085, type: 'fade' });
  }

  spawnImpact(point, color, count = 7) {
    for (let index = 0; index < count; index += 1) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.025 + Math.random() * 0.035, 5, 4),
        new THREE.MeshBasicMaterial({ color, transparent: true }),
      );
      particle.position.copy(point);
      this.scene.add(particle);
      this.effects.push({
        object: particle,
        life: 0.28 + Math.random() * 0.14,
        maxLife: 0.42,
        type: 'particle',
        velocity: new THREE.Vector3((Math.random() - 0.5) * 2.6, Math.random() * 2.6, (Math.random() - 0.5) * 2.6),
      });
    }
  }

  spawnBurst(position, color) {
    const point = tempA.set(position.x, 1.25, position.z);
    this.spawnImpact(point, color, 18);
  }

  updateEffects(dt) {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index];
      effect.life -= dt;
      if (effect.type === 'particle') {
        effect.velocity.y -= 7 * dt;
        effect.object.position.addScaledVector(effect.velocity, dt);
      }
      if (effect.object.material) effect.object.material.opacity = clamp(effect.life / effect.maxLife, 0, 1);
      if (effect.life <= 0) {
        this.scene.remove(effect.object);
        effect.object.geometry?.dispose();
        effect.object.material?.dispose();
        this.effects.splice(index, 1);
      }
    }
  }

  clearEffects() {
    for (const effect of this.effects) this.scene.remove(effect.object);
    this.effects.length = 0;
  }

  showHitMarker(zone) {
    const marker = this.ui.hitMarker;
    marker.classList.remove('active', 'head');
    void marker.offsetWidth;
    if (zone === 'head') marker.classList.add('head');
    marker.classList.add('active');
  }

  addFeed(text) {
    const item = document.createElement('div');
    item.className = 'event-item';
    item.textContent = text;
    this.ui.eventFeed.prepend(item);
    while (this.ui.eventFeed.children.length > 5) this.ui.eventFeed.lastElementChild.remove();
    setTimeout(() => item.remove(), 4200);
  }

  announce(text) {
    const element = this.ui.announcement;
    element.textContent = text;
    element.classList.remove('pop');
    void element.offsetWidth;
    element.classList.add('pop');
  }

  buildScoreboard() {
    const actors = [this.player, ...this.bots];
    this.ui.scoreStrip.replaceChildren();
    for (const actor of actors) {
      const chip = document.createElement('div');
      chip.className = `score-chip${actor === this.player ? ' is-player' : ''}`;
      chip.style.setProperty('--chip-color', `#${actor.color.toString(16).padStart(6, '0')}`);
      const name = document.createElement('span');
      name.textContent = actor.name;
      const score = document.createElement('strong');
      score.textContent = actor.score;
      score.dataset.actorId = actor === this.player ? 'player' : actor.id;
      chip.append(name, score);
      this.ui.scoreStrip.append(chip);
    }
  }

  updateHud() {
    if (this.state === 'menu') return;
    const player = this.player;
    this.ui.timer.textContent = formatTime(this.matchTime);
    this.ui.healthNumber.textContent = Math.ceil(player.health);
    this.ui.healthFill.style.width = `${clamp(player.health, 0, 100)}%`;
    this.ui.healthFill.style.background = player.health < 30
      ? 'linear-gradient(90deg, #ff3f56, #ff8b38)'
      : 'linear-gradient(90deg, #75cc36, #d4f64b)';
    this.ui.healthStatus.textContent = player.shieldUntil > this.elapsed
      ? `Shield ${Math.ceil(player.shieldUntil - this.elapsed)}s`
      : this.elapsed - player.lastDamageAt > CONFIG.regenDelay && player.health < 100
        ? 'Healing'
        : player.health < 35 ? 'Find cover!' : 'Ready';
    this.ui.ammoNumber.textContent = player.ammo;
    this.ui.reloadLabel.textContent = player.reloadTimer > 0 ? 'RELOADING…' : player.ammo <= 3 ? 'R TO RELOAD' : 'FOAM READY';
    for (const actor of [player, ...this.bots]) {
      const id = actor === player ? 'player' : String(actor.id);
      const score = this.ui.scoreStrip.querySelector(`[data-actor-id="${id}"]`);
      if (score) score.textContent = actor.score;
    }
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.onStateChange('paused');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.input.clearTransient();
    this.onStateChange('playing');
  }

  endMatch() {
    if (this.state === 'results') return;
    this.state = 'results';
    document.exitPointerLock?.();
    this.blaster.anchor.visible = false;
    const ranking = [this.player, ...this.bots].sort((a, b) => b.score - a.score || a.deaths - b.deaths);
    this.showResults(ranking);
    this.onStateChange('results');
  }

  showResults(ranking) {
    const winner = ranking[0];
    const draw = ranking[1] && ranking[1].score === winner.score;
    this.ui.resultsTitle.textContent = draw ? `It's a draw!` : winner === this.player ? 'You win!' : `${winner.name} wins!`;
    this.ui.resultsSubtitle.textContent = draw
      ? 'Same score — the rematch decides it.'
      : winner === this.player ? 'Top cobra in the arena.' : 'Nice match — get them in the rematch!';
    this.ui.resultsList.replaceChildren();
    for (const actor of ranking) {
      const item = document.createElement('li');
      item.style.setProperty('--result-color', `#${actor.color.toString(16).padStart(6, '0')}`);
      const name = document.createElement('span');
      name.textContent = actor.name;
      const score = document.createElement('strong');
      score.textContent = `${actor.score} ${actor.score === 1 ? 'tag' : 'tags'}`;
      item.append(name, score);
      this.ui.resultsList.append(item);
    }
  }

  quitToMenu() {
    this.state = 'menu';
    this.clearBots();
    this.clearEffects();
    this.placeMenuCamera();
    this.onStateChange('menu');
  }
}
