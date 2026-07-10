(() => {
  "use strict";

  const panels = ["home", "about", "works", "links"];
  const homePanel = document.querySelector(".panel-home");
  const cursorSymbols = document.getElementById("cursor-symbols");
  const symbolGlyphs = ["・", "○", "。", "+", "×"];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let active = "home";
  let workLoaded = false;
  let pointerInsideHome = false;
  let pointerX = 0;
  let pointerY = 0;

  function clearCursorSymbols() {
    cursorSymbols?.replaceChildren();
  }

  function spawnCursorSymbol() {
    if (active !== "home" || !pointerInsideHome || reduceMotion || !cursorSymbols || document.hidden) return;

    const rect = cursorSymbols.getBoundingClientRect();
    const angle = Math.random() * Math.PI * 2;
    const radius = 18 + Math.random() * 52;
    const symbol = document.createElement("span");
    const x = pointerX - rect.left + Math.cos(angle) * radius;
    const y = pointerY - rect.top + Math.sin(angle) * radius;

    symbol.className = "cursor-symbol";
    symbol.textContent = symbolGlyphs[Math.floor(Math.random() * symbolGlyphs.length)];
    symbol.dataset.tone = Math.random() < 0.5 ? "a" : "b";
    symbol.style.left = `${Math.max(8, Math.min(rect.width - 8, x))}px`;
    symbol.style.top = `${Math.max(8, Math.min(rect.height - 8, y))}px`;
    symbol.style.fontSize = `${10 + Math.floor(Math.random() * 9)}px`;
    symbol.style.setProperty("--symbol-life", `${900 + Math.floor(Math.random() * 650)}ms`);
    symbol.style.animationDelay = `${Math.floor(Math.random() * 120)}ms`;
    symbol.addEventListener("animationend", () => symbol.remove(), { once: true });
    cursorSymbols.appendChild(symbol);

    while (cursorSymbols.childElementCount > 20) cursorSymbols.firstElementChild?.remove();
  }

  homePanel?.addEventListener("pointerenter", event => {
    if (event.pointerType === "touch") return;
    pointerInsideHome = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
  });

  homePanel?.addEventListener("pointermove", event => {
    if (event.pointerType === "touch") return;
    pointerInsideHome = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
  }, { passive: true });

  homePanel?.addEventListener("pointerleave", () => {
    pointerInsideHome = false;
  });

  window.setInterval(spawnCursorSymbol, 120);

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