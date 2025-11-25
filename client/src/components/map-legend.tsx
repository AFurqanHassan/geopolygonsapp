import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getColorForGroupId } from "@/components/map-view";

interface MapLegendProps {
  groupIds: string[];
  selectedGroupIds: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onClearFilter: () => void;
}

export function MapLegend({ groupIds, selectedGroupIds, onToggleGroup, onClearFilter }: MapLegendProps) {
  const allSelected = selectedGroupIds.size === 0;

  return (
    <Card className="p-4 space-y-3 min-w-[200px] max-w-[300px]" data-testid="card-legend">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1" data-testid="text-legend-title">
          Activity Groups
        </h3>
        <p className="text-xs text-muted-foreground">
          Click to filter by group
        </p>
      </div>

      <div className="space-y-2">
        {groupIds.map(groupId => {
          const color = getColorForGroupId(groupId);
          const isSelected = allSelected || selectedGroupIds.has(groupId);

          return (
            <button
              key={groupId}
              onClick={() => onToggleGroup(groupId)}
              className={`
                w-full flex items-center gap-2 p-2 rounded-md transition-all
                hover-elevate active-elevate-2
                ${isSelected ? 'bg-accent' : 'opacity-50'}
              `}
              data-testid={`button-legend-group-${groupId}`}
            >
              <div
                className="w-4 h-4 rounded-sm border-2 border-white flex-shrink-0"
                style={{ backgroundColor: color }}
                data-testid={`indicator-group-${groupId}`}
              />
              <span className="text-sm font-medium text-foreground truncate" data-testid={`text-group-${groupId}`}>
                {groupId}
              </span>
            </button>
          );
        })}
      </div>

      {selectedGroupIds.size > 0 && (
        <div className="pt-2 border-t border-border">
          <button
            onClick={onClearFilter}
            className="text-xs text-primary hover:underline"
            data-testid="button-clear-filter"
          >
            Clear filter ({selectedGroupIds.size} selected)
          </button>
        </div>
      )}
    </Card>
  );
}
