"use strict";

const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d", { alpha: false });
const root = document.documentElement;
const viewport = document.querySelector(".viewport");
const controls = document.getElementById("controls");

const STORAGE_KEY = "ka256-sphere-lab-settings-v5";
const FAVORITES_KEY = "ka256-sphere-lab-favorites-v5";

const defaultSettings = {
  seed: 2640959168,
  sphereCount: 4,
  lineCount: 8,
  pixelSize: 1,
  strokeWidth: 2,
  randomWidth: false,
  strokeMin: 1,
  strokeMax: 2,
  radiusMin: 30,
  radiusMax: 200,
  placementBalance: 78,
  recenterStrength: 85,
  directionJitter: 24,
  sphereDistanceMin: 25,
  sphereDistanceMax: 88,
  lineOffsetMin: 18,
  lineOffsetMax: 82,
  rotationSpeed: 3,
  rotationLag: 30,
  theme: "light"
};

let settings = loadSettings();
let scene = { spheres: [], lines: [] };
let cssW = 1;
let cssH = 1;
let yaw = 0;
let pitch = 0;
let targetYaw = 0;
let targetPitch = 0;
let lastPointer = null;
let lastTime = performance.now();
let fps = 0;
let frameCounter = 0;
let fpsTime = performance.now();

const ids = [
  "sphere-count", "line-count", "pixel-size", "stroke-width",
  "random-width", "stroke-min", "stroke-max", "radius-min", "radius-max",
  "placement-balance", "recenter-strength", "direction-jitter",
  "sphere-distance-min", "sphere-distance-max", "line-offset-min", "line-offset-max",
  "rotation-speed", "rotation-lag"
];

const inputs = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
const mapping = {
  "sphere-count": "sphereCount",
  "line-count": "lineCount",
  "pixel-size": "pixelSize",
  "stroke-width": "strokeWidth",
  "random-width": "randomWidth",
  "stroke-min": "strokeMin",
  "stroke-max": "strokeMax",
  "radius-min": "radiusMin",
  "radius-max": "radiusMax",
  "placement-balance": "placementBalance",
  "recenter-strength": "recenterStrength",
  "direction-jitter": "directionJitter",
  "sphere-distance-min": "sphereDistanceMin",
  "sphere-distance-max": "sphereDistanceMax",
  "line-offset-min": "lineOffsetMin",
  "line-offset-max": "lineOffsetMax",
  "rotation-speed": "rotationSpeed",
  "rotation-lag": "rotationLag"
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return { ...defaultSettings, ...(saved || {}) };
  } catch (_) {
    return { ...defaultSettings };
  }
}

function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (_) {}
}

function makeRand(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return (state >>> 0) / 4294967296;
  };
}

function randRange(rand, min, max) { return min + (max - min) * rand(); }
function randInt(rand, min, max) { return Math.floor(randRange(rand, min, max + 1)); }
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function length3(v) { return Math.hypot(v.x, v.y, v.z); }
function scale3(v, k) { return { x: v.x * k, y: v.y * k, z: v.z * k }; }
function add3(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function sub3(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function normalize3(v) {
  const magnitude = length3(v) || 1;
  return scale3(v, 1 / magnitude);
}
function mixDirection(a, b, amount) {
  return normalize3(add3(scale3(a, 1 - amount), scale3(b, amount)));
}

function randomUnit(rand) {
  const z = randRange(rand, -1, 1);
  const angle = randRange(rand, 0, Math.PI * 2);
  const radius = Math.sqrt(Math.max(0, 1 - z * z));
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle), z };
}

function rotateEuler(v, ax, ay, az) {
  let x = v.x, y = v.y, z = v.z;
  let c = Math.cos(ax), s = Math.sin(ax);
  [y, z] = [c * y - s * z, s * y + c * z];
  c = Math.cos(ay); s = Math.sin(ay);
  [x, z] = [c * x + s * z, -s * x + c * z];
  c = Math.cos(az); s = Math.sin(az);
  [x, y] = [c * x - s * y, s * x + c * y];
  return { x, y, z };
}

function distributedDirections(count, rand) {
  if (count <= 0) return [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const phase = rand() * Math.PI * 2;
  const ax = rand() * Math.PI * 2;
  const ay = rand() * Math.PI * 2;
  const az = rand() * Math.PI * 2;
  const balance = settings.placementBalance / 100;
  const jitter = settings.directionJitter / 100 * 0.42;
  const result = [];

  for (let i = 0; i < count; i++) {
    const z = 1 - 2 * ((i + 0.5) / count);
    const radius = Math.sqrt(Math.max(0, 1 - z * z));
    const angle = phase + i * golden;
    const evenDirection = normalize3(rotateEuler(
      { x: radius * Math.cos(angle), y: radius * Math.sin(angle), z },
      ax, ay, az
    ));
    const randomDirection = randomUnit(rand);
    let direction = mixDirection(randomDirection, evenDirection, balance);
    direction = mixDirection(direction, randomUnit(rand), jitter);
    result.push(direction);
  }
  return result;
}

function recenterPoints(points, weights, strength) {
  if (!points.length || strength <= 0) return points;
  let total = 0, cx = 0, cy = 0, cz = 0;
  points.forEach((point, index) => {
    const weight = weights[index] || 1;
    total += weight;
    cx += point.x * weight;
    cy += point.y * weight;
    cz += point.z * weight;
  });
  if (!total) return points;
  const amount = strength / 100;
  const center = scale3({ x: cx / total, y: cy / total, z: cz / total }, amount);
  return points.map(point => sub3(point, center));
}

function elementWidth(rand) {
  if (!settings.randomWidth) return settings.strokeWidth;
  return randInt(rand, settings.strokeMin, settings.strokeMax);
}

function buildScene() {
  normalizeSettings();
  const rand = makeRand(settings.seed);
  const volume = 230;
  scene = { spheres: [], lines: [] };

  const sphereDirections = distributedDirections(settings.sphereCount, rand);
  const sphereRadii = Array.from(
    { length: settings.sphereCount },
    () => randRange(rand, settings.radiusMin, settings.radiusMax)
  );
  let sphereCenters = sphereDirections.map((direction, index) => {
    const radius = sphereRadii[index];
    const available = Math.max(28, volume - radius * 0.45);
    const distance = available * randRange(
      rand,
      settings.sphereDistanceMin / 100,
      settings.sphereDistanceMax / 100
    );
    return scale3(direction, distance);
  });
  sphereCenters = recenterPoints(
    sphereCenters,
    sphereRadii.map(radius => radius * radius),
    settings.recenterStrength
  );

  for (let i = 0; i < settings.sphereCount; i++) {
    scene.spheres.push({
      center: sphereCenters[i],
      radius: sphereRadii[i],
      width: elementWidth(rand),
      colorIndex: i % 2
    });
  }

  const lineDirections = distributedDirections(settings.lineCount, rand);
  const offsetDirections = distributedDirections(settings.lineCount, rand);
  let linePoints = lineDirections.map((direction, index) => {
    let offset = scale3(
      offsetDirections[index],
      volume * randRange(rand, settings.lineOffsetMin / 100, settings.lineOffsetMax / 100)
    );
    offset = sub3(offset, scale3(direction, dot(offset, direction)));
    if (length3(offset) < 8) {
      const fallback = Math.abs(direction.z) < 0.85 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
      offset = normalize3({
        x: direction.y * fallback.z - direction.z * fallback.y,
        y: direction.z * fallback.x - direction.x * fallback.z,
        z: direction.x * fallback.y - direction.y * fallback.x
      });
      offset = scale3(offset, volume * randRange(rand, 0.2, 0.7));
    }
    return offset;
  });
  linePoints = recenterPoints(
    linePoints,
    linePoints.map(() => 1),
    settings.recenterStrength
  );

  for (let i = 0; i < settings.lineCount; i++) {
    const direction = lineDirections[i];
    let point = linePoints[i];
    point = sub3(point, scale3(direction, dot(point, direction)));
    scene.lines.push({
      point,
      direction,
      width: elementWidth(rand),
      colorIndex: (i + 1) % 2
    });
  }

  saveSettings();
  updateLabels();
}

function normalizeSettings() {
  settings.sphereCount = clampInt(settings.sphereCount, 1, 16);
  settings.lineCount = clampInt(settings.lineCount, 0, 40);
  settings.pixelSize = clampInt(settings.pixelSize, 1, 8);
  settings.strokeWidth = clampInt(settings.strokeWidth, 1, 8);
  settings.strokeMin = clampInt(settings.strokeMin, 1, 8);
  settings.strokeMax = clampInt(settings.strokeMax, 1, 8);
  if (settings.strokeMin > settings.strokeMax) settings.strokeMax = settings.strokeMin;
  settings.radiusMin = clampInt(settings.radiusMin, 18, 180);
  settings.radiusMax = clampInt(settings.radiusMax, 24, 260);
  if (settings.radiusMin > settings.radiusMax) settings.radiusMax = settings.radiusMin;
  settings.placementBalance = clampInt(settings.placementBalance, 0, 100);
  settings.recenterStrength = clampInt(settings.recenterStrength, 0, 100);
  settings.directionJitter = clampInt(settings.directionJitter, 0, 100);
  settings.sphereDistanceMin = clampInt(settings.sphereDistanceMin, 0, 100);
  settings.sphereDistanceMax = clampInt(settings.sphereDistanceMax, 0, 100);
  if (settings.sphereDistanceMin > settings.sphereDistanceMax) settings.sphereDistanceMax = settings.sphereDistanceMin;
  settings.lineOffsetMin = clampInt(settings.lineOffsetMin, 0, 100);
  settings.lineOffsetMax = clampInt(settings.lineOffsetMax, 0, 100);
  if (settings.lineOffsetMin > settings.lineOffsetMax) settings.lineOffsetMax = settings.lineOffsetMin;
  settings.rotationSpeed = clampInt(settings.rotationSpeed, 1, 30);
  settings.rotationLag = clampInt(settings.rotationLag, 1, 30);
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value))));
}

function rotatePoint(point) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x1 = cy * point.x + sy * point.z;
  const z1 = -sy * point.x + cy * point.z;
  return {
    x: x1,
    y: cp * point.y - sp * z1,
    z: sp * point.y + cp * z1
  };
}

function project(point) {
  const scale = Math.min(cssW, cssH) / 650;
  return {
    x: cssW * 0.5 + point.x * scale,
    y: cssH * 0.5 - point.y * scale,
    z: point.z,
    scale
  };
}

function resizeCanvas() {
  const rect = viewport.getBoundingClientRect();
  cssW = Math.max(1, Math.round(rect.width));
  cssH = Math.max(1, Math.round(rect.height));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function palette() {
  const styles = getComputedStyle(root);
  return {
    bg: styles.getPropertyValue("--bg").trim(),
    a: styles.getPropertyValue("--line-a").trim(),
    b: styles.getPropertyValue("--line-b").trim()
  };
}

function cellBrush(xCell, yCell, widthCells, color) {
  const pixelSize = settings.pixelSize;
  const width = Math.max(1, widthCells);
  const start = -Math.floor((width - 1) / 2);
  ctx.fillStyle = color;
  for (let oy = 0; oy < width; oy++) {
    for (let ox = 0; ox < width; ox++) {
      ctx.fillRect(
        (xCell + start + ox) * pixelSize,
        (yCell + start + oy) * pixelSize,
        pixelSize,
        pixelSize
      );
    }
  }
}

function bresenham(x0, y0, x1, y1, callback) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  let guard = 0;
  const limit = Math.max(dx, -dy, 1) * 2 + 8;
  while (true) {
    callback(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * error;
    if (e2 >= dy) { error += dy; x0 += sx; }
    if (e2 <= dx) { error += dx; y0 += sy; }
    if (++guard > limit) break;
  }
}

function circleCells(cx, cy, radius, callback) {
  let x = Math.max(1, Math.round(radius));
  let y = 0;
  let error = 1 - x;
  while (x >= y) {
    callback(cx + x, cy + y); callback(cx + y, cy + x);
    callback(cx - y, cy + x); callback(cx - x, cy + y);
    callback(cx - x, cy - y); callback(cx - y, cy - x);
    callback(cx + y, cy - x); callback(cx + x, cy - y);
    y++;
    if (error < 0) error += 2 * y + 1;
    else { x--; error += 2 * (y - x + 1); }
  }
}

function clipInfiniteLine(px, py, dx, dy, minX, minY, maxX, maxY) {
  const epsilon = 1e-8;
  const points = [];
  function addPoint(x, y) {
    if (x < minX - 0.01 || x > maxX + 0.01 || y < minY - 0.01 || y > maxY + 0.01) return;
    if (points.some(point => Math.hypot(point.x - x, point.y - y) < 0.01)) return;
    points.push({ x, y });
  }
  if (Math.abs(dx) > epsilon) {
    let t = (minX - px) / dx; addPoint(minX, py + t * dy);
    t = (maxX - px) / dx; addPoint(maxX, py + t * dy);
  }
  if (Math.abs(dy) > epsilon) {
    let t = (minY - py) / dy; addPoint(px + t * dx, minY);
    t = (maxY - py) / dy; addPoint(px + t * dx, maxY);
  }
  if (points.length < 2) return null;
  let best = [points[0], points[1]];
  let bestDistance = -1;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const distance = (points[i].x - points[j].x) ** 2 + (points[i].y - points[j].y) ** 2;
      if (distance > bestDistance) {
        bestDistance = distance;
        best = [points[i], points[j]];
      }
    }
  }
  return best;
}
