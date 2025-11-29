/// <reference lib="webworker" />

import concaveman from 'concaveman';

export interface PolygonWorkerMessage {
    type: 'generate';
    points: CSVPoint[];
    concavity: number;
    groupField: string;
}

export interface CSVPoint {
    id: string;
    longitude: number;
    latitude: number;
    activityGroupId: string;
    [key: string]: any;
}

export interface Polygon {
    id: string;
    activityGroupId: string;
    coordinates: [number, number][];
    properties?: Record<string, any>;
}

export interface PolygonWorkerProgress {
    type: 'progress';
    groupsProcessed: number;
    totalGroups: number;
    currentGroup: string;
}

export interface PolygonWorkerComplete {
    type: 'complete';
    polygons: Polygon[];
}

export interface PolygonWorkerError {
    type: 'error';
    message: string;
}

self.onmessage = (event: MessageEvent<PolygonWorkerMessage>) => {
    const { type, points, concavity, groupField } = event.data;

    if (type !== 'generate') {
        return;
    }

    try {
        // Group points by the selected field
        const groupedPoints = new Map<string, CSVPoint[]>();
        points.forEach(point => {
            const key = String((point as any)[groupField] ?? 'undefined');
            const existing = groupedPoints.get(key) ?? [];
            existing.push(point);
            groupedPoints.set(key, existing);
        });

        const generatedPolygons: Polygon[] = [];
        const totalGroups = groupedPoints.size;
        let processedGroups = 0;

        // Generate a concave hull for each group
        groupedPoints.forEach((groupPoints, groupId) => {
            if (groupPoints.length < 3) {
                console.warn(`Group ${groupId} has less than 3 points, skipping polygon generation`);
                processedGroups++;
                return;
            }

            // Convert points to coordinate array for concaveman
            const coordinates: [number, number][] = groupPoints.map(p => [p.longitude, p.latitude]);

            try {
                const hull = concaveman(coordinates, concavity, 0);

                // Validate hull has at least 3 vertices
                if (hull.length < 3) {
                    console.warn(`Group ${groupId} generated invalid hull with ${hull.length} vertices, skipping`);
                    processedGroups++;
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
                    processedGroups++;
                    return;
                }

                // Aggregate all CSV attributes from the points in this group
                const aggregatedProperties: Record<string, any> = {
                    groupId,
                    pointCount: groupPoints.length,
                };

                // Collect all unique attributes from the points
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

                processedGroups++;

                // Report progress
                self.postMessage({
                    type: 'progress',
                    groupsProcessed: processedGroups,
                    totalGroups,
                    currentGroup: groupId,
                } as PolygonWorkerProgress);
            } catch (err) {
                console.error(`Failed to generate polygon for group ${groupId}:`, err);
                processedGroups++;
            }
        });

        // Send complete result
        self.postMessage({
            type: 'complete',
            polygons: generatedPolygons,
        } as PolygonWorkerComplete);
    } catch (error: any) {
        self.postMessage({
            type: 'error',
            message: error.message || 'Failed to generate polygons',
        } as PolygonWorkerError);
    }
};

export { };
