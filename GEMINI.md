# PiratesMap Project Mandates

This project is a web-based map viewer and data analysis tool for Sid Meier's Pirates!. It uses Leaflet for the map interface and OpenCV.js for image processing tasks.

## Core Mandates

### Architecture & Tech Stack
- **Frontend:** Plain HTML/CSS/JS with Leaflet.js. Keep dependencies minimal and avoid modern frameworks (React/Vue/etc.) unless explicitly requested.
- **Backend:** Simple Express server (`index.js`) for local development and serving static files.
- **Image Processing:** Uses `opencv.js` for map analysis and "where-am-I" functionality.
- **Data Management:** Map metadata and city locations are stored in `cities.json`, `cities.txt`, and `eras.yaml`. These are synchronized to `public/cities.js` for client-side use.

### Coding Standards & Style
- **Vanilla JS:** Prefer clean, well-commented Vanilla JavaScript in the `public/` directory.
- **Leaflet Integration:** When adding features to the map, use Leaflet-idiomatic patterns (Layers, Controls, Markers).
- **CSS:** Keep styles within `index.html` or separate CSS files in `public/`. Follow the existing "Pirates!" aesthetic (parchment, nautical themes).

### Workspace Conventions
- **Static Assets:** All web-facing assets (images, scripts, styles) MUST reside in the `public/` directory.
- **Map Tiles/Overlays:** Large map images are stored in `public/map/`. Do not move or rename these without updating the layer logic in `index.html`.
- **Source Files:** The `owncompile/` directory contains GIMP source files (.xcf) and raw images. DO NOT modify these unless specifically instructed to perform image editing tasks.
- **Data Synchronization:** If `cities.json` or `eras.yaml` are updated, ensure the corresponding JS objects in `public/` (like `public/cities.js`) are updated to match.

### Testing & Validation
- **Local Testing:** Use `npm run local` to start the server and verify changes at `http://localhost:3000`.
- **Responsive Design:** Ensure the map remains usable on different screen sizes, as it includes a search interface and various overlays.
- **Performance:** Be mindful of image sizes in `public/map/`. Avoid loading all high-resolution overlays at once if possible.

## Project Context
- This tool is designed to help players identify their location in the game "Sid Meier's Pirates!" using treasure map fragments.
- The "Eras" system in the game changes city ownership and existence; ensure any logic respects the `eras.yaml` definitions.
