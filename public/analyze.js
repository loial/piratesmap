/**
 * PiratesMap - Library-Free Map Analyzer (v2.8)
 * Goal: Fix Type recognition mapping and improve word detection resilience.
 */

const ANALYZER_CONFIG = {
    masterMapUrl: 'map/PiratesTreasureMapBase.png',
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
    console.log("Generating Master Land Mask...");
    const img = new Image(); img.src = ANALYZER_CONFIG.masterMapUrl;
    await new Promise(r => img.onload = r);
    const canvas = document.createElement('canvas');
    canvas.width = ANALYZER_CONFIG.mapWidth; canvas.height = ANALYZER_CONFIG.mapHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    masterLandMask = new Uint8Array(Math.ceil((canvas.width * canvas.height) / 8));
    for (let i = 0; i < data.length; i += 4) {
        if (ANALYZER_CONFIG.isLand(data[i], data[i+1], data[i+2])) {
            const idx = i / 4;
            masterLandMask[idx >> 3] |= (1 << (idx & 7));
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
                <h2 style="margin-top: 0;">Map Piece Analyzer</h2>
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
        dlg.querySelector("#btnAnalyze").onclick = runAnalysis;
        dlg.querySelector("#closeModal").onclick = () => dlg.close();
    }
    dlg.showModal();
};

async function runAnalysis() {
    const btn = document.getElementById('btnAnalyze'), loader = document.getElementById('loader');
    const info = document.getElementById('info'), canvas = document.getElementById('analyzeCanvas');
    if (canvas.width === 0) { info.innerText = "Please select an image first."; return; }
    
    info.innerText = ""; // Clear UI status
    loader.classList.remove("hidden"); btn.disabled = true;
    info.innerText = "Analyzing Map Piece...";

    try {
        const masterMask = await getMasterMask();
        const ctx = canvas.getContext('2d');
        let width = canvas.width, height = canvas.height;
        let originalData = ctx.getImageData(0, 0, width, height).data;

        // 1. Normalization
        let scale = 1.0;
        let imageData = originalData;
        if (width > 750) {
            scale = 0.5;
            console.log("Normalizing 2x scale piece...");
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = Math.round(width * scale); tmpCanvas.height = Math.round(height * scale);
            const tmpCtx = tmpCanvas.getContext('2d'); tmpCtx.imageSmoothingEnabled = false;
            tmpCtx.drawImage(canvas, 0, 0, tmpCanvas.width, tmpCanvas.height);
            width = tmpCanvas.width; height = tmpCanvas.height;
            imageData = tmpCtx.getImageData(0, 0, width, height).data;
        }

        // 2. Map Type Recognition
        console.log("Identifying map type...");
        let detectedWord = "unknown";
        for (const [name, dataUri] of Object.entries(ANALYZER_CONFIG.wordImgs)) {
            const img = new Image(); img.src = dataUri; await new Promise(r => img.onload = r);
            const tCanvas = document.createElement('canvas'); tCanvas.width = img.width; tCanvas.height = img.height;
            const tCtx = tCanvas.getContext('2d'); tCtx.drawImage(img, 0, 0);
            const tData = tCtx.getImageData(0, 0, img.width, img.height).data;
            
            for (let y = 0; y < height - img.height; y++) {
                for (let x = 0; x < width - img.width; x++) {
                    let match = true;
                    for (let py = 0; py < img.height; py++) {
                        for (let px = 0; px < img.width; px++) {
                            const pIdx = (py * img.width + px) * 4;
                            if (tData[pIdx+3] < 128) continue;
                            const sIdx = ((y + py) * width + (x + px)) * 4;
                            if (imageData[sIdx] > 130 || imageData[sIdx+1] > 130 || imageData[sIdx+2] > 130) { match = false; break; }
                        }
                        if (!match) break;
                    }
                    if (match) { detectedWord = name; break; }
                }
                if (detectedWord !== "unknown") break;
            }
        }
        
        let properties = {};
        let maskKey = "family";
        if (detectedWord === "inca") {
            properties = { type: "inca", description: "Inca Treasure" };
            maskKey = "treasure";
        } else if (detectedWord === "treasure") {
            properties = { type: "treasure", description: "Treasure Map" };
            maskKey = "treasure";
        } else if (detectedWord === "lost") {
            properties = { type: "family", description: "Family Member" };
        } else {
            properties = { type: "family", description: detectedWord.charAt(0).toUpperCase() + detectedWord.slice(1) };
        }
        
        console.log(`Detected: ${detectedWord}`);
        info.innerText += `Detected: ${properties.description}\n`;

        // 3. Feature Extraction
        const landPoints = [], waterPoints = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = imageData[idx], g = imageData[idx+1], b = imageData[idx+2];
                if (r === g && g === b) continue;
                if (ANALYZER_CONFIG.isLand(r, g, b)) landPoints.push({ x, y });
                else if (ANALYZER_CONFIG.isWater(r, g, b)) waterPoints.push({ x, y });
            }
        }

        if (landPoints.length < 50) throw new Error("Could not find land on map piece.");

        // 4. Global Scan
        const probeCount = 300;
        const landProbes = Array.from({length: probeCount}, () => landPoints[Math.floor(Math.random() * landPoints.length)]);
        const waterProbes = Array.from({length: Math.min(probeCount, waterPoints.length)}, () => waterPoints[Math.floor(Math.random() * waterPoints.length)]);

        console.log(`Scanning map...`);
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

        // Refine
        const startX = Math.max(0, bestMatch.x - 4), startY = Math.max(0, bestMatch.y - 4);
        for (let my = startY; my < startY + 9; my++) {
            for (let mx = startX; mx < startX + 9; mx++) {
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
        if (confidence < 50) throw new Error(`Piece not found (Confidence: ${confidence.toFixed(1)}%).`);

        // 5. Marker Offset Detection
        let itemOffset = { x: width / 2, y: height / 2 };
        const maskData = ANALYZER_CONFIG.masks[maskKey];
        const mImg = new Image(); mImg.src = maskData.url; await new Promise(r => mImg.onload = r);
        const mCanvas = document.createElement('canvas'); mCanvas.width = mImg.width; mCanvas.height = mImg.height;
        const mCtx = mCanvas.getContext('2d'); mCtx.drawImage(mImg, 0, 0);
        const mPixels = mCtx.getImageData(0, 0, mImg.width, mImg.height).data;

        let bestMarkerMatch = { x: 0, y: 0, score: 0 };
        for (let y = 0; y < height - mImg.height; y++) {
            for (let x = 0; x < width - mImg.width; x++) {
                let hits = 0, total = 0;
                for (let py = 0; py < mImg.height; py++) {
                    for (let px = 0; px < mImg.width; px++) {
                        const mpIdx = (py * mImg.width + px) * 4;
                        if (mPixels[mpIdx+3] < 128) continue;
                        total++;
                        const sIdx = ((y + py) * width + (x + px)) * 4;
                        const r = imageData[sIdx], g = imageData[sIdx+1], b = imageData[sIdx+2];
                        if (r > 150 && g < 120 && b < 120) hits++;
                    }
                }
                if (hits / total > bestMarkerMatch.score) {
                    bestMarkerMatch = { x, y, score: hits / total };
                }
            }
        }

        if (bestMarkerMatch.score > 0.6) {
            itemOffset = { x: bestMarkerMatch.x + maskData.offset[0], y: bestMarkerMatch.y + maskData.offset[1] };
        }

        // 6. Finalize
        const finalX = bestMatch.x + itemOffset.x, finalY = bestMatch.y + itemOffset.y;
        const latLng = baseMapPixelToLatLng(finalX, finalY);
        
        info.innerHTML = `Match Found! (Confidence: ${confidence.toFixed(1)}%)\nType: ${properties.description}\nLocation: ${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`;
        
        const importBtn = L.DomUtil.create("button", null, info);
        importBtn.innerText = "Import Marker";
        importBtn.style.display = "block"; importBtn.style.marginTop = "15px";
        importBtn.onclick = () => {
            markerGroup.addData({
                type: "Feature",
                properties: properties,
                geometry: { type: "Point", coordinates: [latLng.lng, latLng.lat] }
            });
            document.getElementById('dlgAnalyze').close();
            map.flyTo(latLng, 5);
        };

    } catch (err) {
        console.error(err); info.innerText = "Error: " + err.message;
    } finally {
        loader.classList.add("hidden"); btn.disabled = false;
    }
}

function baseMapPixelToLatLng(x, y) {
    const maxX = 5120, maxY = 3208;
    const minLat = 30.279, minLng = -96.744;
    const maxLat = 13.687, maxLng = -58.563;
    const distLat = maxLat - minLat, distLng = maxLng - minLng;
    const pxPerLat = maxY / distLat, pxPerLng = maxX / distLng;
    return { lat: y / pxPerLat + minLat, lng: x / pxPerLng + minLng };
}
