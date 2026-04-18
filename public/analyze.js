/**
 * PiratesMap - Jimp-Powered Map Analyzer (v3.3)
 * Logic: Strict deterministic pixel-probe identification at Amiga scale.
 */

const isNode = typeof window === 'undefined';
let J; // Local Jimp reference
let intToRGBA;

if (isNode) {
    const jimpModule = require('jimp');
    J = jimpModule.Jimp;
    intToRGBA = jimpModule.intToRGBA;
    global.L = { DomUtil: { create: () => ({ append: () => {} }) } };
} else {
    J = window.Jimp;
    intToRGBA = J.intToRGBA;
}

const ANALYZER_CONFIG = {
    masterMapUrl: isNode ? 'public/map/PiratesTreasureMapBase.png' : 'map/PiratesTreasureMapBase.png',
    mapWidth: 5120,
    mapHeight: 3208,
    isLand: (r, g, b) => r > b + 10,
    isWater: (r, g, b) => b > r + 10
};

// State
let masterLandMask = null;

async function getMasterMask() {
    if (masterLandMask) return masterLandMask;
    const Jimp = J;
    const image = await Jimp.read(ANALYZER_CONFIG.masterMapUrl);
    const { data, width, height } = image.bitmap;
    masterLandMask = new Uint8Array(Math.ceil((width * height) / 8));
    for (let i = 0; i < data.length; i += 4) {
        if (ANALYZER_CONFIG.isLand(data[i], data[i+1], data[i+2])) {
            const idx = i / 4;
            masterLandMask[idx >> 3] |= (1 << (idx & 7));
        }
    }
    return masterLandMask;
}

async function runAnalysis(imageSource) {
    const Jimp = J;
    console.log("Reading map piece...");
    
    // 1. Load and Autocrop
    let image = await Jimp.read(imageSource);
    image.autocrop(); 
    
    // 2. Detect Frame Width (Blue border check)
    const startColor = image.getPixelColor(0, 0);
    let frameWidth = 0;
    // Walk diagonal until we leave the frame color
    while (image.getPixelColor(frameWidth, frameWidth) === startColor && frameWidth < 20) {
        frameWidth++;
    }
    console.log(`Detected frame width: ${frameWidth}px`);

    // 3. Normalize to Amiga Scale (frame should be 1px)
    const scale = 1 / frameWidth;
    if (frameWidth > 1) {
        console.log(`Resizing by ${scale.toFixed(2)}x to normalize to Amiga resolution...`);
        image.resize({ w: Math.round(image.bitmap.width * scale), mode: 'nearestNeighbor' });
    }

    // 4. Pixel-Probe Identification (STRICT 1x1)
    const isInk = (x, y) => {
        const rgba = intToRGBA(image.getPixelColor(x, y));
        return rgba.r < 110 && rgba.g < 110 && rgba.b < 110;
    };

    let properties = { type: "family", description: "Mother" };
    
    if (isInk(10, 9)) {
        properties = { type: "treasure", description: "Treasure Map" };
    } else {
        // Starts with "Map to lost..."
        if (isInk(60, 8)) {
            properties = { type: "inca", description: "Inca Treasure" };
        } else if (isInk(62, 7)) {
            properties = { type: "family", description: "Father" };
        } else if (isInk(63, 8)) {
            properties = { type: "family", description: "Sister" };
        } else if (isInk(62, 13)) {
            properties = { type: "family", description: "Uncle" };
        }
    }
    console.log(`Identified: ${properties.description} (${properties.type})`);

    // 5. Marker Offset & Location matching
    const masterMask = await getMasterMask();
    const { data, width, height } = image.bitmap;
    
    const landPoints = [], waterPoints = [];
    let redPoints = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            if (r > 200 && g < 100 && b < 100) redPoints.push({x, y});
            else if (ANALYZER_CONFIG.isLand(r, g, b)) landPoints.push({ x, y });
            else if (ANALYZER_CONFIG.isWater(r, g, b)) waterPoints.push({ x, y });
        }
    }

    let itemOffset = { x: width / 2, y: height / 2 };
    if (properties.type !== "family" && redPoints.length > 0) {
        itemOffset.x = redPoints.reduce((s, p) => s + p.x, 0) / redPoints.length;
        itemOffset.y = redPoints.reduce((s, p) => s + p.y, 0) / redPoints.length;
    }

    const landProbes = Array.from({length: 300}, () => landPoints[Math.floor(Math.random() * landPoints.length)]);
    const waterProbes = Array.from({length: Math.min(300, waterPoints.length)}, () => waterPoints[Math.floor(Math.random() * waterPoints.length)]);

    let bestMatch = { x: 0, y: 0, score: -Infinity };
    for (let my = 0; my < ANALYZER_CONFIG.mapHeight - height; my += 3) {
        for (let mx = 0; mx < ANALYZER_CONFIG.mapWidth - width; mx += 3) {
            let score = 0;
            for (const p of landProbes) {
                const idx = (my + p.y) * ANALYZER_CONFIG.mapWidth + (mx + p.x);
                if (masterMask[idx >> 3] & (1 << (idx & 7))) score++;
            }
            for (const p of waterProbes) {
                const idx = (my + p.y) * ANALYZER_CONFIG.mapWidth + (mx + p.x);
                if (!(masterMask[idx >> 3] & (1 << (idx & 7)))) score++;
            }
            if (score > bestMatch.score) bestMatch = { x: mx, y: my, score: score };
        }
    }

    const confidence = (bestMatch.score / (landProbes.length + waterProbes.length)) * 100;
    const finalX = bestMatch.x + itemOffset.x;
    const finalY = bestMatch.y + itemOffset.y;
    const latLng = baseMapPixelToLatLng(finalX, finalY);

    return {
        confidence, properties, location: latLng, pixels: { x: finalX, y: finalY },
        feature: { type: "Feature", properties, geometry: { type: "Point", coordinates: [latLng.lng, latLng.lat] } }
    };
}

function baseMapPixelToLatLng(x, y) {
    const maxX = 5120, maxY = 3208, minLat = 30.279, minLng = -96.744, maxLat = 13.687, maxLng = -58.563;
    const distLat = maxLat - minLat, distLng = maxLng - minLng;
    return { lat: (y / (maxY / distLat)) + minLat, lng: (x / (maxX / distLng)) + minLng };
}

if (!isNode) {
    window.dialog = () => {
        let dlg = document.getElementById('dlgAnalyze');
        if (!dlg) {
            dlg = L.DomUtil.create("dialog", null, document.body);
            dlg.id = "dlgAnalyze";
            dlg.innerHTML = `<div style="min-width: 450px; padding: 15px; font-family: sans-serif;"><h2>Map Analyzer (v3.3)</h2><canvas id="analyzeCanvas" style="max-width: 100%; height: auto; border: 1px solid #999; display: block; margin-bottom: 15px; background: #222;"></canvas><input id="fileInput" type="file" accept="image/*" style="margin-bottom: 15px; display: block; width: 100%;"><button id="btnAnalyze" style="padding: 12px 24px; cursor: pointer; background: #0078d4; color: white; border: none; border-radius: 4px; font-weight: bold; width: 100%;">Analyze Map Piece <img src="images/loader.gif" id="loader" class="hidden" style="vertical-align: middle; margin-left: 10px;"></button><code id="info" style="display: block; margin: 20px 0; background: #eee; padding: 15px; border-left: 5px solid #0078d4; white-space: pre-wrap; font-size: 13px; min-height: 50px;"></code><div style="text-align: right;"><button id="closeModal">Close</button></div></div>`;
            const fileInput = dlg.querySelector("#fileInput"); const canvas = dlg.querySelector("#analyzeCanvas");
            fileInput.onchange = (e) => {
                const file = e.target.files[0]; if (!file) return;
                const reader = new FileReader(); reader.onload = async (ev) => {
                    const Jimp = window.Jimp;
                    const image = await Jimp.read(ev.target.result);
                    canvas.width = image.bitmap.width; canvas.height = image.bitmap.height;
                    const ctx = canvas.getContext('2d');
                    const imageData = ctx.createImageData(image.bitmap.width, image.bitmap.height);
                    imageData.data.set(image.bitmap.data);
                    ctx.putImageData(imageData, 0, 0);
                };
                reader.readAsArrayBuffer(file);
            };
            dlg.querySelector("#btnAnalyze").onclick = async () => {
                const btn = document.getElementById('btnAnalyze'), loader = document.getElementById('loader'), info = document.getElementById('info');
                loader.classList.remove("hidden"); btn.disabled = true; info.innerText = "Analyzing...";
                try {
                    const file = fileInput.files[0];
                    const buffer = await file.arrayBuffer();
                    const result = await runAnalysis(buffer);
                    info.innerHTML = `Match Found! Confidence: ${result.confidence.toFixed(1)}%\nType: ${result.properties.description}\nLocation: ${result.location.lat.toFixed(4)}, ${result.location.lng.toFixed(4)}`;
                    const importBtn = L.DomUtil.create("button", null, info); importBtn.innerText = "Import Marker"; importBtn.style.display = "block"; importBtn.style.marginTop = "10px";
                    importBtn.onclick = () => { markerGroup.addData(result.feature); dlg.close(); map.flyTo(result.location, 5); };
                } catch (e) { console.error(e); info.innerText = "Error: " + e.message; }
                finally { loader.classList.add("hidden"); btn.disabled = false; }
            };
            dlg.querySelector("#closeModal").onclick = () => dlg.close();
        }
        dlg.showModal();
    };
} else if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length === 0) { console.log("Usage: node public/analyze.js <path-to-map-piece.png>"); process.exit(1); }
    runAnalysis(args[0]).then(result => {
        const output = { metadata: { confidence: result.confidence.toFixed(1) + "%", pixels: result.pixels, type: result.properties.type, description: result.properties.description }, feature: result.feature };
        console.log(JSON.stringify(output, null, 2));
    }).catch(err => { console.error("Analysis Failed:", err.message); process.exit(1); });
}

if (isNode) { module.exports = { runAnalysis, ANALYZER_CONFIG, baseMapPixelToLatLng }; }
