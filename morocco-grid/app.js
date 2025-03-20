// Store map object
let map;
// Store transmission lines
let transmissionLines = [];
// Store future transmission lines
let futureTransmissionLines = [];
// Store voltage filters
let voltageFilters = {};
// Store transmission line legend
let voltageLegend = {};
// Store statistics
let stats = {
    total: 0,
    voltageCategories: {}
};
// Store power plants
let powerPlants = [];
// Store substations
let substations = [];

// Initialize map
function initMap() {
    // Get URL parameters for center and zoom if present
    const urlParams = new URLSearchParams(window.location.search);
    const lat = parseFloat(urlParams.get('lat')) || 31.7917;
    const lng = parseFloat(urlParams.get('lng')) || -7.0926;
    const zoom = parseInt(urlParams.get('zoom')) || 6;
    
    // Get display options from URL if present
    const showLines = urlParams.get('showLines') !== 'false';
    const showFuture = urlParams.get('showFuture') !== 'false';
    const showPlants = urlParams.get('showPlants') !== 'false';
    const showSubs = urlParams.get('showSubs') !== 'false';
    
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: lat, lng: lng },
        zoom: zoom,
        mapTypeControl: true,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
        },
        streetViewControl: true,
        zoomControl: true,
        zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_TOP
        }
    });

    // Add map event to update URL when map is moved or zoomed
    map.addListener('idle', function() {
        const center = map.getCenter();
        const newLat = center.lat().toFixed(6);
        const newLng = center.lng().toFixed(6);
        const newZoom = map.getZoom();
        
        // Update URL without refreshing the page
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('lat', newLat);
        newUrl.searchParams.set('lng', newLng);
        newUrl.searchParams.set('zoom', newZoom);
        window.history.replaceState({}, '', newUrl);
    });

    // Load GeoJSON data
    loadGeoJsonData();
    
    // Load Future GeoJSON data
    loadFutureGeoJsonData();
    
    // Load Power Plants data
    loadPowerPlantsData();
    
    // Load Substations data
    loadSubstationsData();

    // Add voltage filter event listeners
    setupVoltageFilters();
    
    // Set display option checkboxes based on URL
    document.getElementById('showTransmissionLines').checked = showLines;
    document.getElementById('showFutureLines').checked = showFuture;
    document.getElementById('showPowerPlants').checked = showPlants;
    document.getElementById('showSubstations').checked = showSubs;
    
    // Apply display options
    setTimeout(() => {
        toggleTransmissionLines(showLines);
        toggleFutureTransmissionLines(showFuture);
        togglePowerPlants(showPlants);
        toggleSubstations(showSubs);
    }, 1000); // Add a delay to ensure all data is loaded
}

// Load Future GeoJSON data
function loadFutureGeoJsonData() {
    fetch('futuretransmissionlines.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load future GeoJSON data: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            try {
                if (!data || !data.features || !Array.isArray(data.features)) {
                    throw new Error('Invalid future GeoJSON data format');
                }
                
                displayFutureGeoJsonData(data);
            } catch (processError) {
                console.error('Error processing future GeoJSON data:', processError);
                alert('Error processing future transmission line data: ' + processError.message);
            }
        })
        .catch(error => {
            console.error('Error loading future GeoJSON data:', error);
            alert('Error loading future transmission line data: ' + error.message);
        });
}

// Display Future GeoJSON data
function displayFutureGeoJsonData(data) {
    // Clear existing future transmission lines
    futureTransmissionLines.forEach(line => line.setMap(null));
    futureTransmissionLines = [];
    
    // Process each feature
    data.features.forEach(feature => {
        // Ensure it's a line string type
        if (feature.geometry && feature.geometry.type === 'LineString') {
            const properties = feature.properties;
            const voltageText = properties.Legend; // 使用Legend属性，如"400 kV"
            const voltage = parseInt(voltageText, 10); // 解析电压值
            
            // Set line color and weight
            let color, weight;
            
            // Set color and weight based on voltage level
            if (voltage >= 330) {
                color = '#FF0000'; // Red - 400kV
                weight = 5;
            } else if (voltage >= 220) {
                color = '#FFA500'; // Orange - 225kV
                weight = 4;
            } else if (voltage >= 110) {
                color = '#0000FF'; // Blue - 150kV
                weight = 3;
            } else if (voltage >= 60) {
                color = '#800080'; // Purple - 60kV
                weight = 2;
            } else {
                color = '#00FF00'; // Green - <60kV
                weight = 1.5;
            }
            
            // Create path coordinates
            const path = feature.geometry.coordinates.map(coord => {
                return { lat: coord[1], lng: coord[0] };
            });
            
            // Create line with dashed style for future lines
            const line = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: color,
                strokeOpacity: 0.7,
                strokeWeight: weight,
                map: map,
                strokePattern: [
                    {
                        offset: '0',
                        repeat: '10px',
                        icon: {
                            path: 'M 0,-1 0,1',
                            strokeOpacity: 1,
                            scale: 3
                        }
                    }
                ]
            });
            
            // Store line info
            const lineInfo = {
                line: line,
                voltage: voltage,
                voltageText: voltageText,
                path: path,
                isFuture: true
            };
            
            futureTransmissionLines.push(lineInfo);
            
            // Add click event
            line.addListener('click', () => {
                showLineInfo(lineInfo);
            });
        }
    });
}

// Load Power Plants data
function loadPowerPlantsData() {
    fetch('plants.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load power plants data: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            try {
                if (!data || !Array.isArray(data)) {
                    throw new Error('Invalid power plants data format');
                }
                
                displayPowerPlants(data);
                createPowerPlantsLegend();
            } catch (processError) {
                console.error('Error processing power plants data:', processError);
                alert('Error processing power plants data: ' + processError.message);
            }
        })
        .catch(error => {
            console.error('Error loading power plants data:', error);
            alert('Error loading power plants data: ' + error.message);
        });
}

// Display Power Plants on map
function displayPowerPlants(data) {
    // Clear existing power plants
    powerPlants.forEach(marker => marker.setMap(null));
    powerPlants = [];
    
    // Process each power plant
    data.forEach(plant => {
        // Create marker for power plant
        const marker = new google.maps.Marker({
            position: { lat: plant.lat, lng: plant.lng },
            map: map,
            title: plant.name,
            icon: getPowerPlantIcon(plant.type, plant.status)
        });
        
        // Add click event for power plant info
        marker.addListener('click', () => {
            showPowerPlantInfo(plant);
        });
        
        powerPlants.push(marker);
    });
}

// Get power plant icon based on type and status
function getPowerPlantIcon(type, status) {
    let color;
    
    // Set color based on plant type
    switch(type) {
        case 'BESS Plant':
            color = '#FFD700'; // Gold
            break;
        case 'Solar Plant':
            color = '#FFA500'; // Orange
            break;
        case 'Wind Plant':
            color = '#87CEEB'; // Sky Blue
            break;
        case 'Hydro Plant':
            color = '#4169E1'; // Royal Blue
            break;
        case 'Thermal Plant':
            color = '#A52A2A'; // Brown
            break;
        default:
            color = '#808080'; // Gray
    }
    
    // Create SVG icon
    return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: status === 'Planned' ? 0.6 : 0.9,
        strokeColor: '#000000',
        strokeWeight: 1,
        scale: 8
    };
}

// Create power plants legend
function createPowerPlantsLegend() {
    try {
        const legendDiv = document.querySelector('.legend');
        if (!legendDiv) {
            console.error('Legend element does not exist');
            return;
        }
        
        // Check if power plants legend section already exists
        let legendSection = document.getElementById('plants-legend');
        if (!legendSection) {
            legendSection = document.createElement('div');
            legendSection.id = 'plants-legend';
            legendSection.className = 'legend-section';
            legendSection.innerHTML = '<h4 style="margin-top: 10px;">Power Plants</h4>';
            
            // Add to legend
            legendDiv.appendChild(legendSection);
        } else {
            // Clear existing content
            legendSection.innerHTML = '<h4 style="margin-top: 10px;">Power Plants</h4>';
        }
        
        // Define plant types and corresponding colors
        const plantTypes = [
            { type: 'BESS Plant', color: '#FFD700' },
            { type: 'Solar Plant', color: '#FFA500' },
            { type: 'Wind Plant', color: '#87CEEB' },
            { type: 'Hydro Plant', color: '#4169E1' },
            { type: 'Thermal Plant', color: '#A52A2A' }
        ];
        
        plantTypes.forEach(item => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            
            legendItem.innerHTML = `
                <div class="legend-icon" style="background-color: ${item.color};"></div>
                <div class="legend-text">${item.type}</div>
            `;
            
            legendSection.appendChild(legendItem);
        });
        
        // Add operational vs planned legend
        const statusTypes = [
            { status: 'Operational', opacity: 0.9 },
            { status: 'Planned', opacity: 0.6 }
        ];
        
        statusTypes.forEach(item => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            
            legendItem.innerHTML = `
                <div class="legend-icon" style="background-color: #808080; opacity: ${item.opacity};"></div>
                <div class="legend-text">${item.status}</div>
            `;
            
            legendSection.appendChild(legendItem);
        });
    } catch (error) {
        console.error('Error creating power plants legend:', error);
    }
}

// Show power plant info
function showPowerPlantInfo(plant) {
    try {
        const infoPanel = document.getElementById('info-panel');
        const infoTitle = document.getElementById('info-title');
        const infoContent = document.getElementById('info-content');
        
        if (!infoPanel || !infoTitle || !infoContent) {
            console.error('Info panel elements do not exist');
            return;
        }
        
        infoTitle.textContent = plant.name;
        
        let content = '';
        content += `<div><strong>Type:</strong> ${plant.type}</div>`;
        content += `<div><strong>Capacity:</strong> ${plant["capacity MWh"]} MWh</div>`;
        content += `<div><strong>Connection Voltage:</strong> ${plant["poc (kV)"]} kV</div>`;
        content += `<div><strong>Area:</strong> ${plant["superficie (m2)"]} m²</div>`;
        content += `<div><strong>Status:</strong> ${plant.status}</div>`;
        
        infoContent.innerHTML = content;
        infoPanel.style.display = 'block';
    } catch (error) {
        console.error('Error showing power plant info:', error);
    }
}

// Load GeoJSON data
function loadGeoJsonData() {
    fetch('transmissionlines.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load GeoJSON data: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            try {
                if (!data || !data.features || !Array.isArray(data.features)) {
                    throw new Error('Invalid GeoJSON data format');
                }
                
                displayGeoJsonData(data);
                createVoltageLegend();
                
                // Delay updating statistics to ensure DOM is fully loaded
                setTimeout(() => {
                    try {
                        updateStats();
                    } catch (statsError) {
                        console.error('Error updating statistics:', statsError);
                    }
                }, 100);
            } catch (processError) {
                console.error('Error processing GeoJSON data:', processError);
                alert('Error processing transmission line data: ' + processError.message);
            }
        })
        .catch(error => {
            console.error('Error loading GeoJSON data:', error);
            alert('Error loading transmission line data: ' + error.message);
        });
}

// Display GeoJSON data
function displayGeoJsonData(data) {
    // Clear existing transmission lines
    transmissionLines.forEach(line => line.setMap(null));
    transmissionLines = [];

    // Reset statistics
    stats.total = 0;
    stats.voltageCategories = {};
    
    // Process each feature
    data.features.forEach(feature => {
        // Ensure it's a line string type
        if (feature.geometry && feature.geometry.type === 'LineString') {
            const properties = feature.properties;
            const voltageText = properties.Legend; // 使用Legend属性，如"400 kV"
            const voltage = parseInt(voltageText, 10); // 解析电压值
            
            // Count voltage levels
            if (!stats.voltageCategories[voltage]) {
                stats.voltageCategories[voltage] = 0;
            }
            stats.voltageCategories[voltage]++;
            stats.total++;
            
            // Set line color and weight
            let color, weight;
            
            // Set color and weight based on voltage level
            if (voltage >= 330) {
                color = '#FF0000'; // Red - 400kV
                weight = 5;
            } else if (voltage >= 220) {
                color = '#FFA500'; // Orange - 225kV
                weight = 4;
            } else if (voltage >= 110) {
                color = '#0000FF'; // Blue - 150kV
                weight = 3;
            } else if (voltage >= 60) {
                color = '#800080'; // Purple - 60kV
                weight = 2;
            } else {
                color = '#00FF00'; // Green - <60kV
                weight = 1.5;
            }
            
            // Create path coordinates
            const path = feature.geometry.coordinates.map(coord => {
                return { lat: coord[1], lng: coord[0] };
            });
            
            // Create line
            const line = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: color,
                strokeOpacity: 1.0,
                strokeWeight: weight,
                map: map
            });
            
            // Store line info
            const lineInfo = {
                line: line,
                voltage: voltage,
                voltageText: voltageText,
                path: path
            };
            
            transmissionLines.push(lineInfo);
            
            // Add click event
            line.addListener('click', () => {
                showLineInfo(lineInfo);
            });
        }
    });
    
    // Create voltage filters
    createVoltageFilters(stats.voltageCategories);
}

// Create voltage filters
function createVoltageFilters(voltageStats) {
    try {
        const controlsDiv = document.querySelector('.controls');
        if (!controlsDiv) {
            console.error('Controls panel element does not exist');
            return;
        }
        
        // Check if voltage filter section already exists
        let voltageSection = document.getElementById('voltage-filters');
        if (!voltageSection) {
            voltageSection = document.createElement('div');
            voltageSection.id = 'voltage-filters';
            voltageSection.className = 'control-section';
            voltageSection.innerHTML = '<h3 style="margin-top: 0;">Transmission Voltage Filters</h3>';
            
            // Add to controls panel
            controlsDiv.appendChild(voltageSection);
        } else {
            // Clear existing content
            voltageSection.innerHTML = '<h3 style="margin-top: 0;">Transmission Voltage Filters</h3>';
        }
        
        // Sort by voltage level
        const voltages = Object.keys(voltageStats).sort((a, b) => parseFloat(b) - parseFloat(a));
        
        voltages.forEach(voltage => {
            const count = voltageStats[voltage];
            const controlItem = document.createElement('div');
            controlItem.className = 'control-item';
            
            const id = `voltage-${voltage}`;
            voltageFilters[voltage] = true;
            
            controlItem.innerHTML = `
                <input type="checkbox" id="${id}" checked>
                <label for="${id}">${voltage}kV Lines (${count})</label>
            `;
            
            voltageSection.appendChild(controlItem);
        });
        
        // Add apply button
        const applyButton = document.createElement('button');
        applyButton.id = 'applyVoltageFilters';
        applyButton.style.marginTop = '5px';
        applyButton.textContent = 'Apply Filters';
        applyButton.addEventListener('click', filterTransmissionLines);
        
        voltageSection.appendChild(applyButton);
    } catch (error) {
        console.error('Error creating voltage filters:', error);
    }
}

// Set up voltage filter event listeners
function setupVoltageFilters() {
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'applyVoltageFilters') {
            filterTransmissionLines();
        }
        
        if (event.target && event.target.id === 'saveView') {
            saveCurrentMapView();
        }
    });
    
    // Set up display options event listeners
    document.getElementById('showTransmissionLines').addEventListener('change', function() {
        toggleTransmissionLines(this.checked);
    });
    
    document.getElementById('showPowerPlants').addEventListener('change', function() {
        togglePowerPlants(this.checked);
    });
    
    document.getElementById('showSubstations').addEventListener('change', function() {
        toggleSubstations(this.checked);
    });
    
    // Add future transmission lines toggle if element exists
    const futureLinesToggle = document.getElementById('showFutureLines');
    if (futureLinesToggle) {
        futureLinesToggle.addEventListener('change', function() {
            toggleFutureTransmissionLines(this.checked);
        });
    }
}

// Filter transmission lines
function filterTransmissionLines() {
    try {
        // Get all voltage filter states
        for (const voltage in voltageFilters) {
            const checkbox = document.getElementById(`voltage-${voltage}`);
            if (checkbox) {
                voltageFilters[voltage] = checkbox.checked;
            }
        }
        
        // Apply filters
        transmissionLines.forEach(item => {
            const visible = voltageFilters[item.voltage] !== undefined ? voltageFilters[item.voltage] : true;
            item.line.setVisible(visible);
        });
    } catch (error) {
        console.error('Error filtering transmission lines:', error);
    }
}

// Toggle transmission lines visibility
function toggleTransmissionLines(visible) {
    transmissionLines.forEach(item => {
        item.line.setVisible(visible);
    });
}

// Toggle power plants visibility
function togglePowerPlants(visible) {
    powerPlants.forEach(marker => {
        marker.setVisible(visible);
    });
}

// Toggle substations visibility
function toggleSubstations(visible) {
    substations.forEach(marker => {
        marker.setVisible(visible);
    });
}

// Toggle future transmission lines visibility
function toggleFutureTransmissionLines(visible) {
    futureTransmissionLines.forEach(item => {
        item.line.setVisible(visible);
    });
}

// Create voltage level legend
function createVoltageLegend() {
    try {
        const legendDiv = document.querySelector('.legend');
        if (!legendDiv) {
            console.error('Legend element does not exist');
            return;
        }
        
        // Check if transmission line legend section already exists
        let legendSection = document.getElementById('transmission-legend');
        if (!legendSection) {
            legendSection = document.createElement('div');
            legendSection.id = 'transmission-legend';
            legendSection.className = 'legend-section';
            legendSection.innerHTML = '<h4 style="margin-top: 0;">Transmission Lines</h4>';
            
            // Add to legend
            legendDiv.appendChild(legendSection);
        } else {
            // Clear existing content
            legendSection.innerHTML = '<h4 style="margin-top: 0;">Transmission Lines</h4>';
        }
        
        // Define voltage levels and corresponding colors and weights
        const voltageCategories = [
            { voltage: '400kV', color: '#FF0000', weight: 5 },
            { voltage: '225kV', color: '#FFA500', weight: 4 },
            { voltage: '150kV', color: '#0000FF', weight: 3 },
            { voltage: '60kV', color: '#800080', weight: 2 },
            { voltage: '<60kV', color: '#00FF00', weight: 1.5 }
        ];
        
        voltageCategories.forEach(category => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            
            legendItem.innerHTML = `
                <div class="legend-color" style="background-color: ${category.color}; height: ${category.weight}px;"></div>
                <div class="legend-text">${category.voltage} Lines</div>
            `;
            
            legendSection.appendChild(legendItem);
        });
        
        // Add line for planned lines
        const plannedLineItem = document.createElement('div');
        plannedLineItem.className = 'legend-item';
        plannedLineItem.innerHTML = `
            <div class="legend-color" style="background-color: #888; height: 2px; border-top: 2px dashed #888;"></div>
            <div class="legend-text">Planned Lines</div>
        `;
        legendSection.appendChild(plannedLineItem);
    } catch (error) {
        console.error('Error creating voltage legend:', error);
    }
}

// Show line info
function showLineInfo(lineInfo) {
    try {
        const infoPanel = document.getElementById('info-panel');
        const infoTitle = document.getElementById('info-title');
        const infoContent = document.getElementById('info-content');
        
        if (!infoPanel || !infoTitle || !infoContent) {
            console.error('Info panel elements do not exist');
            return;
        }
        
        infoTitle.textContent = 'Transmission Line Information';
        
        let content = '';
        content += `<div><strong>Voltage:</strong> ${lineInfo.voltageText}</div>`;
        content += `<div><strong>Length (approx):</strong> ${calculateLineLength(lineInfo.path).toFixed(2)} km</div>`;
        
        if (lineInfo.isFuture) {
            content += `<div><strong>Status:</strong> Planned</div>`;
        } else {
            content += `<div><strong>Status:</strong> Existing</div>`;
        }
        
        infoContent.innerHTML = content;
        infoPanel.style.display = 'block';
    } catch (error) {
        console.error('Error showing line info:', error);
    }
}

// Calculate line length in kilometers
function calculateLineLength(path) {
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
        totalDistance += google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(path[i].lat, path[i].lng),
            new google.maps.LatLng(path[i + 1].lat, path[i + 1].lng)
        );
    }
    return totalDistance / 1000; // Convert meters to kilometers
}

// Close info panel
function closeInfoPanel() {
    try {
        const infoPanel = document.getElementById('info-panel');
        if (infoPanel) {
            infoPanel.style.display = 'none';
        }
    } catch (error) {
        console.error('Error closing info panel:', error);
    }
}

// Update statistics
function updateStats() {
    try {
        // Update total lines
        const totalLinesElement = document.getElementById('total-lines');
        if (totalLinesElement) {
            totalLinesElement.textContent = stats.total;
        }
        
        // Create detailed voltage statistics
        const statsContent = document.getElementById('stats-content');
        if (!statsContent) {
            console.warn('Stats content element does not exist');
            return;
        }
        
        // Clear existing voltage statistics
        while (statsContent.childNodes.length > 1) {
            statsContent.removeChild(statsContent.lastChild);
        }
        
        // Sort by voltage level
        const voltages = Object.keys(stats.voltageCategories).sort((a, b) => parseFloat(b) - parseFloat(a));
        
        // Add statistics for each voltage level
        voltages.forEach(voltage => {
            const count = stats.voltageCategories[voltage];
            const statItem = document.createElement('div');
            statItem.innerHTML = `${voltage}kV Lines: <span>${count}</span>`;
            statsContent.appendChild(statItem);
        });
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

// Load Substations data
function loadSubstationsData() {
    fetch('substations.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load substations data: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            try {
                if (!data || !Array.isArray(data)) {
                    throw new Error('Invalid substations data format');
                }
                
                displaySubstations(data);
                createSubstationsLegend();
            } catch (processError) {
                console.error('Error processing substations data:', processError);
                alert('Error processing substations data: ' + processError.message);
            }
        })
        .catch(error => {
            console.error('Error loading substations data:', error);
            alert('Error loading substations data: ' + error.message);
        });
}

// Display Substations on map
function displaySubstations(data) {
    // Clear existing substations
    substations.forEach(marker => marker.setMap(null));
    substations = [];
    
    // Process each substation
    data.forEach(station => {
        // Create marker for substation
        const marker = new google.maps.Marker({
            position: { lat: station.lat, lng: station.lng },
            map: map,
            title: station.name,
            icon: getSubstationIcon(station.voltage)
        });
        
        // Add click event for substation info
        marker.addListener('click', () => {
            showSubstationInfo(station);
        });
        
        substations.push(marker);
    });
}

// Get substation icon based on voltage
function getSubstationIcon(voltage) {
    let color;
    
    // Set color based on voltage level
    if (voltage >= 330) {
        color = '#FF0000'; // Red - 400kV
    } else if (voltage >= 220) {
        color = '#FFA500'; // Orange - 225kV
    } else if (voltage >= 110) {
        color = '#0000FF'; // Blue - 150kV
    } else if (voltage >= 60) {
        color = '#800080'; // Purple - 60kV
    } else {
        color = '#00FF00'; // Green - <60kV
    }
    
    // Create SVG icon (square for substations)
    return {
        path: 'M -6,-6 L 6,-6 L 6,6 L -6,6 Z', // Square shape
        fillColor: color,
        fillOpacity: 0.9,
        strokeColor: '#000000',
        strokeWeight: 1,
        scale: 1
    };
}

// Create substations legend
function createSubstationsLegend() {
    try {
        const legendDiv = document.querySelector('.legend');
        if (!legendDiv) {
            console.error('Legend element does not exist');
            return;
        }
        
        // Check if substations legend section already exists
        let legendSection = document.getElementById('substations-legend');
        if (!legendSection) {
            legendSection = document.createElement('div');
            legendSection.id = 'substations-legend';
            legendSection.className = 'legend-section';
            legendSection.innerHTML = '<h4 style="margin-top: 10px;">Substations</h4>';
            
            // Add to legend
            legendDiv.appendChild(legendSection);
        } else {
            // Clear existing content
            legendSection.innerHTML = '<h4 style="margin-top: 10px;">Substations</h4>';
        }
        
        // Define voltage levels and corresponding colors
        const voltageCategories = [
            { voltage: '400kV', color: '#FF0000' },
            { voltage: '225kV', color: '#FFA500' },
            { voltage: '150kV', color: '#0000FF' },
            { voltage: '90kV', color: '#800080' },
            { voltage: '<60kV', color: '#00FF00' }
        ];
        
        voltageCategories.forEach(item => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            
            // Create a square icon for substations
            legendItem.innerHTML = `
                <div class="legend-icon" style="background-color: ${item.color}; width: 12px; height: 12px; border-radius: 0;"></div>
                <div class="legend-text">${item.voltage} Substation</div>
            `;
            
            legendSection.appendChild(legendItem);
        });
    } catch (error) {
        console.error('Error creating substations legend:', error);
    }
}

// Show substation info
function showSubstationInfo(station) {
    try {
        const infoPanel = document.getElementById('info-panel');
        const infoTitle = document.getElementById('info-title');
        const infoContent = document.getElementById('info-content');
        
        if (!infoPanel || !infoTitle || !infoContent) {
            console.error('Info panel elements do not exist');
            return;
        }
        
        infoTitle.textContent = station.name;
        
        let content = '';
        content += `<div><strong>Type:</strong> ${station.type}</div>`;
        content += `<div><strong>Voltage Level:</strong> ${station.voltage} kV</div>`;
        
        infoContent.innerHTML = content;
        infoPanel.style.display = 'block';
    } catch (error) {
        console.error('Error showing substation info:', error);
    }
}

// Save current map view
function saveCurrentMapView() {
    try {
        const center = map.getCenter();
        const lat = center.lat().toFixed(6);
        const lng = center.lng().toFixed(6);
        const zoom = map.getZoom();
        
        // Create URL with map state
        const mapUrl = new URL(window.location.href);
        mapUrl.searchParams.set('lat', lat);
        mapUrl.searchParams.set('lng', lng);
        mapUrl.searchParams.set('zoom', zoom);
        
        // Add display options to URL
        mapUrl.searchParams.set('showLines', document.getElementById('showTransmissionLines').checked);
        mapUrl.searchParams.set('showFuture', document.getElementById('showFutureLines').checked);
        mapUrl.searchParams.set('showPlants', document.getElementById('showPowerPlants').checked);
        mapUrl.searchParams.set('showSubs', document.getElementById('showSubstations').checked);
        
        // Create modal or dialog to display URL
        const urlString = mapUrl.toString();
        const shareUrl = document.getElementById('shareUrl');
        
        if (shareUrl) {
            shareUrl.value = urlString;
            document.getElementById('shareUrlContainer').style.display = 'block';
        } else {
            // Create temporary input to copy to clipboard
            const tempInput = document.createElement('input');
            tempInput.value = urlString;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            
            alert('Map view URL has been copied to clipboard!');
        }
    } catch (error) {
        console.error('Error saving map view:', error);
        alert('Error saving map view: ' + error.message);
    }
} 