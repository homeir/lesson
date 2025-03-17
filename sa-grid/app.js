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
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -8.783195, lng: 34.508523 }, // Center of Africa
        zoom: 4,
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

    // Load GeoJSON data
    loadGeoJsonData();

    // Add voltage filter event listeners
    setupVoltageFilters();
}

// Load GeoJSON data
function loadGeoJsonData() {
    fetch('africagrid20170906final.geojson')
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
            const voltage = properties.voltage_kV;
            const status = properties.status;
            const country = properties.country;
            
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
                color = '#FF0000'; // Red
                weight = 5;
            } else if (voltage >= 161) {
                color = '#FFA500'; // Orange
                weight = 4;
            } else if (voltage >= 90) {
                color = '#0000FF'; // Blue
                weight = 3;
            } else if (voltage >= 60) {
                color = '#800080'; // Purple
                weight = 2;
            } else {
                color = '#00FF00'; // Green
                weight = 1.5;
            }
            
            // If it's a planned line, use dashed line
            const strokeOpacity = status === 'Planned' ? 0.7 : 1.0;
            const strokeDashArray = status === 'Planned' ? [4, 4] : null;
            
            // Create path coordinates
            const path = feature.geometry.coordinates.map(coord => {
                return { lat: coord[1], lng: coord[0] };
            });
            
            // Create line
            const line = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: color,
                strokeOpacity: strokeOpacity,
                strokeWeight: weight,
                map: map
            });
            
            // Set dashed line style (if it's a planned line)
            if (strokeDashArray) {
                line.setOptions({ strokeDasharray: strokeDashArray });
            }
            
            // Store line info
            const lineInfo = {
                line: line,
                voltage: voltage,
                status: status,
                country: country,
                from: properties.from,
                to: properties.to,
                length_km: properties.length_km,
                operator: properties.operator,
                source: properties.source
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
        
        // Don't call updateStats directly here, let loadGeoJsonData handle it
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
            { voltage: '330kV+', color: '#FF0000', weight: 5 },
            { voltage: '161-330kV', color: '#FFA500', weight: 4 },
            { voltage: '90-160kV', color: '#0000FF', weight: 3 },
            { voltage: '60-89kV', color: '#800080', weight: 2 },
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
        
        // Add planned line legend
        const plannedItem = document.createElement('div');
        plannedItem.className = 'legend-item';
        plannedItem.innerHTML = `
            <div class="legend-color" style="background-color: #888888; height: 2px; border-top: 1px dashed #888888;"></div>
            <div class="legend-text">Planned Lines</div>
        `;
        
        legendSection.appendChild(plannedItem);
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
        content += `<div><strong>Voltage:</strong> ${lineInfo.voltage}kV</div>`;
        content += `<div><strong>Status:</strong> ${lineInfo.status}</div>`;
        content += `<div><strong>Country:</strong> ${lineInfo.country}</div>`;
        
        if (lineInfo.length_km) {
            content += `<div><strong>Length:</strong> ${lineInfo.length_km} km</div>`;
        }
        
        if (lineInfo.from) {
            content += `<div><strong>Origin Station:</strong> ${lineInfo.from}</div>`;
        }
        
        if (lineInfo.to) {
            content += `<div><strong>Destination Station:</strong> ${lineInfo.to}</div>`;
        }
        
        if (lineInfo.operator) {
            content += `<div><strong>Operator:</strong> ${lineInfo.operator}</div>`;
        }
        
        if (lineInfo.source) {
            content += `<div><strong>Data Source:</strong> ${lineInfo.source}</div>`;
        }
        
        infoContent.innerHTML = content;
        infoPanel.style.display = 'block';
    } catch (error) {
        console.error('Error showing line info:', error);
    }
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