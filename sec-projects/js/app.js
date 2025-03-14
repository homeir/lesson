let map;
let markers = [];
let activeInfoWindow = null;
let geoJsonLayer = null; // 添加 GeoJSON 图层变量
let transmissionLines = []; // 存储电力传输线路

// Initialize Google Maps
async function initMap() {
    // Create table element
    createTable();
    
    // Create map centered on a default location
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    
    map = new Map(document.getElementById('map'), {
        mapId: 'f31b0e08503d2a23', // 需要替换为您的实际 Map ID
        zoom: 4, // 降低缩放级别以显示更大区域
        center: { lat: 30.0, lng: 45.0 },
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ]
    });

    // 加载 GeoJSON 数据
    loadGeoJsonData();

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
        viewButton.textContent = 'View Map';
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
                <p><strong>Capacity:</strong> ${project.mw}MW / ${project.mwh}MWh</p>
                <p><strong>Altitude:</strong> ${project.altitude}m</p>
                <p><strong>Vendor:</strong> ${project.vendor}</p>
                <p><strong>Round:</strong> ${project.round}</p>
                <p><strong>Status:</strong> <span class="status-${project.status.toLowerCase().replace(' ', '-')}">${project.status}</span></p>
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

// 加载 GeoJSON 数据
function loadGeoJsonData() {
    console.log('开始加载 GeoJSON 数据...');
    fetch('electric-network-mena.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            console.log('GeoJSON 数据加载成功，正在解析...');
            return response.json();
        })
        .then(data => {
            console.log('GeoJSON 数据解析成功，开始处理...');
            // 存储 GeoJSON 数据
            geoJsonData = data;
            
            // 提取所有可能的 transmissionPower 值
            const transmissionPowers = new Set();
            data.features.forEach(feature => {
                if (feature.properties && feature.properties.transmissionPower) {
                    transmissionPowers.add(feature.properties.transmissionPower);
                }
            });
            
            const powerValues = Array.from(transmissionPowers).sort((a, b) => a - b);
            console.log('找到的传输功率值:', powerValues);
            
            try {
                // 添加 transmissionPower 筛选按钮
                addTransmissionPowerFilters(powerValues);
                
                // 显示 GeoJSON 数据
                displayGeoJsonData(data);
                
                console.log('GeoJSON 数据处理完成');
            } catch (error) {
                console.error('处理 GeoJSON 数据时出错:', error);
            }
        })
        .catch(error => {
            console.error('加载 GeoJSON 数据时出错:', error);
            // 显示错误信息给用户
            const mapElement = document.getElementById('map');
            if (mapElement) {
                const errorDiv = document.createElement('div');
                errorDiv.style.position = 'absolute';
                errorDiv.style.top = '50%';
                errorDiv.style.left = '50%';
                errorDiv.style.transform = 'translate(-50%, -50%)';
                errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
                errorDiv.style.color = 'white';
                errorDiv.style.padding = '20px';
                errorDiv.style.borderRadius = '5px';
                errorDiv.style.zIndex = '1000';
                errorDiv.textContent = `加载电力网络数据失败: ${error.message}`;
                mapElement.style.position = 'relative';
                mapElement.appendChild(errorDiv);
            }
        });
}

// 添加 transmissionPower 筛选按钮
function addTransmissionPowerFilters(powers) {
    // 查找筛选容器
    let filtersContainer = document.querySelector('.filter-container');
    
    // 如果筛选容器不存在，则创建一个
    if (!filtersContainer) {
        console.log('未找到 .filter-container 元素，正在创建...');
        filtersContainer = document.createElement('div');
        filtersContainer.className = 'filter-container';
        
        // 将筛选容器添加到内容区域
        const contentElement = document.querySelector('.content');
        if (contentElement) {
            // 在地图元素之前插入筛选容器
            const mapElement = document.getElementById('map');
            if (mapElement) {
                contentElement.insertBefore(filtersContainer, mapElement);
            } else {
                contentElement.appendChild(filtersContainer);
            }
        } else {
            console.error('未找到 .content 元素，无法添加筛选容器');
            return; // 如果找不到内容区域，则退出函数
        }
    }
    
    // 创建筛选组
    const filterGroup = document.createElement('div');
    filterGroup.className = 'filter-group';
    
    // 添加标题
    const title = document.createElement('h3');
    title.textContent = 'Filter by Transmission Power:';
    filterGroup.appendChild(title);
    
    // 添加按钮容器
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'filter-buttons';
    
    // 添加"全部"按钮
    const allButton = document.createElement('button');
    allButton.className = 'filter-btn active';
    allButton.dataset.type = 'transmission';
    allButton.dataset.value = 'all';
    allButton.textContent = 'All';
    buttonsContainer.appendChild(allButton);
    
    // 添加每个 transmissionPower 的按钮
    powers.forEach(power => {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.dataset.type = 'transmission';
        button.dataset.value = power;
        button.textContent = `${power}kV`;
        buttonsContainer.appendChild(button);
    });
    
    // 将按钮容器添加到筛选组
    filterGroup.appendChild(buttonsContainer);
    
    // 将筛选组添加到筛选容器
    filtersContainer.appendChild(filterGroup);
    
    // 添加事件监听器
    buttonsContainer.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            // 移除同组按钮的活动状态
            buttonsContainer.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 添加当前按钮的活动状态
            e.target.classList.add('active');
            
            // 应用筛选
            filterGeoJsonByTransmissionPower(e.target.dataset.value);
        });
    });
}

// 显示 GeoJSON 数据
function displayGeoJsonData(data) {
    // 清除现有的 GeoJSON 图层
    if (geoJsonLayer) {
        geoJsonLayer.setMap(null);
    }
    
    // 清除现有的传输线路
    transmissionLines.forEach(line => line.setMap(null));
    transmissionLines = [];
    
    // 处理每个 feature
    data.features.forEach(feature => {
        if (feature.geometry && feature.geometry.type === 'LineString') {
            // 创建传输线路
            addTransmissionLine(feature);
        } else if (feature.geometry && feature.geometry.type === 'Point') {
            // 点可能已经通过其他方式显示，这里可以添加额外的处理
            // 例如，如果需要显示电网节点，可以在这里添加代码
            addNetworkNode(feature);
        }
    });
    
    console.log(`已加载 ${transmissionLines.length} 条传输线路`);
}

// 添加电网节点
function addNetworkNode(feature) {
    // 如果不需要显示节点，可以注释掉此函数的内容
    const properties = feature.properties || {};
    const coordinates = feature.geometry.coordinates;
    const position = { lat: coordinates[1], lng: coordinates[0] };
    
    // 根据节点类型设置图标
    let icon = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 5,
        fillColor: '#000000',
        fillOpacity: 0.8,
        strokeWeight: 1,
        strokeColor: '#FFFFFF'
    };
    
    // 根据节点类型设置颜色
    if (properties.nodeType) {
        switch (properties.nodeType.toLowerCase()) {
            case 'city':
                icon.fillColor = '#FF0000'; // 红色
                icon.scale = 6;
                break;
            case 'plant':
                icon.fillColor = '#00FF00'; // 绿色
                break;
            case 'dam':
                icon.fillColor = '#0000FF'; // 蓝色
                break;
            case 'town':
                icon.fillColor = '#FFA500'; // 橙色
                break;
            default:
                icon.fillColor = '#000000'; // 黑色
                break;
        }
    }
    
    // 创建标记
    const marker = new google.maps.Marker({
        position: position,
        map: map,
        icon: icon,
        title: properties.name || 'Unknown'
    });
    
    // 添加点击事件
    marker.addListener('click', () => {
        // 创建信息窗口内容
        let content = `
            <div class="info-window">
                <h2>${properties.name || 'Unknown'}</h2>
                <div class="info-content">
                    <p><strong>Type:</strong> ${properties.nodeType || 'Unknown'}</p>
                </div>
            </div>
        `;
        
        // 显示信息窗口
        if (activeInfoWindow) {
            activeInfoWindow.close();
        }
        
        const infoWindow = new google.maps.InfoWindow({
            content: content,
            position: position
        });
        
        infoWindow.open(map);
        activeInfoWindow = infoWindow;
    });
}

// 添加传输线路
function addTransmissionLine(feature) {
    const properties = feature.properties || {};
    const coordinates = feature.geometry.coordinates;
    const path = coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));
    
    // 根据传输功率设置线条颜色
    let color = '#000000'; // 默认黑色
    let strokeWeight = 2; // 默认线宽
    
    switch (properties.transmissionPower) {
        case 150:
            color = '#00FF00'; // 绿色
            break;
        case 225:
            color = '#0000FF'; // 蓝色
            break;
        case 400:
            color = '#FF0000'; // 红色
            break;
        case 500:
            color = '#800080'; // 紫色
            break;
        default:
            color = '#000000'; // 黑色
            break;
    }
    
    // 根据线路类型设置线条样式
    if (properties.lineType === 'double') {
        strokeWeight = 3;
    } else if (properties.lineType === 'triple') {
        strokeWeight = 4;
    }
    
    // 创建线路
    const line = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: strokeWeight,
        map: map,
        // 存储属性以便筛选
        properties: properties
    });
    
    // 添加点击事件
    line.addListener('click', () => {
        // 创建信息窗口内容
        let content = `
            <div class="info-window">
                <h2>Transmission Line</h2>
                <div class="info-content">
                    <p><strong>Power:</strong> ${properties.transmissionPower}kV</p>
                    <p><strong>Type:</strong> ${properties.lineType}</p>
        `;
        
        // 如果有节点信息，添加到内容中
        if (properties.nodes && properties.nodes.length > 0) {
            content += `<p><strong>Nodes:</strong> ${properties.nodes.join(' → ')}</p>`;
        }
        
        // 如果是互联线路，添加到内容中
        if (properties.interconnection && properties.interconnection.length > 0) {
            content += `<p><strong>Interconnection:</strong> ${properties.interconnection.join(' - ')}</p>`;
        }
        
        content += `
                </div>
            </div>
        `;
        
        // 显示信息窗口
        if (activeInfoWindow) {
            activeInfoWindow.close();
        }
        
        const infoWindow = new google.maps.InfoWindow({
            content: content,
            position: path[Math.floor(path.length / 2)] // 在线路中间显示信息窗口
        });
        
        infoWindow.open(map);
        activeInfoWindow = infoWindow;
    });
    
    // 将线路添加到数组中
    transmissionLines.push(line);
}

// 根据传输功率筛选 GeoJSON 数据
function filterGeoJsonByTransmissionPower(value) {
    console.log(`筛选传输功率: ${value}`);
    
    // 显示/隐藏传输线路
    transmissionLines.forEach(line => {
        const properties = line.properties || {};
        const linePower = properties.transmissionPower;
        const filterValue = value === 'all' ? 'all' : parseInt(value, 10);
        const isVisible = filterValue === 'all' || linePower === filterValue;
        
        line.setVisible(isVisible);
    });
    
    console.log(`筛选完成，共 ${transmissionLines.length} 条线路`);
}

// 添加传输功率图例
function addTransmissionPowerLegend() {
    const legendContainer = document.getElementById('legend');
    
    // 添加传输功率图例标题
    const powerTitle = document.createElement('h3');
    powerTitle.textContent = 'Transmission Power:';
    powerTitle.style.margin = '0 20px 0 20px';
    legendContainer.appendChild(powerTitle);
    
    // 添加传输功率图例项
    const powers = [
        { name: '150kV', value: 150, color: '#00FF00' },
        { name: '225kV', value: 225, color: '#0000FF' },
        { name: '400kV', value: 400, color: '#FF0000' },
        { name: '500kV', value: 500, color: '#800080' }
    ];
    
    powers.forEach(power => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = power.color;
        // 确保线路图例的样式是线条形状
        colorBox.style.width = '20px';
        colorBox.style.height = '5px';
        colorBox.style.borderRadius = '2px';
        
        const label = document.createElement('span');
        label.textContent = power.name;
        
        item.appendChild(colorBox);
        item.appendChild(label);
        legendContainer.appendChild(item);
        
        // 添加点击事件
        item.style.cursor = 'pointer';
        item.onclick = () => {
            // 移除所有传输功率过滤按钮的活动状态
            document.querySelectorAll('.filter-btn[data-type="transmission"]').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 添加对应按钮的活动状态
            const targetBtn = document.querySelector(`.filter-btn[data-type="transmission"][data-value="${power.value}"]`);
            if (targetBtn) {
                targetBtn.classList.add('active');
                // 应用筛选
                filterGeoJsonByTransmissionPower(power.value);
            } else {
                console.warn(`未找到传输功率为 ${power.value} 的按钮`);
            }
        };
    });
}

// 添加节点类型图例
function addNodeTypeLegend() {
    const legendContainer = document.getElementById('legend');
    
    // 添加节点类型图例标题
    const nodeTypeTitle = document.createElement('h3');
    nodeTypeTitle.textContent = 'Node Types:';
    nodeTypeTitle.style.margin = '0 20px 0 20px';
    legendContainer.appendChild(nodeTypeTitle);
    
    // 添加节点类型图例项
    const nodeTypes = [
        { name: 'City', color: '#FF0000' },
        { name: 'Plant', color: '#00FF00' },
        { name: 'Dam', color: '#0000FF' },
        { name: 'Town', color: '#FFA500' },
        { name: 'Other', color: '#000000' }
    ];
    
    nodeTypes.forEach(nodeType => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = nodeType.color;
        colorBox.style.width = '10px';
        colorBox.style.height = '10px';
        colorBox.style.borderRadius = '50%';
        
        const label = document.createElement('span');
        label.textContent = nodeType.name;
        
        item.appendChild(colorBox);
        item.appendChild(label);
        legendContainer.appendChild(item);
    });
}

// Add legend to the map
function addLegend() {
    const legendContainer = document.getElementById('legend');
    
    // 清空图例容器
    legendContainer.innerHTML = '';
    
    // 添加状态图例标题
    const statusTitle = document.createElement('h3');
    statusTitle.textContent = 'Project Status:';
    statusTitle.style.margin = '0 20px 0 0';
    legendContainer.appendChild(statusTitle);
    
    // 添加状态图例项
    const statuses = [
        { name: 'Operational', value: 'operational', color: '#4CAF50' },
        { name: 'Under Construction', value: 'construction', color: '#FFA500' },
        { name: 'Planning', value: 'planning', color: '#2196F3' }
    ];
    
    statuses.forEach(status => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = status.color;
        colorBox.style.width = '15px';
        colorBox.style.height = '15px';
        colorBox.style.borderRadius = '50%';
        
        const label = document.createElement('span');
        label.textContent = status.name;
        
        item.appendChild(colorBox);
        item.appendChild(label);
        legendContainer.appendChild(item);
    });
    
    // 添加供应商图例标题
    const vendorTitle = document.createElement('h3');
    vendorTitle.textContent = 'Vendors:';
    vendorTitle.style.margin = '0 20px 0 20px';
    legendContainer.appendChild(vendorTitle);
    
    // 添加供应商图例项
    const vendors = [
        { name: 'BYD', value: 'BYD' },
        { name: 'Sungrow', value: 'Sungrow' },
        { name: 'Unknown', value: 'unknown' }
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
    
    // 添加传输功率图例
    addTransmissionPowerLegend();
    
    // 添加节点类型图例
    addNodeTypeLegend();
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