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

  const workCount = 9;
  const image = document.getElementById("works-image");
  const number = document.getElementById("works-num");
  const thumbs = document.getElementById("works-thumbs");
  document.getElementById("works-total").textContent = String(workCount).padStart(2, "0");
  let workIndex = 0;

  function showWork(index) {
    workIndex = (index + workCount) % workCount;
    image.textContent = `WORK ${String(workIndex + 1).padStart(2, "0")} / images preparing`;
    image.setAttribute("aria-label", `作品画像 ${workIndex + 1} は準備中`);
    number.textContent = String(workIndex + 1).padStart(2, "0");
    [...thumbs.children].forEach((thumb, i) => {
      thumb.classList.toggle("is-current", i === workIndex);
      thumb.setAttribute("aria-selected", i === workIndex ? "true" : "false");
    });
  }

  for (let index = 0; index < workCount; index++) {
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "works-thumb";
    thumb.textContent = String(index + 1).padStart(2, "0");
    thumb.setAttribute("role", "option");
    thumb.setAttribute("aria-label", `作品 ${index + 1} を表示`);
    thumb.addEventListener("click", () => showWork(index));
    thumbs.appendChild(thumb);
  }

  document.getElementById("works-prev").addEventListener("click", () => showWork(workIndex - 1));
  document.getElementById("works-next").addEventListener("click", () => showWork(workIndex + 1));
  document.addEventListener("keydown", event => {
    if (active !== "works") return;
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
