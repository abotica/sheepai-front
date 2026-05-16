/**
 * Small geodesy helpers for zone polygons stored as [lng, lat] rings in
 * `zones.json`. Area uses a planar projection anchored at the polygon's mean
 * latitude — adequate for city-scale outlines (error ≪ threshold noise).
 */

/**
 * @param ring Closed or open ring in [longitude°, latitude°]. Duplicate closing
 *             vertex is ignored.
 * @returns Area in square metres (≥ 0).
 */
export function polygonAreaM2(
  ring: ReadonlyArray<readonly [number, number]>,
): number {
  if (ring.length < 3) return 0;
  const pts: Array<[number, number]> = [];
  for (const p of ring) pts.push([p[0], p[1]]);
  const [fLng, fLat] = pts[0]!;
  const [lLng, lLat] = pts[pts.length - 1]!;
  if (fLng === lLng && fLat === lLat) pts.pop();
  if (pts.length < 3) return 0;

  const latMean =
    pts.reduce((s, [, lat]) => s + lat, 0) / pts.length * (Math.PI / 180);
  const mPerDegLat = 110_574;
  const mPerDegLng = 111_320 * Math.cos(latMean);
  let sum = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [lng1, lat1] = pts[i]!;
    const [lng2, lat2] = pts[(i + 1) % n]!;
    const x1 = lng1 * mPerDegLng;
    const y1 = lat1 * mPerDegLat;
    const x2 = lng2 * mPerDegLng;
    const y2 = lat2 * mPerDegLat;
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}
