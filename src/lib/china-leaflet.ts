import type { Map as LeafletMap, CircleMarker } from "leaflet";
import {
  CHINA_BOUNDS,
  CHINA_MAP_CENTER,
  CHINA_MAP_ZOOM,
  clampToChina,
  type LatLng,
} from "~/lib/china-map";

const CHINA_LEAFLET_BOUNDS: [[number, number], [number, number]] = [
  [CHINA_BOUNDS.southWest.lat, CHINA_BOUNDS.southWest.lng],
  [CHINA_BOUNDS.northEast.lat, CHINA_BOUNDS.northEast.lng],
];

type LeafletContainer = HTMLElement & { _leaflet_id?: number };
type LeafletMapInstance = LeafletMap & { _leaflet_id?: number };

export interface ChinaGuessMapHandle {
  setMarker: (point: LatLng | null) => void;
  destroy: () => void;
}

export interface ChinaResultMarker {
  point: LatLng;
  color: string;
  label?: string;
  radius?: number;
}

export interface ChinaResultLine {
  from: LatLng;
  to: LatLng;
  color: string;
}

export interface ChinaResultMapHandle {
  destroy: () => void;
}

const noopGuessHandle: ChinaGuessMapHandle = {
  setMarker: () => undefined,
  destroy: () => undefined,
};

const noopResultHandle: ChinaResultMapHandle = {
  destroy: () => undefined,
};

async function loadLeaflet() {
  return import("leaflet");
}

/** 仅销毁仍拥有容器的地图实例，避免 Strict Mode 竞态报错 */
function safeRemoveMap(map: LeafletMap) {
  const container = map.getContainer() as LeafletContainer;
  const mapId = (map as LeafletMapInstance)._leaflet_id;
  if (mapId == null || container._leaflet_id !== mapId) return;

  try {
    map.remove();
  } catch {
    // 容器已被新实例接管时忽略
  }
}

function addGeoqTileLayer(map: LeafletMap, L: typeof import("leaflet")) {
  L.tileLayer(
    "https://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: '© <a href="https://www.geoq.cn/">GeoQ</a> 中国地图',
      maxZoom: 18,
    },
  ).addTo(map);
}

function createChinaMap(
  container: HTMLElement,
  L: typeof import("leaflet"),
  options?: { scrollWheelZoom?: boolean },
) {
  const map = L.map(container, {
    center: [CHINA_MAP_CENTER.lat, CHINA_MAP_CENTER.lng],
    zoom: CHINA_MAP_ZOOM,
    minZoom: 4,
    maxZoom: 18,
    maxBounds: CHINA_LEAFLET_BOUNDS,
    maxBoundsViscosity: 1,
    scrollWheelZoom: options?.scrollWheelZoom ?? true,
    worldCopyJump: false,
  });

  addGeoqTileLayer(map, L);

  // 可视化国界，强调仅在中国范围内操作
  L.rectangle(CHINA_LEAFLET_BOUNDS, {
    color: "#b45309",
    weight: 2,
    fill: false,
    dashArray: "8 6",
    opacity: 0.55,
    interactive: false,
  }).addTo(map);

  return map;
}

function fitMapToChinaPoints(
  map: LeafletMap,
  L: typeof import("leaflet"),
  points: LatLng[],
) {
  if (points.length === 0) return;

  const chinaBounds = L.latLngBounds(CHINA_LEAFLET_BOUNDS);
  const pointBounds = L.latLngBounds(
    points.map((p) => [p.lat, p.lng] as [number, number]),
  );

  map.fitBounds(pointBounds, {
    padding: [40, 40],
    maxZoom: 12,
  });

  // 缩放后若视野超出中国范围，则回退至全国视图
  if (!chinaBounds.contains(map.getBounds())) {
    map.fitBounds(chinaBounds, { padding: [24, 24] });
  }
}

function addCircleMarker(
  map: LeafletMap,
  L: typeof import("leaflet"),
  point: LatLng,
  color: string,
  radius = 10,
) {
  return L.circleMarker([point.lat, point.lng], {
    radius,
    fillColor: color,
    color: "#fff",
    weight: 2,
    fillOpacity: 1,
  }).addTo(map);
}

/** 猜点地图：GeoQ 中国底图 */
export async function mountGuessMap(
  container: HTMLElement,
  onGuess: (lat: number, lng: number) => void,
  isActive: () => boolean = () => true,
): Promise<ChinaGuessMapHandle> {
  const L = await loadLeaflet();
  if (!isActive()) return noopGuessHandle;

  const map = createChinaMap(container, L);
  if (!isActive()) {
    safeRemoveMap(map);
    return noopGuessHandle;
  }

  let marker: CircleMarker | null = null;
  let destroyed = false;

  const clickHandler = (event: L.LeafletMouseEvent) => {
    const point = clampToChina({
      lat: event.latlng.lat,
      lng: event.latlng.lng,
    });
    onGuess(point.lat, point.lng);
  };
  map.on("click", clickHandler);

  return {
    setMarker(point) {
      if (destroyed) return;
      marker?.remove();
      marker = null;
      if (!point) return;
      marker = addCircleMarker(map, L, point, "#f59e0b", 10);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      map.off("click", clickHandler);
      marker?.remove();
      marker = null;
      safeRemoveMap(map);
    },
  };
}

/** 结果地图：展示实际位置、猜测与连线 */
export async function mountResultMap(
  container: HTMLElement,
  markers: ChinaResultMarker[],
  lines: ChinaResultLine[] = [],
  isActive: () => boolean = () => true,
): Promise<ChinaResultMapHandle> {
  const L = await loadLeaflet();
  if (!isActive()) return noopResultHandle;

  const map = createChinaMap(container, L, { scrollWheelZoom: false });
  if (!isActive()) {
    safeRemoveMap(map);
    return noopResultHandle;
  }

  let destroyed = false;

  const points = markers.map((item) => item.point);
  fitMapToChinaPoints(map, L, points);

  for (const line of lines) {
    L.polyline(
      [
        [line.from.lat, line.from.lng],
        [line.to.lat, line.to.lng],
      ],
      {
        color: line.color,
        weight: 2,
        opacity: 0.65,
        dashArray: "6 4",
      },
    ).addTo(map);
  }

  for (const item of markers) {
    const circle = addCircleMarker(
      map,
      L,
      item.point,
      item.color,
      item.radius ?? 10,
    );
    if (item.label) {
      circle.bindTooltip(item.label, { permanent: true, direction: "top" });
    }
  }

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      safeRemoveMap(map);
    },
  };
}
