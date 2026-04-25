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
const officialMap = L.imageOverlay('maps/pirates_official_map.jpg', [L.latLng(30.500, -96.836), L.latLng(13.350, -56.836)]);
const compiledMap = L.imageOverlay('maps/PiratesMapFullRetro.png', mapBounds);
const baseMap = L.imageOverlay('maps/PiratesMapBase.png', mapBounds);

const mutuallyExclusiveOverlays = {
    "All cities (all time periods)": L.imageOverlay('maps/PiratesMapOverlayFullNoLabel.png', mapBounds),
    "1560 - The Silver Empire": L.imageOverlay('maps/PiratesMapOverlay1560NoLabel.png', mapBounds),
    "1600 - Merchants and Smugglers": L.imageOverlay('maps/PiratesMapOverlay1600NoLabel.png', mapBounds),
    "1620 - The New Colonists": L.imageOverlay('maps/PiratesMapOverlay1620NoLabel.png', mapBounds),
    "1640 - War for Profit": L.imageOverlay('maps/PiratesMapOverlay1640NoLabel.png', mapBounds),
    "1660 - The Buccaneer Heroes": L.imageOverlay('maps/PiratesMapOverlay1660NoLabel.png', mapBounds),
    "1680 - Pirates' Sunset": L.imageOverlay('maps/PiratesMapOverlay1680NoLabel.png', mapBounds),
};

const latlngLayerInstance = L.latlngGraticule({
    font: "12px piratesFont",
    showLabel: true,
    dashArray: [1, 1],
    zoomInterval: {
        latitude: [{ start: 1, end: 10, interval: 1 }],
        longitude: [{ start: 1, end: 10, interval: 2 }]
    }
});

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

// Update graticule font based on storage before any display
latlngLayerInstance.options.font = storage.usePiratesFont ? "12px piratesFont" : '';

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

// Panel Layers Configuration
const panelBaseLayers = [
    {
        group: "Base Maps",
        layers: [
            { name: "Official Map", layer: officialMap, active: storage.baseLayer === "Official Map" },
            { name: "Compiled Map (Full, static)", layer: compiledMap, active: storage.baseLayer === "Compiled Map (Full, static)" },
            { name: "Compile Map (dynamic)", layer: baseMap, active: storage.baseLayer === "Compile Map (dynamic)" }
        ]
    }
];

const panelOverlays = [
    {
        group: "Eras (Dynamic Map only)",
        layers: Object.keys(mutuallyExclusiveOverlays).map(name => ({
            name: name,
            layer: mutuallyExclusiveOverlays[name],
            active: (storage.baseLayer === "Compile Map (dynamic)" && storage.defaultOverlay === name),
            exclusiveGroup: "eras" // Native exclusivity for overlays
        }))
    },
    {
        group: "Settings",
        layers: [
            { name: "Pirates Font", layer: L.layerGroup(), active: storage.usePiratesFont, icon: '<span class="panel-icon">🔤</span>' },
            { name: "Lat/Long lines", layer: latlngLayerInstance, active: storage.latlngOverlay, icon: '<span class="panel-icon">🌐</span>' }
        ]
    },
    {
        group: "Tools",
        layers: [
            { name: "Add Marker", layer: L.layerGroup(), icon: '<span class="panel-icon no-checkbox">➕</span>' },
            { name: "Analyze Map Piece", layer: L.layerGroup(), icon: '<span class="panel-icon no-checkbox">🗺️</span>' },
            { name: "Store All Markers", layer: L.layerGroup(), icon: '<span class="panel-icon no-checkbox">💾</span>' }
        ]
    },
    {
        group: "Markers",
        layers: [] // Populated dynamically below
    }
];

const panelControl = L.control.panelLayers(panelBaseLayers, panelOverlays, {
    compact: true,
    collapsed: true,
    collapsibleGroups: true,
    position: 'topright',
    sortLayers: true,
    sortFunction: (a, b, nameA, nameB) => {
        if (nameA.startsWith("All cities")) return -1;
        if (nameB.startsWith("All cities")) return 1;
        return nameA.localeCompare(nameB);
    }
}).addTo(map);

let isInternalSwitch = false;

function handleOverlayAdd(event) {
    if (isInternalSwitch) return;
    
    // Era Overlays
    if (Object.keys(mutuallyExclusiveOverlays).includes(event.name)) {
        storage.defaultOverlay = event.name;
        let era = parseInt(event.name.split(" ")[0]);
        filterCities(era);
        if (era) reorderCities(era);
    }
    
    // Tools
    if (event.name === "Add Marker") {
        startAddMarkerMode();
        setTimeout(() => map.removeLayer(event.layer), 100);
    }
    if (event.name === "Analyze Map Piece") {
        if (typeof dialog === 'function') dialog();
        setTimeout(() => map.removeLayer(event.layer), 100);
    }
    if (event.name === "Store All Markers") {
        localStorage.setItem("markers", JSON.stringify(markerGroup.toGeoJSON()));
        alert("Markers stored in persistent storage.");
        setTimeout(() => map.removeLayer(event.layer), 100);
    }

    // Settings
    if (event.name === "Pirates Font") {
        storage.usePiratesFont = true;
        updateFontState();
    }
    if (event.name === "Lat/Long lines") {
        storage.latlngOverlay = true;
    }
    localStorage.setItem("storage", JSON.stringify(storage));
}

function handleOverlayRemove(event) {
    if (isInternalSwitch) return;
    
    if (event.name === "Pirates Font") {
        storage.usePiratesFont = false;
        updateFontState();
    }
    if (event.name === "Lat/Long lines") {
        storage.latlngOverlay = false;
    }
    localStorage.setItem("storage", JSON.stringify(storage));
}

function updateFontState() {
    document.body.classList.toggle('standard-font', !storage.usePiratesFont);
    latlngLayerInstance.options.font = storage.usePiratesFont ? "12px piratesFont" : '';
    setTimeout(() => map.fire('viewreset'), 100);
}

map.on('overlayadd', handleOverlayAdd);
map.on('overlayremove', handleOverlayRemove);

let lastBaseLayer = baseMaps[storage.baseLayer];
map.on('baselayerchange', function (event) {
    const isOfficial = event.layer === officialMap;
    const isDynamic = event.layer === baseMap;

    setTimeout(() => {
        isInternalSwitch = true;
        try {
            if (isOfficial) {
                // Leaflet-panel-layers manages its own layers, but we need to ensure
                // internal state (labels, latlng) syncs with the base map.
                if (map.hasLayer(latlngLayerInstance)) map.removeLayer(latlngLayerInstance);
            } else {
                if (storage.latlngOverlay && !map.hasLayer(latlngLayerInstance)) map.addLayer(latlngLayerInstance);
            }

            if (!map.hasLayer(citiesLayer)) map.addLayer(citiesLayer);

            lastBaseLayer = event.layer;
            storage.baseLayer = Object.keys(baseMaps).find(key => baseMaps[key] === lastBaseLayer);
            
            // Toggle body classes for conditional UI visibility
            document.body.classList.remove('base-official', 'base-static', 'base-dynamic');
            if (isOfficial) document.body.classList.add('base-official');
            else if (event.layer === compiledMap) document.body.classList.add('base-static');
            else if (isDynamic) document.body.classList.add('base-dynamic');

            let era = parseInt(storage.defaultOverlay.split(" ")[0]);
            filterCities(era);
            localStorage.setItem("storage", JSON.stringify(storage));
        } finally {
            isInternalSwitch = false;
        }
    }, 0);
});

// INITIAL SETUP
const setupInitialState = () => {
    if (storage.baseLayer !== "Official Map") {
        citiesLayer.addTo(map);
    }
    
    // Initial body class
    document.body.classList.remove('base-official', 'base-static', 'base-dynamic');
    if (storage.baseLayer === "Official Map") document.body.classList.add('base-official');
    else if (storage.baseLayer === "Compiled Map (Full, static)") document.body.classList.add('base-static');
    else document.body.classList.add('base-dynamic');

    map.setView(L.latLng(24, -78), 3);
    
    let era = parseInt(storage.defaultOverlay.split(" ")[0]);
    
    setTimeout(() => {
        filterCities(era);
        setTimeout(() => map.fire('viewreset'), 100);
    }, 500);
};

setupInitialState();

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

// Sync markerGroup with Panel
markerGroup.on("layeradd", (e) => {
    panelControl.addOverlay({
        name: e.layer.getProps().description || e.layer.getProps().type,
        layer: e.layer,
        group: "Markers",
        icon: '<span class="panel-icon no-checkbox">📍</span>'
    });
});

markerGroup.on("layerremove", (e) => {
    panelControl.removeLayer(e.layer);
});

let storedMarkers = localStorage.getItem("markers");
if (storedMarkers) markerGroup.addData(JSON.parse(storedMarkers));

markerGroup.on("popupopen", (e) => {
    const delBtn = e.popup._container.querySelector(".deletemarker");
    if (delBtn) delBtn.onclick = () => markerGroup.removeLayer(e.popup._source);
});

// Marker Add Dialog
let addMarkerControl = null;

function startAddMarkerMode() {
    if (!addMarkerControl) {
        addMarkerControl = L.control.dialog({
            size: [300, 180],
            minSize: [250, 150],
            maxSize: [400, 300],
            anchor: [100, 100],
            position: 'topleft',
            initOpen: false
        }).addTo(map);

        const content = L.DomUtil.create('div', 'leaflet-control-markers-add-dialog-floating');
        content.style.padding = "10px";
        content.innerHTML = `
            <h3 style="margin-top:0; font-size: 14px;">Add New Marker</h3>
            <form id="addMarkerForm">
                <select id="markerType" style="width:100%; padding: 5px;">
                    ${["treasure", "inca", "evil", "family", "fleet", "train", "missionsource", "missiontarget", "informant"]
                        .map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <input id="markerDesc" type="text" placeholder="Description..." style="width:100%; margin-top:10px; padding: 5px;">
                <div style="color:red; font-size:11px; margin-top:10px; font-weight: bold;">Click on map to place</div>
            </form>
        `;
        addMarkerControl.setContent(content);
        
        // Leaflet.Dialog fires events on the map object, and the dialog instance is the event data
        map.on('dialog:closed', (e) => {
            if (e === addMarkerControl) cleanupAddMarkerMode();
        });
    }

    addMarkerControl.open();
    map.on("click", onMapClickForMarker);
    map.getPane("overlayPane").classList.add("cursor-add-shortcut");
}

function onMapClickForMarker(e) {
    const type = document.getElementById("markerType").value;
    const desc = document.getElementById("markerDesc").value;
    if (type !== "informant") {
        const old = markerGroup.getLayers().find(l => l.getProps().type === type);
        if (old) markerGroup.removeLayer(old);
    }
    markerGroup.addData({
        type: "Feature",
        properties: { type: type, description: desc },
        geometry: { type: "Point", coordinates: [e.latlng.lng, e.latlng.lat] }
    });
    
    // Explicit cleanup
    cleanupAddMarkerMode();
    if (addMarkerControl) addMarkerControl.close();
}

function cleanupAddMarkerMode() {
    map.off("click", onMapClickForMarker);
    map.getPane("overlayPane").classList.remove("cursor-add-shortcut");
}

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
    let era = parseInt(storage.defaultOverlay.split(" ")[0]);
    filterCities(era);
});
updateLabelScale(); // Initialize on load

document.getElementById('map').style.cursor = 'crosshair';
map.attributionControl.addAttribution("Artwork from Sid Meier's Pirates! (1990 - Amiga) | Manual info | Compiled by Herman Sletteng");
