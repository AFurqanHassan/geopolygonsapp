import { z } from "zod";

// CSV Point Schema - allows additional dynamic fields from CSV
export const csvPointSchema = z.object({
  id: z.string(),
  longitude: z.number(),
  latitude: z.number(),
  activityGroupId: z.string(),
}).passthrough(); // Allow additional fields from CSV

export type CSVPoint = z.infer<typeof csvPointSchema>;

// Polygon Schema
export const polygonSchema = z.object({
  id: z.string(),
  activityGroupId: z.string(),
  coordinates: z.array(z.tuple([z.number(), z.number()])),
  properties: z.record(z.unknown()).optional(),
});

export type Polygon = z.infer<typeof polygonSchema>;

// GeoJSON Feature Schema for export
export const geoJSONFeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: z.object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
  }),
  properties: z.record(z.unknown()),
});

export type GeoJSONFeature = z.infer<typeof geoJSONFeatureSchema>;

// GeoJSON FeatureCollection Schema
export const geoJSONFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(geoJSONFeatureSchema),
});

export type GeoJSONFeatureCollection = z.infer<typeof geoJSONFeatureCollectionSchema>;
