import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Optional API endpoints for future server-side features
  // Current MVP uses client-side processing only
  
  // Example: Save points to server (optional)
  app.post("/api/points", async (req, res) => {
    try {
      await storage.savePoints(req.body);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Example: Get points from server (optional)
  app.get("/api/points", async (req, res) => {
    try {
      const points = await storage.getPoints();
      res.json(points);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
