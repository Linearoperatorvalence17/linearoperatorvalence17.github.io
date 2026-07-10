"use strict";

function bindInputs() {
  for (const [id, input] of Object.entries(inputs)) {
    const key = mapping[id];
    if (input.type === "checkbox") input.checked = Boolean(settings[key]);
    else input.value = settings[key];
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
    const out = input.closest("label")?.querySelector("output");
    if (out) {
      let suffix = "";
      if (id === "pixel-size") suffix = " px";
      if (id.startsWith("radius-")) suffix = " u";
      if (id === "rotation-speed") suffix = " /30";
      if (id === "rotation-lag") suffix = " /30";
      out.value = String(settings[key]) + suffix;
    }
  }
  document.getElementById("width-range").setAttribute(
    "aria-hidden",
    settings.randomWidth ? "false" : "true"
  );
  updateLabels();
}

function updateLabels() {
  document.getElementById("seed-label").textContent = "seed " + settings.seed;
  document.getElementById("settings-json").textContent = JSON.stringify(settings, null, 2);
}

document.getElementById("new-seed").addEventListener("click", () => {
  settings.seed = Math.floor(Math.random() * 0xffffffff) >>> 0;
  buildScene();
});

document.getElementById("random-params").addEventListener("click", () => {
  const rand = Math.random;
  settings = {
    ...settings,
    seed: Math.floor(rand() * 0xffffffff) >>> 0,
    sphereCount: Math.floor(2 + rand() * 4),
    lineCount: Math.floor(5 + rand() * 8),
    pixelSize: 1 + Math.floor(rand() * 2),
    strokeWidth: 1 + Math.floor(rand() * 2),
    randomWidth: rand() > 0.72,
    strokeMin: 1,
    strokeMax: 1 + Math.floor(rand() * 2),
    radiusMin: Math.floor(24 + rand() * 28),
    radiusMax: Math.floor(120 + rand() * 90),
    rotationSpeed: Math.floor(2 + rand() * 4),
    rotationLag: Math.floor(18 + rand() * 13)
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

document.getElementById("copy-settings").addEventListener("click", async ev => {
  const text = JSON.stringify(settings, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    flashButton(ev.currentTarget, "コピー済み");
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
    const li = document.createElement("li");
    const load = document.createElement("button");
    load.type = "button";
    load.textContent = `${index + 1}. 球${item.sphereCount} / 線${item.lineCount} / ${item.pixelSize}px / seed ${item.seed}`;
    load.addEventListener("click", () => {
      settings = { ...defaultSettings, ...item };
      normalizeSettings();
      applyTheme();
      syncInputs();
      buildScene();
    });
    const del = document.createElement("button");
    del.type = "button";
    del.className = "delete-favorite";
    del.textContent = "×";
    del.setAttribute("aria-label", `保存設定 ${index + 1} を削除`);
    del.addEventListener("click", () => {
      const next = loadFavorites();
      next.splice(index, 1);
      storeFavorites(next);
      renderFavorites();
    });
    li.append(load, del);
    favoritesEl.appendChild(li);
  });
}

document.getElementById("save-favorite").addEventListener("click", ev => {
  const items = loadFavorites();
  items.push({ ...settings });
  storeFavorites(items.slice(-20));
  renderFavorites();
  flashButton(ev.currentTarget, "保存済み");
});

function flashButton(button, text) {
  const old = button.textContent;
  button.textContent = text;
  setTimeout(() => { button.textContent = old; }, 900);
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
