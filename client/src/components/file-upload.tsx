import { useCallback, useState } from "react";
import Papa from "papaparse";
import { CSVPoint } from "@shared/schema";
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onPointsLoaded: (points: CSVPoint[]) => void;
  onError: (error: string) => void;
  onClearData?: () => void;
}

export function FileUpload({ onPointsLoaded, onError, onClearData }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { toast } = useToast();

  const processCSV = useCallback(
    (file: File) => {
      setIsProcessing(true);
      setStatus("idle");
      setErrorMessage("");

      Papa.parse(file, {
        header: true,
        dynamicTyping: false, // Disable to get predictable string values
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const points: CSVPoint[] = [];
            const errors: string[] = [];

            results.data.forEach((row: any, index: number) => {
              // Try different common column name variations
              const longitudeRaw = row.longitude ?? row.Longitude ?? row.lon ?? row.Lon ?? row.lng ?? row.x;
              const latitudeRaw = row.latitude ?? row.Latitude ?? row.lat ?? row.Lat ?? row.y;
              const activityGroupId = row.ActivityGroupId ?? row.activityGroupId ?? row.GroupId ?? row.groupId ?? row.group ?? "default";

              // Normalize numeric strings (handle locale formats, whitespace)
              const normalizeLongRaw = String(longitudeRaw || "").trim().replace(/,/g, '.');
              const normalizeLatRaw = String(latitudeRaw || "").trim().replace(/,/g, '.');

              // Force number conversion and validate
              const longitude = Number(normalizeLongRaw);
              const latitude = Number(normalizeLatRaw);

              // Skip invalid rows but continue processing others
              if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
                errors.push(`Row ${index + 1}: Invalid coordinates (longitude="${longitudeRaw}", latitude="${latitudeRaw}")`);
                return;
              }

              points.push({
                id: `point-${index}`,
                longitude,
                latitude,
                activityGroupId: String(activityGroupId).trim() || "default",
              });
            });

            if (points.length === 0) {
              // Show detailed error when all rows fail
              const sampleErrors = errors.slice(0, 3);
              const errorSummary = sampleErrors.join("; ") + (errors.length > 3 ? ` ...and ${errors.length - 3} more` : "");
              throw new Error(`No valid points found. Issues: ${errorSummary}`);
            }

            // Show warning if some rows were skipped
            if (errors.length > 0) {
              console.warn("Skipped invalid rows:", errors);
              const sampleErrors = errors.slice(0, 2);
              toast({
                title: "Partial load",
                description: `${points.length} points loaded. Skipped ${errors.length} invalid row(s). Examples: ${sampleErrors.join("; ")}`,
                variant: "default",
              });
            }

            onPointsLoaded(points);
            setStatus("success");
            setIsProcessing(false);
          } catch (err: any) {
            const errorMsg = err.message || "Failed to parse CSV file";
            setErrorMessage(errorMsg);
            setStatus("error");
            onError(errorMsg);
            setIsProcessing(false);
          }
        },
        error: (error) => {
          const errorMsg = `CSV parsing error: ${error.message}`;
          setErrorMessage(errorMsg);
          setStatus("error");
          onError(errorMsg);
          setIsProcessing(false);
        },
      });
    },
    [onPointsLoaded, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) {
        setUploadedFile(file);
        processCSV(file);
      } else {
        const errorMsg = "Please upload a CSV file";
        setErrorMessage(errorMsg);
        setStatus("error");
        onError(errorMsg);
      }
    },
    [processCSV, onError]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setUploadedFile(file);
        processCSV(file);
      }
    },
    [processCSV]
  );

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    setStatus("idle");
    setErrorMessage("");
    onPointsLoaded([]);
    onClearData?.();
  }, [onPointsLoaded, onClearData]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Upload CSV</h2>
        <p className="text-sm text-muted-foreground">
          CSV should contain: longitude, latitude, ActivityGroupId
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
          ${isDragging ? "border-primary bg-accent" : "border-border hover:border-primary/50 hover:bg-accent/50"}
        `}
        data-testid="dropzone-csv"
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          data-testid="input-file"
        />
        
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isDragging ? "Drop CSV file here" : "Drag CSV file or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports .csv files
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded File Display */}
      {uploadedFile && (
        <Card className="p-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate" data-testid="text-filename">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(uploadedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleRemoveFile}
              className="flex-shrink-0"
              data-testid="button-remove-file"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Status Messages */}
      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Processing CSV file...</span>
        </div>
      )}

      {status === "success" && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400" data-testid="status-success">
          <CheckCircle2 className="w-4 h-4" />
          <span>CSV loaded successfully</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-start gap-2 text-sm text-destructive" data-testid="status-error">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
