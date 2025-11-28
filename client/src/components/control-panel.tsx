import React from "react";
import { useState, useEffect } from "react";
import { CSVPoint, Polygon } from "@shared/schema";
import concaveman from "concaveman";
import shpwrite from "@mapbox/shp-write";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Shapes, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ControlPanelProps {
  points: CSVPoint[];
  concavity: number;
  onConcavityChange: (value: number) => void;
  onPolygonsGenerated: (polygons: Polygon[]) => void;
  polygons: Polygon[];
  onResetState?: () => void;
}

export function ControlPanel({
  points,
  concavity,
  onConcavityChange,
  onPolygonsGenerated,
  polygons,
  onResetState,
}: ControlPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedCount, setLastGeneratedCount] = useState(0);
  const { toast } = useToast();

  // Reset state when points are cleared
  useEffect(() => {
    if (points.length === 0 && lastGeneratedCount > 0) {
      setLastGeneratedCount(0);
      onResetState?.();
    }
  }, [points.length, lastGeneratedCount, onResetState]);

  const [groupField, setGroupField] = useState<string>('A ctivityGroupId');

  // Extract available columns from the first point (if available)
  const availableColumns = React.useMemo(() => {
    if (points.length === 0) return ['ActivityGroupId'];

    const firstPoint = points[0];
    const columns = Object.keys(firstPoint).filter(
      key => !['id', 'longitude', 'latitude'].includes(key)
    );

    // Ensure activityGroupId is always available as default
    if (!columns.includes('ActivityGroupId')) {
      columns.unshift('ActivityGroupId');
    }

    return columns;
  }, [points]);

  const handleGeneratePolygons = () => {
    if (points.length === 0) {
      toast({
        title: "No data",
        description: "Please upload a CSV file first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Group points by the selected field (groupField)
      const groupedPoints = new Map<string, CSVPoint[]>();
      points.forEach(point => {
        const key = String((point as any)[groupField] ?? 'undefined');
        const existing = groupedPoints.get(key) ?? [];
        existing.push(point);
        groupedPoints.set(key, existing);
      });

      const generatedPolygons: Polygon[] = [];

      // Generate a concave hull for each group
      groupedPoints.forEach((groupPoints, groupId) => {
        if (groupPoints.length < 3) {
          console.warn(`Group ${groupId} has less than 3 points, skipping polygon generation`);
          return;
        }

        // Convert points to coordinate array for concaveman
        const coordinates: [number, number][] = groupPoints.map(p => [p.longitude, p.latitude]);

        try {
          const hull = concaveman(coordinates, concavity, 0);

          // Validate hull has at least 3 vertices
          if (hull.length < 3) {
            console.warn(`Group ${groupId} generated invalid hull with ${hull.length} vertices, skipping`);
            return;
          }

          // Verify all coordinates are valid numbers
          const validHull = hull.every(coord =>
            Array.isArray(coord) &&
            coord.length === 2 &&
            Number.isFinite(coord[0]) &&
            Number.isFinite(coord[1])
          );
          if (!validHull) {
            console.warn(`Group ${groupId} generated hull with invalid coordinates, skipping`);
            return;
          }

          // Aggregate all CSV attributes from the points in this group
          const aggregatedProperties: Record<string, any> = {
            groupId,
            pointCount: groupPoints.length,
          };

          // Collect all unique attributes from the points
          // For each attribute, if all points have the same value, use it
          // Otherwise, collect unique values or use the first value
          const firstPoint = groupPoints[0];
          Object.keys(firstPoint).forEach(key => {
            // Skip coordinate and id fields
            if (['id', 'longitude', 'latitude'].includes(key)) return;

            // Check if all points have the same value for this attribute
            const values = groupPoints.map(p => (p as any)[key]);
            const uniqueValues = Array.from(new Set(values));

            if (uniqueValues.length === 1) {
              // All points have the same value
              aggregatedProperties[key] = uniqueValues[0];
            } else {
              // Multiple values - store the first one and add a count
              aggregatedProperties[key] = uniqueValues[0];
              aggregatedProperties[`${key}_unique_count`] = uniqueValues.length;
            }
          });

          generatedPolygons.push({
            id: `polygon-${groupId}`,
            activityGroupId: groupId,
            coordinates: hull as [number, number][],
            properties: aggregatedProperties,
          });
        } catch (err) {
          console.error(`Failed to generate polygon for group ${groupId}:`, err);
        }
      });

      onPolygonsGenerated(generatedPolygons);
      setLastGeneratedCount(generatedPolygons.length);
      toast({
        title: "Success",
        description: `Generated ${generatedPolygons.length} polygon${generatedPolygons.length !== 1 ? 's' : ''}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate polygons",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportShapefile = () => {
    if (polygons.length === 0) {
      toast({
        title: "No polygons",
        description: "Please generate polygons first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert polygons to GeoJSON features with properly closed rings
      const features = polygons
        .filter(polygon => {
          // Skip invalid polygons with less than 3 coordinates
          if (polygon.coordinates.length < 3) {
            console.warn(`Skipping polygon ${polygon.id} with less than 3 coordinates`);
            return false;
          }
          return true;
        })
        .map(polygon => {
          // Ensure polygon is closed (first and last coordinates must be equal)
          const coords = [...polygon.coordinates];
          const firstCoord = coords[0];
          const lastCoord = coords[coords.length - 1];

          // Close the ring if not already closed
          if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
            coords.push([...firstCoord]);
          }

          return {
            type: "Feature" as const,
            geometry: {
              type: "Polygon" as const,
              coordinates: [coords],
            },
            properties: {
              // Export all properties from the polygon (includes all CSV attributes)
              activityGroupId: polygon.activityGroupId,
              id: polygon.id,
              ...(polygon.properties || {}),
            },
          };
        });

      if (features.length === 0) {
        throw new Error("No valid polygons to export");
      }

      const geojson = {
        type: "FeatureCollection" as const,
        features,
      };

      // Download shapefile using shp-write
      const options = {
        folder: "geopolygon-export",
        types: {
          polygon: "polygons",
        },
        compression: "DEFLATE" as const,
        outputType: "blob" as const,
      };

      console.log("Attempting shapefile export with", features.length, "features");
      shpwrite.download(geojson, options);

      toast({
        title: "Export started",
        description: "Shapefile download has been initiated",
      });
    } catch (error: any) {
      console.error("Shapefile export error:", error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to export shapefile. Try GeoJSON export instead.",
        variant: "destructive",
      });
    }
  };

  const handleExportGeoJSON = () => {
    if (polygons.length === 0) {
      toast({
        title: "No polygons",
        description: "Please generate polygons first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert polygons to GeoJSON features
      const features = polygons
        .filter(polygon => polygon.coordinates.length >= 3)
        .map(polygon => {
          const coords = [...polygon.coordinates];
          const firstCoord = coords[0];
          const lastCoord = coords[coords.length - 1];

          if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
            coords.push([...firstCoord]);
          }

          return {
            type: "Feature" as const,
            geometry: {
              type: "Polygon" as const,
              coordinates: [coords],
            },
            properties: {
              // Export all properties from the polygon (includes all CSV attributes)
              activityGroupId: polygon.activityGroupId,
              id: polygon.id,
              ...(polygon.properties || {}),
            },
          };
        });

      const geojson = {
        type: "FeatureCollection" as const,
        features,
      };

      // Create and download GeoJSON file
      const geojsonStr = JSON.stringify(geojson, null, 2);
      const blob = new Blob([geojsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `geopolygons-${new Date().toISOString().split('T')[0]}.geojson`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Downloaded ${features.length} polygon${features.length !== 1 ? 's' : ''} as GeoJSON`,
      });
    } catch (error: any) {
      console.error("GeoJSON export error:", error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to export GeoJSON",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Polygon Generation Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Generate Polygons</h2>
          <p className="text-sm text-muted-foreground">
            Adjust concavity and generate polygons from your data
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Group By Column
          </label>
          <Select
            value={groupField}
            onValueChange={setGroupField}
            disabled={points.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a column" />
            </SelectTrigger>
            <SelectContent>
              {availableColumns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select which column to use for grouping points into polygons
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Concavity: {concavity.toFixed(2)}
          </label>
          <Slider
            value={[concavity]}
            onValueChange={(values) => onConcavityChange(values[0])}
            min={1}
            max={3}
            step={0.1}
            className="w-full"
            disabled={points.length === 0}
          />
          <p className="text-xs text-muted-foreground">
            Lower values create tighter polygons, higher values create looser ones
          </p>
        </div>

        <Button
          onClick={handleGeneratePolygons}
          disabled={points.length === 0 || isGenerating}
          className="w-full"
          data-testid="button-generate-polygons"
        >
          <Shapes className="w-4 h-4 mr-2" />
          {isGenerating ? "Generating..." : "Generate Polygons"}
        </Button>

        {lastGeneratedCount > 0 && (
          <div className="flex items-start gap-2 p-3 bg-accent/50 rounded-lg text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Generated {lastGeneratedCount} polygon{lastGeneratedCount !== 1 ? 's' : ''} from {points.length} point{points.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Export Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Export</h2>
          <p className="text-sm text-muted-foreground">
            Download polygons as Shapefile or GeoJSON
          </p>
        </div>

        <Button
          onClick={handleExportShapefile}
          disabled={polygons.length === 0}
          variant="outline"
          className="w-full"
          data-testid="button-export-shapefile"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Shapefile
        </Button>

        <Button
          onClick={handleExportGeoJSON}
          disabled={polygons.length === 0}
          variant="outline"
          className="w-full"
          data-testid="button-export-geojson"
        >
          <Download className="w-4 h-4 mr-2" />
          Export GeoJSON
        </Button>

        {polygons.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-accent/50 rounded-lg text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Shapefile: .shp, .shx, .dbf, .prj files | GeoJSON: single .geojson file
            </p>
          </div>
        )}
      </div>
    </div >
  );
}
