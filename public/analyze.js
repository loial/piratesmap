/**
 * PiratesMap - Library-Free Map Analyzer (v2.2)
 * Robust dual-probe bitmask matching with global search.
 */

const ANALYZER_CONFIG = {
    masterMapUrl: 'map/PiratesTreasureMapBase.png',
    mapWidth: 5120,
    mapHeight: 3208,
    // Master Map Color Logic: Land is warmer (R > B), Water is cooler (B > R)
    isMasterLand: (r, g, b) => r > b + 5,
    isMasterWater: (r, g, b) => b > r + 5
};

let masterLandMask = null;

async function getMasterMask() {
    if (masterLandMask) return masterLandMask;

    console.log("Generating Master Land Mask...");
    const img = new Image();
    img.src = ANALYZER_CONFIG.masterMapUrl;
    await new Promise(r => img.onload = r);

    const canvas = document.createElement('canvas');
    canvas.width = ANALYZER_CONFIG.mapWidth;
    canvas.height = ANALYZER_CONFIG.mapHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    // 1 bit per pixel mask. 1 = Land, 0 = Water/Other
    masterLandMask = new Uint8Array(Math.ceil((canvas.width * canvas.height) / 8));

    for (let i = 0; i < data.length; i += 4) {
        const pixelIdx = i / 4;
        if (ANALYZER_CONFIG.isMasterLand(data[i], data[i+1], data[i+2])) {
            masterLandMask[pixelIdx >> 3] |= (1 << (pixelIdx & 7));
        }
    }
    console.log("Master Mask Ready.");
    return masterLandMask;
}

const dialog = () => {
    let dlg = document.getElementById('dlgAnalyze');
    if (!dlg) {
        dlg = L.DomUtil.create("dialog", null, document.body);
        dlg.id = "dlgAnalyze";
        dlg.innerHTML = `
            <div style="min-width: 450px; padding: 15px; font-family: sans-serif;">
                <h2 style="margin-top: 0;">Map Analyzer</h2>
                <p>Upload a screenshot of a map piece.</p>
                <canvas id="analyzeCanvas" style="max-width: 100%; height: auto; border: 1px solid #999; display: block; margin-bottom: 15px; background: #333;"></canvas>
                <input id="fileInput" type="file" accept="image/*" style="margin-bottom: 15px; display: block; width: 100%;">
                <button id="btnAnalyze" style="padding: 12px 24px; cursor: pointer; background: #0078d4; color: white; border: none; border-radius: 4px; font-weight: bold;">
                    Analyze Map <img src="images/loader.gif" id="loader" class="hidden" style="vertical-align: middle; margin-left: 10px;">
                </button>
                <code id="info" style="display: block; margin: 20px 0; background: #eee; padding: 15px; border-left: 5px solid #0078d4; white-space: pre-wrap; font-size: 13px; max-height: 200px; overflow-y: auto;"></code>
                <div style="text-align: right;">
                    <button id="closeModal" style="padding: 8px 16px; cursor: pointer; background: #ccc; border: none; border-radius: 4px;">Close</button>
                </div>
            </div>
        `;

        const fileInput = dlg.querySelector("#fileInput");
        const canvas = dlg.querySelector("#analyzeCanvas");

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        };

        dlg.querySelector("#btnAnalyze").onclick = runAnalysis;
        dlg.querySelector("#closeModal").onclick = () => dlg.close();
    }
    dlg.showModal();
};

async function runAnalysis() {
    const btn = document.getElementById('btnAnalyze');
    const loader = document.getElementById('loader');
    const info = document.getElementById('info');
    const canvas = document.getElementById('analyzeCanvas');
    
    if (canvas.width === 0) {
        info.innerText = "Please select an image first.";
        return;
    }

    loader.classList.remove("hidden");
    btn.disabled = true;
    info.innerText = "Processing map piece...";

    try {
        const masterMask = await getMasterMask();
        const ctx = canvas.getContext('2d');
        let width = canvas.width;
        let height = canvas.height;
        let imageData = ctx.getImageData(0, 0, width, height).data;

        // 1. Scale Normalization (Detect 2x Amiga resolution)
        let scale = 1.0;
        if (width > 750) {
            console.log("Normalizing 2x piece...");
            scale = 0.5;
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = Math.round(width * scale);
            tmpCanvas.height = Math.round(height * scale);
            const tmpCtx = tmpCanvas.getContext('2d');
            tmpCtx.imageSmoothingEnabled = false;
            tmpCtx.drawImage(canvas, 0, 0, tmpCanvas.width, tmpCanvas.height);
            width = tmpCanvas.width;
            height = tmpCanvas.height;
            imageData = tmpCtx.getImageData(0, 0, width, height).data;
        }

        // 2. Feature Extraction
        console.log("Extracting features...");
        const landPoints = [];
        const waterPoints = [];
        let markerPoint = null;

        const isUI = (r, g, b) => {
            if (r === g && g === b) return true; // Grayscale (UI/BG)
            if (r === 204 && g === 170 && b === 153) return true; // Beige label
            if (r === 0 && g === 0 && b === 204) return true;     // Blue label
            return false;
        };

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = imageData[idx], g = imageData[idx+1], b = imageData[idx+2];

                if (r > 200 && g < 60 && b < 60) {
                    markerPoint = { x, y };
                } else if (!isUI(r, g, b)) {
                    if (r > b + 10) landPoints.push({ x, y });
                    else if (b > r + 10) waterPoints.push({ x, y });
                }
            }
        }

        if (landPoints.length < 50) throw new Error("Could not find enough land on map piece.");

        // 3. Global Bitmask Matching
        const probeCount = 150;
        const landProbes = [];
        const waterProbes = [];
        
        // Pick representative probes
        for (let i = 0; i < probeCount; i++) {
            landProbes.push(landPoints[Math.floor(Math.random() * landPoints.length)]);
            if (waterPoints.length > 0) {
                waterProbes.push(waterPoints[Math.floor(Math.random() * waterPoints.length)]);
            }
        }

        console.log(`Scanning map (Land Probes: ${landProbes.length}, Water Probes: ${waterProbes.length})...`);
        let bestMatch = { x: 0, y: 0, score: -Infinity };

        // Step scan to find absolute global maximum
        for (let my = 0; my < ANALYZER_CONFIG.mapHeight - height; my += 2) {
            for (let mx = 0; mx < ANALYZER_CONFIG.mapWidth - width; mx += 2) {
                let score = 0;
                
                // Land must hit land
                for (const p of landProbes) {
                    const px = (my + p.y) * ANALYZER_CONFIG.mapWidth + (mx + p.x);
                    if (masterMask[px >> 3] & (1 << (px & 7))) score++;
                    else score--; // Penalty for hitting water
                }
                
                // Water must hit water
                for (const p of waterProbes) {
                    const px = (my + p.y) * ANALYZER_CONFIG.mapWidth + (mx + p.x);
                    if (!(masterMask[px >> 3] & (1 << (px & 7)))) score++;
                    else score--; // Penalty for hitting land
                }

                if (score > bestMatch.score) {
                    bestMatch = { x: mx, y: my, score: score };
                }
            }
        }

        // Refine with 1px precision around the global best
        console.log("Refining match precision...");
        const startX = Math.max(0, bestMatch.x - 2);
        const startY = Math.max(0, bestMatch.y - 2);
        for (let my = startY; my < startY + 5; my++) {
            for (let mx = startX; mx < startX + 5; mx++) {
                let score = 0;
                for (const p of landProbes) {
                    const px = (my + p.y) * ANALYZER_CONFIG.mapWidth + (mx + p.x);
                    if (masterMask[px >> 3] & (1 << (px & 7))) score++; else score--;
                }
                for (const p of waterProbes) {
                    const px = (my + p.y) * ANALYZER_CONFIG.mapWidth + (mx + p.x);
                    if (!(masterMask[px >> 3] & (1 << (px & 7)))) score++; else score--;
                }
                if (score > bestMatch.score) bestMatch = { x: mx, y: my, score: score };
            }
        }

        const maxPossible = landProbes.length + waterProbes.length;
        const confidence = (bestMatch.score / maxPossible) * 100;
        
        if (confidence < 70) throw new Error(`Low confidence match (${confidence.toFixed(1)}%). Piece not found.`);

        // 4. Output Results
        const itemX = markerPoint ? markerPoint.x : width / 2;
        const itemY = markerPoint ? markerPoint.y : height / 2;
        const finalX = bestMatch.x + itemX;
        const finalY = bestMatch.y + itemY;

        const latLng = baseMapPixelToLatLng(finalX, finalY);
        console.log(`Found Match! Confidence: ${confidence.toFixed(1)}% at ${finalX}, ${finalY}`);

        info.innerHTML = `Match Found! (Confidence: ${confidence.toFixed(1)}%)\nLocation: ${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`;
        
        const importBtn = L.DomUtil.create("button", null, info);
        importBtn.innerText = "Import Marker to Map";
        importBtn.style.display = "block";
        importBtn.style.marginTop = "15px";
        importBtn.style.padding = "8px 16px";
        importBtn.style.cursor = "pointer";
        
        importBtn.onclick = () => {
            markerGroup.addData({
                type: "Feature",
                properties: { type: "treasure", description: "Analyzed Map Piece" },
                geometry: { type: "Point", coordinates: [latLng.lng, latLng.lat] }
            });
            document.getElementById('dlgAnalyze').close();
            map.flyTo(latLng, 5);
        };

    } catch (err) {
        console.error(err);
        info.innerText = "Error: " + err.message;
    } finally {
        loader.classList.add("hidden");
        btn.disabled = false;
    }
}

function baseMapPixelToLatLng(x, y) {
    const maxX = 5120, maxY = 3208;
    const minLat = 30.279, minLng = -96.744;
    const maxLat = 13.687, maxLng = -58.563;

    const distLat = maxLat - minLat;
    const distLng = maxLng - minLng;
    const pxPerLat = maxY / distLat;
    const pxPerLng = maxX / distLng;

    const lng = x / pxPerLng + minLng;
    const lat = y / pxPerLat + minLat;
    return { lat, lng };
}
