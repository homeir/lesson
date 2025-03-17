// 存储地图对象
let map;
// 存储传输线路
let transmissionLines = [];
// 存储电压等级过滤器
let voltageFilters = {};
// 存储传输线路图例
let voltageLegend = {};
// 存储统计信息
let stats = {
    total: 0,
    voltageCategories: {}
};

// 初始化地图
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -8.783195, lng: 34.508523 }, // 非洲中部位置
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

    // 加载 GeoJSON 数据
    loadGeoJsonData();

    // 添加电压等级过滤器事件监听器
    setupVoltageFilters();
}

// 加载 GeoJSON 数据
function loadGeoJsonData() {
    fetch('africagrid20170906final.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error('无法加载 GeoJSON 数据: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            displayGeoJsonData(data);
            createVoltageLegend();
            updateStats();
        })
        .catch(error => {
            console.error('加载 GeoJSON 数据时出错:', error);
            alert('加载传输线路数据时出错: ' + error.message);
        });
}

// 显示 GeoJSON 数据
function displayGeoJsonData(data) {
    // 清除现有的传输线路
    transmissionLines.forEach(line => line.setMap(null));
    transmissionLines = [];

    // 重置统计信息
    stats.total = 0;
    stats.voltageCategories = {};
    
    // 处理每个特征
    data.features.forEach(feature => {
        // 确保是线段类型
        if (feature.geometry && feature.geometry.type === 'LineString') {
            const properties = feature.properties;
            const voltage = properties.voltage_kV;
            const status = properties.status;
            const country = properties.country;
            
            // 统计电压等级
            if (!stats.voltageCategories[voltage]) {
                stats.voltageCategories[voltage] = 0;
            }
            stats.voltageCategories[voltage]++;
            stats.total++;
            
            // 设置线条颜色和粗细
            let color, weight;
            
            // 根据电压等级设置颜色和粗细
            if (voltage >= 330) {
                color = '#FF0000'; // 红色
                weight = 5;
            } else if (voltage >= 161) {
                color = '#FFA500'; // 橙色
                weight = 4;
            } else if (voltage >= 90) {
                color = '#0000FF'; // 蓝色
                weight = 3;
            } else if (voltage >= 60) {
                color = '#800080'; // 紫色
                weight = 2;
            } else {
                color = '#00FF00'; // 绿色
                weight = 1.5;
            }
            
            // 如果是计划中的线路，使用虚线
            const strokeOpacity = status === 'Planned' ? 0.7 : 1.0;
            const strokeDashArray = status === 'Planned' ? [4, 4] : null;
            
            // 创建路径坐标
            const path = feature.geometry.coordinates.map(coord => {
                return { lat: coord[1], lng: coord[0] };
            });
            
            // 创建线段
            const line = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: color,
                strokeOpacity: strokeOpacity,
                strokeWeight: weight,
                map: map
            });
            
            // 设置虚线样式（如果是计划中的线路）
            if (strokeDashArray) {
                line.setOptions({ strokeDasharray: strokeDashArray });
            }
            
            // 存储线段信息
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
            
            // 添加点击事件
            line.addListener('click', () => {
                showLineInfo(lineInfo);
            });
        }
    });
    
    // 创建电压过滤器
    createVoltageFilters(stats.voltageCategories);
}

// 创建电压过滤器
function createVoltageFilters(voltageStats) {
    const controlsDiv = document.querySelector('.controls');
    
    // 检查是否已存在电压过滤器部分
    let voltageSection = document.getElementById('voltage-filters');
    if (!voltageSection) {
        voltageSection = document.createElement('div');
        voltageSection.id = 'voltage-filters';
        voltageSection.className = 'control-section';
        voltageSection.innerHTML = '<h3 style="margin-top: 0;">传输电压过滤器</h3>';
        
        // 添加到控制面板
        controlsDiv.appendChild(voltageSection);
    } else {
        // 清空现有内容
        voltageSection.innerHTML = '<h3 style="margin-top: 0;">传输电压过滤器</h3>';
    }
    
    // 按电压等级排序
    const voltages = Object.keys(voltageStats).sort((a, b) => parseFloat(b) - parseFloat(a));
    
    voltages.forEach(voltage => {
        const count = voltageStats[voltage];
        const controlItem = document.createElement('div');
        controlItem.className = 'control-item';
        
        const id = `voltage-${voltage}`;
        voltageFilters[voltage] = true;
        
        controlItem.innerHTML = `
            <input type="checkbox" id="${id}" checked>
            <label for="${id}">${voltage}kV 线路 (${count})</label>
        `;
        
        voltageSection.appendChild(controlItem);
    });
    
    // 添加应用按钮
    const applyButton = document.createElement('button');
    applyButton.id = 'applyVoltageFilters';
    applyButton.style.marginTop = '5px';
    applyButton.textContent = '应用过滤器';
    applyButton.addEventListener('click', filterTransmissionLines);
    
    voltageSection.appendChild(applyButton);
    
    // 更新统计信息
    updateStats();
}

// 设置电压过滤器事件监听器
function setupVoltageFilters() {
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'applyVoltageFilters') {
            filterTransmissionLines();
        }
    });
}

// 过滤传输线路
function filterTransmissionLines() {
    // 获取所有电压过滤器的状态
    for (const voltage in voltageFilters) {
        const checkbox = document.getElementById(`voltage-${voltage}`);
        if (checkbox) {
            voltageFilters[voltage] = checkbox.checked;
        }
    }
    
    // 应用过滤器
    transmissionLines.forEach(item => {
        const visible = voltageFilters[item.voltage] !== undefined ? voltageFilters[item.voltage] : true;
        item.line.setVisible(visible);
    });
}

// 创建电压等级图例
function createVoltageLegend() {
    const legendDiv = document.querySelector('.legend');
    
    // 检查是否已存在传输线路图例部分
    let legendSection = document.getElementById('transmission-legend');
    if (!legendSection) {
        legendSection = document.createElement('div');
        legendSection.id = 'transmission-legend';
        legendSection.className = 'legend-section';
        legendSection.innerHTML = '<h4 style="margin-top: 0;">传输线路</h4>';
        
        // 添加到图例
        legendDiv.appendChild(legendSection);
    } else {
        // 清空现有内容
        legendSection.innerHTML = '<h4 style="margin-top: 0;">传输线路</h4>';
    }
    
    // 定义电压等级和对应的颜色、粗细
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
            <div class="legend-text">${category.voltage} 线路</div>
        `;
        
        legendSection.appendChild(legendItem);
    });
    
    // 添加计划线路图例
    const plannedItem = document.createElement('div');
    plannedItem.className = 'legend-item';
    plannedItem.innerHTML = `
        <div class="legend-color" style="background-color: #888888; height: 2px; border-top: 1px dashed #888888;"></div>
        <div class="legend-text">计划中的线路</div>
    `;
    
    legendSection.appendChild(plannedItem);
}

// 显示线路信息
function showLineInfo(lineInfo) {
    const infoPanel = document.getElementById('info-panel');
    const infoTitle = document.getElementById('info-title');
    const infoContent = document.getElementById('info-content');
    
    infoTitle.textContent = '传输线路信息';
    
    let content = '';
    content += `<div><strong>电压:</strong> ${lineInfo.voltage}kV</div>`;
    content += `<div><strong>状态:</strong> ${lineInfo.status}</div>`;
    content += `<div><strong>国家:</strong> ${lineInfo.country}</div>`;
    
    if (lineInfo.length_km) {
        content += `<div><strong>长度:</strong> ${lineInfo.length_km} km</div>`;
    }
    
    if (lineInfo.from) {
        content += `<div><strong>起点站:</strong> ${lineInfo.from}</div>`;
    }
    
    if (lineInfo.to) {
        content += `<div><strong>终点站:</strong> ${lineInfo.to}</div>`;
    }
    
    if (lineInfo.operator) {
        content += `<div><strong>运营商:</strong> ${lineInfo.operator}</div>`;
    }
    
    if (lineInfo.source) {
        content += `<div><strong>数据来源:</strong> ${lineInfo.source}</div>`;
    }
    
    infoContent.innerHTML = content;
    infoPanel.style.display = 'block';
}

// 关闭信息面板
function closeInfoPanel() {
    document.getElementById('info-panel').style.display = 'none';
}

// 更新统计信息
function updateStats() {
    // 更新总线路数
    document.getElementById('total-lines').textContent = stats.total;
    
    // 创建详细的电压统计信息
    const statsContent = document.getElementById('stats-content');
    
    // 清除现有的电压统计信息
    while (statsContent.childNodes.length > 1) {
        statsContent.removeChild(statsContent.lastChild);
    }
    
    // 按电压等级排序
    const voltages = Object.keys(stats.voltageCategories).sort((a, b) => parseFloat(b) - parseFloat(a));
    
    // 添加每个电压等级的统计信息
    voltages.forEach(voltage => {
        const count = stats.voltageCategories[voltage];
        const statItem = document.createElement('div');
        statItem.innerHTML = `${voltage}kV 线路: <span>${count}</span>`;
        statsContent.appendChild(statItem);
    });
} 