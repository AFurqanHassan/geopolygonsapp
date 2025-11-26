import express from "express";
import { createServer } from "http";
import runApp from "../server/app";

// Create Express app
const app = express();
const server = createServer(app);

// Initialize the app without static file serving (Vercel handles static files)
async function initializeApp() {
    // Empty function - Vercel serves static files automatically
    const serveStatic = async (app: express.Express, _server: any) => {
        // No-op for Vercel - static files are served by Vercel's CDN
    };

    await runApp(serveStatic);
}

// Initialize app
initializeApp().catch(console.error);

// Export for Vercel serverless
export default app;
