/**
 * PiratesMap - Sophisticated Jimp Map Analyzer (v4.7)
 * Logic: Frame-based scaling, deterministic identification, and "Clean Piece" matching.
 * Features: Collapsible progress status and dedicated result container.
 */

const isNode = typeof window === 'undefined';
let _Jimp = null;
let _intToRGBA = null;

async function getJimp() {
    if (_Jimp) return { Jimp: _Jimp, intToRGBA: _intToRGBA };
    if (isNode) {
        const jimpModule = require('jimp');
        _Jimp = jimpModule.Jimp;
        _intToRGBA = jimpModule.intToRGBA;
        global.L = { DomUtil: { create: () => ({ append: () => {} }) } };
    } else {
        if (!window.Jimp) {
            throw new Error("Jimp library not loaded. Check your internet connection or index.html script tag.");
        }
        _Jimp = window.Jimp;
        _intToRGBA = _Jimp.intToRGBA || window.intToRGBA;
    }
    return { Jimp: _Jimp, intToRGBA: _intToRGBA };
}

const ANALYZER_CONFIG = {
    masterMapUrl: isNode ? 'public/map/PiratesTreasureMapBase.png' : 'map/PiratesTreasureMapBase.png',
    mapWidth: 5120,
    mapHeight: 3208,
    isLand: (r, g, b) => r > b + 10,
    isWater: (r, g, b) => b > r + 10,
    removeColors: ["000000", "ccaa99", "0000cc", "775533", "664433", "aa8855", "ccaa77"],
    markerColors: ["ee0000", "996644", "002222"]
};

let masterLandMask = null;

async function getMasterMask() {
    if (masterLandMask) return masterLandMask;
    const { Jimp } = await getJimp();
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

async function runAnalysis(imageSource, onProgress = () => {}) {
    const { Jimp, intToRGBA } = await getJimp();
    onProgress("Reading map piece...");
    
    // 1. Initial Load & Normalize
    let image = await Jimp.read(imageSource);
    image.autocrop(); 
    
    const startColor = image.getPixelColor(0, 0);
    let frameWidth = 0;
    while (image.getPixelColor(frameWidth, frameWidth) === startColor && frameWidth < 20) {
        frameWidth++;
    }
    const scale = 1 / (frameWidth || 1);
    if (frameWidth > 1) {
        const targetW = Math.round(image.bitmap.width * scale);
        const targetH = Math.round(image.bitmap.height * scale);
        onProgress(`Normalizing piece (Amiga scale: ${targetW}x${targetH})...`);
        try {
            image.resize({ w: targetW, h: targetH, mode: 'nearestNeighbor' });
        } catch (e) {
            image.resize(targetW, targetH);
        }
    }

    // 2. Deterministic Identification
    onProgress("Identifying map type...");
    const getHex = (x, y) => {
        const rgba = intToRGBA(image.getPixelColor(x, y));
        const toHex = (c) => c.toString(16).padStart(2, '0');
        return toHex(rgba.r) + toHex(rgba.g) + toHex(rgba.b);
    };
    const isInk = (x, y) => {
        const rgba = intToRGBA(image.getPixelColor(x, y));
        return rgba.r < 110 && rgba.g < 110 && rgba.b < 110;
    };

    let properties; // = { type: "family", description: "Mother" };
    if (isInk(10, 9)) {
        properties = { type: "treasure" };
    } else {
        if (isInk(60, 8)) properties = { type: "inca" };
        else if (isInk(62, 7)) properties = { type: "family", description: "Father" };
        else if (isInk(63, 8)) properties = { type: "family", description: "Sister" };
        else if (isInk(62, 13)) properties = { type: "family", description: "Uncle" };
        else properties = { type: "family", description: "Mother" };
    }
    onProgress(`Type: ${properties.description || properties.type}. Pre-processing content...`);

    // 3. Sophisticated Cleaning & Marker Extraction
    const { width, height } = image.bitmap;
    let markerPixels = [];
    let landPoints = [], waterPoints = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const hex = getHex(x, y);
            const rgba = intToRGBA(image.getPixelColor(x, y));
            if (ANALYZER_CONFIG.markerColors.includes(hex)) {
                markerPixels.push({x, y});
                image.setPixelColor(0x00000000, x, y);
            } else if (ANALYZER_CONFIG.removeColors.includes(hex)) {
                image.setPixelColor(0x00000000, x, y);
            } else if (ANALYZER_CONFIG.isLand(rgba.r, rgba.g, rgba.b)) {
                landPoints.push({ x, y });
            } else if (ANALYZER_CONFIG.isWater(rgba.r, rgba.g, rgba.b)) {
                waterPoints.push({ x, y });
            }
        }
    }

    let itemOffset = { x: width / 2, y: height / 2 };
    if (markerPixels.length > 0) {
        itemOffset.x = markerPixels.reduce((s, p) => s + p.x, 0) / markerPixels.length;
        itemOffset.y = markerPixels.reduce((s, p) => s + p.y, 0) / markerPixels.length;
    }

    // 4. Sparse-Sampling Search on "Cleaned" data
    const masterMask = await getMasterMask();
    const landProbes = Array.from({length: Math.min(300, landPoints.length)}, () => landPoints[Math.floor(Math.random() * landPoints.length)]);
    const waterProbes = Array.from({length: Math.min(300, waterPoints.length)}, () => waterPoints[Math.floor(Math.random() * waterPoints.length)]);

    let bestMatch = { x: 0, y: 0, score: -Infinity };
    const step = 3;
    
    onProgress("Scanning master map for location candidates...");
    for (let my = 0; my < ANALYZER_CONFIG.mapHeight - height; my += step) {
        if (my % 300 === 0 && !isNode) {
            onProgress(`Scanning... (${Math.round((my / (ANALYZER_CONFIG.mapHeight - height)) * 100)}%)`);
            await new Promise(r => setTimeout(r, 0));
        }
        for (let mx = 0; mx < ANALYZER_CONFIG.mapWidth - width; mx += step) {
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
    onProgress(`Scanning complete. Candidate confirmed at ${confidence.toFixed(1)}% confidence.`);
    
    const finalX = bestMatch.x + itemOffset.x;
    const finalY = bestMatch.y + itemOffset.y;
    const latLng = baseMapPixelToLatLng(finalX, finalY);

    return { confidence, properties, location: latLng, pixels: { x: finalX, y: finalY }, feature: { type: "Feature", properties, geometry: { type: "Point", coordinates: [latLng.lng, latLng.lat] } } };
}

function baseMapPixelToLatLng(x, y) {
    const maxX = 5120, maxY = 3208, minLat = 30.279, minLng = -96.744, maxLat = 13.687, maxLng = -58.563;
    const distLat = maxLat - minLat, distLng = maxLng - minLng;
    return { lat: (y / (maxY / distLat)) + minLat, lng: (x / (maxX / distLng)) + minLng };
}

if (!isNode) {
    let analyzeDialog = null;

    window.dialog = () => {
        if (!analyzeDialog) {
            analyzeDialog = L.control.dialog({
                size: [480, 550],
                minSize: [400, 400],
                maxSize: [800, 800],
                anchor: [50, 50],
                position: 'topleft',
                initOpen: false
            }).addTo(map);

            const wrapper = L.DomUtil.create('div');
            wrapper.id = "dlgAnalyze";
            const content = L.DomUtil.create('div', 'analyze-dialog-content', wrapper);
            content.style.cssText = "padding: 10px;";
            content.innerHTML = `
<style>
    @keyframes analyze-spin { to { transform: rotate(360deg); } }
    .analyze-spinner { 
        display: inline-block; width: 14px; height: 14px; 
        border: 2px solid rgba(255,255,255,.3); border-radius: 50%; 
        border-top-color: #fff; animation: analyze-spin 0.6s linear infinite; 
        vertical-align: middle; margin-left: 10px;
    }
    #btnAnalyze:disabled { background-color: #ccc !important; color: #888 !important; cursor: not-allowed; }
    .hidden { display: none !important; }
    .status-summary { 
        padding: 12px; cursor: pointer; font-family: monospace; font-size: 13px; 
        background: #eee; border-left: 5px solid #0078d4; outline: none;
    }
    .status-summary:hover { background: #e5e5e5; }
    .status-history { 
        display: block; padding: 10px 15px; white-space: pre-wrap; font-size: 12px; 
        max-height: 120px; overflow-y: auto; background: #fafafa; border: 1px solid #ddd; border-top: none;
    }
    #analyzeCanvas {
        width: 100%;
        height: 200px;
        object-fit: contain;
        border: 1px solid #999;
        display: block;
        margin-bottom: 15px;
        background: #222;
    }
</style>
<h2 style="margin-top: 0; font-size: 18px;">Map Analyzer</h2>
<p style="color: #666; margin-bottom: 15px; font-size: 13px;">Upload a map fragment to identify its location.</p>
<canvas id="analyzeCanvas"></canvas>
<input id="fileInput" type="file" accept="image/*" style="margin-bottom: 15px; display: block; width: 100%; font-size: 12px;">
<button id="btnAnalyze" style="padding: 10px; cursor: pointer; background: #0078d4; color: white; border: none; border-radius: 4px; width: 100%; font-weight: bold;">
    Analyze Map Piece <span id="loader" class="analyze-spinner hidden"></span>
</button>

<details id="statusDetails" style="margin: 15px 0;">
    <summary id="statusCurrent" class="status-summary">Ready.</summary>
    <code id="statusHistory" class="status-history"></code>
</details>

<div id="resultBox" class="hidden" style="margin-bottom: 15px; padding: 12px; background: #f0f7ff; border: 1px solid #0078d4; border-radius: 4px; font-size: 13px;">
</div>
`;
            analyzeDialog.setContent(content);

            const fileInput = content.querySelector("#fileInput"); 
            const canvas = content.querySelector("#analyzeCanvas");
            const statusCurrent = content.querySelector("#statusCurrent"); 
            const statusHistory = content.querySelector("#statusHistory");
            const resultBox = content.querySelector("#resultBox");

            fileInput.onchange = (e) => {
                const file = e.target.files[0]; if (!file) return;
                statusCurrent.innerText = "File loaded. Ready.";
                statusHistory.innerText = "";
                resultBox.innerHTML = ""; resultBox.classList.add("hidden");

                const reader = new FileReader(); reader.onload = async (ev) => {
                    const { Jimp } = await getJimp();
                    const image = await Jimp.read(ev.target.result);

                    // Maintain internal resolution but display is capped by CSS
                    canvas.width = image.bitmap.width; 
                    canvas.height = image.bitmap.height;

                    const ctx = canvas.getContext('2d');
                    const imageData = ctx.createImageData(image.bitmap.width, image.bitmap.height);
                    imageData.data.set(image.bitmap.data); 
                    ctx.putImageData(imageData, 0, 0);
                };
                reader.readAsArrayBuffer(file);
            };

            content.querySelector("#btnAnalyze").onclick = async () => {
                const btn = content.querySelector('#btnAnalyze');
                const loader = content.querySelector('#loader');
                loader.classList.remove("hidden"); btn.disabled = true;
                statusHistory.innerText = ""; resultBox.innerHTML = ""; resultBox.classList.add("hidden");

                let history = [];
                const updateProgress = (msg) => {
                    statusCurrent.innerText = msg;
                    if (msg.startsWith("Scanning...") && history.length > 0 && history[history.length-1].startsWith("Scanning...")) {
                        history[history.length-1] = msg;
                    } else {
                        history.push(msg);
                    }
                    statusHistory.innerText = history.join('\n');
                    statusHistory.scrollTop = statusHistory.scrollHeight;
                };

                try {
                    const file = fileInput.files[0]; if (!file) throw new Error("Please select a file.");
                    const buffer = await file.arrayBuffer();
                    updateProgress("Initializing...");
                    const result = await runAnalysis(buffer, updateProgress);
                    map.flyTo(result.location, 5);
                    statusCurrent.innerText = "Complete.";
                    resultBox.classList.remove("hidden");
                    resultBox.innerHTML = `
                        <div style="font-weight: bold; color: #0078d4; margin-bottom: 5px;">Match Found!</div>
                        <strong>Type:</strong> ${result.properties.description || result.properties.type}<br>
                        <strong>Confidence:</strong> ${result.confidence.toFixed(1)}%<br>
                        <strong>Location:</strong> ${result.location.lat.toFixed(4)}, ${result.location.lng.toFixed(4)}
                    `;

                    const importBtn = L.DomUtil.create("button", "result-import-button", resultBox); 
                    importBtn.innerText = "Import Marker"; 
                    importBtn.style.cssText = "display: block; margin-top: 10px; width: 100%; padding: 8px; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 4px;";
                    importBtn.onclick = () => { 
                        markerGroup.addData(result.feature); 
                        analyzeDialog.close(); 
                        map.flyTo(result.location, 5); 
                    };
                } catch (e) { console.error(e); statusCurrent.innerText = "Error: " + e.message; }
                finally { loader.classList.add("hidden"); btn.disabled = false; }
            };
        }
        analyzeDialog.open();
    };
}
 else if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length === 0) { console.log("Usage: node public/analyze.js <path-to-map-piece.png>"); process.exit(1); }
    runAnalysis(args[0], (m) => console.log(`[Progress] ${m}`)).then(result => {
        const output = { metadata: { confidence: result.confidence.toFixed(1) + "%", pixels: result.pixels, type: result.properties.type, description: result.properties.description }, feature: result.feature };
        console.log(JSON.stringify(output, null, 2));
    }).catch(err => { console.error("Analysis Failed:", err.message); process.exit(1); });
}

if (isNode) { module.exports = { runAnalysis, ANALYZER_CONFIG, baseMapPixelToLatLng }; }
