/**
 * PiratesMap - Hybrid Map Analyzer (v2.12)
 * Works in Browser and Node.js (via Jimp v1.6.1).
 */

const isNode = typeof window === 'undefined';
let Jimp;
if (isNode) {
    const jimpModule = require('jimp');
    Jimp = jimpModule.Jimp;
    // Mock L.DomUtil for Node environment
    global.L = { DomUtil: { create: () => ({ append: () => {} }) } };
}

const ANALYZER_CONFIG = {
    masterMapUrl: isNode ? 'public/map/PiratesTreasureMapBase.png' : 'map/PiratesTreasureMapBase.png',
    mapWidth: 5120,
    mapHeight: 3208,
    isLand: (r, g, b) => r > b + 10,
    isWater: (r, g, b) => b > r + 10,
    wordImgs: {
        sister: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAMCAYAAACJOyb4AAAAoUlEQVR4AdSQUQ2AMBBDFxzgBS1YQBMW0IIXJADvRi/jAnwQ9gFJ02vXdRvNPI1rLTSp4ndZ3vXD7ZFPa3HTZfn+m2LulfZybgRoMW6ZUmIGqMjyoi/t5QRPN15wMuRHpkReTubLyPNyDMIKid0/XiJfzB4y0uVs5QSAAmI8YLp4iXu2kG97jCeyck4TWGUWMwM0YAblXGp8wcolvub/lm8AAAD//zo/yXAAAAAGSURBVAMAt1qQW9oUtE0AAAAASUVORK5CYII=",
        mother: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAMCAYAAACTB8Z2AAAAkUlEQVR4AdyQ0QmAMAxES2dyFldwJldwFndSX+AkhBYraj8Ujlwu6V1tXpd564WcHn7DOCXQYnM7zBvDj1dJ4JOwFtPajv0ZN4zQAen0cF/FpcdeuqqFsaSnUEVjyffiqux4HveZe+0MY/AGvDl+/jKXYfEwBmjUGmpzC1N6qUqTMT2gL1U04OdwYGGQHvhv2A4AAP//p+Oz/gAAAAZJREFUAwAU1qCTJxycMwAAAABJRU5ErkJggg==",
        uncle: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAMCAYAAACNzvbFAAAAgklEQVR4AdSP0QmAQAxD5WZyFldwJldwFndSXzFSShHR/pzwaBJ70WvbuuzVtOHHM05zevpzKYXnDWtL07YrtD/lq3hNaTzgAQ3oCDmQWykiw1+PA3iIu3qn/LFUS2+mL75LCTmsiY7wDpR7TSZvpVzJwwI+TjJQHrW8lbJUST+lBwAAAP//UniRvwAAAAZJREFUAwBkeXw/bOpDIgAAAABJRU5ErkJggg==",
        inca: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAMCAYAAACA0IaCAAAAfElEQVR4AcyP0QmAMAxES2dyFldwJldwFndSX+CVIi2o9EPhvEvTPNK8b+sxSjkN/ApsmpekvvIL7HpqMPQoXv4K7D7nlrg9MurVXRgD9ZZAqBE9a7IqsFbTS089YIAY0Mkt0Uf2zHrAWF15kZpcOxl5TlacBYwwQv+FnQAAAP//YyZ/IAAAAAZJREFUAwAP0nMjxnnBIQAAAABJRU5ErkJggg==",
        treasure: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAMCAYAAADoIwS6AAAAtUlEQVR4AeyS0Q3CMBBDo27ALszCCszECszCLowAeSc5ci2lv+lHKzln3/kiq+32eb9+Z8HWTvSMMPfHs7Xb2mQjTMX41rnsqDD1VnqEWe2jxgzAARzABTRAZz3qyVth+g+Mt6kiMEg7zxnaoR3vOfe7nOOpMJBEXpqL6Uezgw8+Ax6f4VdvF4aBG5P7XNyruPakVdXPqvkIQzqAURUO0EJq+tlL7R5mAn2B3giDWI0rzOwL/AEAAP//vVcYYQAAAAZJREFUAwCUQdID3x8MTQAAAABJRU5ErkJggg==",
        lost: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAYAAABr5z2BAAAAgklEQVR4AcSPwRGAIAwEM9RkLbZgTbRgC7ZAL5agbiTKBB6KD505cxfCRkOa4/ZFQfIzjFN274oCuHx8xeObzNuwAiz01CaADciAeET2tQIw0Pod6/laAdjixSXAvk++AOUAPi2Rc8EjDcXLegpgA+KcimQlieBNZ+fukRWA6dX/gB0AAP//R68kxAAAAAZJREFUAwAMN2H5ZRc3nQAAAABJRU5ErkJggg=="
    },
    masks: {
        treasure: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAABH0lEQVR4AeSQ7RGCMBBET0qwBGqxFq0Ja6EWSrAFzMvMZo4zIwmMv2R43lduVzLYj58/MJjutxWO3mT1ihAUEo61+nuxGEiA+G1pbx53BxvH5it4zItBj8kw3ca8FJ19jShwFvxsL89XxBIC8TA9YA5x3lJnAw4igBg5EegBOTDrpRiwKDEi0DvL8HjOlxYRGXIeWnY4k79gbwFxzgBL8DJbgVxQe+hnAxK/TC3og2oiIkTwObW4muWbKQaWHi9EDqm9eWuCsSdxFjcGNGxZLjXhPEs/LItUllcmzEozJZ8Gqdn6RrFYo3PKAAGPvsL3ThnUBGPvsIGEuBbw/5qZOGTAshckjybqdRvUxBEDb6K824BFD8IezdTrNtBia3wDAAD//+TIY+cAAAAGSURBVAMAzb+JMUfYx6AAAAAASUVORK5CYII=", offset: [17, 17] },
        family: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAMCAYAAABbayygAAAAeElEQVR4AXSOgQmAMBADa0dxFmfRmXQWZ3EV5R6uREEh9JPc1/YW374udyqqNkCALJgzKzADgJRdgVls55V2zN0NAGTDjPAwdaMB4Vd2Be7L3JSgnpOsQAZloffs23FOmr8T5nUj70nlYoFsEPLbFJldgRkwKyH8AwAA//+RpTKWAAAABklEQVQDAHfcQiFKPwLGAAAAAElFTkSuQmCC", offset: [5, 6] }
    }
};

let masterLandMask = null;

async function getMasterMask() {
    if (masterLandMask) return masterLandMask;
    let data;
    if (isNode) {
        const image = await Jimp.read(ANALYZER_CONFIG.masterMapUrl);
        data = image.bitmap.data;
    } else {
        const img = new Image(); img.src = ANALYZER_CONFIG.masterMapUrl;
        await new Promise(r => img.onload = r);
        const canvas = document.createElement('canvas');
        canvas.width = ANALYZER_CONFIG.mapWidth; canvas.height = ANALYZER_CONFIG.mapHeight;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
        data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    }
    masterLandMask = new Uint8Array(Math.ceil((ANALYZER_CONFIG.mapWidth * ANALYZER_CONFIG.mapHeight) / 8));
    for (let i = 0; i < data.length; i += 4) {
        if (ANALYZER_CONFIG.isLand(data[i], data[i+1], data[i+2])) {
            const idx = i / 4;
            masterLandMask[idx >> 3] |= (1 << (idx & 7));
        }
    }
    return masterLandMask;
}

/**
 * Generic Image Abstraction
 */
async function loadGenericImage(source) {
    if (isNode) {
        const image = await Jimp.read(source);
        return {
            width: image.bitmap.width,
            height: image.bitmap.height,
            data: image.bitmap.data,
            getPixel: (x, y) => {
                const idx = (y * image.bitmap.width + x) * 4;
                return [image.bitmap.data[idx], image.bitmap.data[idx+1], image.bitmap.data[idx+2], image.bitmap.data[idx+3]];
            }
        };
    } else {
        const img = new Image(); img.src = source;
        await new Promise(r => img.onload = r);
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        return {
            width: img.width, height: img.height, data: imageData.data,
            getPixel: (x, y) => {
                const idx = (y * img.width + x) * 4;
                return [imageData.data[idx], imageData.data[idx+1], imageData.data[idx+2], imageData.data[idx+3]];
            }
        };
    }
}

async function runAnalysis(imageSource) {
    let width, height, imageData;
    
    if (isNode) {
        const image = await Jimp.read(imageSource);
        width = image.bitmap.width; height = image.bitmap.height;
        imageData = image.bitmap.data;
    } else {
        const ctx = imageSource.getContext('2d');
        width = imageSource.width; height = imageSource.height;
        imageData = ctx.getImageData(0, 0, width, height).data;
    }

    if (width > 750) {
        const scale = 0.5;
        if (isNode) {
            const image = await Jimp.read(imageSource);
            image.resize({ w: Math.round(width * scale), mode: 'nearestNeighbor' });
            width = image.bitmap.width; height = image.bitmap.height;
            imageData = image.bitmap.data;
        } else {
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = Math.round(width * scale); tmpCanvas.height = Math.round(height * scale);
            const tmpCtx = tmpCanvas.getContext('2d'); tmpCtx.imageSmoothingEnabled = false;
            tmpCtx.drawImage(imageSource, 0, 0, tmpCanvas.width, tmpCanvas.height);
            width = tmpCanvas.width; height = tmpCanvas.height;
            imageData = tmpCtx.getImageData(0, 0, width, height).data;
        }
    }

    const masterLandMask = await getMasterMask();

    // 1. Identify Category (Marker First)
    let detectedCategory = "unknown";
    let bestMarkerMatch = { key: "family", x: 0, y: 0, score: 0 };
    for (const [key, maskData] of Object.entries(ANALYZER_CONFIG.masks)) {
        const m = await loadGenericImage(maskData.url);
        for (let y = 0; y < height - m.height; y += 2) {
            for (let x = 0; x < width - m.width; x += 2) {
                let hits = 0, total = 0;
                for (let py = 0; py < m.height; py += 2) {
                    for (let px = 0; px < m.width; px += 2) {
                        const [mr, mg, mb, ma] = m.getPixel(px, py);
                        if (ma < 128) continue;
                        total++;
                        const sIdx = ((y + py) * width + (x + px)) * 4;
                        if (imageData[sIdx] > 140 && imageData[sIdx+1] < 120 && imageData[sIdx+2] < 120) hits++;
                    }
                }
                if (hits / total > bestMarkerMatch.score) {
                    bestMarkerMatch = { key, x, y, score: hits / total };
                }
            }
        }
    }
    detectedCategory = bestMarkerMatch.score > 0.4 ? bestMarkerMatch.key : "unknown";
    const itemOffset = { 
        x: bestMarkerMatch.x + ANALYZER_CONFIG.masks[detectedCategory === "unknown" ? "treasure" : detectedCategory].offset[0], 
        y: bestMarkerMatch.y + ANALYZER_CONFIG.masks[detectedCategory === "unknown" ? "treasure" : detectedCategory].offset[1] 
    };

    // 2. Word Identification
    let detectedWord = "unknown";
    const searchWords = detectedCategory === "treasure" ? ["inca"] : (detectedCategory === "family" ? ["sister", "mother", "uncle", "lost"] : ["inca", "sister", "mother", "uncle", "lost"]);
    for (const name of searchWords) {
        const w = await loadGenericImage(ANALYZER_CONFIG.wordImgs[name]);
        for (let y = 0; y < Math.min(height - w.height, 60); y++) {
            for (let x = 0; x < width - w.width; x++) {
                let match = true;
                for (let py = 0; py < w.height; py++) {
                    for (let px = 0; px < w.width; px++) {
                        const [wr, wg, wb, wa] = w.getPixel(px, py);
                        if (wa < 128) continue;
                        const sIdx = ((y + py) * width + (x + px)) * 4;
                        if (imageData[sIdx] > 115 || imageData[sIdx+1] > 115 || imageData[sIdx+2] > 115) { match = false; break; }
                    }
                    if (!match) break;
                }
                if (match) { detectedWord = name; break; }
            }
            if (detectedWord !== "unknown") break;
        }
    }

    let properties = {};
    if (detectedCategory === "treasure" || (detectedCategory === "unknown" && detectedWord === "inca")) {
        properties = { type: (detectedWord === "inca" ? "inca" : "treasure"), description: (detectedWord === "inca" ? "Inca Treasure" : "Treasure Map") };
    } else {
        const desc = (detectedWord === "unknown" || detectedWord === "lost") ? "Family Member" : detectedWord.charAt(0).toUpperCase() + detectedWord.slice(1);
        properties = { type: "family", description: desc };
    }

    // 3. Map Search
    const landPoints = [], waterPoints = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            if (ANALYZER_CONFIG.isLand(imageData[idx], imageData[idx+1], imageData[idx+2])) landPoints.push({ x, y });
            else if (ANALYZER_CONFIG.isWater(imageData[idx], imageData[idx+1], imageData[idx+2])) waterPoints.push({ x, y });
        }
    }
    const probeCount = 300;
    const landProbes = Array.from({length: probeCount}, () => landPoints[Math.floor(Math.random() * landPoints.length)]);
    const waterProbes = Array.from({length: Math.min(probeCount, waterPoints.length)}, () => waterPoints[Math.floor(Math.random() * waterPoints.length)]);

    let bestMatch = { x: 0, y: 0, score: -Infinity };
    for (let my = 0; my < ANALYZER_CONFIG.mapHeight - height; my += 3) {
        for (let mx = 0; mx < ANALYZER_CONFIG.mapWidth - width; mx += 3) {
            let score = 0;
            for (const p of landProbes) {
                const idx = (my + p.y) * ANALYZER_CONFIG.mapWidth + (mx + p.x);
                if (masterLandMask[idx >> 3] & (1 << (idx & 7))) score++;
            }
            for (const p of waterProbes) {
                const idx = (my + p.y) * ANALYZER_CONFIG.mapWidth + (mx + p.x);
                if (!(masterLandMask[idx >> 3] & (1 << (idx & 7)))) score++;
            }
            if (score > bestMatch.score) bestMatch = { x: mx, y: my, score: score };
        }
    }
    const confidence = (bestMatch.score / (landProbes.length + waterProbes.length)) * 100;
    const finalX = bestMatch.x + itemOffset.x, finalY = bestMatch.y + itemOffset.y;
    const latLng = baseMapPixelToLatLng(finalX, finalY);

    return {
        confidence,
        properties,
        location: latLng,
        pixels: { x: finalX, y: finalY },
        feature: { type: "Feature", properties, geometry: { type: "Point", coordinates: [latLng.lng, latLng.lat] } }
    };
}

function baseMapPixelToLatLng(x, y) {
    const maxX = 5120, maxY = 3208, minLat = 30.279, minLng = -96.744, maxLat = 13.687, maxLng = -58.563;
    const distLat = maxLat - minLat, distLng = maxLng - minLng;
    return { lat: (y / (maxY / distLat)) + minLat, lng: (x / (maxX / distLng)) + minLng };
}

// --- BROWSER UI CODE ---
if (!isNode) {
    window.dialog = () => {
        let dlg = document.getElementById('dlgAnalyze');
        if (!dlg) {
            dlg = L.DomUtil.create("dialog", null, document.body);
            dlg.id = "dlgAnalyze";
            dlg.innerHTML = `
                <div style="min-width: 450px; padding: 15px; font-family: sans-serif;">
                    <h2>Map Analyzer (v2.12)</h2>
                    <canvas id="analyzeCanvas" style="max-width: 100%; height: auto; border: 1px solid #999; display: block; margin-bottom: 15px; background: #222;"></canvas>
                    <input id="fileInput" type="file" accept="image/*" style="margin-bottom: 15px; display: block; width: 100%;">
                    <button id="btnAnalyze" style="padding: 12px 24px; cursor: pointer; background: #0078d4; color: white; border: none; border-radius: 4px; font-weight: bold; width: 100%;">
                        Analyze Map Piece <img src="images/loader.gif" id="loader" class="hidden" style="vertical-align: middle; margin-left: 10px;">
                    </button>
                    <code id="info" style="display: block; margin: 20px 0; background: #eee; padding: 15px; border-left: 5px solid #0078d4; white-space: pre-wrap; font-size: 13px; min-height: 50px;"></code>
                    <div style="text-align: right;"><button id="closeModal">Close</button></div>
                </div>
            `;
            const fileInput = dlg.querySelector("#fileInput");
            const canvas = dlg.querySelector("#analyzeCanvas");
            fileInput.onchange = (e) => {
                const file = e.target.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => { canvas.width = img.width; canvas.height = img.height; canvas.getContext('2d').drawImage(img, 0, 0); };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            };
            dlg.querySelector("#btnAnalyze").onclick = async () => {
                const btn = document.getElementById('btnAnalyze'), loader = document.getElementById('loader'), info = document.getElementById('info');
                loader.classList.remove("hidden"); btn.disabled = true; info.innerText = "Analyzing...";
                try {
                    const result = await runAnalysis(canvas);
                    info.innerHTML = `Match Found! Confidence: ${result.confidence.toFixed(1)}%\nType: ${result.properties.description}\nLocation: ${result.location.lat.toFixed(4)}, ${result.location.lng.toFixed(4)}`;
                    const importBtn = L.DomUtil.create("button", null, info);
                    importBtn.innerText = "Import Marker"; importBtn.style.display = "block"; importBtn.style.marginTop = "10px";
                    importBtn.onclick = () => { markerGroup.addData(result.feature); dlg.close(); map.flyTo(result.location, 5); };
                } catch (e) { info.innerText = "Error: " + e.message; }
                finally { loader.classList.add("hidden"); btn.disabled = false; }
            };
            dlg.querySelector("#closeModal").onclick = () => dlg.close();
        }
        dlg.showModal();
    };
} else if (require.main === module) {
    // --- NODE CLI CODE ---
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log("Usage: node public/analyze.js <path-to-map-piece.png>");
        process.exit(1);
    }
    runAnalysis(args[0]).then(result => {
        const output = {
            metadata: {
                confidence: result.confidence.toFixed(1) + "%",
                pixels: result.pixels,
                type: result.properties.type,
                description: result.properties.description
            },
            feature: result.feature
        };
        console.log(JSON.stringify(output, null, 2));
    }).catch(err => {
        console.error("Analysis Failed:", err.message);
        process.exit(1);
    });
}

if (isNode) {
    module.exports = { runAnalysis, ANALYZER_CONFIG, baseMapPixelToLatLng };
}
