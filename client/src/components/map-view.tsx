import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CSVPoint, Polygon } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

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

import { getColorForGroupId } from "@/lib/colors";


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
      attribution: '&copy; <a href="https://github.com/AFurqanHassan">AfurqanHassan</a>',
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

  const { toast } = useToast();

  // Update points
  useEffect(() => {
    if (!mapRef.current || !pointLayersRef.current) return;

    pointLayersRef.current.clearLayers();

    if (showPoints && points.length > 0) {
      const bounds = L.latLngBounds([]);

      // Limit rendered points to prevent crash
      const RENDER_LIMIT = 15000;
      const pointsToRender = points.slice(0, RENDER_LIMIT);

      if (points.length > RENDER_LIMIT) {
        // Debounce toast to avoid spamming on every render
        const toastId = "map-limit-toast";
        // We can't easily debounce here without extra state/refs, but this effect runs on points change
        // so it should be fine to just show it once per data load
        setTimeout(() => {
          // Simple check to avoid spamming if already visible (not perfect but helpful)
          const existingToasts = document.querySelectorAll('[data-radix-toast-announce]');
          if (existingToasts.length === 0) {
            toast({
              title: "Map Rendering Limited",
              description: `Showing first ${RENDER_LIMIT.toLocaleString()} of ${points.length.toLocaleString()} points to prevent browser crash. All points are still available for polygon generation.`,
              variant: "default",
            });
          }
        }, 500);
      }

      pointsToRender.forEach(point => {
        // For points, use the first available property for grouping/coloring
        const pointGroupId = Object.keys(point).find(k => !['id', 'longitude', 'latitude'].includes(k))
          ? String(point[Object.keys(point).find(k => !['id', 'longitude', 'latitude'].includes(k))!] || 'default')
          : 'default';

        if (selectedGroupIds.size > 0 && !selectedGroupIds.has(pointGroupId)) {
          return;
        }

        const color = getColorForGroupId(pointGroupId);
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
            </div>
          </div>
        `);

        marker.addTo(pointLayersRef.current!);
        bounds.extend([point.latitude, point.longitude]);
      });


    }
  }, [points, showPoints, selectedGroupIds, toast]);

  // Update polygons
  useEffect(() => {
    if (!mapRef.current || !polygonLayersRef.current) return;

    polygonLayersRef.current.clearLayers();

    if (showPolygons && polygons.length > 0) {
      polygons.forEach(polygon => {
        if (selectedGroupIds.size > 0 && !selectedGroupIds.has(polygon.groupId)) {
          return;
        }

        const color = getColorForGroupId(polygon.groupId);

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
              <div>Group: ${polygon.groupId}</div>
              <div>Points: ${polygon.properties?.pointCount || polygon.coordinates.length}</div>
              <div>Vertices: ${polygon.coordinates.length}</div>
            </div>
          </div>
        `);

        polygonLayer.addTo(polygonLayersRef.current!);
      });
    }

  }, [polygons, showPolygons, selectedGroupIds]);

  // Auto-zoom to fit visible content (points + polygons) when selection/data changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Use a small timeout to let the map render settling happen, ensuring smooth flight
    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      const bounds = L.latLngBounds([]);
      let hasVisibleItems = false;

      // Add visible polygons to bounds
      if (showPolygons && polygons.length > 0) {
        polygons.forEach(polygon => {
          if (selectedGroupIds.size > 0 && !selectedGroupIds.has(polygon.groupId)) return;

          polygon.coordinates.forEach(coord => {
            // coord is [lng, lat], bounds.extend takes [lat, lng]
            bounds.extend([coord[1], coord[0]]);
            hasVisibleItems = true;
          });
        });
      }

      // Add visible points to bounds
      // We prioritize polygons for bounds if both are present to avoid noise from scattered points?
      // No, user wants to see what is selected.
      if (showPoints && points.length > 0) {
        points.forEach(point => {
          const pointGroupId = Object.keys(point).find(k => !['id', 'longitude', 'latitude'].includes(k))
            ? String(point[Object.keys(point).find(k => !['id', 'longitude', 'latitude'].includes(k))!] || 'default')
            : 'default';

          if (selectedGroupIds.size > 0 && !selectedGroupIds.has(pointGroupId)) return;

          bounds.extend([point.latitude, point.longitude]);
          hasVisibleItems = true;
        });
      }

      if (hasVisibleItems && bounds.isValid()) {
        mapRef.current.flyToBounds(bounds, {
          padding: [50, 50],
          duration: 1.5,
          easeLinearity: 0.25
        });
      }
    }, 100);

    return () => clearTimeout(timer);

  }, [points, polygons, showPoints, showPolygons, selectedGroupIds]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      data-testid="map-container"
    />
  );
}
