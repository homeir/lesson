// Store map object
let map;
// Store transmission lines
let transmissionLines = [];
// Store voltage filters
let voltageFilters = {};
// Store transmission line legend
let voltageLegend = {};
// Store statistics
let stats = {
    total: 0,
    voltageCategories: {}
};

// Initialize map
function initMap() {
    // Get URL parameters for center and zoom if present
    const urlParams = new URLSearchParams(window.location.search);
    const lat = parseFloat(urlParams.get('lat')) || 26.8206;  // Egypt center coordinates
    const lng = parseFloat(urlParams.get('lng')) || 30.8025;
    const zoom = parseInt(urlParams.get('zoom')) || 6;
    
    // Get display options from URL if present
    const showLines = urlParams.get('showLines') !== 'false';
    
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

    // Add voltage filter event listeners
    setupVoltageFilters();
    
    // Set display option checkboxes based on URL
    document.getElementById('showTransmissionLines').checked = showLines;
    
    // Apply display options
    setTimeout(() => {
        toggleTransmissionLines(showLines);
    }, 1000); // Add a delay to ensure all data is loaded
    
    // Make map accessible globally for map type switching
    window.map = map;
    
    // Add map type switching functionality
    setTimeout(() => {
        const mapTypeRadios = document.querySelectorAll('input[name="mapType"]');
        mapTypeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked && map) {
                    map.setMapTypeId(this.value);
                }
            });
        });
    }, 100);
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
            const voltage = properties.transmissionPower; // 使用transmissionPower属性
            const lineType = properties.lineType; // 线路类型：single, double
            
            // Count voltage levels
            if (!stats.voltageCategories[voltage]) {
                stats.voltageCategories[voltage] = 0;
            }
            stats.voltageCategories[voltage]++;
            stats.total++;
            
            // Set line color and weight based on voltage level
            let color, weight;
            
            if (voltage >= 500) {
                color = '#FF0000'; // Red - 500kV
                weight = 6;
            } else if (voltage >= 400) {
                color = '#FF4500'; // Orange Red - 400kV  
                weight = 5;
            } else if (voltage >= 275) {
                color = '#FFA500'; // Orange - 275kV
                weight = 4;
            } else if (voltage >= 225) {
                color = '#FFD700'; // Gold - 225kV
                weight = 3.5;
            } else if (voltage >= 150) {
                color = '#0000FF'; // Blue - 150kV
                weight = 3;
            } else if (voltage >= 110) {
                color = '#800080'; // Purple - 110kV
                weight = 2.5;
            } else if (voltage >= 60) {
                color = '#008000'; // Green - 60kV
                weight = 2;
            } else {
                color = '#808080'; // Gray - <60kV
                weight = 1.5;
            }
            
            // Adjust weight for double lines
            if (lineType === 'double') {
                weight = weight * 1.5;
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
                strokeOpacity: 0.8,
                strokeWeight: weight,
                map: map
            });
            
            // Store line info
            const lineInfo = {
                line: line,
                voltage: voltage,
                voltageText: voltage + 'kV',
                lineType: lineType,
                path: path,
                nodes: properties.nodes || []
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
            { voltage: '500kV', color: '#FF0000', weight: 6 },
            { voltage: '400kV', color: '#FF4500', weight: 5 },
            { voltage: '275kV', color: '#FFA500', weight: 4 },
            { voltage: '225kV', color: '#FFD700', weight: 3.5 },
            { voltage: '150kV', color: '#0000FF', weight: 3 },
            { voltage: '110kV', color: '#800080', weight: 2.5 },
            { voltage: '60kV', color: '#008000', weight: 2 },
            { voltage: '<60kV', color: '#808080', weight: 1.5 }
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
        
        // Add legend for line types
        const lineTypeItem = document.createElement('div');
        lineTypeItem.className = 'legend-item';
        lineTypeItem.innerHTML = `
            <div class="legend-text" style="margin-top: 10px;"><strong>Line Types:</strong></div>
        `;
        legendSection.appendChild(lineTypeItem);
        
        const singleLineItem = document.createElement('div');
        singleLineItem.className = 'legend-item';
        singleLineItem.innerHTML = `
            <div class="legend-color" style="background-color: #666; height: 2px;"></div>
            <div class="legend-text">Single Circuit</div>
        `;
        legendSection.appendChild(singleLineItem);
        
        const doubleLineItem = document.createElement('div');
        doubleLineItem.className = 'legend-item';
        doubleLineItem.innerHTML = `
            <div class="legend-color" style="background-color: #666; height: 4px;"></div>
            <div class="legend-text">Double Circuit</div>
        `;
        legendSection.appendChild(doubleLineItem);
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
        content += `<div><strong>Voltage Level:</strong> ${lineInfo.voltageText}</div>`;
        content += `<div><strong>Line Type:</strong> ${lineInfo.lineType === 'single' ? 'Single Circuit' : 'Double Circuit'}</div>`;
        content += `<div><strong>Line Length (approx):</strong> ${calculateLineLength(lineInfo.path).toFixed(2)} km</div>`;
        
        if (lineInfo.nodes && lineInfo.nodes.length > 0) {
            content += `<div><strong>Connected Nodes:</strong> ${lineInfo.nodes.join(' - ')}</div>`;
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