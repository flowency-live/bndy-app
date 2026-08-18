import "maplibre-gl";

declare module "maplibre-gl" {
  /**
   * MapView has long used the runtime-supported heading display option, but
   * maplibre-gl 4.7.x's bundled TypeScript surface omits it from the options
   * interface. Keep the local declaration aligned with the runtime call.
   */
  interface GeolocateControlOptions {
    showUserHeading?: boolean;
  }
}
