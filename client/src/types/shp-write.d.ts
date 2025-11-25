declare module 'shp-write' {
  interface DownloadOptions {
    folder?: string;
    types?: {
      polygon?: string;
      polyline?: string;
      point?: string;
    };
  }

  interface GeoJSON {
    type: string;
    features: any[];
  }

  function download(geojson: GeoJSON, options?: DownloadOptions): void;
  function zip(geojson: GeoJSON, options?: DownloadOptions): any;

  export { download, zip };
  export default { download, zip };
}
