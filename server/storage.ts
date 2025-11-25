import { type CSVPoint, type Polygon } from "@shared/schema";

// Storage interface for geospatial data
// Note: This app primarily uses client-side processing
// Backend storage is optional for future features

export interface IStorage {
  // CSV Points
  savePoints(points: CSVPoint[]): Promise<void>;
  getPoints(): Promise<CSVPoint[]>;
  clearPoints(): Promise<void>;
  
  // Polygons
  savePolygons(polygons: Polygon[]): Promise<void>;
  getPolygons(): Promise<Polygon[]>;
  clearPolygons(): Promise<void>;
}

export class MemStorage implements IStorage {
  private points: CSVPoint[] = [];
  private polygons: Polygon[] = [];

  async savePoints(points: CSVPoint[]): Promise<void> {
    this.points = points;
  }

  async getPoints(): Promise<CSVPoint[]> {
    return this.points;
  }

  async clearPoints(): Promise<void> {
    this.points = [];
  }

  async savePolygons(polygons: Polygon[]): Promise<void> {
    this.polygons = polygons;
  }

  async getPolygons(): Promise<Polygon[]> {
    return this.polygons;
  }

  async clearPolygons(): Promise<void> {
    this.polygons = [];
  }
}

export const storage = new MemStorage();
