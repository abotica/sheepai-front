"use client";

import "leaflet/dist/leaflet.css";
import { useLayoutEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { ForecastSlot, ZonesFile, Zone } from "@/lib/forecast";
import { levelColor } from "@/lib/forecast";
import { formatPassengers } from "@/lib/format";
import { map as copy } from "@/lib/copy";
import { usePrefersTouchUi } from "@/hooks/useMediaQuery";

interface MapViewProps {
  zones: ZonesFile;
  slot: ForecastSlot;
}

function geoRingToLeaflet(
  ring: Array<[number, number]>,
): Array<[number, number]> {
  return ring.map(([lng, lat]) => [lat, lng] as [number, number]);
}

/**
 * Leaflet reads container size on init; flex layouts often report 0×0 until
 * after paint. Invalidate + fit again on mount and when the container resizes.
 */
function MapLayoutSync({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const m = useMap();
  useLayoutEffect(() => {
    const pad: L.PointTuple = L.Browser.mobile ? [24, 24] : [40, 40];
    const sync = () => {
      m.invalidateSize({ animate: false });
      m.fitBounds(bounds, { padding: pad });
    };
    sync();
    const raf = requestAnimationFrame(sync);
    const el = m.getContainer();
    const ro = new ResizeObserver(() => sync());
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [bounds, m]);
  return null;
}

const DOCK_ICON = L.divIcon({
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  html: `
    <div style="
      width: 32px;
      height: 32px;
      border-radius: 9999px;
      background: #D9614B;
      border: 2px solid #FBF8F2;
      box-shadow: 0 1px 2px 0 rgba(10,31,46,0.10), 0 0 0 1px rgba(217,97,75,0.20);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FBF8F2;
      font-family: var(--font-sans), system-ui, sans-serif;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: -0.01em;
    ">⚓</div>
  `,
});

interface ZonePolygonProps {
  zone: Zone;
  load: number;
  share: number;
  level: ForecastSlot["zones"][string]["level"];
  densityPph?: number;
  showHoverTooltip: boolean;
  showHoverStyle: boolean;
}

function ZonePolygon({
  zone,
  load,
  share,
  level,
  densityPph,
  showHoverTooltip,
  showHoverStyle,
}: ZonePolygonProps) {
  const color = levelColor(level);
  const hoverHandlers = showHoverStyle
    ? {
        mouseover: (e: { target: L.Path }) => {
          const layer = e.target;
          layer.setStyle({ weight: 2.5, fillOpacity: color.fillOpacity + 0.12 });
        },
        mouseout: (e: { target: L.Path }) => {
          const layer = e.target;
          layer.setStyle({ weight: 1.5, fillOpacity: color.fillOpacity });
        },
      }
    : {};
  return (
    <Polygon
      positions={geoRingToLeaflet(zone.polygon)}
      pathOptions={{
        color: color.stroke,
        weight: 1.5,
        opacity: 0.9,
        fillColor: color.fill,
        fillOpacity: color.fillOpacity,
      }}
      eventHandlers={hoverHandlers}
    >
      {showHoverTooltip ? (
        <Tooltip
          direction="top"
          offset={[0, -8]}
          opacity={1}
          sticky
          className="brod-tooltip"
        >
          <div className="flex max-w-[200px] flex-col gap-0.5">
            <span className="font-sans text-[13px] font-semibold leading-tight text-ink">
              {zone.name_hr}
            </span>
            <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
              <span className="font-sans text-[15px] font-bold tabular-nums text-ink">
                {formatPassengers(Math.round(load))}
              </span>
              <span className="font-sans text-[10px] text-ink-dim">
                {copy.loadLabel}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-ink-mute">
                · {(share * 100).toFixed(0)}%
              </span>
              {densityPph !== undefined && (
                <span className="font-mono text-[10px] tabular-nums text-ink-mute">
                  · {densityPph.toLocaleString("hr-HR")} {copy.densityPerHa}
                </span>
              )}
            </span>
            <span
              className="font-sans text-[10px] font-semibold uppercase"
              style={{ color: color.stroke, letterSpacing: "0.14em" }}
            >
              {color.label}
            </span>
          </div>
        </Tooltip>
      ) : null}
      <Popup maxWidth={300} className="brod-map-popup">
        <div className="flex min-w-[min(280px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col gap-2 px-4 py-3">
          <div
            className="font-sans text-[10px] font-semibold uppercase"
            style={{ color: color.stroke, letterSpacing: "0.16em" }}
          >
            {color.label}
          </div>
          <div className="font-sans text-[16px] font-semibold leading-tight text-ink">
            {zone.name_hr}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
            <span
              className="font-display text-[26px] font-bold text-ink tabular-nums"
              style={{ letterSpacing: "-0.5px" }}
            >
              {formatPassengers(Math.round(load))}
            </span>
            <span className="font-sans text-[12px] text-ink-dim">
              {copy.loadLabel}
            </span>
            {densityPph !== undefined && (
              <span className="font-mono text-[11px] tabular-nums text-ink-mute">
                · {densityPph.toLocaleString("hr-HR")} {copy.densityPerHa}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-ink-mute">
            <span className="tabular-nums">
              {(share * 100).toFixed(1)}% {copy.shareLabel}
            </span>
            <span>·</span>
            <span>
              {zone.access_mode === "walking"
                ? copy.accessWalking
                : copy.accessVehicular}
            </span>
          </div>
        </div>
      </Popup>
    </Polygon>
  );
}

export default function MapView({ zones, slot }: MapViewProps) {
  const prefersTouch = usePrefersTouchUi();
  const showFinePointerUi = !prefersTouch;

  const bounds = useMemo<L.LatLngBoundsExpression>(() => {
    const all: Array<[number, number]> = [
      [zones.cruise_dock.lat, zones.cruise_dock.lng],
      ...zones.zones.flatMap((z) => geoRingToLeaflet(z.polygon)),
    ];
    return all;
  }, [zones]);

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: L.Browser.mobile ? [24, 24] : [40, 40] }}
      scrollWheelZoom={true}
      zoomControl={false}
      zoomSnap={0.25}
      zoomDelta={0.5}
      wheelDebounceTime={40}
      wheelPxPerZoomLevel={120}
      inertia={true}
      inertiaDeceleration={2400}
      zoomAnimation={true}
      fadeAnimation={true}
      className="z-0 h-full min-h-[200px] w-full touch-pan-y touch-manipulation"
      style={{ background: "#FBF8F2", minHeight: "100%" }}
    >
      <MapLayoutSync bounds={bounds} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains={["a", "b", "c", "d"]}
        maxZoom={19}
      />

      {zones.zones.map((zone) => {
        const z = slot.zones[zone.id];
        if (!z) return null;
        return (
          <ZonePolygon
            key={zone.id}
            zone={zone}
            load={z.load}
            share={z.share}
            level={z.level}
            densityPph={z.density_pph}
            showHoverTooltip={showFinePointerUi}
            showHoverStyle={showFinePointerUi}
          />
        );
      })}

      <Marker
        position={[zones.cruise_dock.lat, zones.cruise_dock.lng]}
        icon={DOCK_ICON}
      >
        <Popup maxWidth={280}>
          <div className="flex max-w-[calc(100vw-2.5rem)] flex-col gap-1 px-4 py-3">
            <div
              className="font-sans text-[10px] font-semibold uppercase text-coral"
              style={{ letterSpacing: "0.16em" }}
            >
              {copy.dockBadge}
            </div>
            <div className="font-sans text-[16px] font-semibold leading-tight text-ink">
              {copy.dockTitle}
            </div>
            <div className="font-sans text-[12px] text-ink-dim">
              {copy.dockSubtitle}
            </div>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
