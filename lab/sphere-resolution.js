"use strict";

const normalizeSettingsBeforeResolution = normalizeSettings;
normalizeSettings = function normalizeSettingsWithFractionalCells() {
  const requestedPixelSize = Number(settings.pixelSize);
  normalizeSettingsBeforeResolution();
  const finiteValue = Number.isFinite(requestedPixelSize) ? requestedPixelSize : 1;
  settings.pixelSize = Math.max(0.5, Math.min(8, Math.round(finiteValue * 2) / 2));
};
