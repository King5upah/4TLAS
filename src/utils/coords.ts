import type { Vec2, MapTransform } from '../types';

export function worldToScreen(wx: number, wy: number, tr: MapTransform, cw: number, ch: number): Vec2 {
  return {
    x: wx * tr.scale + tr.x + cw / 2,
    y: wy * tr.scale + tr.y + ch / 2,
  };
}

export function screenToWorld(sx: number, sy: number, tr: MapTransform, cw: number, ch: number): Vec2 {
  return {
    x: (sx - tr.x - cw / 2) / tr.scale,
    y: (sy - tr.y - ch / 2) / tr.scale,
  };
}

export function zoomAtPoint(tr: MapTransform, sx: number, sy: number, cw: number, ch: number, factor: number): MapTransform {
  const newScale = Math.max(1e-20, tr.scale * factor);
  const wx = (sx - tr.x - cw / 2) / tr.scale;
  const wy = (sy - tr.y - ch / 2) / tr.scale;
  return { scale: newScale, x: sx - cw / 2 - wx * newScale, y: sy - ch / 2 - wy * newScale };
}

export function fitToView(bodies: { orbitRadius?: number | null }[], cw: number, ch: number): MapTransform {
  const maxR = Math.max(...bodies.map(b => b.orbitRadius ?? 0), 1);
  return { x: 0, y: 0, scale: (Math.min(cw, ch) * 0.38) / maxR };
}

/** Format km distance into human-readable string */
export function formatDist(km: number): string {
  const a = Math.abs(km);
  if (a >= 9.461e12) return `${(km / 9.461e12).toFixed(2)} ly`;
  if (a >= 1e9) return `${(km / 1e9).toFixed(2)} Tm`;
  if (a >= 1e6) return `${(km / 1e6).toFixed(2)} Gm`;
  if (a >= 1e3) return `${(km / 1e3).toFixed(1)} Mm`;
  return `${km.toFixed(0)} km`;
}

export function formatAU(km: number): string {
  return `${(km / 149_597_870.7).toFixed(4)} AU`;
}

export function euclidDist(a: Vec2, b: Vec2): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/** Logarithmic pixel radius for rendering — keeps small and large bodies both visible */
export function bodyPx(radiusKm: number): number {
  return Math.max(3, Math.log10(Math.max(radiusKm, 1) + 1) * 4.5);
}

/** Resolve child/feature position to absolute world coordinates */
export function absPos(pos: Vec2, parent?: Vec2): Vec2 {
  return parent ? { x: parent.x + pos.x, y: parent.y + pos.y } : pos;
}
