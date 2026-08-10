import { getArenaPreviewData } from './arena.js';

function cssColor(value) {
  return `#${value.toString(16).padStart(6, '0')}`;
}

function shade(value, factor) {
  const red = Math.max(0, Math.min(255, ((value >> 16) & 255) * factor));
  const green = Math.max(0, Math.min(255, ((value >> 8) & 255) * factor));
  const blue = Math.max(0, Math.min(255, (value & 255) * factor));
  return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
}

function polygon(ctx, points, fill, stroke = null, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index].x, points[index].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function project(x, z, y, width, height) {
  return {
    x: width / 2 + (x - z) * (width / 132),
    y: height * 0.57 + (x + z) * (height / 162) - y * (height / 17),
  };
}

function drawBlock(ctx, obstacle, width, height) {
  const { x, z, width: boxWidth, depth, height: boxHeight, y, color, stripe } = obstacle;
  const bottomY = y - boxHeight / 2;
  const topY = y + boxHeight / 2;
  const x0 = x - boxWidth / 2;
  const x1 = x + boxWidth / 2;
  const z0 = z - depth / 2;
  const z1 = z + depth / 2;
  const bottom = [
    project(x0, z0, bottomY, width, height),
    project(x1, z0, bottomY, width, height),
    project(x1, z1, bottomY, width, height),
    project(x0, z1, bottomY, width, height),
  ];
  const top = [
    project(x0, z0, topY, width, height),
    project(x1, z0, topY, width, height),
    project(x1, z1, topY, width, height),
    project(x0, z1, topY, width, height),
  ];

  polygon(ctx, [top[1], top[2], bottom[2], bottom[1]], shade(color, 0.7));
  polygon(ctx, [top[2], top[3], bottom[3], bottom[2]], shade(color, 0.53));
  polygon(ctx, top, cssColor(color), 'rgba(255,255,255,.22)', 0.75);

  const stripeY = Math.max(0.12, boxHeight * 0.25);
  const stripeCenter = bottomY + boxHeight * 0.66;
  const stripeTop = project(x1, z1, stripeCenter + stripeY / 2, width, height);
  const stripeBottom = project(x1, z1, stripeCenter - stripeY / 2, width, height);
  const otherTop = project(x0, z1, stripeCenter + stripeY / 2, width, height);
  const otherBottom = project(x0, z1, stripeCenter - stripeY / 2, width, height);
  polygon(ctx, [stripeTop, otherTop, otherBottom, stripeBottom], cssColor(stripe));
}

function drawArenaPreview(canvas) {
  const data = getArenaPreviewData(canvas.dataset.arena);
  const width = 300;
  const height = 116;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, cssColor(data.skyTop));
  sky.addColorStop(0.58, cssColor(data.skyBottom));
  sky.addColorStop(1, cssColor(data.floor));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.36;
  ctx.fillStyle = '#fff8cf';
  ctx.beginPath();
  ctx.arc(width * 0.78, height * 0.2, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const ground = [
    project(-23, -23, 0, width, height),
    project(23, -23, 0, width, height),
    project(23, 23, 0, width, height),
    project(-23, 23, 0, width, height),
  ];
  polygon(ctx, ground, cssColor(data.floor), 'rgba(255,255,255,.24)', 1);

  const court = [
    project(-18, -18, 0.02, width, height),
    project(18, -18, 0.02, width, height),
    project(18, 18, 0.02, width, height),
    project(-18, 18, 0.02, width, height),
  ];
  polygon(ctx, court, cssColor(data.court), cssColor(data.ring), 2.5);

  ctx.globalAlpha = 0.24;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.8;
  for (let line = -2; line <= 2; line += 1) {
    const start = project(line * 6.4, -17, 0.03, width, height);
    const end = project(line * 6.4, 17, 0.03, width, height);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  [...data.obstacles]
    .sort((left, right) => (left.x + left.z + left.y * 3) - (right.x + right.z + right.y * 3))
    .forEach((obstacle) => drawBlock(ctx, obstacle, width, height));

  const vignette = ctx.createLinearGradient(0, 0, 0, height);
  vignette.addColorStop(0, 'rgba(3,18,28,.05)');
  vignette.addColorStop(1, 'rgba(3,18,28,.32)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

export function renderArenaPreviews() {
  document.querySelectorAll('canvas[data-arena]').forEach(drawArenaPreview);
}
