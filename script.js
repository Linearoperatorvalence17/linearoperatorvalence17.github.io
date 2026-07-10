(() => {
  "use strict";

  const panels = ["home", "about", "works", "links"];
  const homePanel = document.querySelector(".panel-home");
  const cursorSymbols = document.getElementById("cursor-symbols");
  const symbolPatterns = [
    {
      name: "circle-5",
      rows: ["01110", "10001", "10001", "10001", "01110"],
    },
    {
      name: "cross-5",
      rows: ["00100", "00100", "11111", "00100", "00100"],
    },
    {
      name: "x-5",
      rows: ["10001", "01010", "00100", "01010", "10001"],
    },
    {
      name: "circle-4",
      rows: ["0110", "1001", "1001", "0110"],
    },
    {
      name: "cross-3",
      rows: ["010", "111", "010"],
    },
    {
      name: "x-3",
      rows: ["101", "010", "101"],
    },
    {
      name: "diamond-circle-3",
      rows: ["010", "101", "010"],
    },
    {
      name: "dot-2",
      rows: ["11", "11"],
    },
  ];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let active = "home";
  let workLoaded = false;
  let pointerInsideHome = false;
  let pointerMoving = false;
  let pointerStopTimer = 0;
  let motionFrame = 0;
  let motionClock = 0;
  let lastFrameAt = 0;
  let lastSymbolAt = -Infinity;
  let pointerX = 0;
  let pointerY = 0;
  let pointerSpeed = 0;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let lastPointerAt = 0;

  function clearCursorSymbols() {
    cursorSymbols?.replaceChildren();
  }

  function pauseCursorSymbols() {
    pointerMoving = false;
    pointerSpeed = 0;
    window.clearTimeout(pointerStopTimer);
    if (motionFrame) {
      cancelAnimationFrame(motionFrame);
      motionFrame = 0;
    }
  }

  function buildPixelSymbol(pattern) {
    const symbol = document.createElement("span");
    symbol.className = "cursor-symbol";
    symbol.dataset.pattern = pattern.name;
    symbol.style.setProperty("--grid-size", String(pattern.rows.length));
    symbol.setAttribute("aria-hidden", "true");

    pattern.rows.forEach((row, rowIndex) => {
      [...row].forEach((cell, columnIndex) => {
        if (cell !== "1") return;
        const pixel = document.createElement("i");
        pixel.className = "cursor-pixel";
        pixel.style.gridRowStart = String(rowIndex + 1);
        pixel.style.gridColumnStart = String(columnIndex + 1);
        symbol.appendChild(pixel);
      });
    });

    return symbol;
  }

  function spawnCursorSymbol() {
    if (
      active !== "home" ||
      !pointerInsideHome ||
      !pointerMoving ||
      reduceMotion ||
      !cursorSymbols ||
      document.hidden
    ) return;

    const rect = cursorSymbols.getBoundingClientRect();
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 60;
    const pattern = symbolPatterns[Math.floor(Math.random() * symbolPatterns.length)];
    const symbol = buildPixelSymbol(pattern);
    const x = pointerX - rect.left + Math.cos(angle) * radius;
    const y = pointerY - rect.top + Math.sin(angle) * radius;

    symbol.dataset.tone = Math.random() < 0.5 ? "a" : "b";
    symbol.dataset.bornAt = String(motionClock);
    symbol.dataset.life = String(700 + Math.floor(Math.random() * 500));
    symbol.style.left = `${Math.max(8, Math.min(rect.width - 8, x))}px`;
    symbol.style.top = `${Math.max(8, Math.min(rect.height - 8, y))}px`;
    cursorSymbols.appendChild(symbol);

    while (cursorSymbols.childElementCount > 36) cursorSymbols.firstElementChild?.remove();
  }

  function getSpawnInterval() {
    const speedRatio = Math.min(1, pointerSpeed / 1.8);
    return 120 - speedRatio * 90;
  }

  function updateCursorSymbols(now) {
    motionFrame = 0;
    if (!pointerMoving || active !== "home" || !pointerInsideHome || document.hidden) return;

    if (!lastFrameAt) lastFrameAt = now;
    motionClock += Math.min(50, now - lastFrameAt);
    lastFrameAt = now;

    const spawnInterval = getSpawnInterval();
    if (motionClock - lastSymbolAt >= spawnInterval) {
      lastSymbolAt = motionClock;
      spawnCursorSymbol();
    }

    cursorSymbols?.querySelectorAll(".cursor-symbol").forEach(symbol => {
      const bornAt = Number(symbol.dataset.bornAt);
      const life = Number(symbol.dataset.life);
      if (motionClock - bornAt >= life) symbol.remove();
    });

    motionFrame = requestAnimationFrame(updateCursorSymbols);
  }

  function resumeCursorSymbols() {
    if (pointerMoving || reduceMotion) return;
    pointerMoving = true;
    lastFrameAt = 0;
    motionFrame = requestAnimationFrame(updateCursorSymbols);
  }

  homePanel?.addEventListener("pointerenter", event => {
    if (event.pointerType === "touch") return;
    pointerInsideHome = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    lastPointerAt = performance.now();
  });

  homePanel?.addEventListener("pointermove", event => {
    if (event.pointerType === "touch") return;
    const now = performance.now();
    const elapsed = Math.max(1, now - lastPointerAt);
    const distance = Math.hypot(event.clientX - lastPointerX, event.clientY - lastPointerY);
    const instantSpeed = distance / elapsed;

    pointerInsideHome = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    pointerSpeed = pointerSpeed * 0.55 + instantSpeed * 0.45;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    lastPointerAt = now;
    resumeCursorSymbols();

    window.clearTimeout(pointerStopTimer);
    pointerStopTimer = window.setTimeout(pauseCursorSymbols, 110);
  }, { passive: true });

  homePanel?.addEventListener("pointerleave", () => {
    pointerInsideHome = false;
    pauseCursorSymbols();
  });

  function showPanel(name, pushHash = false) {
    if (!panels.includes(name)) name = "home";
    active = name;
    panels.forEach(panelName => {
      const panel = document.querySelector(`[data-panel="${panelName}"]`);
      const link = document.querySelector(`[data-nav="${panelName}"]`);
      const selected = panelName === name;
      panel.hidden = !selected;
      if (selected) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (pushHash && location.hash !== `#${name}`) history.pushState(null, "", `#${name}`);
    if (name === "works" && !workLoaded) showWork(workIndex);
    if (name !== "home") {
      pointerInsideHome = false;
      pauseCursorSymbols();
      clearCursorSymbols();
    }
  }

  document.querySelectorAll("[data-nav]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      showPanel(link.dataset.nav, true);
      document.querySelector(`[data-panel="${active}"]`).focus({ preventScroll: true });
    });
  });

  window.addEventListener("hashchange", () => showPanel(location.hash.slice(1) || "home"));

  const works = Array.isArray(window.KA256_WORKS)
    ? window.KA256_WORKS.filter(path => typeof path === "string" && path.length > 0)
    : [];
  const workCount = works.length;
  const image = document.getElementById("works-image");
  const number = document.getElementById("works-num");
  const total = document.getElementById("works-total");
  const thumbs = document.getElementById("works-thumbs");
  const previousButton = document.getElementById("works-prev");
  const nextButton = document.getElementById("works-next");
  let workIndex = 0;

  total.textContent = String(workCount).padStart(2, "0");
  previousButton.disabled = workCount < 2;
  nextButton.disabled = workCount < 2;

  function makeImage(path, alt) {
    const element = document.createElement("img");
    element.src = path;
    element.alt = alt;
    element.decoding = "async";
    return element;
  }

  function showWork(index) {
    workLoaded = true;
    if (!workCount) {
      workIndex = 0;
      number.textContent = "00";
      image.textContent = "作品画像を works フォルダへ追加してください";
      image.setAttribute("aria-label", "作品画像はまだ登録されていません");
      return;
    }

    workIndex = (index + workCount) % workCount;
    const position = String(workIndex + 1).padStart(2, "0");
    const picture = makeImage(works[workIndex], `k.a.256 のイラスト作品 ${workIndex + 1}`);
    picture.addEventListener("error", () => {
      image.textContent = `画像を読み込めませんでした: ${works[workIndex]}`;
    }, { once: true });
    image.replaceChildren(picture);
    image.setAttribute("aria-label", `k.a.256 のイラスト作品 ${workIndex + 1}`);
    number.textContent = position;

    [...thumbs.children].forEach((thumb, i) => {
      thumb.classList.toggle("is-current", i === workIndex);
      thumb.setAttribute("aria-selected", i === workIndex ? "true" : "false");
    });
  }

  works.forEach((_, index) => {
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "works-thumb";
    thumb.textContent = String(index + 1).padStart(2, "0");
    thumb.setAttribute("role", "option");
    thumb.setAttribute("aria-label", `作品 ${index + 1} を表示`);
    thumb.addEventListener("click", () => showWork(index));
    thumbs.appendChild(thumb);
  });

  previousButton.addEventListener("click", () => showWork(workIndex - 1));
  nextButton.addEventListener("click", () => showWork(workIndex + 1));
  document.addEventListener("keydown", event => {
    if (active !== "works" || workCount < 2) return;
    if (event.key === "ArrowLeft") showWork(workIndex - 1);
    if (event.key === "ArrowRight") showWork(workIndex + 1);
  });

  const themeKey = "ka256-site-theme";
  const savedTheme = localStorage.getItem(themeKey);
  if (savedTheme === "night") document.documentElement.dataset.theme = "night";
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const isNight = document.documentElement.dataset.theme === "night";
    if (isNight) delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = "night";
    localStorage.setItem(themeKey, isNight ? "light" : "night");
  });

  showPanel(location.hash.slice(1) || "home");
})();