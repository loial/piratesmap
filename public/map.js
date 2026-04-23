/* 
    PiratesMap - Core Map Logic
    Coordinate Constants: 5120x3208 pixels, PxPerLong = 134.1, PxPerLat = 193.33, 
    LeftLong = 96,744W, RightLong = 58,563, TopLat = 30,279N, BotLat = 13,687N 
*/

const MAP_CONSTANTS = {
    minLat: 30.279,
    minLng: -96.744,
    maxLat: 13.687,
    maxLng: -58.563,
    maxX: 5120,
    maxY: 3208
};

const distLat = MAP_CONSTANTS.maxLat - MAP_CONSTANTS.minLat;
const distLng = MAP_CONSTANTS.maxLng - MAP_CONSTANTS.minLng;
const pxPerLat = MAP_CONSTANTS.maxY / distLat;
const pxPerLng = MAP_CONSTANTS.maxX / distLng;

// Initialize CRS
L.CRS.PiratesCRS = L.extend({}, L.CRS.Simple, {
    transformation: new L.Transformation(0.1 * pxPerLng, 0, 0.1 * pxPerLat, 0)
});

const mapBounds = [L.latLng(MAP_CONSTANTS.minLat, MAP_CONSTANTS.minLng), L.latLng(MAP_CONSTANTS.maxLat, MAP_CONSTANTS.maxLng)];

// Layers
const officialMap = L.imageOverlay('pirates_official_map.jpg', [L.latLng(30.500, -96.836), L.latLng(13.350, -56.836)]);
const compiledMap = L.imageOverlay('map/PiratesMapFullRetro.png', mapBounds);
const baseMap = L.imageOverlay('map/PiratesMapBase.png', mapBounds);

const mutuallyExclusiveOverlays = {
    "All cities (all time periods)": L.imageOverlay('map/PiratesMapOverlayFullNoLabel.png', mapBounds),
    "1560 - The Silver Empire": L.imageOverlay('map/PiratesMapOverlay1560NoLabel.png', mapBounds),
    "1600 - Merchants and Smugglers": L.imageOverlay('map/PiratesMapOverlay1600NoLabel.png', mapBounds),
    "1620 - The New Colonists": L.imageOverlay('map/PiratesMapOverlay1620NoLabel.png', mapBounds),
    "1640 - War for Profit": L.imageOverlay('map/PiratesMapOverlay1640NoLabel.png', mapBounds),
    "1660 - The Buccaneer Heroes": L.imageOverlay('map/PiratesMapOverlay1660NoLabel.png', mapBounds),
    "1680 - Pirates' Sunset": L.imageOverlay('map/PiratesMapOverlay1680NoLabel.png', mapBounds),
};

const baseMaps = {
    "Official Map": officialMap,
    "Compiled Map (Full, static)": compiledMap,
    "Compile Map (dynamic)": baseMap
};

// Global State / Storage
const storageDefaults = {
    baseLayer: "Compile Map (dynamic)",
    defaultOverlay: "All cities (all time periods)",
    latlngOverlay: true,
    usePiratesFont: true
};

let storage = localStorage.getItem("storage");
if (storage) {
    storage = JSON.parse(storage);
    // Ensure new properties exist in old storage objects
    storage = Object.assign({}, storageDefaults, storage);
    // Clean up obsolete properties
    const keysToKeep = Object.keys(storageDefaults);
    Object.keys(storage).forEach(key => {
        if (!keysToKeep.includes(key)) delete storage[key];
    });
} else {
    storage = { ...storageDefaults };
}

// Initialize Lat/Lon layer AFTER storage is loaded
const latlngLayer = L.latlngGraticule({
    font: storage.usePiratesFont ? "12px piratesFont" : '',
    showLabel: true,
    dashArray: [1, 1],
    zoomInterval: {
        latitude: [{ start: 1, end: 10, interval: 1 }],
        longitude: [{ start: 1, end: 10, interval: 2 }]
    }
});

setTimeout(() => map.fire('viewreset'), 100);// Force graticule re-render

// Apply initial font state
document.body.classList.toggle('standard-font', !storage.usePiratesFont);

// Create map with NO layers initially to prevent race conditions in listeners
const map = L.map('map', {
    crs: L.CRS.PiratesCRS,
    minZoom: 2,
    maxZoom: 6,
    wheelPxPerZoomLevel: 20
});

// City Layer
const citiesLayer = L.layerGroup();
citiesLayer.cities = {};

function onEachCityFeature(feature, layer) {
    const direction = feature.properties.label_direction || "center";

    layer.bindTooltip(`<div class="city-label-inner">${feature.properties.name}</div>`, {
        permanent: true,
        direction: "center",
        className: "city-labels label-" + direction
    });
    let popupContent = `<b>${feature.properties.name} - ${feature.properties.location}</b>`;

    citiesLayer.cities[feature.properties.name] = layer;
    if (feature.properties.link) {
        popupContent += `<br/>See also: <a href="#" class="citylink">${feature.properties.link}</a>`;
    }
    popupContent += `<p>${feature.properties.text}</p>`;
    popupContent += `<p>(Eras: ${feature.properties.eras.length === 6 ? 'All' : feature.properties.eras})</p>`;

    layer.bindPopup(popupContent);
    layer.on("popupopen", function () {
        if (feature.properties.link) {
            this.getPopup().getElement().getElementsByClassName("citylink")[0].onclick = () => {
                citiesLayer.cities[feature.properties.link].openPopup();
            };
        }
    });
}

L.geoJSON(cities, {
    onEachFeature: onEachCityFeature,
    pointToLayer(feature, latlng) {
        return L.circle(latlng, {
            radius: 0.09,
            fillColor: '#ffffff',
            color: '#000',
            weight: 1,
            opacity: 0.2,
            fillOpacity: 0.1,
            className: "citypoint"
        });
    }
}).addTo(citiesLayer);

function filterCities(era) {
    const isDynamicBase = storage.baseLayer === "Compile Map (dynamic)";
    const isAll = isNaN(era);

    for (let name in citiesLayer.cities) {
        const city = citiesLayer.cities[name];
        // Tooltips are only shown on the Dynamic Map and filtered by era
        const tooltipVisible = isDynamicBase && (isAll || (city.feature.properties.eras && city.feature.properties.eras.includes(era)));
        
        // Markers (hotspots) should always be displayed to remain interactive
        const el = city.getElement();
        if (el) el.style.display = "";
        
        const tooltip = city.getTooltip();
        if (tooltip) {
            const tEl = tooltip.getElement();
            if (tEl) tEl.style.display = tooltipVisible ? "" : "none";
        }
    }
}

function reorderCities(era) {
    let c = {};
    for (let name in citiesLayer.cities) {
        c[name] = citiesLayer.cities[name];
    }
    cities.features.filter(e => e.properties.link && e.properties.eras.includes(era))
        .forEach(e => {
            let current = e.properties.name;
            let other = e.properties.link;
            if (c[current] && c[other]) {
                const curEl = c[current].getElement();
                const othEl = c[other].getElement();
                if (curEl && othEl) curEl.before(othEl);
            }
        });
}

// Layer Control Handling
const overlayMaps = (storage.baseLayer === "Compile Map (dynamic)") ? { ...mutuallyExclusiveOverlays } : {};
const layerControl = L.control.layers(baseMaps, overlayMaps, {
    collapsed: false,
    sortLayers: true,
    sortFunction: (a, b, nameA, nameB) => {
        if (nameA.startsWith("All cities")) return -1;
        if (nameB.startsWith("All cities")) return 1;
        return nameA.localeCompare(nameB);
    }
}).addTo(map);
layerControl._container.classList.add("overlays");

const otherOverlays = { "Lat/Long lines": latlngLayer };
let otherOverlaysControl = L.control.layers(null, otherOverlays, { collapsed: false });

function updateOverlayUI() {
    setTimeout(() => {
        const overlayContainer = document.querySelector(".overlays");
        if (!overlayContainer) return;
        
        const inputs = overlayContainer.querySelectorAll("input");
        const eraNames = Object.keys(mutuallyExclusiveOverlays);
        
        inputs.forEach(input => {
            const labelEl = input.closest('label');
            if (!labelEl) return;
            const label = labelEl.textContent.trim();
            
            if (eraNames.includes(label)) {
                const isActive = map.hasLayer(mutuallyExclusiveOverlays[label]);
                input.checked = isActive; 
                input.disabled = isActive; 
                labelEl.style.cursor = isActive ? "default" : "pointer";
                labelEl.style.opacity = "1"; 
                
                if (isActive) {
                    labelEl.classList.add("active-overlay-label");
                } else {
                    labelEl.classList.remove("active-overlay-label");
                }
            }
        });
    }, 100);
}

let isInternalSwitch = false;

function handleOverlayAdd(event) {
    if (Object.keys(mutuallyExclusiveOverlays).includes(event.name)) {
        if (isInternalSwitch) return;
        
        setTimeout(() => {
            isInternalSwitch = true;
            try {
                storage.defaultOverlay = event.name;
                for (let o in mutuallyExclusiveOverlays) {
                    if (event.name !== o && map.hasLayer(mutuallyExclusiveOverlays[o])) {
                        map.removeLayer(mutuallyExclusiveOverlays[o]);
                    }
                }
                let era = parseInt(event.name.split(" ")[0]);
                filterCities(era);
                if (era) reorderCities(era);
                updateOverlayUI();
                localStorage.setItem("storage", JSON.stringify(storage));
            } finally {
                isInternalSwitch = false;
            }
        }, 0);
    }
    
    if (event.name === "Lat/Long lines") {
        storage.latlngOverlay = true;
        localStorage.setItem("storage", JSON.stringify(storage));
    }
}

function handleOverlayRemove(event) {
    if (isInternalSwitch) return;
    if (Object.keys(mutuallyExclusiveOverlays).includes(event.name)) {
        event.layer.addTo(map);
    }
    if (event.name === "Lat/Long lines") {
        storage.latlngOverlay = false;
        localStorage.setItem("storage", JSON.stringify(storage));
    }
}

map.on('overlayadd', handleOverlayAdd);
map.on('overlayremove', handleOverlayRemove);

let lastBaseLayer = baseMaps[storage.baseLayer];
map.on('baselayerchange', function (event) {
    const isOfficial = event.layer === officialMap;
    const isDynamic = event.layer === baseMap;

    // Use a small timeout to avoid Leaflet race conditions during transition
    setTimeout(() => {
        isInternalSwitch = true;
        try {
            if (isOfficial) {
                // Remove era overlays immediately
                for (let o in mutuallyExclusiveOverlays) {
                    if (map.hasLayer(mutuallyExclusiveOverlays[o])) map.removeLayer(mutuallyExclusiveOverlays[o]);
                }
                if (map.hasLayer(latlngLayer)) map.removeLayer(latlngLayer);
                try { map.removeControl(otherOverlaysControl); } catch(e) {}
            } else {
                otherOverlaysControl.addTo(map);
                if (storage.latlngOverlay && !map.hasLayer(latlngLayer)) map.addLayer(latlngLayer);
            }

            // Always ensure city markers are on the map for search/info
            if (!map.hasLayer(citiesLayer)) map.addLayer(citiesLayer);


            if (lastBaseLayer === baseMap) {
                for (let o in mutuallyExclusiveOverlays) {
                    if (map.hasLayer(mutuallyExclusiveOverlays[o])) map.removeLayer(mutuallyExclusiveOverlays[o]);
                    layerControl.removeLayer(mutuallyExclusiveOverlays[o]);
                }
            }

            if (isDynamic) {
                if (storage.defaultOverlay) map.addLayer(mutuallyExclusiveOverlays[storage.defaultOverlay]);
                for (let o in mutuallyExclusiveOverlays) layerControl.addOverlay(mutuallyExclusiveOverlays[o], o);
                updateOverlayUI();
            }

            lastBaseLayer = event.layer;
            storage.baseLayer = Object.keys(baseMaps).find(key => baseMaps[key] === lastBaseLayer);
            
            let era = parseInt(storage.defaultOverlay.split(" ")[0]);
            filterCities(era);
            localStorage.setItem("storage", JSON.stringify(storage));
        } finally {
            isInternalSwitch = false;
        }
    }, 0);
});

// INITIAL SETUP - Manually add layers to avoid race conditions during map constructor
const setupInitialState = () => {
    const startLayer = baseMaps[storage.baseLayer];
    startLayer.addTo(map);
    
    if (storage.baseLayer === "Compile Map (dynamic)") {
        if (storage.defaultOverlay) mutuallyExclusiveOverlays[storage.defaultOverlay].addTo(map);
    }
    
    if (storage.baseLayer !== "Official Map") {
        citiesLayer.addTo(map);
        otherOverlaysControl.addTo(map);
        if (storage.latlngOverlay) latlngLayer.addTo(map);
    }
    
    map.setView(L.latLng(24, -78), 3);
    
    let era = parseInt(storage.defaultOverlay.split(" ")[0]);
    
    // Safety sync after elements render
    setTimeout(() => {
        filterCities(era);
        updateOverlayUI();
    }, 500);
};

setupInitialState();

// Font Toggle Control
L.Control.FontToggle = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.style.backgroundColor = 'white';
        container.style.padding = '5px';
        container.style.cursor = 'pointer';

        const label = L.DomUtil.create('label', '', container);
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '5px';
        label.style.fontSize = '12px';
        label.style.color = '#333';
        label.style.margin = '0';

        const checkbox = L.DomUtil.create('input', '', label);
        checkbox.type = 'checkbox';
        checkbox.checked = storage.usePiratesFont;

        L.DomUtil.create('span', '', label).innerText = 'Pirates Font';

        L.DomEvent.on(checkbox, 'change', (e) => {
            storage.usePiratesFont = e.target.checked;
            document.body.classList.toggle('standard-font', !storage.usePiratesFont);
            
            // Sync Lat/Lon Graticule Font
            latlngLayer.options.font = storage.usePiratesFont ? "12px piratesFont" : null;
            setTimeout(() => map.fire('viewreset'), 100);// Force graticule re-render
            
            localStorage.setItem("storage", JSON.stringify(storage));
        });

        L.DomEvent.disableClickPropagation(container);
        return container;
    }
});

new L.Control.FontToggle().addTo(map);

// Search Control
const normalizeSearch = function (text, records) {
    const frecords = {};
    text = text.replace(/[.*+?^${}()|[\]\\]/g, '');
    if (text === '') return [];
    const regSearch = new RegExp((this.options.initial ? '^' : '') + text, !this.options.casesensitive ? 'i' : undefined);
    for (const key in records) {
        if (regSearch.test(key.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) frecords[key] = records[key];
    }
    return frecords;
};

const searchControl = new L.Control.Search({
    layer: citiesLayer,
    propertyName: 'name',
    filterData: normalizeSearch,
    marker: false,
    initial: false,
    firstTipSubmit: true,
    moveToLocation: (latlng) => map.flyTo(latlng, 5)
});

searchControl.on('search:locationfound', (e) => {
    if (e.layer) e.layer.openPopup();
});

map.addControl(searchControl);

/* MARKER SYSTEM */

L.Layer.include({
    getProps: function () {
        this.feature = this.feature || { type: 'Feature', properties: {} };
        return this.feature.properties;
    },
    setProps: function (props) {
        Object.assign(this.getProps(), props);
        return this;
    }
});

const icons = {
    treasure: L.icon({ iconUrl: 'images/treasure-icon.png', iconSize: [50, 40], iconAnchor: [36, 28], popupAnchor: [-20, -28] }),
    enemy: L.icon({ iconUrl: 'images/enemy-icon.png', iconSize: [42, 44], iconAnchor: [13, 42], popupAnchor: [0, -42] }),
    family: L.icon({ iconUrl: 'images/family-icon.png', iconSize: [42, 50], iconAnchor: [21, 25], popupAnchor: [0, -25] }),
    missionFrom: L.icon({ iconUrl: 'images/missionfrom-icon.png', iconSize: [48, 48], iconAnchor: [24, 24], popupAnchor: [0, -24] }),
    missionTo: L.icon({ iconUrl: 'images/missionto-icon.png', iconSize: [48, 48], iconAnchor: [24, 24], popupAnchor: [0, -24] }),
    fleet: L.icon({ iconUrl: 'images/fleet-icon.png', iconSize: [63, 40], iconAnchor: [30, 38], popupAnchor: [0, -38] }),
    train: L.icon({ iconUrl: 'images/train-icon.png', iconSize: [32, 68], iconAnchor: [16, 65], popupAnchor: [0, -50] })
};

function onEachMarkerFeature(feature, layer) {
    let title = feature.properties.type.charAt(0).toUpperCase() + feature.properties.type.slice(1);
    if (feature.properties.type === "family") title = `Long lost ${feature.properties.description}`;
    
    let popupContent = `<b>${title}</b>`;
    if (feature.properties.description && feature.properties.type !== "family") popupContent += `<p>${feature.properties.description}</p>`;
    if (feature.properties.type === "missionsource") popupContent += `<p><a onClick="map.flyTo(markerGroup.getLayers().find(l=>l.getProps().type=='missiontarget').getLatLng())">Show target</a></p>`;
    if (feature.properties.type === "missiontarget") popupContent += `<p><a onClick="map.flyTo(markerGroup.getLayers().find(l=>l.getProps().type=='missionsource').getLatLng())">Show start</a></p>`;
    
    popupContent += `<p><a class="deletemarker">Delete this marker</a></p>`;
    layer.bindPopup(popupContent);
}

const markerGroup = L.geoJSON(null, {
    onEachFeature: onEachMarkerFeature,
    pointToLayer(feature, latlng) {
        let options = { draggable: ["treasure", "inca", "family"].includes(feature.properties.type) };
        if (feature.properties.type === "treasure" || feature.properties.type === "inca") options.icon = icons.treasure;
        else if (feature.properties.type === "family") options.icon = icons.family;
        else if (feature.properties.type === "evil") options.icon = icons.enemy;
        else if (feature.properties.type === "fleet") options.icon = icons.fleet;
        else if (feature.properties.type === "train") options.icon = icons.train;
        else if (feature.properties.type === "missionsource") options.icon = icons.missionFrom;
        else if (feature.properties.type === "missiontarget") options.icon = icons.missionTo;
        return L.marker(latlng, options);
    }
}).addTo(map);

let storedMarkers = localStorage.getItem("markers");
if (storedMarkers) markerGroup.addData(JSON.parse(storedMarkers));

markerGroup.on("popupopen", (e) => {
    e.popup._container.querySelector(".deletemarker").onclick = () => markerGroup.removeLayer(e.popup._source);
});

// Custom Marker Control
L.Control.Markers = L.Control.extend({
    options: { collapsed: true, position: 'topright' },
    initialize: function (markerGroup, options) {
        L.Util.setOptions(this, options);
        this._markerGroup = markerGroup;
    },
    onAdd: function (map) {
        this._initLayout();
        this._update();
        this._markerGroup.on("layeradd layerremove", this._update, this);
        return this._container;
    },
    expand: function () {
        L.DomUtil.addClass(this._container, 'leaflet-control-markers-expanded');
        this._section.style.height = null;
        const acceptableHeight = map.getSize().y - (this._container.offsetTop + 50);
        if (acceptableHeight < this._section.clientHeight) {
            L.DomUtil.addClass(this._section, 'leaflet-control-markers-scrollbar');
            this._section.style.height = acceptableHeight + 'px';
        } else {
            L.DomUtil.removeClass(this._section, 'leaflet-control-markers-scrollbar');
        }
        return this;
    },
    collapse: function () {
        L.DomUtil.removeClass(this._container, 'leaflet-control-markers-expanded');
        return this;
    },
    _initLayout: function () {
        const className = 'leaflet-control-markers';
        const container = this._container = L.DomUtil.create('div', className);
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        const section = this._section = L.DomUtil.create('section', className + '-list');
        if (this.options.collapsed) {
            map.on('click', this.collapse, this);
            L.DomEvent.on(container, {
                mouseenter: this.expand,
                mouseleave: this.collapse
            }, this);
        }

        const link = L.DomUtil.create('a', className + '-toggle', container);
        link.href = '#';
        link.title = 'Markers';
        L.DomEvent.on(link, {
            keydown: (e) => { if (e.keyCode === 13) this.expand(); },
            click: (e) => {
                L.DomEvent.preventDefault(e);
                this.expand();
            }
        }, this);

        const header = L.DomUtil.create('div', className + "-header", section);
        const titleDiv = L.DomUtil.create('div', null, header);
        titleDiv.innerHTML = '<b>Markers</b>';

        const actionDiv = L.DomUtil.create('div', null, header);
        
        const analyzeIcon = L.DomUtil.create('span', className + "-analyzeicon", actionDiv);
        analyzeIcon.innerText = "🗺️";
        analyzeIcon.onclick = () => typeof dialog === 'function' ? dialog() : console.log("Analyze script not loaded");
        
        const addBtn = L.DomUtil.create('span', className + "-addicon", actionDiv);
        addBtn.innerText = '+';

        const addDialog = this._addDialog = L.DomUtil.create('div', className + "-add-dialog", actionDiv);
        addDialog.innerHTML = `
            <form>
                <select>
                    ${["treasure", "inca", "evil", "family", "fleet", "train", "missionsource", "missiontarget", "informant"]
                        .map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <br/>
                <input type="text" placeholder="Description...">
                <br/>
                <span class="${className}-add-dialog-info">Click on map to create marker</span>
            </form>
        `;

        addBtn.onclick = () => {
            if (addBtn.innerText === "+") {
                addDialog.style.display = "unset";
                addBtn.innerText = "x";
                map.on("click", this._addOnMapClick, this);
                if (citiesLayer.hidePoints) citiesLayer.hidePoints(true);
                map.getPane("overlayPane").classList.add("cursor-add-shortcut");
            } else {
                this._cleanupAdd();
            }
        };

        this._markersList = L.DomUtil.create('div', className + '-markers', section);
        const storeBtn = L.DomUtil.create('a', className + "-store", section);
        storeBtn.innerText = "Store in persistent storage";
        storeBtn.onclick = () => localStorage.setItem("markers", JSON.stringify(this._markerGroup.toGeoJSON()));
        
        container.appendChild(section);

        if (!this.options.collapsed) {
            this.expand();
        }
    },
    _cleanupAdd: function() {
        map.off("click", this._addOnMapClick, this);
        if (citiesLayer.hidePoints) citiesLayer.hidePoints(false);
        map.getPane("overlayPane").classList.remove("cursor-add-shortcut");
        this._addDialog.style.display = "none";
        this._container.querySelector(".leaflet-control-markers-addicon").innerText = "+";
    },
    _addOnMapClick: function (e) {
        const type = this._addDialog.querySelector("select").value;
        const desc = this._addDialog.querySelector("input").value;
        if (type !== "informant") {
            const old = this._markerGroup.getLayers().find(l => l.getProps().type === type);
            if (old) this._markerGroup.removeLayer(old);
        }
        markerGroup.addData({
            type: "Feature",
            properties: { type: type, description: desc },
            geometry: { type: "Point", coordinates: [e.latlng.lng, e.latlng.lat] }
        });
        this._cleanupAdd();
    },
    _update: function () {
        L.DomUtil.empty(this._markersList);
        this._markerGroup.eachLayer(layer => {
            const item = L. DomUtil.create('label', '', this._markersList);
            const input = L.DomUtil.create('input', 'leaflet-control-markers-selector', item);
            input.type = 'checkbox';
            input.checked = map.hasLayer(layer);
            input.onclick = () => map.hasLayer(layer) ? map.removeLayer(layer) : map.addLayer(layer);
            
            const name = L.DomUtil.create('span', '', item);
            name.innerHTML = ' ' + layer.getProps().type;
            name.onclick = (e) => {
                e.preventDefault();
                if (map.hasLayer(layer)) {
                    map.flyTo(layer.getLatLng());
                    if (layer.bounce) layer.bounce(1);
                    layer.openPopup();
                }
            };
        });
    }
});

L.control.markers = function (markerGroup, opts) {
    return new L.Control.Markers(markerGroup, opts);
};

setTimeout(() => L.control.markers(markerGroup, { collapsed: false }).addTo(map), 10);

// Dynamic Label Scaling
function updateLabelScale() {
    const zoom = map.getZoom();
    const offsetScale = 0.1 * Math.pow(zoom / 2, 3.75);
    const fontScale = 0.3 * zoom + 0.1;
    const root = document.documentElement;
    root.style.setProperty('--city-label-scale', fontScale);
    root.style.setProperty('--city-label-offset-scale', offsetScale);
}

map.on('zoom', updateLabelScale);
map.on('zoomend', () => {
    updateOverlayUI();
    let era = parseInt(storage.defaultOverlay.split(" ")[0]);
    filterCities(era);
});
updateLabelScale(); // Initialize on load

document.getElementById('map').style.cursor = 'crosshair';
map.attributionControl.addAttribution("Artwork from Sid Meier's Pirates! (1990 - Amiga) | Manual info | Compiled by Herman Sletteng");
