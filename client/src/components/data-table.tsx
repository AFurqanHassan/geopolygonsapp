import { useState, useMemo } from "react";
import { CSVPoint } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";

interface DataTableProps {
  points: CSVPoint[];
}

export function DataTable({ points }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPoints = useMemo(() => {
    if (!searchTerm) return points;
    
    const term = searchTerm.toLowerCase();
    return points.filter(point => 
      point.id.toLowerCase().includes(term) ||
      point.activityGroupId.toLowerCase().includes(term) ||
      point.latitude.toString().includes(term) ||
      point.longitude.toString().includes(term)
    );
  }, [points, searchTerm]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Data Table</h2>
          <p className="text-sm text-muted-foreground" data-testid="text-data-count">
            {filteredPoints.length} of {points.length} point{points.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search points..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-points"
          />
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        {points.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No data loaded</h3>
            <p className="text-xs text-muted-foreground">
              Upload a CSV file to view point data
            </p>
          </div>
        ) : filteredPoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No results found</h3>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-card border-b border-border z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Latitude
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Longitude
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Group
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPoints.map((point, index) => (
                <tr 
                  key={point.id}
                  className={`${index % 2 === 0 ? 'bg-background' : 'bg-card/50'} hover-elevate`}
                  data-testid={`row-point-${index}`}
                >
                  <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                    {point.id}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-foreground whitespace-nowrap">
                    {point.latitude.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-foreground whitespace-nowrap">
                    {point.longitude.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                      {point.activityGroupId}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ScrollArea>
    </div>
  );
}
