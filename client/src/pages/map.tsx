import { useState, useRef } from "react";
import { CSVPoint, Polygon } from "@shared/schema";
import { FileUpload } from "@/components/file-upload";
import { ControlPanel } from "@/components/control-panel";
import { MapView } from "@/components/map-view";
import { DataTable } from "@/components/data-table";
import { MapLegend } from "@/components/map-legend";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Background3D } from "@/components/background-3d";

export default function MapPage() {
  const [points, setPoints] = useState<CSVPoint[]>([]);
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [concavity, setConcavity] = useState(2);
  const [padding, setPadding] = useState(0.2);
  const [showPoints, setShowPoints] = useState(true);
  const [showPolygons, setShowPolygons] = useState(true);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  
  const sidebarRef = useRef<HTMLElement>(null);

  // Get unique group IDs from polygons (after generation)
  const uniqueGroupIds = Array.from(new Set(polygons.map(p => p.groupId)));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* 3D Background Animation */}
      <Background3D />

      {/* Left Sidebar - Control Panel */}
      <AnimatePresence mode="wait">
        {leftPanelOpen && (
          <motion.aside
            ref={sidebarRef}
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="w-80 border-r border-white/5 bg-slate-950/30 backdrop-blur-2xl flex flex-col overflow-hidden relative shadow-2xl z-20"
            data-testid="sidebar-left"
          >
            <div className="flex-1 overflow-y-auto z-10 custom-scrollbar">
              <div className="p-4 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h1 className="text-2xl font-semibold text-foreground mb-1" data-testid="text-app-title">
                    GeoPolygon
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Geospatial Data Processing
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <FileUpload
                    onPointsLoaded={setPoints}
                    onError={(error: string) => console.error(error)}
                    onClearData={() => {
                      setPolygons([]);
                      setSelectedGroupIds(new Set());
                    }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <ControlPanel
                    points={points}
                    concavity={concavity}
                    onConcavityChange={setConcavity}
                    onPolygonsGenerated={setPolygons}
                    polygons={polygons}
                    onResetState={() => {
                      setPolygons([]);
                      setSelectedGroupIds(new Set());
                    }}
                    padding={padding}
                    onPaddingChange={setPadding}
                  />
                </motion.div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content - Map */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Controls - Glassy */}
        <div className="border-b border-white/5 bg-slate-900/40 backdrop-blur-2xl px-4 py-2 flex items-center justify-between gap-4 relative overflow-hidden z-20">
          <div className="flex items-center gap-2">
            {!leftPanelOpen && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setLeftPanelOpen(true)}
                data-testid="button-toggle-left-panel"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            {leftPanelOpen && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLeftPanelOpen(false)}
                data-testid="button-close-left-panel"
              >
                Hide Controls
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showPoints ? "secondary" : "ghost"}
              onClick={() => setShowPoints(!showPoints)}
              className="toggle-elevate"
              data-state={showPoints ? "on" : "off"}
              data-testid="button-layer-points"
            >
              Points
            </Button>
            <Button
              size="sm"
              variant={showPolygons ? "secondary" : "ghost"}
              onClick={() => setShowPolygons(!showPolygons)}
              className="toggle-elevate"
              data-state={showPolygons ? "on" : "off"}
              data-testid="button-layer-polygons"
            >
              Polygons
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {!rightPanelOpen && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setRightPanelOpen(true)}
                data-testid="button-toggle-right-panel"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            {rightPanelOpen && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRightPanelOpen(false)}
                data-testid="button-close-right-panel"
              >
                Hide Data
              </Button>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <MapView
            points={points}
            polygons={polygons}
            showPoints={showPoints}
            showPolygons={showPolygons}
            selectedGroupIds={selectedGroupIds}
          />

          {/* Legend Overlay */}
          {uniqueGroupIds.length > 0 && (
            <div className="absolute bottom-4 right-4 z-[1000]">
              <MapLegend
                groupIds={uniqueGroupIds}
                selectedGroupIds={selectedGroupIds}
                onToggleGroup={(groupId: string) => {
                  const newSelected = new Set(selectedGroupIds);
                  if (newSelected.has(groupId)) {
                    newSelected.delete(groupId);
                  } else {
                    newSelected.add(groupId);
                  }
                  setSelectedGroupIds(newSelected);
                }}
                onClearFilter={() => setSelectedGroupIds(new Set())}
              />
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar - Data Table */}
      {rightPanelOpen && (
        <aside
          className="w-96 transition-all duration-200 border-l border-white/5 bg-slate-900/40 backdrop-blur-2xl flex flex-col overflow-hidden z-20"
          data-testid="sidebar-right"
        >
          <DataTable points={points} />
        </aside>
      )}
    </div>
  );
}
