"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BaiduSceneMap } from "~/app/game/_components/BaiduSceneMap";
import {
  buildBaiduStaticMapUrl,
  buildBaiduStaticPanoramaUrl,
} from "~/lib/baidu-panorama";
import { type TuxunLocation } from "~/lib/tuxun-locations";

type SceneImageMode = "panorama" | "static-map" | "base-map" | "error";

interface Props {
  location: TuxunLocation;
}

export function BaiduPanorama({ location }: Props) {
  const [imageMode, setImageMode] = useState<SceneImageMode>("panorama");

  useEffect(() => {
    setImageMode("panorama");
  }, [location.id]);

  const panoramaUrl = useMemo(
    () =>
      buildBaiduStaticPanoramaUrl({
        lng: location.lng,
        lat: location.lat,
        heading: location.heading,
        pitch: location.pitch,
      }),
    [location.heading, location.lat, location.lng, location.pitch],
  );

  const staticMapUrl = useMemo(
    () =>
      buildBaiduStaticMapUrl({
        lng: location.lng,
        lat: location.lat,
      }),
    [location.lat, location.lng],
  );

  const sceneImageUrl =
    imageMode === "panorama"
      ? panoramaUrl
      : imageMode === "static-map"
        ? staticMapUrl
        : null;

  const handleSceneImageError = useCallback(() => {
    if (imageMode === "panorama" && staticMapUrl) {
      setImageMode("static-map");
      return;
    }

    if (imageMode === "static-map") {
      setImageMode("base-map");
      return;
    }

    setImageMode("error");
  }, [imageMode, staticMapUrl]);

  useEffect(() => {
    if (!sceneImageUrl || imageMode === "error") return;

    let active = true;
    const image = new Image();
    const fail = () => {
      if (!active) return;
      handleSceneImageError();
    };
    const timer = window.setTimeout(() => {
      if (image.complete && image.naturalWidth === 0) fail();
    }, 2500);

    image.onload = () => {
      if (image.naturalWidth === 0) fail();
    };
    image.onerror = fail;
    image.src = sceneImageUrl;

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [handleSceneImageError, imageMode, sceneImageUrl]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-stone-950">
      {imageMode === "base-map" ? (
        <BaiduSceneMap center={{ lat: location.lat, lng: location.lng }} />
      ) : sceneImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${location.id}-${imageMode}`}
          src={sceneImageUrl}
          alt={
            imageMode === "panorama"
              ? "待猜地点的百度全景静态图"
              : "待猜地点附近的百度静态地图"
          }
          className="h-full min-h-[420px] w-full object-cover"
          onError={handleSceneImageError}
        />
      ) : (
        <div className="grid h-full min-h-[420px] place-items-center bg-stone-950 text-center">
          <div className="max-w-md px-6">
            <div className="text-lg font-bold text-stone-100">
              无法加载百度地图图像
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              请确认 NEXT_PUBLIC_BAIDU_MAP_AK 已配置，并且该 AK
              至少开通了基础静态图服务。
            </p>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 rounded-md border border-black/40 bg-stone-950/80 px-3 py-2 text-xs font-semibold text-stone-200 shadow-lg shadow-black/30">
        {imageMode === "base-map"
          ? "百度 JS 底图占位"
          : imageMode === "static-map"
            ? "百度静态图占位"
            : "百度全景静态图"}
      </div>
      {(imageMode === "static-map" || imageMode === "base-map") && (
        <div className="absolute right-4 bottom-4 max-w-xs rounded-md border border-sky-500/40 bg-stone-950/85 px-3 py-2 text-xs leading-5 text-sky-100 shadow-lg shadow-black/30">
          当前 AK 未返回可用全景图，已降级为基础地图服务；这不是街景等价替代。
        </div>
      )}
    </div>
  );
}
