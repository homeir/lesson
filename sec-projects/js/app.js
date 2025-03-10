let map;
let markers = [];
let activeInfoWindow = null;

// Initialize Google Maps
async function initMap() {


    // Create table element
    createTable();
    
    // Create map centered on a default location
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    
    map = new Map(document.getElementById('map'), {
        zoom: 3,
        center: { lat: 30.0, lng: 45.0 },
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ]
    });

    // Add markers for each project
    for (const project of projectData) {
        await addMarker(project);
    }

    // Add legend
    addLegend();
}

function createTable() {
    const tableContainer = document.getElementById('grid');
    const table = document.createElement('table');
    table.className = 'project-table';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = [
        'ID', 'Project Name', 'Area', 
        'Country/City', 'MW', 'MWh', 'Battery Supplier',
        'PCS Model', 'PCS Qty', 'ESS Model',
        'ESS Qty', 'Altitude', 'Latitude', 'Longitude', 'Min Temp', 'Max Temp',
        'Contract Date', 'COD Date', 'Client', 'Status', 'Actions'
    ];

    const dataFields = [
        'id', 'project_name', 'area',
        'country_city', 'mw', 'mwh', 'battery_supplier',
        'pcs_model', 'pcs_qty', 'ess_model',
        'ess_qty', 'altitude', 'latitude', 'longitude', 'min_temp', 'max_temp',
        'contract_date', 'cod_date', 'client', 'status'
    ];

    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    projectData.forEach(project => {
        const row = document.createElement('tr');
        
        // Add data cells based on field mapping
        dataFields.forEach(field => {
            const td = document.createElement('td');
            const value = project[field];
            
            // Handle different data types
            if (value === undefined || value === null) {
                td.textContent = '-';
            } else {
                // Add special formatting for numeric fields
                if (['mw', 'mwh'].includes(field) && typeof value === 'number') {
                    td.textContent = value.toFixed(2);
                    td.style.textAlign = 'right';
                }
                // Add special formatting for temperature
                else if (['min_temp', 'max_temp'].includes(field) && typeof value === 'number') {
                    td.textContent = `${value}°C`;
                    td.style.textAlign = 'right';
                }
                // Add special formatting for coordinates
                else if (['latitude', 'longitude'].includes(field) && typeof value === 'number') {
                    td.textContent = value.toFixed(4);
                    td.style.textAlign = 'right';
                }
                // Add special formatting for dates
                else if (field.includes('date') && value) {
                    try {
                        td.textContent = new Date(value).toLocaleDateString('zh-CN');
                    } catch (e) {
                        td.textContent = value;
                    }
                }
                // Add status styling
                else if (field === 'status' && value) {
                    td.textContent = value;
                    td.className = `status-${value.toLowerCase().replace(' ', '-')}`;
                }
                // Default handling
                else {
                    td.textContent = value;
                }
            }
            
            row.appendChild(td);
        });

        // Add view map button
        const actionCell = document.createElement('td');
        const viewButton = document.createElement('button');
        viewButton.textContent = '查看地图';
        viewButton.onclick = () => {
            if (project.location) {
                map.panTo(project.location);
                map.setZoom(8);
                const marker = markers.find(m => m.title === project.project_name);
                if (marker) {
                    marker.dispatchEvent('click');
                }
            }
        };
        actionCell.appendChild(viewButton);
        row.appendChild(actionCell);

        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    tableContainer.appendChild(table);
}

// Add a marker for a project
async function addMarker(project) {
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    
    // Create marker element
    const markerElement = document.createElement('div');
    markerElement.className = 'custom-marker';
    markerElement.style.width = '20px';
    markerElement.style.height = '20px';
    markerElement.style.borderRadius = '50%';
    markerElement.style.backgroundColor = getStatusColor(project.status);
    markerElement.style.border = '2px solid #FFFFFF';
    
    const marker = new AdvancedMarkerElement({
        map,
        position: project.location,
        title: project.project_name,
        content: markerElement
    });

    // Create info window content
    const content = `
        <div class="info-window">
            <h2>${project.project_name}</h2>
            <div class="info-content">
                <p><strong>容量:</strong> ${project.mw}MW / ${project.mwh}MWh</p>
                <p><strong>位置:</strong> ${project.country_city}</p>
                <p><strong>海拔:</strong> ${project.altitude}</p>
                <p><strong>温度范围:</strong> ${project.min_temp}°C ~ ${project.max_temp}°C</p>
                <p><strong>电池供应商:</strong> ${project.battery_supplier}</p>
                <p><strong>PCS型号:</strong> ${project.pcs_model} x ${project.pcs_qty}</p>
                <p><strong>ESS型号:</strong> ${project.ess_model} x ${project.ess_qty}</p>
                <p><strong>合同日期:</strong> ${new Date(project.contract_date).toLocaleDateString('zh-CN')}</p>
                <p><strong>投运日期:</strong> ${new Date(project.cod_date).toLocaleDateString('zh-CN')}</p>
                <p><strong>客户:</strong> ${project.client}</p>
                <p><strong>状态:</strong> <span class="status-${project.status.toLowerCase().replace(' ', '-')}">${project.status}</span></p>
            </div>
        </div>
    `;

    const infoWindow = new google.maps.InfoWindow({
        content: content,
        maxWidth: 300
    });

    // Add click listener to marker
    marker.addEventListener('click', () => {
        if (activeInfoWindow) {
            activeInfoWindow.close();
        }
        infoWindow.open(map, marker);
        activeInfoWindow = infoWindow;
        
        // Pan to marker
        map.panTo(marker.position);
    });

    markers.push(marker);
}

// Add legend to map
function addLegend() {
    const legend = document.createElement('div');
    legend.id = 'legend';
    legend.innerHTML = `
        <h3>Project Status</h3>
        <div class="legend-item">
            <span class="legend-color" style="background-color: #4CAF50"></span>
            <span>Operational</span>
        </div>
        <div class="legend-item">
            <span class="legend-color" style="background-color: #FFA500"></span>
            <span>Under Construction</span>
        </div>
        <div class="legend-item">
            <span class="legend-color" style="background-color: #2196F3"></span>
            <span>Planning</span>
        </div>
    `;

    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legend);
}

// Get color based on project status
function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'operational':
            return '#4CAF50';  // Green
        case 'under construction':
            return '#FFA500';  // Orange
        case 'planning':
            return '#2196F3';  // Blue
        default:
            return '#757575';  // Grey
    }
}

// Filter projects by status
function filterProjects(status) {
    markers.forEach(marker => {
        const project = projectData.find(p => p.name === marker.title);
        if (status === 'all' || project.details.status.toLowerCase() === status.toLowerCase()) {
            marker.setVisible(true);
        } else {
            marker.setVisible(false);
            if (activeInfoWindow) {
                activeInfoWindow.close();
            }
        }
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Add filter event listeners
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            filterProjects(e.target.dataset.status);
        });
    });
}); 