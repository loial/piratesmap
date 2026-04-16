/**
 * Map piece analyzer using OpenCV.js
 * Identifies map fragments and translates them to world coordinates.
 */

// Shared function to convert base map pixels to Lat/Lng
function baseMapPixelToLatLng(x, y) {
    // These constants should ideally be shared with map.js
    const minLat = 30.279;
    const minLng = -96.744;
    const maxLat = 13.687;
    const maxLng = -58.563;
    const maxX = 5120;
    const maxY = 3208;

    const distLat = maxLat - minLat;
    const distLng = maxLng - minLng;
    const pxPerLat = maxY / distLat;
    const pxPerLng = maxX / distLng;

    const lng = x / pxPerLng + minLng;
    const lat = y / pxPerLat + minLat;
    return { lat, lng };
}

const dialog = () => {
    let dlg = document.getElementById('dlgAnalyze');
    if (!dlg) {
        dlg = L.DomUtil.create("dialog", null, document.body);
        dlg.id = "dlgAnalyze";
        dlg.innerHTML = `
            <h2>Map piece analyzer</h2>
            <p>Load a screenshot of a map piece to add as marker</p>
            <canvas id="mapPiece"></canvas>
            <input id="fileInput" type="file" name="file" accept="image/*">
            <button id="btnAnalyze">Analyze <img src="images/loader.gif" id="loader" class="hidden"></button>
            <code id="info"></code>
            <button id="closeModal">Close</button>
        `;

        const loader = dlg.querySelector("#loader");
        loader.show = () => loader.classList.remove("hidden");
        loader.hide = () => loader.classList.add("hidden");

        dlg.querySelector("#btnAnalyze").addEventListener('click', analyze);
        dlg.querySelector("#closeModal").addEventListener('click', () => dlg.close());

        utils.addFileInputHandler('fileInput', 'mapPiece');
        dlg.addEventListener('close', () => {
            document.getElementById('fileInput').value = '';
            const canvas = document.getElementById('mapPiece');
            canvas.removeAttribute("width");
            canvas.removeAttribute("height");
        });
    }
    dlg.showModal();
};

async function analyze() {
    const wordImgs = {
        sister: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAMCAYAAACJOyb4AAAAoUlEQVR4AdSQUQ2AMBBDFxzgBS1YQBMW0IIXJADvRi/jAnwQ9gFJ02vXdRvNPI1rLTSp4ndZ3vXD7ZFPa3HTZfn+m2LulfZybgRoMW6ZUmIGqMjyoi/t5QRPN15wMuRHpkReTubLyPNyDMIKid0/XiJfzB4y0uVs5QSAAmI8YLp4iXu2kG97jCeyck4TWGUWMwM0YAblXGp8wcolvub/lm8AAAD//zo/yXAAAAAGSURBVAMAt1qQW9oUtE0AAAAASUVORK5CYII=",
        mother: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAMCAYAAACTB8Z2AAAAkUlEQVR4AdyQ0QmAMAxES2dyFldwJldwFndSX+AkhBYraj8Ujlwu6V1tXpd564WcHn7DOCXQYnM7zBvDj1dJ4JOwFtPajv0ZN4zQAen0cF/FpcdeuqqFsaSnUEVjyffiqux4HveZe+0MY/AGvDl+/jKXYfEwBmjUGmpzC1N6qUqTMT2gL1U04OdwYGGQHvhv2A4AAP//p+Oz/gAAAAZJREFUAwAU1qCTJxycMwAAAABJRU5ErkJggg==",
        uncle: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAMCAYAAACNzvbFAAAAgklEQVR4AdSP0QmAQAxD5WZyFldwJldwFndSXzFSShHR/pzwaBJ70WvbuuzVtOHHM05zevpzKYXnDWtL07YrtD/lq3hNaTzgAQ3oCDmQWykiw1+PA3iIu3qn/LFUS2+mL75LCTmsiY7wDpR7TSZvpVzJwwI+TjJQHrW8lbJUST+lBwAAAP//UniRvwAAAAZJREFUAwBkeXw/bOpDIgAAAABJRU5ErkJggg==",
        inca: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAMCAYAAACA0IaCAAAAfElEQVR4AcyP0QmAMAxES2dyFldwJldwFndSX+CVIi2o9EPhvEvTPNK8b+sxSjkN/ApsmpekvvIL7HpqMPQoXv4K7D7nlrg9MurVXRgD9ZZAqBE9a7IqsFbTS089YIAY0Mkt0Uf2zHrAWF15kZpcOxl5TlacBYwwQv+FnQAAAP//YyZ/IAAAAAZJREFUAwAP0nMjxnnBIQAAAABJRU5ErkJggg==",
        treasure: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACMAAAAMCAYAAADoIwS6AAAAtUlEQVR4AeyS0Q3CMBBDo27ALszCCszECszCLowAeSc5ci2lv+lHKzln3/kiq+32eb9+Z8HWTvSMMPfHs7Xb2mQjTMX41rnsqDD1VnqEWe2jxgzAARzABTRAZz3qyVth+g+Mt6kiMEg7zxnaoR3vOfe7nOOpMJBEXpqL6Uezgw8+Ax6f4VdvF4aBG5P7XNyruPakVdXPqvkIQzqAURUO0EJq+tlL7R5mAn2B3giDWI0rzOwL/AEAAP//vVcYYQAAAAZJREFUAwCUQdID3x8MTQAAAABJRU5ErkJggg==",
        lost: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAYAAABr5z2BAAAAgklEQVR4AcSPwRGAIAwEM9RkLbZgTbRgC7ZAL5agbiTKBB6KD505cxfCRkOa4/ZFQfIzjFN274oCuHx8xeObzNuwAiz01CaADciAeET2tQIw0Pod6/laAdjixSXAvk++AOUAPi2Rc8EjDcXLegpgA+KcimQlieBNZ+fukRWA6dX/gB0AAP//R68kxAAAAAZJREFUAwAMN2H5ZRc3nQAAAABJRU5ErkJggg=="
    };
    const masks = {
        treasure: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAABH0lEQVR4AeSQ7RGCMBBET0qwBGqxFq0Ja6EWSrAFzMvMZo4zIwmMv2R43lduVzLYj58/MJjutxWO3mT1ihAUEo61+nuxGEiA+G1pbx53BxvH5it4zItBj8kw3ca8FJ19jShwFvxsL89XxBIC8TA9YA5x3lJnAw4igBg5EegBOTDrpRiwKDEi0DvL8HjOlxYRGXIeWnY4k79gbwFxzgBL8DJbgVxQe+hnAxK/TC3og2oiIkTwObW4muWbKQaWHi9EDqm9eWuCsSdxFjcGNGxZLjXhPEs/LItUllcmzEozJZ8Gqdn6RrFYo3PKAAGPvsL3ThnUBGPvsIGEuBbw/5qZOGTAshckjybqdRvUxBEDb6K824BFD8IezdTrNtBia3wDAAD//+TIY+cAAAAGSURBVAMAzb+JMUfYx6AAAAAASUVORK5CYII=",
        family: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAMCAYAAABbayygAAAAeElEQVR4AXSOgQmAMBADa0dxFmfRmXQWZ3EV5R6uREEh9JPc1/YW374udyqqNkCALJgzKzADgJRdgVls55V2zN0NAGTDjPAwdaMB4Vd2Be7L3JSgnpOsQAZloffs23FOmr8T5nUj70nlYoFsEPLbFJldgRkwKyH8AwAA//+RpTKWAAAABklEQVQDAHfcQiFKPwLGAAAAAElFTkSuQmCC"
    };

    const btnAnalyze = document.getElementById('btnAnalyze');
    const loader = document.getElementById('loader');
    const info = document.getElementById('info');
    
    loader.show();
    btnAnalyze.disabled = true;
    info.innerText = "Analyzing...";

    try {
        let piece = cv.imread('mapPiece');
        if (piece.cols > 750 && piece.rows > 570) {
            cv.resize(piece, piece, new cv.Size(piece.cols / 2, piece.rows / 2), 0, 0, cv.INTER_NEAREST);
        }

        let foundWord = "";
        let type = "";
        let dst = new cv.Mat();
        let mask = new cv.Mat();

        // Identify map type
        for (let word in wordImgs) {
            let tmpImage = new Image();
            tmpImage.src = wordImgs[word];
            await new Promise(r => tmpImage.onload = r);
            let search = cv.imread(tmpImage);
            cv.matchTemplate(piece, search, dst, cv.TM_CCOEFF_NORMED, mask);
            let result = cv.minMaxLoc(dst, mask);
            if (result.maxVal >= 0.99) {
                foundWord = word;
                search.delete();
                break;
            }
            search.delete();
        }

        if (!foundWord) {
            info.innerText = "Error: Could not identify map type.";
            return;
        }

        type = ["treasure", "inca"].includes(foundWord) ? "treasure" : "family";
        info.innerText = `Identified: ${foundWord} (${type})\n`;

        // Mask non-map elements
        const removeColors = ["000000", "ccaa99", "0000cc", "775533", "664433", "aa8855", "ccaa77"];
        let mergedMask = new cv.Mat.zeros(piece.rows, piece.cols, cv.CV_8U);
        let tmpMask = new cv.Mat();

        for (let r of removeColors) {
            let color = [parseInt(r.substring(0, 2), 16), parseInt(r.substring(2, 4), 16), parseInt(r.substring(4, 6), 16), 0];
            let low = new cv.Mat(piece.rows, piece.cols, piece.type(), color);
            let high = new cv.Mat(piece.rows, piece.cols, piece.type(), [...color.slice(0, 3), 255]);
            cv.inRange(piece, low, high, tmpMask);
            cv.bitwise_or(tmpMask, mergedMask, mergedMask);
            low.delete(); high.delete();
        }
        cv.bitwise_not(mergedMask, mergedMask);

        // Crop to map piece
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(mergedMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        let rect = cv.boundingRect(contours.get(0));
        piece = piece.roi(rect);
        mergedMask = mergedMask.roi(rect);
        contours.delete(); hierarchy.delete();

        // Find marker offset
        let tmpImage = new Image();
        tmpImage.src = masks[type];
        await new Promise(r => tmpImage.onload = r);
        let search = cv.imread(tmpImage);
        let channels = new cv.MatVector();
        cv.split(search, channels);
        let alphaMask = channels.get(3);
        cv.matchTemplate(piece, search, dst, cv.TM_CCORR_NORMED, alphaMask);
        let result = cv.minMaxLoc(dst, mask);
        
        let offset = { x: 0, y: 0 };
        if (result.maxVal >= 0.99) {
            offset = type === "family" ? { x: result.maxLoc.x + 5, y: result.maxLoc.y + 6 } : { x: result.maxLoc.x + 17, y: result.maxLoc.y + 17 };
        }
        search.delete(); channels.delete(); alphaMask.delete();

        // Mask out marker for final match
        const removeMarker = ["996644", "002222", "ee0000"];
        cv.bitwise_not(mergedMask, mergedMask);
        for (let r of removeMarker) {
            let color = [parseInt(r.substring(0, 2), 16), parseInt(r.substring(2, 4), 16), parseInt(r.substring(4, 6), 16), 0];
            let low = new cv.Mat(piece.rows, piece.cols, piece.type(), color);
            let high = new cv.Mat(piece.rows, piece.cols, piece.type(), [...color.slice(0, 3), 255]);
            cv.inRange(piece, low, high, tmpMask);
            cv.bitwise_or(tmpMask, mergedMask, mergedMask);
            low.delete(); high.delete();
        }
        cv.bitwise_not(mergedMask, mergedMask);

        // Apply mask to piece alpha channel
        let pChannels = new cv.MatVector();
        cv.split(piece, pChannels);
        let finalChannels = new cv.MatVector();
        for (let i = 0; i < 3; i++) finalChannels.push_back(pChannels.get(i));
        finalChannels.push_back(mergedMask);
        cv.merge(finalChannels, piece);
        pChannels.delete(); finalChannels.delete();

        // Match against base map
        let mapImg = new Image();
        mapImg.src = 'map/PiratesTreasureMapBase.png';
        await new Promise(r => mapImg.onload = r);
        let baseMap = cv.imread(mapImg);
        cv.matchTemplate(baseMap, piece, dst, cv.TM_CCOEFF_NORMED, mergedMask);
        let finalResult = cv.minMaxLoc(dst, mask);

        if (finalResult.maxVal >= 0.99) {
            let mapPoint = { x: finalResult.maxLoc.x + offset.x, y: finalResult.maxLoc.y + offset.y };
            let latLng = baseMapPixelToLatLng(mapPoint.x, mapPoint.y);
            
            let feature = {
                type: "Feature",
                properties: { type: type === "treasure" ? foundWord : type, description: foundWord === "lost" ? "family member" : foundWord },
                geometry: { type: "Point", coordinates: [latLng.lng, latLng.lat] }
            };

            info.innerText += `Location: ${latLng.lat.toFixed(3)}, ${latLng.lng.toFixed(3)}\n`;
            let btnImport = L.DomUtil.create("button", null, info);
            btnImport.innerText = "Import marker";
            btnImport.onclick = () => {
                markerGroup.addData(feature);
                dlg.close();
                map.flyTo([latLng.lat, latLng.lng]);
            };
        } else {
            info.innerText += "Error: Could not find piece on base map.";
        }

        piece.delete(); dst.delete(); mask.delete(); mergedMask.delete(); tmpMask.delete(); baseMap.delete();
    } catch (e) {
        console.error(e);
        info.innerText = "OpenCV Error: " + e.message;
    } finally {
        loader.hide();
        btnAnalyze.disabled = false;
    }
}
