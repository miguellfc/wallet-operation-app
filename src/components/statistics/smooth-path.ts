export type ChartPoint = { x: number; y: number };

/**
 * A smooth curve through the points (Catmull-Rom turned into cubic Béziers). The control points are clamped to
 * [top, bottom] so the curve never overshoots the chart between two points.
 */
export function smoothPath(points: ChartPoint[], top: number, bottom: number) {
  if (points.length === 0) return '';
  const clampY = (y: number) => Math.min(Math.max(y, top), bottom);
  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: clampY(p1.y + (p2.y - p0.y) / 6) };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: clampY(p2.y - (p3.y - p1.y) / 6) };
    path += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
  }
  return path;
}

/** The smooth curve closed down to `baseline`, for the gradient under the line. */
export function smoothAreaPath(points: ChartPoint[], top: number, bottom: number, baseline: number) {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${smoothPath(points, top, bottom)} L${last.x},${baseline} L${first.x},${baseline} Z`;
}
