// GPU layer specs  -  validated against @maplibre/maplibre-gl-style-spec (0 errors).
import type { Skin } from "./skins";
import { MIC_ICON, PILL_IDLE, PILL_LIVE } from "./skinMap";

/** Venue name pills appear from this zoom (clusters dominate below it anyway). */
export const VENUE_LABEL_MINZOOM = 11;

export type LayerSpec = Record<string, unknown>;
const GIG = "gigs", VEN = "vens";
const isCl = ["has", "point_count"];
const notCl = ["!", ["has", "point_count"]];

export const GIG_LAYERS = ["g-heat", "g-cl-bloom", "g-cl", "g-cl-count", "g-pin", "g-ping", "g-bloom", "g-count", "g-tik", "g-mic"];
export const VEN_LAYERS = ["v-cl-bloom", "v-cl", "v-cl-count", "v-hit", "v-bloom", "v-pin", "v-label"];
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
  layers.push({ id: "g-cl", type: "circle", source: GIG, filter: isCl, paint: { "circle-color": c.clFill, "circle-stroke-width": 2, "circle-stroke-color": ["case", ["==", ["get", "tonight"], 1], "#ffffff", c.clRing], "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 15, 120, 34] } });
  layers.push({ id: "g-cl-count", type: "symbol", source: GIG, filter: isCl, layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Open Sans Bold"], "text-size": 13, "text-allow-overlap": true }, paint: { "text-color": "#fff", "text-halo-color": c.clRing, "text-halo-width": 0.6 } });
  layers.push({ id: "g-pin", type: "circle", source: GIG, filter: notCl, paint: { "circle-radius": 18, "circle-opacity": 0 } });
  layers.push({ id: "g-ping", type: "circle", source: GIG, filter: ["all", notCl, ["==", ["get", "tonight"], 1]], paint: { "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": c.gigGlow, "circle-stroke-width": 2, "circle-radius": 10, "circle-stroke-opacity": 0.85, "circle-pitch-alignment": "map" } });
  // g-bloom: glow behind pins, radius bumped ~20% for larger cores
  layers.push({ id: "g-bloom", type: "circle", source: GIG, filter: notCl, paint: { "circle-color": c.gigGlow, "circle-blur": 1, "circle-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.4, 13, 0.6], "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 9, 13, 18, 16, 24] } });
  // g-count: solid accent-filled circles with contrast ring on all skins
  layers.push({ id: "g-count", type: "circle", source: GIG, filter: notCl, paint: { "circle-color": c.gigGlow, "circle-stroke-color": c.gigStroke, "circle-stroke-width": 2.5, "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 6, 13, 9, 16, 12], "circle-pitch-alignment": "map" } });
  // g-tik: £ glyph inside ticketed pins (free = clean default, no glyph). Only from z12  - 
  // below that the pin is too small to read a glyph; the gig sheet reveals ticketing on tap.
  // Glyph colour = c.gigCore, runtime-picked for best WCAG contrast against the accent fill.
  layers.push({ id: "g-tik", type: "symbol", source: GIG, filter: ["all", notCl, ["==", ["get", "ticketed"], 1]], minzoom: 12, layout: { "text-field": "£", "text-font": ["Open Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 12, 9.5, 16, 13], "text-allow-overlap": true, "text-ignore-placement": true }, paint: { "text-color": c.gigCore } });
  // g-mic: mic glyph inside open-mic pins (item 13). Same z-gate as g-tik  -  below
  // z12 the pin is too small to read a glyph; the gig sheet says OPEN MIC on tap.
  // Icon registered by skinMap.registerMic in the pin's contrast colour.
  layers.push({ id: "g-mic", type: "symbol", source: GIG, filter: ["all", notCl, ["==", ["get", "openmic"], 1], ["!=", ["get", "ticketed"], 1]], minzoom: 12, layout: { "icon-image": MIC_ICON, "icon-size": ["interpolate", ["linear"], ["zoom"], 12, 0.42, 16, 0.62], "icon-allow-overlap": true, "icon-ignore-placement": true } });
  return layers;
}

export function buildVenueLayers(skin: Skin, visible: boolean): LayerSpec[] {
  const c = skin.colors;
  const vis = visible ? "visible" : "none";
  const liveColor = ["case", ["==", ["get", "live"], 1], c.venLive, c.venIdle];
  const layers: LayerSpec[] = [];
  layers.push({ id: "v-cl-bloom", type: "circle", source: VEN, filter: isCl, layout: { visibility: vis }, paint: { "circle-color": liveColor, "circle-blur": 1, "circle-opacity": 0.34, "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 18, 300, 44] } });
  layers.push({ id: "v-cl", type: "circle", source: VEN, filter: isCl, layout: { visibility: vis }, paint: { "circle-color": c.clFill, "circle-stroke-width": 2, "circle-stroke-color": liveColor, "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 14, 300, 32] } });
  layers.push({ id: "v-cl-count", type: "symbol", source: VEN, filter: isCl, layout: { visibility: vis, "text-field": ["get", "point_count_abbreviated"], "text-font": ["Open Sans Bold"], "text-size": 12, "text-allow-overlap": true }, paint: { "text-color": "#fff", "text-halo-color": liveColor, "text-halo-width": 0.5 } });
  layers.push({ id: "v-hit", type: "circle", source: VEN, filter: notCl, layout: { visibility: vis }, paint: { "circle-radius": 16, "circle-opacity": 0 } });
  layers.push({ id: "v-bloom", type: "circle", source: VEN, filter: notCl, layout: { visibility: vis }, paint: { "circle-color": liveColor, "circle-blur": 1, "circle-opacity": ["case", ["==", ["get", "live"], 1], 0.6, 0.32], "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 5, 13, 12] } });
  // Diamond venue marker (generated icons registered by skinMap.registerDiamonds)  -  icon-size bumped ~15%
  layers.push({ id: "v-pin", type: "symbol", source: VEN, filter: notCl, layout: { visibility: vis, "icon-image": ["case", ["==", ["get", "live"], 1], "bndy-dia-live", "bndy-dia-idle"], "icon-size": ["interpolate", ["linear"], ["zoom"], 8, 0.63, 13, 0.98, 16, 1.15], "icon-allow-overlap": true } });
  // v-label: venue name pill (nine-patch registered by skinMap.registerPills). Singles only  - 
  // clusters can never grow labels. Native collision drops clashing pills (never the diamonds:
  // v-pin has icon-allow-overlap). Variable anchors fan pills below→above→right→left before
  // one drops; live venues out-prioritise idle via symbol-sort-key. Pill = --txt on --card,
  // WCAG AA verified on all 9 skins (worst = solar 10.6:1).
  layers.push({ id: "v-label", type: "symbol", source: VEN, filter: notCl, minzoom: VENUE_LABEL_MINZOOM, layout: {
    visibility: vis,
    "icon-image": ["case", ["==", ["get", "live"], 1], PILL_LIVE, PILL_IDLE],
    "icon-text-fit": "both", "icon-text-fit-padding": [3, 9, 3, 9],
    "text-field": ["get", "name"],
    "text-font": ["Open Sans Bold"],
    "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10.5, 14, 12.5],
    "text-variable-anchor": ["top", "bottom", "left", "right"],
    "text-radial-offset": 1.05,
    "symbol-sort-key": ["case", ["==", ["get", "live"], 1], 0, 1],
  }, paint: { "text-color": c.pillTxt ?? "#ffffff" } });
  return layers;
}