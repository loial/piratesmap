/**
 * Map piece analyzer using OpenCV.js
 * Identifies map fragments and translates them to world coordinates.
 * Adapted from the original version in the main branch.
 */

const dialog = () => {
    let dlg = document.getElementById('dlgAnalyze');
    if (!dlg) {
        dlg = L.DomUtil.create("dialog", null, document.body);
        dlg.id = "dlgAnalyze";
        
        L.DomUtil.create("h2", null, dlg).innerText = "Map piece analyzer";
        let p = L.DomUtil.create("p", null, dlg);
        p.innerText = "Load a screenshot of a map piece to add as marker";
        
        L.DomUtil.create("canvas", null, dlg).id = "mapPiece";
        L.DomUtil.create("br", null, dlg);
        
        let i = L.DomUtil.create("input", null, dlg);
        i.id = "fileInput";
        i.type = "file";
        i.name = "file";
        i.accept = "image/*";
        
        let b1 = L.DomUtil.create("button", null, dlg);
        b1.innerText = "Analyze";
        b1.id = "btnAnalyze";
        b1.addEventListener('click', () => { analyze(); });
        
        let loader = L.DomUtil.create("img", "hidden", b1);
        loader.src = "images/loader.gif";
        loader.id = "loader";
        loader.show = () => { loader.classList.remove("hidden") };
        loader.hide = () => { loader.classList.add("hidden") };
        
        L.DomUtil.create("br", null, dlg);
        let info = L.DomUtil.create("code", null, dlg);
        info.id = "info";
        
        L.DomUtil.create("br", null, dlg);
        let bClose = L.DomUtil.create("button", null, dlg);
        bClose.innerText = "Close";
        bClose.id = "closeModal";
        bClose.addEventListener('click', () => { dlg.close(); });

        utils.addFileInputHandler('fileInput', 'mapPiece');
        dlg.addEventListener('close', () => {
            let f = document.getElementById('fileInput');
            f.value = '';
            let c = document.getElementById('mapPiece');
            c.removeAttribute("width");
            c.removeAttribute("height");
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

    let btnAnalyze = document.getElementById('btnAnalyze');
    let loader = document.getElementById('loader');
    let info = document.getElementById('info');
    let dlg = document.getElementById('dlgAnalyze');

    loader.show();
    btnAnalyze.setAttribute('disabled', "");
    info.innerText = "";

    // Track OpenCV objects for cleanup
    let piece = null, dst = null, mask = null, search = null, tmpImage = null,
        mergedMask = null, tmpMask = null, contours = null, hierarchy = null,
        channels = null, alphaMask = null, baseMap = null, newChannels = null;

    try {
        console.log("Begin analyzing map");
        
        piece = cv.imread('mapPiece');
        if (piece.cols > 750 && piece.rows > 570) {
            cv.resize(piece, piece, new cv.Size(piece.cols / 2, piece.rows / 2), 0, 0, cv.INTER_NEAREST);
            console.log("Resized map to " + piece.cols + "x" + piece.rows);
        }

        dst = new cv.Mat();
        mask = new cv.Mat();
        tmpImage = new Image();
        let foundWord = "";
        let type = "";
        let offset = { x: 0, y: 0 };

        console.log("Looking for text");
        for (let word in wordImgs) {
            tmpImage.src = wordImgs[word];
            await new Promise(r => tmpImage.onload = r);
            search = cv.imread(tmpImage);
            cv.matchTemplate(piece, search, dst, cv.TM_CCOEFF_NORMED, mask);
            let result = cv.minMaxLoc(dst, mask);
            if (result.maxVal >= 0.99) {
                foundWord = word;
                console.log("Identified: " + word);
                info.innerText += "Identified: " + word + "\n";
                search.delete(); search = null;
                break;
            }
            search.delete(); search = null;
        }

        if (foundWord) {
            type = (foundWord === "treasure" || foundWord === "inca") ? "treasure" : "family";
            console.log("Type: " + type);
            info.innerText += "Type: " + type + "\n";

            console.log("Masking non-map elements");
            const removeColors = ["000000", "ccaa99", "0000cc", "775533", "664433", "aa8855", "ccaa77"];
            tmpMask = new cv.Mat();
            for (let r of removeColors) {
                let colorVal = [parseInt(r.substring(0, 2), 16), parseInt(r.substring(2, 4), 16), parseInt(r.substring(4, 6), 16), 0];
                let low = new cv.Mat(piece.rows, piece.cols, piece.type(), colorVal);
                let high = new cv.Mat(piece.rows, piece.cols, piece.type(), [colorVal[0], colorVal[1], colorVal[2], 255]);
                cv.inRange(piece, low, high, tmpMask);
                if (mergedMask) {
                    cv.bitwise_or(tmpMask, mergedMask, mergedMask);
                } else {
                    mergedMask = tmpMask.clone();
                }
                low.delete(); high.delete();
            }
            tmpMask.delete(); tmpMask = null;
            cv.bitwise_not(mergedMask, mergedMask);

            contours = new cv.MatVector();
            hierarchy = new cv.Mat();
            cv.findContours(mergedMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
            console.log("Found " + contours.size() + " shapes");

            let rect = cv.boundingRect(contours.get(0));
            let pieceROI = piece.roi(rect);
            let maskROI = mergedMask.roi(rect);
            let croppedPiece = pieceROI.clone();
            let croppedMask = maskROI.clone();
            piece.delete(); piece = croppedPiece;
            mergedMask.delete(); mergedMask = croppedMask;
            pieceROI.delete(); maskROI.delete();
            contours.delete(); contours = null;
            hierarchy.delete(); hierarchy = null;

            console.log("Finding map/marker offset");
            tmpImage.src = masks[type];
            await new Promise(r => tmpImage.onload = r);
            search = cv.imread(tmpImage);
            channels = new cv.MatVector();
            cv.split(search, channels);
            alphaMask = channels.get(3);
            cv.matchTemplate(piece, search, dst, cv.TM_CCORR_NORMED, alphaMask);
            let mResult = cv.minMaxLoc(dst, mask);
            if (mResult.maxVal >= 0.99) {
                let maxLoc = mResult.maxLoc;
                offset = type === "family" ? { x: maxLoc.x + 5, y: maxLoc.y + 6 } : { x: maxLoc.x + 17, y: maxLoc.y + 17 };
                console.log("Offset: " + offset.x + "," + offset.y);
                info.innerText += "Offset: " + offset.x + "," + offset.y + "\n";
            }
            search.delete(); search = null;
            channels.delete(); channels = null;
            alphaMask.delete(); alphaMask = null;

            console.log("Mask out marker");
            const removeMarker = ["996644", "002222", "ee0000"];
            cv.bitwise_not(mergedMask, mergedMask);
            tmpMask = new cv.Mat();
            for (let r of removeMarker) {
                let colorVal = [parseInt(r.substring(0, 2), 16), parseInt(r.substring(2, 4), 16), parseInt(r.substring(4, 6), 16), 0];
                let low = new cv.Mat(piece.rows, piece.cols, piece.type(), colorVal);
                let high = new cv.Mat(piece.rows, piece.cols, piece.type(), [colorVal[0], colorVal[1], colorVal[2], 255]);
                cv.inRange(piece, low, high, tmpMask);
                cv.bitwise_or(tmpMask, mergedMask, mergedMask);
                low.delete(); high.delete();
            }
            tmpMask.delete(); tmpMask = null;
            cv.bitwise_not(mergedMask, mergedMask);

            console.log("applying mask");
            channels = new cv.MatVector();
            cv.split(piece, channels);
            newChannels = new cv.MatVector();
            for (let i = 0; i < 3; i++) newChannels.push_back(channels.get(i));
            newChannels.push_back(mergedMask);
            cv.merge(newChannels, piece);
            channels.delete(); channels = null;
            newChannels.delete(); newChannels = null;

            console.log("Loading TreasureMapBase");
            tmpImage.src = 'map/PiratesTreasureMapBase.png';
            await new Promise(r => tmpImage.onload = r);
            baseMap = cv.imread(tmpImage);
            
            console.log("Template matching map piece against MapBase");
            try {
                cv.matchTemplate(baseMap, piece, dst, cv.TM_CCOEFF_NORMED, mergedMask);
            } catch (e) {
                console.log("OpenCv.js error:", e);
            }
            
            let finalResult = cv.minMaxLoc(dst, mask);
            if (finalResult.maxVal >= 0.99) {
                let maxLoc = finalResult.maxLoc;
                let mapPoint = { x: maxLoc.x + offset.x, y: maxLoc.y + offset.y };
                console.log("baseMap location: " + mapPoint.x + "," + mapPoint.y);
                info.innerText += "baseMap location: " + mapPoint.x + "," + mapPoint.y + "\n";
                
                let latLng = baseMapPixelToLatLng(mapPoint.x, mapPoint.y);
                let feature = {
                    type: "Feature",
                    properties: { 
                        type: type === "treasure" ? foundWord : type, 
                        description: (foundWord === "lost" || foundWord === "sister") ? "family member" : foundWord 
                    },
                    geometry: { type: "Point", coordinates: [latLng.lng, latLng.lat] }
                };

                let markerJSON = JSON.stringify(feature);
                info.innerText += markerJSON + "\n";
                
                let button = L.DomUtil.create("button", null, info);
                button.innerText = "Import marker";
                button.onclick = () => {
                    markerGroup.addData(feature);
                    if (dlg) dlg.close();
                    map.flyTo([latLng.lat, latLng.lng]);
                };
            } else {
                console.log("No match found. MaxVal: " + finalResult.maxVal);
                info.innerText += "Error: Could not find piece on base map.";
            }
        }
    } catch (e) {
        console.error("Analysis failed:", e);
        info.innerText = "Error: " + (e.message || e);
    } finally {
        if (piece) piece.delete();
        if (dst) dst.delete();
        if (mask) mask.delete();
        if (mergedMask) mergedMask.delete();
        if (tmpMask) tmpMask.delete();
        if (search) search.delete();
        if (contours) contours.delete();
        if (hierarchy) hierarchy.delete();
        if (channels) channels.delete();
        if (alphaMask) alphaMask.delete();
        if (baseMap) baseMap.delete();
        if (newChannels) newChannels.delete();
        
        console.log("Finished analyzing");
        loader.hide();
        btnAnalyze.removeAttribute('disabled');
    }
}

function baseMapPixelToLatLng(x, y) {
    const maxX = 5120;
    const maxY = 3208;
    const minLat = 30.279;
    const minLng = -96.744;
    const maxLat = 13.687;
    const maxLng = -58.563;
    
    const distLat = maxLat - minLat;
    const distLng = maxLng - minLng;
    const pxPerLat = maxY / distLat;
    const pxPerLng = maxX / distLng;
    
    const lng = x / pxPerLng + minLng;
    const lat = y / pxPerLat + minLat;
    return { lat, lng };
}
