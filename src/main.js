import { CONFIG } from './config.js';
import { GameAudio } from './audio.js';
import { CobraClashGame } from './game.js';
import { InputController } from './input.js';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#game');
const menu = $('#menu');
const hud = $('#hud');
const pauseScreen = $('#pause-screen');
const respawnScreen = $('#respawn-screen');
const resultsScreen = $('#results-screen');
const pointerHint = $('#pointer-hint');
const difficulty = $('#difficulty');
const difficultyLabel = $('#difficulty-label');

const ui = {
  timer: $('#timer'),
  scoreStrip: $('#score-strip'),
  eventFeed: $('#event-feed'),
  announcement: $('#announcement'),
  hitMarker: $('#hit-marker'),
  healthNumber: $('#health-number'),
  healthFill: $('#health-fill'),
  healthStatus: $('#health-status'),
  ammoNumber: $('#ammo-number'),
  reloadLabel: $('#reload-label'),
  damageFlash: $('#damage-flash'),
  respawn: respawnScreen,
  respawnCount: $('#respawn-count'),
  resultsTitle: $('#results-title'),
  resultsSubtitle: $('#results-subtitle'),
  resultsList: $('#results-list'),
};

const input = new InputController(canvas);
const audio = new GameAudio();
const game = new CobraClashGame(canvas, input, audio, ui);

function show(element, visible) {
  element.classList.toggle('is-visible', visible);
}

function syncScreens(state) {
  show(menu, state === 'menu');
  hud.classList.toggle('is-visible', state !== 'menu');
  hud.setAttribute('aria-hidden', state === 'menu' ? 'true' : 'false');
  show(pauseScreen, state === 'paused');
  show(resultsScreen, state === 'results');
  pointerHint.classList.toggle('is-visible', state === 'playing' && document.pointerLockElement !== canvas);
  if (state !== 'playing') input.clearTransient();
}

game.onStateChange = syncScreens;

function updateDifficulty() {
  const value = Number(difficulty.value);
  difficultyLabel.textContent = CONFIG.difficultyNames[value - 1];
  difficulty.style.background = `linear-gradient(90deg, var(--lime) 0 ${(value - 1) * 25}%, #264c56 ${(value - 1) * 25}% 100%)`;
}
difficulty.addEventListener('input', updateDifficulty);
updateDifficulty();

function requestAim() {
  if (!canvas.requestPointerLock) {
    game.pause();
    return;
  }
  const request = canvas.requestPointerLock();
  request?.catch?.(() => game.pause());
  setTimeout(() => {
    if (game.state === 'playing' && document.pointerLockElement !== canvas) game.pause();
  }, 500);
}

function play() {
  audio.start();
  game.startMatch(Number($('#bot-count').value), Number(difficulty.value), $('#arena').value);
  requestAim();
}

$('#play-button').addEventListener('click', play);
$('#resume-button').addEventListener('click', () => {
  audio.start();
  game.resume();
  requestAim();
});
$('#quit-button').addEventListener('click', () => game.quitToMenu());
$('#menu-button').addEventListener('click', () => game.quitToMenu());
$('#rematch-button').addEventListener('click', () => {
  audio.start();
  game.startMatch(Number($('#bot-count').value), Number(difficulty.value), $('#arena').value);
  requestAim();
});
canvas.addEventListener('click', () => {
  if (game.state === 'playing' && document.pointerLockElement !== canvas) requestAim();
});

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  if (!locked && game.state === 'playing') game.pause();
  pointerHint.classList.toggle('is-visible', game.state === 'playing' && !locked);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') {
    document.exitPointerLock?.();
    game.pause();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'Enter' && game.state === 'menu') play();
});

let previous = performance.now();
function frame(now) {
  const dt = (now - previous) / 1000;
  previous = now;
  game.update(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

requestAnimationFrame(() => $('#loading').classList.add('is-hidden'));
syncScreens('menu');
