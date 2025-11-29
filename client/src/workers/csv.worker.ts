/// <reference lib="webworker" />

import Papa from 'papaparse';

export interface CSVWorkerMessage {
    type: 'parse';
    file: File;
}

export interface CSVWorkerProgress {
    type: 'progress';
    rowsProcessed: number;
    points: CSVPoint[];
}

export interface CSVWorkerComplete {
    type: 'complete';
    points: CSVPoint[];
    errors: string[];
}

export interface CSVWorkerError {
    type: 'error';
    message: string;
}

export interface CSVPoint {
    id: string;
    longitude: number;
    latitude: number;
    activityGroupId: string;
    [key: string]: any;
}

let rowIndex = 0;
let pointsBuffer: CSVPoint[] = [];
let errorsBuffer: string[] = [];
const BATCH_SIZE = 1000; // Report progress every 1000 rows

self.onmessage = async (event: MessageEvent<CSVWorkerMessage>) => {
    const { type, file } = event.data;

    if (type !== 'parse') {
        return;
    }

    rowIndex = 0;
    pointsBuffer = [];
    errorsBuffer = [];

    Papa.parse(file, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        worker: false, // We're already in a worker
        chunk: (results, parser) => {
            // Process chunk of rows
            results.data.forEach((row: any) => {
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
                    errorsBuffer.push(`Row ${rowIndex + 1}: Invalid coordinates (longitude="${longitudeRaw}", latitude="${latitudeRaw}")`);
                    rowIndex++;
                    return;
                }

                // Create point with all CSV columns preserved
                const point: CSVPoint = {
                    id: `point-${rowIndex}`,
                    longitude,
                    latitude,
                    activityGroupId: String(activityGroupId).trim() || "default",
                    // Include all other columns from the CSV
                    ...Object.keys(row).reduce((acc, key) => {
                        // Skip the columns we've already processed
                        const normalizedKey = key.toLowerCase();
                        if (!['longitude', 'lon', 'lng', 'x', 'latitude', 'lat', 'y', 'activitygroupid', 'groupid', 'group'].includes(normalizedKey)) {
                            acc[key] = row[key];
                        }
                        return acc;
                    }, {} as Record<string, any>)
                };

                pointsBuffer.push(point);
                rowIndex++;

                // Report progress every BATCH_SIZE rows
                if (pointsBuffer.length >= BATCH_SIZE) {
                    self.postMessage({
                        type: 'progress',
                        rowsProcessed: rowIndex,
                        points: [...pointsBuffer], // Send copy of current batch
                    } as CSVWorkerProgress);
                    pointsBuffer = []; // Clear buffer after sending
                }
            });
        },
        complete: () => {
            // Send any remaining points in buffer
            const allPoints = [...pointsBuffer];

            if (allPoints.length === 0 && errorsBuffer.length > 0) {
                // All rows failed
                const sampleErrors = errorsBuffer.slice(0, 3);
                const errorSummary = sampleErrors.join("; ") + (errorsBuffer.length > 3 ? ` ...and ${errorsBuffer.length - 3} more` : "");
                self.postMessage({
                    type: 'error',
                    message: `No valid points found. Issues: ${errorSummary}`,
                } as CSVWorkerError);
                return;
            }

            self.postMessage({
                type: 'complete',
                points: allPoints,
                errors: errorsBuffer,
            } as CSVWorkerComplete);
        },
        error: (error) => {
            self.postMessage({
                type: 'error',
                message: `CSV parsing error: ${error.message}`,
            } as CSVWorkerError);
        },
    });
};

export { };
