"use strict";

function render() {
  const colors = palette();
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, cssW, cssH);

  const pixelSize = settings.pixelSize;
  const scale = Math.min(cssW, cssH) / 650;

  for (const line of scene.lines) {
    const point3 = rotatePoint(line.point);
    const direction3 = rotatePoint(line.direction);
    const projected = project(point3);
    const dx = direction3.x * scale;
    const dy = -direction3.y * scale;
    if (Math.hypot(dx, dy) < 1e-5) continue;
    const clipped = clipInfiniteLine(
      projected.x, projected.y, dx, dy,
      -pixelSize * 4, -pixelSize * 4,
      cssW + pixelSize * 4, cssH + pixelSize * 4
    );
    if (!clipped) continue;
    const color = line.colorIndex === 0 ? colors.a : colors.b;
    bresenham(
      clipped[0].x / pixelSize,
      clipped[0].y / pixelSize,
      clipped[1].x / pixelSize,
      clipped[1].y / pixelSize,
      (x, y) => cellBrush(x, y, line.width, color)
    );
  }

  for (const sphere of scene.spheres) {
    const center3 = rotatePoint(sphere.center);
    const projected = project(center3);
    const color = sphere.colorIndex === 0 ? colors.a : colors.b;
    circleCells(
      Math.round(projected.x / pixelSize),
      Math.round(projected.y / pixelSize),
      Math.max(1, (sphere.radius * projected.scale) / pixelSize),
      (x, y) => cellBrush(x, y, sphere.width, color)
    );
  }
}

function animate(now) {
  const delta = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  const response = 1 - Math.exp(-delta * (34 / settings.rotationLag));
  yaw += (targetYaw - yaw) * response;
  pitch += (targetPitch - pitch) * response;
  render();

  frameCounter++;
  if (now - fpsTime > 500) {
    fps = Math.round(frameCounter * 1000 / (now - fpsTime));
    frameCounter = 0;
    fpsTime = now;
    document.getElementById("fps-label").textContent = `${fps} fps`;
  }
  requestAnimationFrame(animate);
}

function pointerMove(event) {
  if (event.pointerType === "touch") return;
  if (lastPointer) {
    const sensitivity = settings.rotationSpeed * 0.00055;
    targetYaw += (event.clientX - lastPointer.x) * sensitivity;
    targetPitch += (event.clientY - lastPointer.y) * sensitivity;
    targetPitch = Math.max(-1.45, Math.min(1.45, targetPitch));
  }
  lastPointer = { x: event.clientX, y: event.clientY };
}

viewport.addEventListener("pointermove", pointerMove);
viewport.addEventListener("pointerleave", () => { lastPointer = null; });
viewport.addEventListener("pointerdown", event => {
  if (event.pointerType !== "mouse") lastPointer = { x: event.clientX, y: event.clientY };
});
