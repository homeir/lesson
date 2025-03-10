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
        mapId: 'f31b0e08503d2a23', // 需要替换为您的实际 Map ID
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
        'id', 'project_name',
, 'MW', 'MWh', 'altitude', 'latitude', 'longitude', 'status'
    ];

    const dataFields = [
        'id', 'project_name',
, 'mw', 'mwh', 'altitude', 'latitude', 'longitude', 'status'
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
                    td.textContent = value.toFixed(6);
                    td.style.textAlign = 'right';
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
    
    // Create location object from latitude and longitude
    const location = {
        lat: project.latitude,
        lng: project.longitude
    };
    
    const marker = new AdvancedMarkerElement({
        map,
        position: location,
        title: project.project_name,
        content: markerElement
    });

    // Store marker element for visibility control
    marker.element = markerElement;

    // Create info window content
    const content = `
        <div class="info-window">
            <h2>${project.project_name}</h2>
            <div class="info-content">
                <p><strong>容量:</strong> ${project.mw}MW / ${project.mwh}MWh</p>
                <p><strong>海拔:</strong> ${project.altitude}m</p>
                <p><strong>供应商:</strong> ${project.vendor}</p>
                <p><strong>轮次:</strong> ${project.round}</p>
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
        map.panTo(location);
    });

    markers.push(marker);
}

// Add legend to the map
function addLegend() {
    const legendContainer = document.getElementById('legend');
    
    // 清空图例容器
    legendContainer.innerHTML = '';
    
    // 添加状态图例标题
    const statusTitle = document.createElement('h3');
    statusTitle.textContent = '项目状态:';
    statusTitle.style.margin = '0 20px 0 0';
    legendContainer.appendChild(statusTitle);
    
    // 添加状态图例项
    const statuses = [
        { name: '运行中', value: 'operational', color: '#4CAF50' },
        { name: '建设中', value: 'construction', color: '#FFA500' },
        { name: '规划中', value: 'planning', color: '#2196F3' }
    ];
    
    statuses.forEach(status => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = status.color;
        
        const label = document.createElement('span');
        label.textContent = status.name;
        
        item.appendChild(colorBox);
        item.appendChild(label);
        legendContainer.appendChild(item);
    });
    
    // 添加供应商图例标题
    const vendorTitle = document.createElement('h3');
    vendorTitle.textContent = '供应商:';
    vendorTitle.style.margin = '0 20px 0 20px';
    legendContainer.appendChild(vendorTitle);
    
    // 添加供应商图例项
    const vendors = [
        { name: '比亚迪', value: 'BYD' },
        { name: '阳光电源', value: 'Sungrow' },
        { name: '未知', value: 'unknown' }
    ];
    
    vendors.forEach(vendor => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const label = document.createElement('span');
        label.textContent = vendor.name;
        
        // 添加点击事件
        item.style.cursor = 'pointer';
        item.onclick = () => {
            // 移除所有供应商过滤按钮的活动状态
            document.querySelectorAll('.filter-btn[data-type="vendor"]').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 添加对应按钮的活动状态
            document.querySelector(`.filter-btn[data-type="vendor"][data-value="${vendor.value}"]`).classList.add('active');
            
            // 应用过滤
            filterProjects('vendor', vendor.value);
        };
        
        item.appendChild(label);
        legendContainer.appendChild(item);
    });
}

// Get color for status
function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'operational':
            return '#4CAF50';  // Green
        case 'construction':
            return '#FFA500';  // Orange
        case 'planning':
            return '#2196F3';  // Blue
        default:
            return '#757575';  // Grey
    }
}

// Filter projects by criteria
function filterProjects(criteria, value) {
    markers.forEach(marker => {
        const project = projectData.find(p => p.project_name === marker.title);
        
        // 如果找不到项目，跳过
        if (!project) return;
        
        let isVisible = false;
        
        // 根据不同的过滤条件进行过滤
        if (criteria === 'status') {
            isVisible = (value === 'all' || project.status.toLowerCase() === value.toLowerCase());
        } else if (criteria === 'vendor') {
            isVisible = (value === 'all' || project.vendor === value);
        }
        
        // 设置标记的可见性
        marker.element.style.display = isVisible ? 'block' : 'none';
        
        // 如果标记被隐藏且信息窗口打开，则关闭信息窗口
        if (!isVisible && activeInfoWindow) {
            activeInfoWindow.close();
        }
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Add filter event listeners
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            // 获取过滤类型和值
            const filterType = e.target.dataset.type || 'status'; // 默认为状态过滤
            const filterValue = e.target.dataset.value || 'all';
            
            // 移除同组按钮的活动状态
            document.querySelectorAll(`.filter-btn[data-type="${filterType}"]`).forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 添加当前按钮的活动状态
            e.target.classList.add('active');
            
            // 应用过滤
            filterProjects(filterType, filterValue);
        });
    });
}); 