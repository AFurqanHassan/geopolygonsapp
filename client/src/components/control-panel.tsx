import { useState, useEffect } from "react";
import { CSVPoint, Polygon } from "@shared/schema";
import concaveman from "concaveman";
import shpwrite from "shp-write";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
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
      // Group points by ActivityGroupId
      const groupedPoints = new Map<string, CSVPoint[]>();
      points.forEach(point => {
        if (!groupedPoints.has(point.activityGroupId)) {
          groupedPoints.set(point.activityGroupId, []);
        }
        groupedPoints.get(point.activityGroupId)!.push(point);
      });

      const generatedPolygons: Polygon[] = [];

      // Generate concave hull for each group
      groupedPoints.forEach((groupPoints, groupId) => {
        if (groupPoints.length < 3) {
          console.warn(`Group ${groupId} has less than 3 points, skipping polygon generation`);
          return;
        }

        // Convert points to coordinate array for concaveman
        const coordinates: [number, number][] = groupPoints.map(p => [p.longitude, p.latitude]);

        try {
          // Generate concave hull
          const hull = concaveman(coordinates, concavity, 0);

          // Validate hull has at least 3 vertices before storing
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

          generatedPolygons.push({
            id: `polygon-${groupId}`,
            activityGroupId: groupId,
            coordinates: hull as [number, number][],
            properties: {
              groupId,
              pointCount: groupPoints.length,
            },
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
              // Only export whitelisted properties for security and predictability
              activityGroupId: polygon.activityGroupId,
              id: polygon.id,
              pointCount: polygon.properties?.pointCount ?? 0,
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
      };

      shpwrite.download(geojson, options);

      toast({
        title: "Export started",
        description: "Shapefile download has been initiated",
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export shapefile",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Separator />

      {/* Polygon Generation Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Polygon Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure concavity for polygon generation
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Concavity
              </label>
              <span className="text-sm font-mono text-muted-foreground" data-testid="text-concavity-value">
                {concavity.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[concavity]}
              onValueChange={([value]) => onConcavityChange(value)}
              min={1}
              max={5}
              step={0.1}
              className="w-full"
              data-testid="slider-concavity"
            />
            <p className="text-xs text-muted-foreground">
              Lower = tighter fit, Higher = smoother polygon
            </p>
          </div>

          <Button
            onClick={handleGeneratePolygons}
            disabled={points.length === 0 || isGenerating}
            className="w-full"
            data-testid="button-generate-polygons"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Shapes className="w-4 h-4 mr-2" />
                Generate Polygons
              </>
            )}
          </Button>
        </div>

        {points.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p data-testid="text-point-count">
              {points.length} point{points.length !== 1 ? 's' : ''} loaded
            </p>
            <p data-testid="text-group-count">
              {new Set(points.map(p => p.activityGroupId)).size} unique group{new Set(points.map(p => p.activityGroupId)).size !== 1 ? 's' : ''}
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
            Download polygons as shapefile
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

        {polygons.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-accent/50 rounded-lg text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Exports {polygons.length} polygon{polygons.length !== 1 ? 's' : ''} as .shp, .shx, .dbf, and .prj files
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
