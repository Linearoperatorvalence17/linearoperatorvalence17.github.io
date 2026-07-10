"use strict";

const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d", { alpha: false });
const root = document.documentElement;
const viewport = document.querySelector(".viewport");
const controls = document.getElementById("controls");

const STORAGE_KEY = "ka256-sphere-lab-settings-v4";
const FAVORITES_KEY = "ka256-sphere-lab-favorites-v4";

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
  "random-width", "stroke-min", "stroke-max", "radius-min",
  "radius-max", "rotation-speed", "rotation-lag"
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
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
}

function randRange(rand, min, max) { return min + (max - min) * rand(); }
function randInt(rand, min, max) { return Math.floor(randRange(rand, min, max + 1)); }

function randomUnit(rand) {
  const z = randRange(rand, -1, 1);
  const a = randRange(rand, 0, Math.PI * 2);
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return { x: r * Math.cos(a), y: r * Math.sin(a), z };
}

function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function length3(v) { return Math.hypot(v.x, v.y, v.z); }
function scale3(v, k) { return { x: v.x * k, y: v.y * k, z: v.z * k }; }
function sub3(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function normalize3(v) {
  const m = length3(v) || 1;
  return scale3(v, 1 / m);
}

function rotateEuler(v, ax, ay, az) {
  let x = v.x, y = v.y, z = v.z;
  let c = Math.cos(ax), q = Math.sin(ax);
  [y, z] = [c * y - q * z, q * y + c * z];
  c = Math.cos(ay); q = Math.sin(ay);
  [x, z] = [c * x + q * z, -q * x + c * z];
  c = Math.cos(az); q = Math.sin(az);
  [x, y] = [c * x - q * y, q * x + c * y];
  return { x, y, z };
}

function balancedDirections(count, rand) {
  if (count <= 0) return [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const phase = rand() * Math.PI * 2;
  const ax = rand() * Math.PI * 2;
  const ay = rand() * Math.PI * 2;
  const az = rand() * Math.PI * 2;
  const result = [];
  for (let i = 0; i < count; i++) {
    const z = 1 - 2 * ((i + 0.5) / count);
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    const a = phase + i * golden + randRange(rand, -0.12, 0.12);
    const v = { x: r * Math.cos(a), y: r * Math.sin(a), z };
    result.push(normalize3(rotateEuler(v, ax, ay, az)));
  }
  return result;
}

function shuffle(values, rand) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function stratifiedValues(count, min, max, rand) {
  if (count <= 0) return [];
  const values = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.18 + rand() * 0.64) / count;
    values.push(min + (max - min) * t);
  }
  return shuffle(values, rand);
}

function centerWeighted(points, weights) {
  let total = 0, cx = 0, cy = 0, cz = 0;
  points.forEach((p, i) => {
    const w = weights[i] || 1;
    total += w; cx += p.x * w; cy += p.y * w; cz += p.z * w;
  });
  if (!total) return points;
  const center = { x: cx / total, y: cy / total, z: cz / total };
  return points.map(p => sub3(p, center));
}

function elementWidth(rand) {
  if (!settings.randomWidth) return settings.strokeWidth;
  return randInt(rand, settings.strokeMin, settings.strokeMax);
}

function buildScene() {
  normalizeSettings();
  const rand = makeRand(settings.seed);
  const volume = 230;
  scene.spheres = [];
  scene.lines = [];

  const sphereDirs = balancedDirections(settings.sphereCount, rand);
  const sphereRadii = Array.from(
    { length: settings.sphereCount },
    () => randRange(rand, settings.radiusMin, settings.radiusMax)
  );
  let sphereCenters = sphereDirs.map((direction, i) => {
    const radius = sphereRadii[i];
    const available = Math.max(28, volume - radius * 0.45);
    const distance = available * randRange(rand, 0.25, 0.88);
    return scale3(direction, distance);
  });
  sphereCenters = centerWeighted(sphereCenters, sphereRadii.map(r => r * r));

  for (let i = 0; i < settings.sphereCount; i++) {
    scene.spheres.push({
      center: sphereCenters[i],
      radius: sphereRadii[i],
      width: elementWidth(rand),
      colorIndex: i % 2
    });
  }

  const lineDirs = balancedDirections(settings.lineCount, rand);
  const offsetDirs = balancedDirections(settings.lineCount, rand);
  let linePoints = lineDirs.map((direction, i) => {
    let offset = scale3(offsetDirs[i], randRange(rand, volume * 0.18, volume * 0.82));
    offset = sub3(offset, scale3(direction, dot(offset, direction)));
    if (length3(offset) < 8) {
      const fallback = Math.abs(direction.z) < 0.85 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
      offset = normalize3({
        x: direction.y * fallback.z - direction.z * fallback.y,
        y: direction.z * fallback.x - direction.x * fallback.z,
        z: direction.x * fallback.y - direction.y * fallback.x
      });
      offset = scale3(offset, randRange(rand, volume * 0.2, volume * 0.7));
    }
    return offset;
  });
  linePoints = centerWeighted(linePoints, linePoints.map(() => 1));

  for (let i = 0; i < settings.lineCount; i++) {
    const direction = lineDirs[i];
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
  settings.rotationSpeed = clampInt(settings.rotationSpeed, 1, 30);
  settings.rotationLag = clampInt(settings.rotationLag, 1, 30);
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value))));
}

function rotatePoint(p) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x1 = cy * p.x + sy * p.z;
  const z1 = -sy * p.x + cy * p.z;
  return {
    x: x1,
    y: cp * p.y - sp * z1,
    z: sp * p.y + cp * z1
  };
}

function add(a, b, scale = 1) {
  return { x: a.x + b.x * scale, y: a.y + b.y * scale, z: a.z + b.z * scale };
}

function project(p) {
  const scale = Math.min(cssW, cssH) / 650;
  return {
    x: cssW * 0.5 + p.x * scale,
    y: cssH * 0.5 - p.y * scale,
    z: p.z,
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
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function palette() {
  const cs = getComputedStyle(root);
  return {
    bg: cs.getPropertyValue("--bg").trim(),
    a: cs.getPropertyValue("--line-a").trim(),
    b: cs.getPropertyValue("--line-b").trim()
  };
}

function cellBrush(xCell, yCell, widthCells, color) {
  const px = settings.pixelSize;
  const width = Math.max(1, widthCells);
  const start = -Math.floor((width - 1) / 2);
  ctx.fillStyle = color;
  for (let oy = 0; oy < width; oy++) {
    for (let ox = 0; ox < width; ox++) {
      ctx.fillRect(
        (xCell + start + ox) * px,
        (yCell + start + oy) * px,
        px,
        px
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
  let err = dx + dy;
  const total = Math.max(dx, -dy, 1);
  let step = 0;
  while (true) {
    callback(x0, y0, step / total);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
    step++;
    if (step > total * 2 + 8) break;
  }
}

function circleCells(cx, cy, r, callback) {
  let x = Math.max(1, Math.round(r));
  let y = 0;
  let err = 1 - x;
  while (x >= y) {
    callback(cx + x, cy + y);
    callback(cx + y, cy + x);
    callback(cx - y, cy + x);
    callback(cx - x, cy + y);
    callback(cx - x, cy - y);
    callback(cx - y, cy - x);
    callback(cx + y, cy - x);
    callback(cx + x, cy - y);
    y++;
    if (err < 0) err += 2 * y + 1;
    else { x--; err += 2 * (y - x + 1); }
  }
}

function clipInfiniteLine(px, py, dx, dy, minX, minY, maxX, maxY) {
  const eps = 1e-8;
  const points = [];
  function addPoint(x, y) {
    if (x < minX - 0.01 || x > maxX + 0.01 || y < minY - 0.01 || y > maxY + 0.01) return;
    if (points.some(p => Math.hypot(p.x - x, p.y - y) < 0.01)) return;
    points.push({ x, y });
  }
  if (Math.abs(dx) > eps) {
    let t = (minX - px) / dx;
    addPoint(minX, py + t * dy);
    t = (maxX - px) / dx;
    addPoint(maxX, py + t * dy);
  }
  if (Math.abs(dy) > eps) {
    let t = (minY - py) / dy;
    addPoint(px + t * dx, minY);
    t = (maxY - py) / dy;
    addPoint(px + t * dx, maxY);
  }
  if (points.length < 2) return null;
  let best = [points[0], points[1]], bestD = -1;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = (points[i].x - points[j].x) ** 2 + (points[i].y - points[j].y) ** 2;
      if (d > bestD) { bestD = d; best = [points[i], points[j]]; }
    }
  }
  return best;
}
