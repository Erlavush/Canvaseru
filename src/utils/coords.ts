import type { Camera } from '../types/canvas';

/**
 * Convert world (canvas) coordinates → screen (viewport) coordinates.
 * ScreenX = WorldX * zoom + panX
 */
export function worldToScreen(
  wx: number, wy: number, cam: Camera
): { sx: number; sy: number } {
  return {
    sx: wx * cam.zoom + cam.x,
    sy: wy * cam.zoom + cam.y,
  };
}

/**
 * Convert screen (viewport) coordinates → world (canvas) coordinates.
 * WorldX = (ScreenX - panX) / zoom
 */
export function screenToWorld(
  sx: number, sy: number, cam: Camera
): { wx: number; wy: number } {
  return {
    wx: (sx - cam.x) / cam.zoom,
    wy: (sy - cam.y) / cam.zoom,
  };
}

/**
 * Zoom toward a screen pivot point (cursor or pinch center).
 * Adjusts panX/panY so the world point under the pivot stays fixed.
 */
export function zoomToward(
  cam: Camera,
  newZoom: number,
  pivotSx: number,
  pivotSy: number,
): Camera {
  const clampedZoom = Math.min(5, Math.max(0.1, newZoom));
  return {
    zoom: clampedZoom,
    x: pivotSx - (pivotSx - cam.x) * (clampedZoom / cam.zoom),
    y: pivotSy - (pivotSy - cam.y) * (clampedZoom / cam.zoom),
  };
}
