let map;
let markers = [];
let activeInfoWindow = null;

// Initialize Google Maps
function initMap() {
    // Create map centered on a default location
    map = new google.maps.Map(document.getElementById('map'), {
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
    projectData.forEach(project => {
        addMarker(project);
    });

    // Add legend
    addLegend();
}

// Add a marker for a project
function addMarker(project) {
    const marker = new google.maps.Marker({
        position: project.location,
        map: map,
        title: project.name,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: getStatusColor(project.details.status),
            fillOpacity: 0.7,
            strokeWeight: 2,
            strokeColor: '#FFFFFF'
        }
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
    marker.addListener('click', () => {
        if (activeInfoWindow) {
            activeInfoWindow.close();
        }
        infoWindow.open(map, marker);
        activeInfoWindow = infoWindow;
        
        // Pan to marker
        map.panTo(marker.getPosition());
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
        const project = projectData.find(p => p.name === marker.getTitle());
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