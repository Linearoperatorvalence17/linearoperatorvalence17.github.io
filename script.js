(() => {
  "use strict";

  const panels = ["home", "about", "works", "links"];
  let active = "home";

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
    element.loading = "eager";
    return element;
  }

  function showWork(index) {
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

  works.forEach((path, index) => {
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "works-thumb";
    thumb.setAttribute("role", "option");
    thumb.setAttribute("aria-label", `作品 ${index + 1} を表示`);
    thumb.appendChild(makeImage(path, ""));
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
  showWork(0);
})();
