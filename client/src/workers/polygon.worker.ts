/// <reference lib="webworker" />

import concaveman from 'concaveman';
import * as turf from '@turf/turf';
import polygonClipping from 'polygon-clipping';

export interface PolygonWorkerMessage {
    type: 'generate';
    points: CSVPoint[];
    concavity: number;
    groupField: string;
    method?: 'concave' | 'simplified';
    padding?: number;
}

export interface CSVPoint {
    id: string;
    longitude: number;
    latitude: number;
    [key: string]: any;
}

export interface Polygon {
    id: string;
    groupId: string;
    groupField?: string;
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

// Douglas-Peucker algorithm for line simplification
function douglasPeucker(points: [number, number][], tolerance: number): [number, number][] {
    if (points.length <= 2) return points;

    let maxDistance = 0;
    let maxIndex = 0;
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
        const distance = perpendicularDistance(points[i], firstPoint, lastPoint);
        if (distance > maxDistance) {
            maxDistance = distance;
            maxIndex = i;
        }
    }

    if (maxDistance > tolerance) {
        const leftPart = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
        const rightPart = douglasPeucker(points.slice(maxIndex), tolerance);
        return leftPart.slice(0, -1).concat(rightPart);
    } else {
        return [firstPoint, lastPoint];
    }
}

function perpendicularDistance(point: [number, number], lineStart: [number, number], lineEnd: [number, number]): number {
    const [x, y] = point;
    const [x1, y1] = lineStart;
    const [x2, y2] = lineEnd;

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
        return Math.sqrt(A * A + B * B);
    }

    const param = dot / lenSq;
    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}



/**
 * Filter outliers from a group of points.
 * Removes points that are far from the main cluster.
 */
function filterOutliers(points: CSVPoint[], threshold: number = 2): CSVPoint[] {
    if (points.length <= 3) return points;

    // Calculate centroid
    let sumLon = 0, sumLat = 0;
    points.forEach(p => {
        sumLon += p.longitude;
        sumLat += p.latitude;
    });
    const centroidLon = sumLon / points.length;
    const centroidLat = sumLat / points.length;

    // Calculate distances from centroid
    const distances = points.map(p => {
        const dx = p.longitude - centroidLon;
        const dy = p.latitude - centroidLat;
        return Math.sqrt(dx * dx + dy * dy);
    });

    // Calculate mean and standard deviation
    const meanDist = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + (d - meanDist) ** 2, 0) / distances.length;
    const stdDev = Math.sqrt(variance);

    // Keep points within threshold * stdDev from centroid
    const maxDist = meanDist + threshold * stdDev;

    const filtered = points.filter((p, i) => distances[i] <= maxDist);

    // Return filtered if we have enough points, otherwise return original
    return filtered.length >= 8 ? filtered : points;
}

/**
 * Ensure polygon coordinates are closed (first == last)
 */
function ensureClosed(coords: [number, number][]): [number, number][] {
    if (coords.length < 3) return coords;
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
        return [...coords, [...first] as [number, number]];
    }
    return coords;
}



self.onmessage = (event: MessageEvent<PolygonWorkerMessage>) => {
    const { type, points, concavity, groupField, method = 'concave', padding = 0.05 } = event.data;

    if (type !== 'generate') {
        return;
    }

    try {
        // Group points by the selected field
        const groupedPoints = new Map<string, CSVPoint[]>();

        points.forEach((point) => {
            const key = String((point as any)[groupField] ?? 'undefined');
            const existing = groupedPoints.get(key) ?? [];
            existing.push(point);
            groupedPoints.set(key, existing);
        });



        const generatedPolygons: Polygon[] = [];
        const totalGroups = groupedPoints.size;
        let processedGroups = 0;

        groupedPoints.forEach((groupPoints, groupId) => {
            if (groupPoints.length < 3) {
                processedGroups++;
                return;
            }

            try {
                const coordinates: [number, number][] = groupPoints.map(p => [p.longitude, p.latitude]);
                let hull = concaveman(coordinates, concavity, 0);

                if (hull.length < 3) {
                    processedGroups++;
                    return;
                }

                if (hull[0][0] !== hull[hull.length - 1][0] || hull[0][1] !== hull[hull.length - 1][1]) {
                    hull.push([...hull[0]]);
                }

                let finalCoordinates = hull as [number, number][];

                if (method === 'simplified') {
                    const tolerance = padding > 0 ? padding * 0.0001 : 0.00005;
                    finalCoordinates = douglasPeucker(finalCoordinates, tolerance);

                    if (finalCoordinates.length > 0 &&
                        (finalCoordinates[0][0] !== finalCoordinates[finalCoordinates.length - 1][0] ||
                            finalCoordinates[0][1] !== finalCoordinates[finalCoordinates.length - 1][1])) {
                        finalCoordinates.push([...finalCoordinates[0]]);
                    }


                }

                const aggregatedProperties: Record<string, any> = {
                    groupId,
                    pointCount: groupPoints.length,
                    method: method
                };

                const firstPoint = groupPoints[0];
                Object.keys(firstPoint).forEach(key => {
                    if (['id', 'longitude', 'latitude'].includes(key)) return;
                    const values = groupPoints.map(p => (p as any)[key]);
                    const uniqueValues = Array.from(new Set(values));
                    if (uniqueValues.length === 1) {
                        aggregatedProperties[key] = uniqueValues[0];
                    } else {
                        aggregatedProperties[key] = uniqueValues[0];
                        aggregatedProperties[`${key}_unique_count`] = uniqueValues.length;
                    }
                });

                generatedPolygons.push({
                    id: `polygon-${groupId}`,
                    groupId: groupId,
                    groupField: groupField,
                    coordinates: finalCoordinates,
                    properties: aggregatedProperties,
                });

                processedGroups++;

                if (processedGroups % 10 === 0) {
                    self.postMessage({
                        type: 'progress',
                        groupsProcessed: processedGroups,
                        totalGroups,
                        currentGroup: groupId,
                    } as PolygonWorkerProgress);
                }

            } catch (err) {
                console.error(`Failed to generate polygon for group ${groupId}:`, err);
                processedGroups++;
            }
        });

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
