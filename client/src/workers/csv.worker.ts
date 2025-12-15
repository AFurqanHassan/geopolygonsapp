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
    detectedColumns: {
        longitude: string | null;
        latitude: string | null;
        group: string | null;
    };
}

export interface CSVWorkerError {
    type: 'error';
    message: string;
}

export interface CSVWorkerChunk {
    type: 'chunk';
    points: CSVPoint[];
    rowsProcessed: number;
}

export interface CSVPoint {
    id: string;
    longitude: number;
    latitude: number;
    [key: string]: any;
}

let rowIndex = 0;
let pointsBuffer: CSVPoint[] = [];
let errorsBuffer: string[] = [];
const CHUNK_SIZE = 25000; // Send data to main thread every 25k rows

// Detected column names (set during first row processing)
let detectedLonCol: string | null = null;
let detectedLatCol: string | null = null;
let detectedGroupCol: string | null = null;
let columnsDetected = false;

// Column name patterns for flexible matching
const LONGITUDE_PATTERNS = [
    /^lon$/i, /^lng$/i, /^long$/i, /^longitude$/i,
    /^x$/i, /^xcoord$/i, /^x_coord$/i, /^x-coord$/i,
    /^easting$/i, /^east$/i,
    /lon/i, /lng/i, /long/i,
    /^coord.*x/i, /x.*coord/i,
];

const LATITUDE_PATTERNS = [
    /^lat$/i, /^latitude$/i,
    /^y$/i, /^ycoord$/i, /^y_coord$/i, /^y-coord$/i,
    /^northing$/i, /^north$/i,
    /lat/i,
    /^coord.*y/i, /y.*coord/i,
];

const GROUP_PATTERNS = [
    // Only look for explicitly named group columns
    /^activitygroupid$/i, /^activity_group_id$/i, /^activitygroup$/i,
    /^groupid$/i, /^group_id$/i, /^group$/i,
    /^category$/i, /^class$/i, /^type$/i,
    /^zone$/i, /^region$/i, /^area$/i,
    /^district$/i, /^sector$/i, /^cluster$/i,
];

function findMatchingColumn(columns: string[], patterns: RegExp[]): string | null {
    // Try exact matches first (patterns at the start of the list are more specific)
    for (const pattern of patterns) {
        for (const col of columns) {
            if (pattern.test(col)) {
                return col;
            }
        }
    }
    return null;
}

function detectColumns(row: Record<string, any>): void {
    const columns = Object.keys(row);

    // Detect longitude column (REQUIRED)
    detectedLonCol = findMatchingColumn(columns, LONGITUDE_PATTERNS);

    // Detect latitude column (REQUIRED)
    detectedLatCol = findMatchingColumn(columns, LATITUDE_PATTERNS);

    // Detect group column (OPTIONAL - skip coordinate columns)
    const nonCoordColumns = columns.filter(col =>
        col !== detectedLonCol && col !== detectedLatCol
    );
    detectedGroupCol = findMatchingColumn(nonCoordColumns, GROUP_PATTERNS);
    // If no group column found, just use null (will default to "default" value)
    // All other columns are preserved as extra properties

    columnsDetected = true;
    console.log('[CSV Worker] Detected columns:', {
        longitude: detectedLonCol,
        latitude: detectedLatCol,
        group: detectedGroupCol
    });
}

function getColumnValue(row: Record<string, any>, detectedCol: string | null): any {
    if (detectedCol && row[detectedCol] !== undefined) {
        return row[detectedCol];
    }
    return undefined;
}

function parseCoordinate(value: any): number | null {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    // Convert to string and normalize
    let strValue = String(value).trim();

    // Handle common locale formats:
    // - European format: "1.234,56" -> "1234.56"
    // - Spaces as thousands separator: "1 234.56" -> "1234.56"
    // - Comma as decimal: "1234,56" -> "1234.56"

    // Remove spaces
    strValue = strValue.replace(/\s/g, '');

    // If there's both comma and period, determine which is decimal
    const hasComma = strValue.includes(',');
    const hasPeriod = strValue.includes('.');

    if (hasComma && hasPeriod) {
        // Both present - assume the last one is decimal separator
        const lastComma = strValue.lastIndexOf(',');
        const lastPeriod = strValue.lastIndexOf('.');

        if (lastComma > lastPeriod) {
            // Comma is decimal separator (European format: 1.234,56)
            strValue = strValue.replace(/\./g, '').replace(',', '.');
        } else {
            // Period is decimal separator (US format: 1,234.56)
            strValue = strValue.replace(/,/g, '');
        }
    } else if (hasComma && !hasPeriod) {
        // Only comma - could be decimal separator
        // Check if it's likely a thousands separator (more than 3 digits after comma)
        const parts = strValue.split(',');
        if (parts.length === 2 && parts[1].length <= 3) {
            // Likely decimal separator
            strValue = strValue.replace(',', '.');
        } else {
            // Likely thousands separator
            strValue = strValue.replace(/,/g, '');
        }
    }

    const num = Number(strValue);
    return Number.isFinite(num) ? num : null;
}

self.onmessage = async (event: MessageEvent<CSVWorkerMessage>) => {
    const { type, file } = event.data;

    if (type !== 'parse') {
        return;
    }

    // Reset state
    rowIndex = 0;
    pointsBuffer = [];
    errorsBuffer = [];
    detectedLonCol = null;
    detectedLatCol = null;
    detectedGroupCol = null;
    columnsDetected = false;

    Papa.parse(file, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        worker: false, // We're already in a worker
        chunk: (results, parser) => {
            // Process chunk of rows
            results.data.forEach((row: any) => {
                // Detect columns on first row
                if (!columnsDetected) {
                    detectColumns(row);

                    // Check if we have required columns
                    if (!detectedLonCol || !detectedLatCol) {
                        const availableCols = Object.keys(row).join(', ');
                        errorsBuffer.push(
                            `Could not detect coordinate columns. ` +
                            `Available columns: ${availableCols}. ` +
                            `Please ensure your CSV has columns for longitude (e.g., lon, lng, longitude, x) ` +
                            `and latitude (e.g., lat, latitude, y).`
                        );
                    }
                }

                // Skip if we couldn't detect coordinate columns
                if (!detectedLonCol || !detectedLatCol) {
                    rowIndex++;
                    return;
                }

                // Get coordinate values using detected columns
                const longitudeRaw = getColumnValue(row, detectedLonCol);
                const latitudeRaw = getColumnValue(row, detectedLatCol);
                const groupRaw = getColumnValue(row, detectedGroupCol);

                // Parse coordinates with locale-aware parsing
                const longitude = parseCoordinate(longitudeRaw);
                const latitude = parseCoordinate(latitudeRaw);

                // Skip invalid rows but continue processing others
                if (longitude === null || latitude === null) {
                    if (rowIndex < 10) { // Only log first 10 errors in detail
                        errorsBuffer.push(
                            `Row ${rowIndex + 1}: Invalid coordinates ` +
                            `(${detectedLonCol}="${longitudeRaw}", ${detectedLatCol}="${latitudeRaw}")`
                        );
                    }
                    rowIndex++;
                    return;
                }

                // Validate coordinate ranges
                if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
                    // Coords might be swapped - try to detect and fix
                    if (latitude >= -180 && latitude <= 180 && longitude >= -90 && longitude <= 90) {
                        // Looks like they're swapped
                        const point: CSVPoint = {
                            id: `point-${rowIndex}`,
                            longitude: latitude, // Swap
                            latitude: longitude, // Swap
                            // Preserve all original columns from CSV
                            ...Object.keys(row).reduce((acc, key) => {
                                if (key !== detectedLonCol && key !== detectedLatCol) {
                                    acc[key] = row[key];
                                }
                                return acc;
                            }, {} as Record<string, any>)
                        };
                        pointsBuffer.push(point);
                    } else if (rowIndex < 10) {
                        errorsBuffer.push(
                            `Row ${rowIndex + 1}: Coordinates out of range ` +
                            `(lon=${longitude}, lat=${latitude})`
                        );
                    }
                    rowIndex++;
                    return;
                }

                // Create point with all CSV columns preserved
                const point: CSVPoint = {
                    id: `point-${rowIndex}`,
                    longitude,
                    latitude,
                    // Include all original columns from the CSV (except lon/lat which are normalized)
                    ...Object.keys(row).reduce((acc, key) => {
                        // Skip only the coordinate columns we've already extracted
                        if (key !== detectedLonCol && key !== detectedLatCol) {
                            acc[key] = row[key];
                        }
                        return acc;
                    }, {} as Record<string, any>)
                };

                pointsBuffer.push(point);
                rowIndex++;

                // Send chunk to main thread if buffer is large enough
                if (pointsBuffer.length >= CHUNK_SIZE) {
                    self.postMessage({
                        type: 'chunk',
                        points: pointsBuffer,
                        rowsProcessed: rowIndex,
                    } as CSVWorkerChunk);
                    pointsBuffer = []; // Clear buffer after sending
                }

                // Report progress periodically
                if (rowIndex % 10000 === 0) {
                    self.postMessage({
                        type: 'progress',
                        rowsProcessed: rowIndex,
                        points: [],
                    } as CSVWorkerProgress);
                }
            });
        },
        complete: () => {
            // Send any remaining points
            if (pointsBuffer.length > 0) {
                self.postMessage({
                    type: 'chunk',
                    points: pointsBuffer,
                    rowsProcessed: rowIndex,
                } as CSVWorkerChunk);
                pointsBuffer = [];
            }

            // Send complete message with detected columns info
            self.postMessage({
                type: 'complete',
                points: [], // Points already sent in chunks
                errors: errorsBuffer,
                detectedColumns: {
                    longitude: detectedLonCol,
                    latitude: detectedLatCol,
                    group: detectedGroupCol,
                },
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
