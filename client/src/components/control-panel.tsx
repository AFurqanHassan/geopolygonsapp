import React from "react";
import { useState, useEffect, useRef } from "react";
import { CSVPoint, Polygon } from "@shared/schema";
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
  const [progressMessage, setProgressMessage] = useState("");
  const [groupsProcessed, setGroupsProcessed] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);
  const { toast } = useToast();
  const polygonWorkerRef = useRef<Worker | null>(null);

  // Reset state when points are cleared
  useEffect(() => {
    if (points.length === 0 && lastGeneratedCount > 0) {
      setLastGeneratedCount(0);
      onResetState?.();
    }
  }, [points.length, lastGeneratedCount, onResetState]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (polygonWorkerRef.current) {
        polygonWorkerRef.current.terminate();
        polygonWorkerRef.current = null;
      }
    };
  }, []);

  const [groupField, setGroupField] = useState<string>('activityGroupId');

  // Extract available columns from the first point (if available)
  const availableColumns = React.useMemo(() => {
    if (points.length === 0) return ['activityGroupId'];

    const firstPoint = points[0];
    const columns = Object.keys(firstPoint).filter(
      key => !['id', 'longitude', 'latitude'].includes(key)
    );

    // Ensure activityGroupId is always available as default
    if (!columns.includes('activityGroupId')) {
      columns.unshift('activityGroupId');
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
    setProgressMessage("");
    setGroupsProcessed(0);
    setTotalGroups(0);

    // Terminate existing worker if any
    if (polygonWorkerRef.current) {
      polygonWorkerRef.current.terminate();
    }

    // Create new worker
    const worker = new Worker(
      new URL('../workers/polygon.worker.ts', import.meta.url),
      { type: 'module' }
    );
    polygonWorkerRef.current = worker;

    worker.onmessage = (event) => {
      const { type } = event.data;

      if (type === 'progress') {
        const { groupsProcessed: processed, totalGroups: total, currentGroup } = event.data;
        setGroupsProcessed(processed);
        setTotalGroups(total);
        setProgressMessage(`Processing group: ${currentGroup} (${processed}/${total})`);
      } else if (type === 'complete') {
        const { polygons: generatedPolygons } = event.data;

        onPolygonsGenerated(generatedPolygons);
        setLastGeneratedCount(generatedPolygons.length);
        setIsGenerating(false);
        setProgressMessage("");

        toast({
          title: "Success",
          description: `Generated ${generatedPolygons.length} polygon${generatedPolygons.length !== 1 ? 's' : ''}`,
        });

        // Cleanup
        worker.terminate();
        polygonWorkerRef.current = null;
      } else if (type === 'error') {
        const errorMsg = event.data.message || "Failed to generate polygons";

        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });

        setIsGenerating(false);
        setProgressMessage("");

        // Cleanup
        worker.terminate();
        polygonWorkerRef.current = null;
      }
    };

    worker.onerror = (error) => {
      toast({
        title: "Worker Error",
        description: error.message || "Failed to generate polygons",
        variant: "destructive",
      });

      setIsGenerating(false);
      setProgressMessage("");

      // Cleanup
      worker.terminate();
      polygonWorkerRef.current = null;
    };

    // Start processing
    worker.postMessage({
      type: 'generate',
      points,
      concavity,
      groupField,
    });
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

        {isGenerating && progressMessage && (
          <div className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg text-xs text-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mt-0.5" />
            <p>{progressMessage}</p>
          </div>
        )}

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
