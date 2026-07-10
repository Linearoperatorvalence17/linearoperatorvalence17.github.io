"use strict";

function bindInputs() {
  for (const [id, input] of Object.entries(inputs)) {
    const key = mapping[id];
    input.addEventListener("input", () => {
      settings[key] = input.type === "checkbox" ? input.checked : Number(input.value);
      normalizeSettings();
      syncInputs();
      if (["rotationSpeed", "rotationLag"].includes(key)) {
        saveSettings();
        updateLabels();
      } else {
        buildScene();
      }
    });
  }
  syncInputs();
}

function syncInputs() {
  for (const [id, input] of Object.entries(inputs)) {
    const key = mapping[id];
    if (input.type === "checkbox") input.checked = Boolean(settings[key]);
    else input.value = settings[key];
    const output = input.closest("label")?.querySelector("output");
    if (!output) continue;
    let suffix = "";
    if (id === "pixel-size") suffix = " px";
    else if (id.startsWith("radius-")) suffix = " u";
    else if ([
      "placement-balance", "recenter-strength", "direction-jitter",
      "sphere-distance-min", "sphere-distance-max", "line-offset-min", "line-offset-max"
    ].includes(id)) suffix = "%";
    else if (id === "rotation-speed" || id === "rotation-lag") suffix = " /30";
    output.value = `${settings[key]}${suffix}`;
  }
  document.getElementById("width-range").setAttribute("aria-hidden", settings.randomWidth ? "false" : "true");
  updateLabels();
}

function updateLabels() {
  document.getElementById("seed-label").textContent = `seed ${settings.seed}`;
  document.getElementById("settings-json").textContent = JSON.stringify(settings, null, 2);
}

document.getElementById("new-seed").addEventListener("click", () => {
  settings.seed = Math.floor(Math.random() * 0xffffffff) >>> 0;
  buildScene();
});

document.getElementById("random-params").addEventListener("click", () => {
  const random = Math.random;
  const sphereDistanceMin = Math.floor(8 + random() * 35);
  const lineOffsetMin = Math.floor(4 + random() * 30);
  settings = {
    ...settings,
    seed: Math.floor(random() * 0xffffffff) >>> 0,
    sphereCount: Math.floor(2 + random() * 6),
    lineCount: Math.floor(4 + random() * 12),
    pixelSize: 1 + Math.floor(random() * 3),
    strokeWidth: 1 + Math.floor(random() * 3),
    randomWidth: random() > 0.65,
    strokeMin: 1,
    strokeMax: 1 + Math.floor(random() * 3),
    radiusMin: Math.floor(20 + random() * 55),
    radiusMax: Math.floor(100 + random() * 150),
    placementBalance: Math.floor(35 + random() * 66),
    recenterStrength: Math.floor(35 + random() * 66),
    directionJitter: Math.floor(random() * 66),
    sphereDistanceMin,
    sphereDistanceMax: Math.floor(Math.max(sphereDistanceMin, 58 + random() * 43)),
    lineOffsetMin,
    lineOffsetMax: Math.floor(Math.max(lineOffsetMin, 48 + random() * 53)),
    rotationSpeed: Math.floor(2 + random() * 8),
    rotationLag: Math.floor(10 + random() * 21)
  };
  normalizeSettings();
  syncInputs();
  buildScene();
});

document.getElementById("reset-view").addEventListener("click", () => {
  targetYaw = targetPitch = yaw = pitch = 0;
});

document.getElementById("theme-toggle").addEventListener("click", () => {
  settings.theme = settings.theme === "night" ? "light" : "night";
  applyTheme();
  saveSettings();
});

function applyTheme() {
  if (settings.theme === "night") root.setAttribute("data-theme", "night");
  else root.removeAttribute("data-theme");
}

document.getElementById("copy-settings").addEventListener("click", async event => {
  const text = JSON.stringify(settings, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    flashButton(event.currentTarget, "コピー済み");
  } catch (_) {
    window.prompt("設定をコピーしてください", text);
  }
});

const favoritesEl = document.getElementById("favorites");
function loadFavorites() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); }
  catch (_) { return []; }
}
function storeFavorites(items) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(items)); } catch (_) {}
}
function renderFavorites() {
  const items = loadFavorites();
  favoritesEl.innerHTML = "";
  items.forEach((item, index) => {
    const listItem = document.createElement("li");
    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.textContent = `${index + 1}. 球${item.sphereCount} / 線${item.lineCount} / 均等${item.placementBalance ?? 0}% / seed ${item.seed}`;
    loadButton.addEventListener("click", () => {
      settings = { ...defaultSettings, ...item };
      normalizeSettings();
      applyTheme();
      syncInputs();
      buildScene();
    });
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-favorite";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", `保存設定 ${index + 1} を削除`);
    deleteButton.addEventListener("click", () => {
      const next = loadFavorites();
      next.splice(index, 1);
      storeFavorites(next);
      renderFavorites();
    });
    listItem.append(loadButton, deleteButton);
    favoritesEl.appendChild(listItem);
  });
}

document.getElementById("save-favorite").addEventListener("click", event => {
  const items = loadFavorites();
  items.push({ ...settings });
  storeFavorites(items.slice(-20));
  renderFavorites();
  flashButton(event.currentTarget, "保存済み");
});

function flashButton(button, text) {
  const previous = button.textContent;
  button.textContent = text;
  setTimeout(() => { button.textContent = previous; }, 900);
}

const panelToggle = document.getElementById("panel-toggle");
panelToggle.addEventListener("click", () => {
  const hidden = controls.classList.toggle("is-hidden");
  panelToggle.textContent = hidden ? "≡" : "×";
  panelToggle.setAttribute("aria-expanded", hidden ? "false" : "true");
  setTimeout(resizeCanvas, 220);
});

window.addEventListener("resize", resizeCanvas);
applyTheme();
bindInputs();
renderFavorites();
resizeCanvas();
buildScene();
requestAnimationFrame(animate);
