// GPU layer specs — validated against @maplibre/maplibre-gl-style-spec (0 errors).
import type { Skin } from "./skins";

export type LayerSpec = Record<string, unknown>;
const GIG = "gigs", VEN = "vens";
const isCl = ["has", "point_count"];
const notCl = ["!", ["has", "point_count"]];

export const GIG_LAYERS = ["g-heat", "g-cl-bloom", "g-cl-core", "g-cl-count", "g-hit", "g-ping", "g-bloom", "g-core"];
export const VEN_LAYERS = ["v-cl-bloom", "v-cl-core", "v-cl-count", "v-hit", "v-bloom", "v-core"];
export const ALL_LAYERS = [...GIG_LAYERS, ...VEN_LAYERS];

export function buildGigLayers(skin: Skin): LayerSpec[] {
  const c = skin.colors;
  const layers: LayerSpec[] = [];
  layers.push({ id: "g-heat", type: "heatmap", source: GIG, maxzoom: 9.5, layout: { visibility: skin.heat ? "visible" : "none" }, paint: {
    "heatmap-weight": 1,
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 4, 0.7, 9, 1.6],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 4, 14, 9, 34],
    "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0.75, 9.5, 0],
    "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.2, "rgba(255,122,26,.25)", 0.45, "rgba(255,122,26,.55)", 0.7, "rgba(255,60,140,.7)", 1, "rgba(255,226,196,.95)"] } });
  layers.push({ id: "g-cl-bloom", type: "circle", source: GIG, filter: isCl, paint: { "circle-color": c.clRing, "circle-blur": 1, "circle-opacity": 0.42, "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 20, 120, 46] } });
  layers.push({ id: "g-cl-core", type: "circle", source: GIG, filter: isCl, paint: { "circle-color": c.clFill, "circle-stroke-width": 2, "circle-stroke-color": ["case", ["==", ["get", "tonight"], 1], "#ffffff", c.clRing], "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 15, 120, 34] } });
  layers.push({ id: "g-cl-count", type: "symbol", source: GIG, filter: isCl, layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Open Sans Bold"], "text-size": 13, "text-allow-overlap": true }, paint: { "text-color": "#fff", "text-halo-color": c.clRing, "text-halo-width": 0.6 } });
  layers.push({ id: "g-hit", type: "circle", source: GIG, filter: notCl, paint: { "circle-radius": 18, "circle-opacity": 0 } });
  layers.push({ id: "g-ping", type: "circle", source: GIG, filter: ["all", notCl, ["==", ["get", "tonight"], 1]], paint: { "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": c.gigGlow, "circle-stroke-width": 2, "circle-radius": 10, "circle-stroke-opacity": 0.85, "circle-pitch-alignment": "map" } });
  layers.push({ id: "g-bloom", type: "circle", source: GIG, filter: notCl, paint: { "circle-color": c.gigGlow, "circle-blur": 1, "circle-opacity": ["interpolate", ["linear"], ["zoom"], 8, skin.markerStyle === "dot" ? 0.45 : 0.35, 13, 0.6], "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 7, 13, 15, 16, 20] } });
  if (skin.markerStyle === "ring") {
    layers.push({ id: "g-core", type: "circle", source: GIG, filter: notCl, paint: { "circle-color": "rgba(10,8,14,.55)", "circle-stroke-color": c.gigCore, "circle-stroke-width": 2.4, "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4.5, 13, 7.5, 16, 10], "circle-pitch-alignment": "map" } });
  } else {
    layers.push({ id: "g-core", type: "circle", source: GIG, filter: notCl, paint: { "circle-color": c.gigCore, "circle-stroke-color": c.gigGlow, "circle-stroke-width": skin.markerStyle === "dot" ? 2 : 1.6, "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, skin.markerStyle === "dot" ? 4.2 : 3.6, 13, 6, 16, 8] } });
  }
  return layers;
}

export function buildVenueLayers(skin: Skin, visible: boolean): LayerSpec[] {
  const c = skin.colors;
  const vis = visible ? "visible" : "none";
  const liveColor = ["case", ["==", ["get", "live"], 1], c.venLive, c.venIdle];
  const layers: LayerSpec[] = [];
  layers.push({ id: "v-cl-bloom", type: "circle", source: VEN, filter: isCl, layout: { visibility: vis }, paint: { "circle-color": liveColor, "circle-blur": 1, "circle-opacity": 0.34, "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 18, 300, 44] } });
  layers.push({ id: "v-cl-core", type: "circle", source: VEN, filter: isCl, layout: { visibility: vis }, paint: { "circle-color": c.clFill, "circle-stroke-width": 2, "circle-stroke-color": liveColor, "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 14, 300, 32] } });
  layers.push({ id: "v-cl-count", type: "symbol", source: VEN, filter: isCl, layout: { visibility: vis, "text-field": ["get", "point_count_abbreviated"], "text-font": ["Open Sans Bold"], "text-size": 12, "text-allow-overlap": true }, paint: { "text-color": "#fff", "text-halo-color": liveColor, "text-halo-width": 0.5 } });
  layers.push({ id: "v-hit", type: "circle", source: VEN, filter: notCl, layout: { visibility: vis }, paint: { "circle-radius": 16, "circle-opacity": 0 } });
  layers.push({ id: "v-bloom", type: "circle", source: VEN, filter: notCl, layout: { visibility: vis }, paint: { "circle-color": liveColor, "circle-blur": 1, "circle-opacity": ["case", ["==", ["get", "live"], 1], 0.6, 0.32], "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 5, 13, 12] } });
  // Diamond venue marker (generated icons registered by skinMap.registerDiamonds)
  layers.push({ id: "v-core", type: "symbol", source: VEN, filter: notCl, layout: { visibility: vis, "icon-image": ["case", ["==", ["get", "live"], 1], "bndy-dia-live", "bndy-dia-idle"], "icon-size": ["interpolate", ["linear"], ["zoom"], 8, 0.55, 13, 0.85, 16, 1], "icon-allow-overlap": true } });
  return layers;
}
