"use strict";

function render() {
  const colors = palette();
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, cssW, cssH);

  const px = settings.pixelSize;
  const scale = Math.min(cssW, cssH) / 650;

  for (const line of scene.lines) {
    const point3 = rotatePoint(line.point);
    const direction3 = rotatePoint(line.direction);
    const p = project(point3);
    const dx = direction3.x * scale;
    const dy = -direction3.y * scale;
    if (Math.hypot(dx, dy) < 1e-5) continue;
    const clipped = clipInfiniteLine(
      p.x,
      p.y,
      dx,
      dy,
      -px * 4,
      -px * 4,
      cssW + px * 4,
      cssH + px * 4
    );
    if (!clipped) continue;
    const color = line.colorIndex === 0 ? colors.a : colors.b;
    bresenham(
      clipped[0].x / px,
      clipped[0].y / px,
      clipped[1].x / px,
      clipped[1].y / px,
      (xc, yc) => cellBrush(xc, yc, line.width, color)
    );
  }

  for (const sphere of scene.spheres) {
    const center3 = rotatePoint(sphere.center);
    const p = project(center3);
    const color = sphere.colorIndex === 0 ? colors.a : colors.b;
    circleCells(
      Math.round(p.x / px),
      Math.round(p.y / px),
      Math.max(1, (sphere.radius * p.scale) / px),
      (xc, yc) => cellBrush(xc, yc, sphere.width, color)
    );
  }
}

function animate(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  const response = 1 - Math.exp(-dt * (34 / settings.rotationLag));
  yaw += (targetYaw - yaw) * response;
  pitch += (targetPitch - pitch) * response;
  render();

  frameCounter++;
  if (now - fpsTime > 500) {
    fps = Math.round(frameCounter * 1000 / (now - fpsTime));
    frameCounter = 0;
    fpsTime = now;
    document.getElementById("fps-label").textContent = fps + " fps";
  }
  requestAnimationFrame(animate);
}

function pointerMove(ev) {
  if (ev.pointerType === "touch") return;
  if (lastPointer) {
    const sensitivity = settings.rotationSpeed * 0.00055;
    targetYaw += (ev.clientX - lastPointer.x) * sensitivity;
    targetPitch += (ev.clientY - lastPointer.y) * sensitivity;
    targetPitch = Math.max(-1.45, Math.min(1.45, targetPitch));
  }
  lastPointer = { x: ev.clientX, y: ev.clientY };
}

viewport.addEventListener("pointermove", pointerMove);
viewport.addEventListener("pointerleave", () => { lastPointer = null; });
viewport.addEventListener("pointerdown", ev => {
  if (ev.pointerType !== "mouse") lastPointer = { x: ev.clientX, y: ev.clientY };
});
