import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CSVPoint, Polygon } from "@shared/schema";

// Fix Leaflet default icon paths for Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  points: CSVPoint[];
  polygons: Polygon[];
  showPoints: boolean;
  showPolygons: boolean;
  selectedGroupIds: Set<string>;
}

// Color palette for ActivityGroupIds
const COLOR_PALETTE = [
  "#2563eb", // blue
  "#059669", // green
  "#d97706", // orange
  "#9333ea", // purple
  "#dc2626", // red
  "#0891b2", // cyan
  "#ea580c", // orange-red
  "#7c3aed", // violet
  "#0d9488", // teal
  "#c026d3", // fuchsia
];

export function getColorForGroupId(groupId: string): string {
  const hash = groupId.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

export function MapView({ points, polygons, showPoints, showPolygons, selectedGroupIds }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pointLayersRef = useRef<L.LayerGroup | null>(null);
  const polygonLayersRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [0, 0],
      zoom: 2,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    pointLayersRef.current = L.layerGroup().addTo(map);
    polygonLayersRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update points
  useEffect(() => {
    if (!mapRef.current || !pointLayersRef.current) return;

    pointLayersRef.current.clearLayers();

    if (showPoints && points.length > 0) {
      const bounds = L.latLngBounds([]);

      points.forEach(point => {
        if (selectedGroupIds.size > 0 && !selectedGroupIds.has(point.activityGroupId)) {
          return;
        }

        const color = getColorForGroupId(point.activityGroupId);
        const marker = L.circleMarker([point.latitude, point.longitude], {
          radius: 5,
          fillColor: color,
          color: "#fff",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8,
        });

        marker.bindPopup(`
          <div class="text-xs">
            <div class="font-semibold mb-1">Point ${point.id}</div>
            <div class="font-mono text-xs space-y-0.5">
              <div>Lat: ${point.latitude.toFixed(6)}</div>
              <div>Lng: ${point.longitude.toFixed(6)}</div>
              <div>Group: ${point.activityGroupId}</div>
            </div>
          </div>
        `);

        marker.addTo(pointLayersRef.current!);
        bounds.extend([point.latitude, point.longitude]);
      });

      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [points, showPoints, selectedGroupIds]);

  // Update polygons
  useEffect(() => {
    if (!mapRef.current || !polygonLayersRef.current) return;

    polygonLayersRef.current.clearLayers();

    if (showPolygons && polygons.length > 0) {
      polygons.forEach(polygon => {
        if (selectedGroupIds.size > 0 && !selectedGroupIds.has(polygon.activityGroupId)) {
          return;
        }

        const color = getColorForGroupId(polygon.activityGroupId);
        
        // Convert [lng, lat] to [lat, lng] for Leaflet
        const latLngs = polygon.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);

        const polygonLayer = L.polygon(latLngs, {
          color: color,
          weight: 2,
          opacity: 0.8,
          fillColor: color,
          fillOpacity: 0.2,
        });

        polygonLayer.bindPopup(`
          <div class="text-xs">
            <div class="font-semibold mb-1">Polygon ${polygon.id}</div>
            <div class="space-y-0.5">
              <div>Group: ${polygon.activityGroupId}</div>
              <div>Points: ${polygon.properties?.pointCount || polygon.coordinates.length}</div>
              <div>Vertices: ${polygon.coordinates.length}</div>
            </div>
          </div>
        `);

        polygonLayer.addTo(polygonLayersRef.current!);
      });
    }
  }, [polygons, showPolygons, selectedGroupIds]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full"
      data-testid="map-container"
    />
  );
}
