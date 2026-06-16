"use client";

import { BaiduPanoramaView } from "~/app/game/_components/BaiduPanoramaView";
import { type TuxunLocation } from "~/lib/tuxun-locations";

interface Props {
  location: TuxunLocation;
  onUnavailable?: () => void;
}

export function BaiduPanorama({ location, onUnavailable }: Props) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-stone-950">
      <BaiduPanoramaView
        point={{ lat: location.lat, lng: location.lng }}
        panoId={location.panoId}
        heading={location.heading}
        pitch={location.pitch}
        onUnavailable={onUnavailable}
      />

      <div className="absolute top-4 left-4 rounded-md border border-black/40 bg-stone-950/80 px-3 py-2 text-xs font-semibold text-stone-200 shadow-lg shadow-black/30">
        百度 JS 全景图
      </div>
    </div>
  );
}
