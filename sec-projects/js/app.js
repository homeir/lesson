let map;
let markers = [];
let activeInfoWindow = null;

// Initialize Google Maps
function initMap() {
    const gridElement = document.getElementById('grid');
    
    // Define grid columns with proper column types
    const columns = [
        {
            field: 'id',
            caption: 'ID',
            width: 60,
            columnType: 'number',
            style: { textAlign: 'center' }
        },
        {
            field: 'ess_count',
            caption: 'ESS Count',
            width: 80,
            columnType: 'number',
            style: { textAlign: 'right' }
        },
        {
            field: 'project_name',
            caption: 'Project Name',
            width: 300,
            columnType: 'multilinetext',
            style: { textAlign: 'left' }
        },
        {
            field: 'project_application',
            caption: 'Application',
            width: 100,
            columnType: new cheetahGrid.columns.type.MenuColumn({
                options: [
                    {value: 'Utility', label: 'Utility'},
                    {value: 'C&I', label: 'C&I'}
                ]
            })
        },
        {
            field: 'area',
            caption: 'Area',
            width: 100,
            columnType: new cheetahGrid.columns.type.MenuColumn({
                options: [
                    {value: 'China', label: 'China'},
                    {value: 'APAC', label: 'APAC'},
                    {value: 'MEA', label: 'MEA'},
                    {value: 'Europe', label: 'Europe'},
                    {value: 'America', label: 'America'}
                ]
            })
        },
        {
            field: 'country_city',
            caption: 'Country/City',
            width: 120
        },
        {
            field: 'mw',
            caption: 'MW',
            width: 80,
            columnType: new cheetahGrid.columns.type.NumberColumn({
                format: '0.00'
            })
        },
        {
            field: 'mwh',
            caption: 'MWh',
            width: 80,
            columnType: new cheetahGrid.columns.type.NumberColumn({
                format: '0.00'
            })
        },
        {
            field: 'battery_supplier',
            caption: 'Battery Supplier',
            width: 200,
            columnType: 'text'
        },
        {
            field: 'battery_chemistry',
            caption: 'Chemistry',
            width: 80,
            columnType: new cheetahGrid.columns.type.MenuColumn({
                options: [
                    {value: 'LFP', label: 'LFP'}
                ]
            })
        },
        {
            field: 'pcs_model',
            caption: 'PCS Model',
            width: 100,
            columnType: 'text'
        },
        {
            field: 'pcs_numbers',
            caption: 'PCS Qty',
            width: 80,
            columnType: 'number',
            style: { textAlign: 'right' }
        },
        {
            field: 'ess_model1',
            caption: 'ESS Model 1',
            width: 120,
            columnType: 'text'
        },
        {
            field: 'ess_model2',
            caption: 'ESS Model 2',
            width: 120,
            columnType: 'text'
        },
        {
            field: 'ess_numbers1',
            caption: 'ESS Qty 1',
            width: 80,
            columnType: 'number',
            style: { textAlign: 'right' }
        },
        {
            field: 'ess_numbers2',
            caption: 'ESS Qty 2',
            width: 80,
            columnType: 'number',
            style: { textAlign: 'right' }
        },
        {
            field: 'altitude',
            caption: 'Altitude',
            width: 100,
            columnType: 'text'
        },
        {
            field: 'min_temperature',
            caption: 'Min Temp',
            width: 80,
            columnType: new cheetahGrid.columns.type.NumberColumn({
                format: '0'
            })
        },
        {
            field: 'max_temperature',
            caption: 'Max Temp',
            width: 80,
            columnType: new cheetahGrid.columns.type.NumberColumn({
                format: '0'
            })
        },
        {
            field: 'contract_time',
            caption: 'Contract Date',
            width: 120,
            columnType: 'text'
        },
        {
            field: 'crm_or_c4',
            caption: 'CRM/C4',
            width: 140,
            columnType: 'text'
        },
        {
            field: 'client',
            caption: 'Client',
            width: 200,
            columnType: 'multilinetext'
        },
        {
            field: 'tech_support',
            caption: 'Tech Support',
            width: 100,
            columnType: 'text'
        },
        {
            caption: 'Actions',
            width: 120,
            columnType: new cheetahGrid.columns.type.ButtonColumn({
                caption: 'View Map'
            }),
            action: new cheetahGrid.columns.action.ButtonAction({
                action(rec) {
                    const project = projectData.find(p => p.id === rec.id);
                    if (project) {
                        map.panTo(project.location);
                        map.setZoom(8);
                        const marker = markers.find(m => m.getTitle() === project.name);
                        if (marker) {
                            google.maps.event.trigger(marker, 'click');
                        }
                    }
                }
            })
        }
    ];

    // Create grid instance
    grid = new cheetahGrid.ListGrid({
        parentElement: gridElement,
        columns: columns,
        frozenColCount: 1,
        defaultRowHeight: 40,
        headerRowHeight: 45,
        theme: {
            borderColor: '#ddd',
            textAlign: 'left',
            color: '#333',
            frozenRowsBgColor: '#f8f8f8',
            selectionBgColor: 'rgba(50, 150, 250, 0.1)'
        }
    });

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