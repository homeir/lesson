let map;
let markers = [];
let activeInfoWindow = null;

// Initialize Google Maps
async function initMap() {
    // Validate project data first
    if (!validateProjectData(projectData)) {
        console.error('项目数据格式验证失败，地图可能无法正确显示标记');
        return;
    }

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
        'ID', 'ESS Count', 'Project Name', 'Application', 'Area', 
        'Country/City', 'MW', 'MWh', 'Battery Supplier', 'Chemistry',
        'PCS Model', 'PCS Qty', 'ESS Model 1', 'ESS Model 2',
        'ESS Qty 1', 'ESS Qty 2', 'Altitude', 'Min Temp', 'Max Temp',
        'Contract Date', 'CRM/C4', 'Client', 'Tech Support', 'Actions'
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
        
        // Add data cells
        Object.keys(project).forEach(key => {
            if (key !== 'location') {  // Skip location data
                const td = document.createElement('td');
                td.textContent = project[key];
                row.appendChild(td);
            }
        });

        // Add view map button
        const actionCell = document.createElement('td');
        const viewButton = document.createElement('button');
        viewButton.textContent = 'View Map';
        viewButton.onclick = () => {
            map.panTo(project.location);
            map.setZoom(8);
            const marker = markers.find(m => m.title === project.name);
            if (marker) {
                marker.dispatchEvent('click');
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
    markerElement.style.backgroundColor = getStatusColor(project.details.status);
    markerElement.style.border = '2px solid #FFFFFF';
    
    const marker = new AdvancedMarkerElement({
        map,
        position: project.location,
        title: project.name,
        content: markerElement
    });

    // Create info window content
    const content = `
        <div class="info-window">
            <h2>${project.name}</h2>
            <div class="info-content">
                <p><strong>Capacity:</strong> ${project.details.capacity}</p>
                <p><strong>Application:</strong> ${project.details.application}</p>
                <p><strong>Area:</strong> ${project.details.area}</p>
                <p><strong>Battery:</strong> ${project.details.battery}</p>
                <p><strong>Chemistry:</strong> ${project.details.chemistry}</p>
                <p><strong>PCS Model:</strong> ${project.details.pcs_model}</p>
                <p><strong>Client:</strong> ${project.details.client}</p>
                <p><strong>Status:</strong> <span class="status-${project.details.status.toLowerCase().replace(' ', '-')}">${project.details.status}</span></p>
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