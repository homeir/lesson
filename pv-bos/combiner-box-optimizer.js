/**
 * 汇流箱位置优化算法
 * 根据光伏阵列分组信息计算每个汇流箱的最优位置
 */

(function() {
    'use strict';

    // 光伏板参数
    let moduleDimensions = {
        length: 2.172, // 默认长度(m)
        width: 1.303,  // 默认宽度(m)
        mountType: '1P', // 默认1P布置，可选'1P'或'2P'
        rowSpacing: 6.5, // 默认行间距(m)
        columnSpacing: 0.3 // 默认列间距(m)
    };

    // 坐标映射到实际物理位置
    function mapToRealPosition(row, col, mountType) {
        const { length, width, rowSpacing, columnSpacing } = moduleDimensions;
        
        // 根据安装方式确定实际尺寸
        const moduleLength = mountType === '1P' ? length : width;
        const moduleWidth = mountType === '1P' ? width : length;
        
        // 计算每行/列的实际物理位置
        const x = col * (moduleWidth + columnSpacing);
        const y = row * (moduleLength + rowSpacing);
        
        return { x, y };
    }

    // 计算两点之间的欧氏距离
    function calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    // 获取汇流箱最优位置
    function findOptimalCombinerPosition(stringPositions) {
        if (stringPositions.length === 0) {
            console.error('没有串位置信息，无法计算最优汇流箱位置');
            return null;
        }
        
        let bestPosition = null;
        let minTotalDistance = Infinity;
        
        // 尝试每个串位置作为汇流箱位置
        for (let i = 0; i < stringPositions.length; i++) {
            const candidatePos = stringPositions[i];
            const candidateRealPos = mapToRealPosition(
                candidatePos[0], 
                candidatePos[1], 
                moduleDimensions.mountType
            );
            
            let totalDistance = 0;
            
            // 计算到所有其他串的距离总和
            for (let j = 0; j < stringPositions.length; j++) {
                if (i === j) continue; // 跳过自身
                
                const otherPos = stringPositions[j];
                const otherRealPos = mapToRealPosition(
                    otherPos[0], 
                    otherPos[1], 
                    moduleDimensions.mountType
                );
                
                const distance = calculateDistance(
                    candidateRealPos.x, 
                    candidateRealPos.y, 
                    otherRealPos.x, 
                    otherRealPos.y
                );
                
                totalDistance += distance;
            }
            
            // 如果当前位置的总距离更小，则更新最优位置
            if (totalDistance < minTotalDistance) {
                minTotalDistance = totalDistance;
                bestPosition = {
                    row: candidatePos[0],
                    col: candidatePos[1],
                    realX: candidateRealPos.x,
                    realY: candidateRealPos.y,
                    totalDistance: totalDistance
                };
            }
        }
        
        return bestPosition;
    }

    // 分析分组阵列，按汇流箱分组
    function analyzeArrayGrouping(arrayGrouping, rows, columns) {
        if (!arrayGrouping || arrayGrouping.length === 0) {
            console.error('分组数组为空，无法分析');
            return [];
        }
        
        // 按汇流箱分组的结果
        const combinerGroups = {};
        
        // 遍历所有串，按汇流箱ID分组
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                // 每个组件有3个串
                for (let s = 0; s < 3; s++) {
                    const stringIndex = (row * columns + col) * 3 + s;
                    const combinerBoxId = arrayGrouping[stringIndex];
                    
                    if (combinerBoxId === undefined) continue;
                    
                    // 初始化汇流箱分组
                    if (!combinerGroups[combinerBoxId]) {
                        combinerGroups[combinerBoxId] = [];
                    }
                    
                    // 添加串位置到对应汇流箱的分组中
                    combinerGroups[combinerBoxId].push([row, col, s]);
                }
            }
        }
        
        return combinerGroups;
    }

    // 计算所有汇流箱的最优位置
    function calculateOptimalCombinerPositions(arrayGrouping, rows, columns) {
        // 分析分组数组，获取汇流箱分组
        const combinerGroups = analyzeArrayGrouping(arrayGrouping, rows, columns);
        const optimalPositions = {};
        
        // 依次计算每个汇流箱的最优位置
        for (const [combinerBoxId, stringPositions] of Object.entries(combinerGroups)) {
            // 简化串位置数组，只保留行列信息
            const simplifiedPositions = stringPositions.map(pos => [pos[0], pos[1]]);
            
            // 去重，因为同一组件上的不同串坐标相同
            const uniquePositions = Array.from(new Set(simplifiedPositions.map(JSON.stringify)), JSON.parse);
            
            // 计算最优位置
            const optimalPosition = findOptimalCombinerPosition(uniquePositions);
            
            if (optimalPosition) {
                optimalPositions[combinerBoxId] = optimalPosition;
            }
        }
        
        return optimalPositions;
    }

    // 渲染所有汇流箱
    function renderCombinerBoxes(optimalPositions, pvArray) {
        // 清除现有汇流箱
        const existingBoxes = document.querySelectorAll('.combiner-box');
        existingBoxes.forEach(box => box.remove());
        
        // 根据最优位置创建汇流箱
        for (const [combinerBoxId, position] of Object.entries(optimalPositions)) {
            createCombinerBox(position, combinerBoxId, pvArray);
        }
    }

    // 创建单个汇流箱
    function createCombinerBox(position, combinerBoxId, pvArray) {
        try {
            const box = document.createElement('div');
            box.className = 'combiner-box optimized';
            box.dataset.combinerBoxId = combinerBoxId;
            
            // 将实际物理位置映射到页面坐标
            // 这里需要根据页面上的比例尺进行转换
            // 假设页面上每个光伏组件宽度为layoutParams.moduleWidth像素
            // 高度为layoutParams.moduleHeight像素
            const layoutParams = window.layoutParams || { 
                moduleWidth: 180, 
                moduleHeight: 8, 
                marginY: 4 
            };
            
            const x = position.col * layoutParams.moduleWidth;
            const y = position.row * (layoutParams.moduleHeight + layoutParams.marginY);
            
            box.style.left = `${x}px`;
            box.style.top = `${y}px`;
            
            // 设置汇流箱颜色
            if (window.StringColoring) {
                const color = window.StringColoring.getCombinerBoxColor(position.col, true);
                box.style.backgroundColor = color.bg;
                box.style.borderColor = color.border;
            }
            
            // 设置提示信息
            box.setAttribute('title', `汇流箱 #${combinerBoxId}
位置: 第${position.row + 1}行, 第${position.col + 1}列
物理坐标: (${position.realX.toFixed(2)}m, ${position.realY.toFixed(2)}m)
总距离: ${position.totalDistance.toFixed(2)}m`);
            
            // 点击事件
            box.addEventListener('click', function(e) {
                e.stopPropagation();
                if (window.showCombinerBoxDetails) {
                    window.showCombinerBoxDetails(combinerBoxId, position);
                }
            });
            
            pvArray.appendChild(box);
        } catch (error) {
            console.error(`创建汇流箱失败: ${error.message}`);
        }
    }

    // 启动优化过程
    function startOptimization(rows, columns, arrayGrouping) {
        const pvArray = document.getElementById('pv-array');
        if (!pvArray) {
            console.error('找不到pv-array元素');
            return;
        }
        
        const optimalPositions = calculateOptimalCombinerPositions(arrayGrouping, rows, columns);
        renderCombinerBoxes(optimalPositions, pvArray);
        
        return optimalPositions;
    }

    // 创建汇流箱参数设置界面
    function createSettingsUI() {
        const settingsContainer = document.createElement('div');
        settingsContainer.className = 'combiner-optimizer-settings';
        settingsContainer.innerHTML = `
            <h3>汇流箱位置优化设置</h3>
            <div class="form-group">
                <label for="module-length">组件长度 (m):</label>
                <input type="number" id="module-length" min="0.5" max="5" step="0.001" value="${moduleDimensions.length}">
            </div>
            <div class="form-group">
                <label for="module-width">组件宽度 (m):</label>
                <input type="number" id="module-width" min="0.5" max="5" step="0.001" value="${moduleDimensions.width}">
            </div>
            <div class="form-group">
                <label for="mount-type">安装方式:</label>
                <select id="mount-type">
                    <option value="1P" ${moduleDimensions.mountType === '1P' ? 'selected' : ''}>1P竖排</option>
                    <option value="2P" ${moduleDimensions.mountType === '2P' ? 'selected' : ''}>2P横排</option>
                </select>
            </div>
            <div class="form-group">
                <label for="row-spacing">行间距 (m):</label>
                <input type="number" id="row-spacing" min="0.1" max="20" step="0.1" value="${moduleDimensions.rowSpacing}">
            </div>
            <div class="form-group">
                <label for="column-spacing">列间距 (m):</label>
                <input type="number" id="column-spacing" min="0.1" max="5" step="0.1" value="${moduleDimensions.columnSpacing}">
            </div>
            <button id="optimize-button">优化汇流箱位置</button>
        `;
        
        // 插入到页面中
        const insertPoint = document.querySelector('.array-controls');
        if (insertPoint) {
            insertPoint.parentNode.insertBefore(settingsContainer, insertPoint.nextSibling);
            
            // 添加事件监听器
            setupEventListeners();
        } else {
            console.error('找不到合适的插入点');
        }
    }

    // 设置事件监听器
    function setupEventListeners() {
        const lengthInput = document.getElementById('module-length');
        const widthInput = document.getElementById('module-width');
        const mountTypeSelect = document.getElementById('mount-type');
        const rowSpacingInput = document.getElementById('row-spacing');
        const columnSpacingInput = document.getElementById('column-spacing');
        const optimizeButton = document.getElementById('optimize-button');
        
        if (lengthInput) {
            lengthInput.addEventListener('change', function() {
                moduleDimensions.length = parseFloat(this.value);
            });
        }
        
        if (widthInput) {
            widthInput.addEventListener('change', function() {
                moduleDimensions.width = parseFloat(this.value);
            });
        }
        
        if (mountTypeSelect) {
            mountTypeSelect.addEventListener('change', function() {
                moduleDimensions.mountType = this.value;
            });
        }
        
        if (rowSpacingInput) {
            rowSpacingInput.addEventListener('change', function() {
                moduleDimensions.rowSpacing = parseFloat(this.value);
            });
        }
        
        if (columnSpacingInput) {
            columnSpacingInput.addEventListener('change', function() {
                moduleDimensions.columnSpacing = parseFloat(this.value);
            });
        }
        
        if (optimizeButton) {
            optimizeButton.addEventListener('click', function() {
                if (!window.arrayGrouping || window.arrayGrouping.length === 0) {
                    alert('请先执行分组运算，获取阵列分组信息');
                    return;
                }
                
                const rows = window.layoutParams ? window.layoutParams.rows : 52;
                const columns = window.layoutParams ? window.layoutParams.columns : 4;
                
                startOptimization(rows, columns, window.arrayGrouping);
            });
        }
    }

    // 在DOM加载完成后初始化
    document.addEventListener('DOMContentLoaded', function() {
        // 延迟加载，确保主脚本已经初始化
        setTimeout(createSettingsUI, 1000);
    });
    
    // 暴露公共接口
    window.CombinerBoxOptimizer = {
        startOptimization,
        setModuleDimensions: function(dimensions) {
            Object.assign(moduleDimensions, dimensions);
        },
        getModuleDimensions: function() {
            return Object.assign({}, moduleDimensions);
        }
    };
})(); 