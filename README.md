# GeoPolygons - Geospatial Data Processing Application

A powerful web application for processing CSV geospatial data and generating concave hull polygons from point clusters. Built with React, TypeScript, Leaflet, and Express.

![GeoPolygons Application](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage Guide](#usage-guide)
- [Technical Architecture](#technical-architecture)
- [Performance Optimization](#performance-optimization)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Core Functionality

- **CSV Data Import**: Upload CSV files containing geospatial point data (latitude/longitude coordinates)
- **Flexible Data Handling**: Automatically detects common column name variations (latitude/lat/Latitude, longitude/lon/lng)
- **Dynamic Grouping**: Group points by any column in your CSV (ActivityGroupId, region, category, etc.)
- **Polygon Generation**: Create concave hull polygons around point clusters using the concaveman algorithm
- **Adjustable Concavity**: Fine-tune polygon shapes with an interactive concavity slider (1.0-3.0)
- **Interactive Map**: Visualize points and polygons on an interactive Leaflet map with zoom/pan controls
- **Data Export**: Export generated polygons as:
  - **Shapefile** (.shp, .shx, .dbf, .prj) - industry standard GIS format
  - **GeoJSON** (.geojson) - web-friendly format
- **Real-time Preview**: See points and polygons update on the map as you adjust parameters
- **Data Table**: View and inspect your uploaded CSV data in a virtualized table
- **Layer Control**: Toggle visibility of points and polygons independently
- **Interactive Legend**: Filter visible data by group with color-coded legend

### User Experience

- **Drag & Drop Upload**: Simply drag CSV files onto the upload area
- **Progress Tracking**: Real-time feedback during data processing
- **Error Handling**: Detailed error messages for invalid data with row-level diagnostics
- **Partial Loading**: Continues processing valid rows even if some rows have errors
- **Responsive Design**: Works on desktop and tablet devices
- **Dark Mode**: Built-in dark theme support
- **Collapsible Panels**: Maximize map viewing area by hiding side panels

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/AFurqanHassan/geopolygonsapp.git
cd GeoPolygons

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000`

## 📦 Installation

### Environment Setup

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

**Environment Variables:**

```env
# Database (Optional - for future server-side processing)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Session Secret
SESSION_SECRET=your-secret-key-here

# Server Port
PORT=5000
```

### Database Setup (Optional)

The application works entirely client-side by default. Database setup is only needed for server-side processing:

```bash
npm run db:push
```

## 📖 Usage Guide

### 1. Upload CSV Data

Your CSV file should contain at minimum:
- **Latitude column**: `latitude`, `lat`, `Latitude`, or `y`
- **Longitude column**: `longitude`, `lon`, `lng`, `Lon`, or `x`
- **Grouping column** (optional): `ActivityGroupId`, `groupId`, `group`, or any custom column

**Example CSV:**

```csv
latitude,longitude,ActivityGroupId,Name
31.5204,74.3587,Group1,Point A
31.5304,74.3687,Group1,Point B
31.5404,74.3787,Group2,Point C
31.5604,74.3887,Group2,Point D
```

**Steps:**
1. Click the upload area or drag & drop your CSV file
2. Wait for parsing to complete (progress indicator will show)
3. Verify the point count matches your expectations

### 2. Configure Polygon Generation

**Select Group Field:**
- Choose which column to use for grouping points
- Each unique value will generate a separate polygon
- Default: `ActivityGroupId`

**Adjust Concavity:**
- **Lower values (1.0-1.5)**: Tighter polygons that closely follow point clusters
- **Medium values (1.5-2.5)**: Balanced polygons (recommended)
- **Higher values (2.5-3.0)**: Looser polygons that encompass broader areas

### 3. Generate Polygons

1. Click **"Generate Polygons"** button
2. Wait for processing (seconds to minutes depending on data size)
3. Polygons will appear on the map with color-coded groups

### 4. Visualize and Interact

**Map Controls:**
- **Zoom**: Mouse wheel or +/- buttons
- **Pan**: Click and drag
- **Toggle Layers**: Use "Points" and "Polygons" buttons in header
- **Filter Groups**: Click legend items to show/hide specific groups

**Data Table:**
- View all uploaded CSV data
- Scroll through records efficiently with virtualization
- Inspect individual point attributes

### 5. Export Data

**Shapefile Export:**
- Click **"Export Shapefile"** button
- Downloads a ZIP containing .shp, .shx, .dbf, and .prj files
- Use in ArcGIS, QGIS, or other GIS software

**GeoJSON Export:**
- Click **"Export GeoJSON"** button
- Downloads a single .geojson file
- Use in web mapping libraries or GIS tools

## 🏗️ Technical Architecture

### Frontend Stack

- **Framework**: React 18.3 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **UI Components**: Radix UI primitives with custom theming
- **Styling**: Tailwind CSS with shadcn/ui components
- **Mapping**: Leaflet + React-Leaflet
- **Data Parsing**: PapaParse (CSV parsing)
- **Geometry**: 
  - Concaveman (concave hull generation)
  - Turf.js (geospatial operations)
- **State Management**: React hooks (useState, useEffect, useMemo)
- **Build Tool**: Vite

### Backend Stack

- **Server**: Express.js
- **Database**: PostgreSQL (via Neon serverless)
- **ORM**: Drizzle ORM
- **Session**: express-session with memorystore
- **File Format**: shp-write (Shapefile generation)

### Project Structure

```
GeoPolygons/
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── file-upload.tsx       # CSV upload component
│   │   │   ├── control-panel.tsx     # Polygon generation controls
│   │   │   ├── map-view.tsx          # Leaflet map component
│   │   │   ├── data-table.tsx        # Virtualized data table
│   │   │   ├── map-legend.tsx        # Interactive legend
│   │   │   └── ui/                   # Reusable UI components
│   │   ├── pages/         # Page components
│   │   │   └── map.tsx               # Main map page
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and helpers
│   │   └── types/         # TypeScript type definitions
├── server/                # Backend application
│   ├── app.ts            # Express app configuration
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Data persistence layer
│   └── index-dev.ts      # Development server
├── shared/               # Shared code between client/server
│   └── schema.ts         # Zod schemas and types
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

### Data Flow

```mermaid
graph LR
    A[CSV Upload] --> B[PapaParse]
    B --> C[Point Validation]
    C --> D[Store Points in State]
    D --> E[Display on Map]
    D --> F[Display in Table]
    
    G[Generate Polygons] --> H[Group Points]
    H --> I[Concaveman Algorithm]
    I --> J[Store Polygons in State]
    J --> K[Display on Map]
    
    L[Export] --> M{Format?}
    M -->|Shapefile| N[shp-write]
    M -->|GeoJSON| O[JSON.stringify]
    N --> P[Download ZIP]
    O --> Q[Download .geojson]
```

## ⚡ Performance Optimization

### Current Performance (Phase 1 ✅ Implemented)

The application now uses **Web Workers** for non-blocking processing, making it suitable for:
- ✅ Large datasets (up to 1 million points)
- ✅ Multiple users uploading files concurrently
- ✅ Smooth, responsive UI during processing

### Optimizations Implemented

**Web Workers for Background Processing:**
- ✅ CSV parsing runs in background thread (prevents UI freezing)
- ✅ Polygon generation runs in background thread
- ✅ Real-time progress bars and row counters
- ✅ Main UI remains fully responsive

**Streaming & Chunking:**
- ✅ CSV parsed in chunks of 1000 rows with progress updates
- ✅ Batch processing for efficient memory usage
- ✅ Automatic worker cleanup

**User Experience:**
- ✅ Progress bar (0-100%) during CSV parsing
- ✅ Live row count display
- ✅ Group-by-group progress during polygon generation
- ✅ No browser "Page Unresponsive" warnings

### Performance for Large Files (481k+ Records)

**Before Optimization:**
- ❌ Browser freezes for 10-30 seconds
- ❌ No progress indication
- ❌ "Page Unresponsive" warnings
- ❌ Poor user experience

**After Phase 1 (Current):**
- ✅ UI remains responsive throughout
- ✅ Real-time progress feedback
- ✅ Smooth 481k+ record processing
- ✅ Professional user experience

### Future Enhancements (Phase 2 - Optional)

For large datasets, we have a comprehensive optimization plan:

#### Phase 1: Client-Side Optimizations (Quick Wins)

**Web Workers for Background Processing:**
- Offload CSV parsing to Web Worker (prevents UI freezing)
- Offload polygon generation to Web Worker
- Maintain responsive UI during processing

**Streaming & Chunking:**
- Stream CSV parsing instead of loading entire file
- Process and display data in chunks
- Show real-time progress indicators

**Memory Optimization:**
- Virtualized rendering for data table
- Lazy loading of map markers
- Efficient data structures

**Implementation Status:** Planned (see `implementation_plan.md`)

#### Phase 2: Server-Side Processing (Scalability)

**Database Storage:**
- PostgreSQL for persistent data storage
- Indexed queries for fast retrieval
- Session-based data isolation

**Background Job Queue:**
- Asynchronous polygon generation
- Progress tracking with polling
- Resource management for concurrent users

**Caching Strategy:**
- Cache generated polygons (avoid recomputation)
- Redis or in-memory cache
- TTL-based invalidation

**Implementation Status:** Planned (see `implementation_plan.md`)

### Performance Metrics

**Target Performance:**
- CSV parsing (481k rows): < 10 seconds with progress
- Polygon generation: < 30 seconds with progress
- UI responsiveness: No freezing during operations
- Memory usage: < 500MB in browser
- Concurrent users: 10+ (with Phase 2)

## 🌐 Deployment

The application supports multiple deployment platforms:

### Vercel (Recommended for Client-Side App)

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

```bash
npm run build
# Deploy dist/ folder to Vercel
```

### Railway (Full-Stack with Database)

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed instructions.

```bash
# Set environment variables in Railway dashboard
railway up
```

### Render

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Render deployment guide.

### Self-Hosted

```bash
# Build the application
npm run build

# Set environment variables
export NODE_ENV=production
export PORT=5000
export DATABASE_URL=your-database-url

# Start the server
npm start
```

## 📚 API Documentation

### Optional Server Endpoints

These endpoints are available but not currently used (app works client-side):

#### `POST /api/points`
Save points to server storage.

**Request:**
```json
{
  "points": [
    {
      "id": "point-1",
      "longitude": 74.3587,
      "latitude": 31.5204,
      "activityGroupId": "Group1"
    }
  ]
}
```

**Response:**
```json
{
  "success": true
}
```

#### `GET /api/points`
Retrieve saved points.

**Response:**
```json
{
  "points": [ /* array of points */ ]
}
```

## 🎨 Customization

### Theme Customization

Edit `tailwind.config.ts` to customize colors, spacing, and other design tokens:

```typescript
export default {
  theme: {
    extend: {
      colors: {
        primary: { /* your colors */ },
        // ...
      }
    }
  }
}
```

### Map Configuration

Edit `client/src/components/map-view.tsx` to customize:
- Default map center and zoom
- Basemap tile layer
- Marker styles
- Polygon styles

### Concavity Presets

Edit `client/src/components/control-panel.tsx` to adjust:
- Concavity slider range (currently 1.0-3.0)
- Default concavity value (currently 2.0)
- Step size (currently 0.1)

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload

# Building
npm run build        # Build for production
npm run check        # TypeScript type checking

# Database
npm run db:push      # Push database schema changes
```

### Adding New Features

1. **New Component**: Add to `client/src/components/`
2. **New Page**: Add to `client/src/pages/`
3. **New API Route**: Add to `server/routes.ts`
4. **Schema Changes**: Update `shared/schema.ts`

### Code Style

- TypeScript strict mode enabled
- ESLint and Prettier configured
- Functional React components with hooks
- Zod for runtime type validation

## 🐛 Troubleshooting

### CSV Upload Issues

**Problem**: "No valid points found"
- **Solution**: Ensure CSV has `latitude` and `longitude` columns (or variations)
- Check for missing values or invalid coordinates

**Problem**: "Skipped invalid rows"
- **Solution**: Review console warnings for specific row numbers
- Ensure coordinates are numeric values

### Polygon Generation Issues

**Problem**: "Group has less than 3 points"
- **Solution**: Groups need minimum 3 points to create a polygon
- Consider merging small groups or filtering them out

**Problem**: Polygons look incorrect
- **Solution**: Adjust concavity slider
- Lower values for tighter fit, higher for looser polygons

### Export Issues

**Problem**: Shapefile export fails
- **Solution**: Try GeoJSON export instead
- Check browser console for detailed errors

### Performance Issues

**Problem**: Browser freezes with large files
- **Solution**: See [Performance Optimization](#performance-optimization) section
- Consider implementing Web Worker optimizations
- Break large files into smaller chunks

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Support

For issues and questions:
- GitHub Issues: [https://github.com/AFurqanHassan/geopolygonsapp/issues](https://github.com/AFurqanHassan/geopolygonsapp/issues)

## 🙏 Acknowledgments

- [Concaveman](https://github.com/mapbox/concaveman) - Fast concave hull algorithm
- [Leaflet](https://leafletjs.com/) - Interactive mapping library
- [PapaParse](https://www.papaparse.com/) - Powerful CSV parser
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Mapbox](https://www.mapbox.com/) - Shapefile writing library

---

**Built with ❤️ for geospatial data processing**
