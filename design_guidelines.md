# Design Guidelines: Geospatial Data Processing Application

## Design Approach

**Selected Approach:** Design System (Material Design) with GIS Tool References

**Justification:** This is a utility-focused, data-dense application for geospatial analysis. Drawing inspiration from professional GIS platforms like Mapbox Studio, QGIS, and ArcGIS Online ensures familiarity for target users while maintaining efficiency and learnability.

**Key Principles:**
- Data clarity over visual flair
- Efficient spatial organization for multi-panel workspace
- Clear information hierarchy for complex operations
- Professional, technical aesthetic

## Core Design Elements

### Typography
- **Primary Font:** Inter or Roboto (technical clarity)
- **Headings:** Font weight 600, sizes: text-2xl (panels), text-lg (sections), text-base (labels)
- **Body Text:** Font weight 400, text-sm for data tables and controls
- **Monospace:** For coordinates and technical data (JetBrains Mono or Roboto Mono, text-xs)

### Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, 8
- Tight spacing (p-2, gap-2): Within controls and buttons
- Standard spacing (p-4, gap-4): Between form elements, card content
- Section spacing (p-6, gap-6): Panel separators
- Major spacing (p-8): Outer containers

**Application Structure:**
- Full-height layout (h-screen) with no scrolling on main container
- Three-panel workspace: Left sidebar (file upload + controls, w-80), Center map (flex-1), Right panel (data table, w-96)
- All panels independently scrollable with overflow-y-auto
- Responsive: Stack vertically on mobile (hidden sidebars with toggle buttons)

### Component Library

**A. File Upload Zone**
- Large dropzone area with dashed border
- Icon: Document/upload icon (Heroicons)
- "Drag CSV file or click to browse" messaging
- File validation feedback inline
- Recently uploaded files list below with remove buttons

**B. Map Container**
- Full-height center panel (flex-1)
- Leaflet-based map with zoom controls
- Layer toggles (Points/Polygons) as floating controls (top-right)
- Legend component (bottom-right) showing ActivityGroupId colors
- Coordinate display on hover (bottom-left)

**C. Control Panel (Left Sidebar)**
- File upload section at top
- Collapsible "Polygon Settings" section with concavity slider
- "Group by ActivityGroupId" toggle
- "Generate Polygons" primary action button (full-width, p-3)
- "Export Shapefile" secondary button (full-width, outline style)
- Settings organized in clear sections with subtle dividers (border-t)

**D. Data Table (Right Panel)**
- Fixed header row with column labels (sticky top-0)
- Columns: ID, Latitude, Longitude, ActivityGroupId
- Alternating row backgrounds for readability
- Monospace font for coordinate values
- Row count indicator in panel header
- Search/filter input at panel top

**E. Buttons & Controls**
- Primary actions: Solid background, p-3, rounded-lg, font-medium
- Secondary actions: Outline style (border-2), same padding
- Icon buttons: Square (w-10 h-10), rounded-lg, for map controls
- Toggle switches: Modern slider style for boolean options

**F. Status Indicators**
- Processing state: Small spinner icon with status text
- Success/error messages: Toast notifications (top-right, slide-in)
- File validation: Inline below upload zone with check/error icons

**G. Visual Feedback**
- Map points: Circular markers (radius based on zoom)
- Polygons: Semi-transparent fill with distinct stroke
- ActivityGroupId colors: Use distinct palette (8-10 colors)
- Selected/hovered states: Slightly increased opacity and stroke weight

### Animations
**Minimal, purposeful only:**
- Smooth map pan/zoom (handled by Leaflet)
- Toast slide-in/fade-out (300ms)
- Panel collapse/expand (200ms ease-in-out)
- No decorative animations

## Accessibility
- Semantic HTML throughout (nav, main, aside, section)
- ARIA labels for icon-only buttons
- Keyboard navigation for all controls
- Focus visible states with ring offset
- Sufficient contrast for text on map backgrounds

## Implementation Notes
- Use Heroicons for all UI icons (outline style)
- Leaflet via CDN for mapping
- Panel borders: Subtle border-r/border-l between sections
- Map should have minimal chrome, maximum data visibility
- Ensure coordinate precision displayed to 6 decimal places

This creates a professional, efficient workspace optimized for geospatial data analysis workflows.