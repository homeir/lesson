/**
 * 汇流箱位置优化算法
 * 根据光伏阵列分组信息计算每个汇流箱的最优位置
 */

(function() {
    'use strict';

    // 光伏板参数
    let moduleDimensions = {
        length: 2.382, // 默认长度(m)
        width: 1.134,  // 默认宽度(m)
        mountType: '1P', // 默认1P布置，可选'1P'或'2P'
        rowSpacing: 7.35, // 默认行间距(m)
        columnSpacing: 0.3 // 默认列间距(m)
    };

    let totalStringLength = 0;

    // 坐标映射到实际物理位置
    function mapToRealPosition(row, col, mountType) {
        const { length, width, rowSpacing, columnSpacing } = moduleDimensions;
        // 获取每串组件数量
        const modulesPerString = document.getElementById('modules-per-string').value;
        // 根据安装方式确定实际尺寸
        const moduleLength = mountType === '1P' ? length : width
        const moduleWidth = (mountType === '1P' ? width : length) * modulesPerString; // 需要乘以每串组件数量;

        // 计算每行/列的实际物理位置
        const x = col * (moduleWidth + columnSpacing);
        const y = row * (moduleLength + rowSpacing);
        
        return { x, y };
    }

    // 计算两点之间的折线距离
    function calculateDistance(x1, y1, x2, y2) {
        //return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    // 获取汇流箱最优位置
    function findOptimalCombinerPosition(stringPositions) {
        if (stringPositions.length === 0) {
            console.error('没有串位置信息，无法计算最优汇流箱位置');
            return null;
        }
        
        // 寻找区域的边界
        let [minRow, maxRow] = stringPositions.reduce(([min, max], pos) => [Math.min(min, pos[0]), Math.max(max, pos[0])], [Infinity, -Infinity]);
        let [minCol, maxCol] = stringPositions.reduce(([min, max], pos) => [Math.min(min, pos[1]), Math.max(max, pos[1])], [Infinity, -Infinity]);
        
        console.log('找到区域边界: minRow:', minRow, 'maxRow:', maxRow, 'minCol:', minCol, 'maxCol:', maxCol);
        
        // 直接使用分组的实际串位置作为候选位置
        // 确保比较精确点，增加采样点的密度
        let bestPosition = null;
        let minTotalDistance = Infinity;
        
        // 找到中心点位置
        const centerRow = Math.floor((minRow + maxRow) / 2);
        const centerCol = Math.floor((minCol + maxCol) / 2);
        
        // 优先考虑测试中心点
        const candidatePositions = [
            [centerRow, centerCol], // 中心点
            ...stringPositions // 然后再考虑所有串位置
        ];
        
        // 测试每个候选位置
        for (const candidatePos of candidatePositions) {
            const row = candidatePos[0];
            const col = candidatePos[1];
            
            const candidateRealPos = mapToRealPosition(row, col, moduleDimensions.mountType);
            let totalDistance = 0;
            
            // 计算到所有串的距离总和
            for (const stringPos of stringPositions) {
                // 跳过自身
                if (row === stringPos[0] && col === stringPos[1]) continue;
                
                const otherRealPos = mapToRealPosition(
                    stringPos[0],
                    stringPos[1],
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
                    row: row,
                    col: col,
                    realX: candidateRealPos.x,
                    realY: candidateRealPos.y,
                    totalDistance: totalDistance,
                    stringCount: stringPositions.length // 添加串数量信息
                };
            }
        }
        
        console.log('选择最优位置:', bestPosition);
        return bestPosition;
    }
    function chechTheTotalCombinerBoxes(arrayGrouping) {
        let totalCombinerBoxes = new Set();
        for (let i = 0; i < arrayGrouping.length; i++) {
            for (let j = 0; j < arrayGrouping[i].length; j++) {
                totalCombinerBoxes.add(arrayGrouping[i][j]);
            }
        }
        return Array.from(totalCombinerBoxes);
    }
    
    // 分析分组阵列，按汇流箱分组
    function analyzeArrayGrouping(arrayGrouping) {
        if (!arrayGrouping || arrayGrouping.length === 0) {
            console.error('分组数组为空，无法分析');
            return [];
        }
        
        console.log('分析分组数组:', arrayGrouping);
        
        // 按汇流箱分组的结果
        const combinerGroups = {};
        
        // 检查并提取所有汇流箱ID
        let combinerBoxIds = chechTheTotalCombinerBoxes(arrayGrouping);
        console.log('发现的汇流箱ID:', combinerBoxIds);
        
        if (combinerBoxIds.length === 0) {
            console.error('未找到有效的汇流箱ID');
            return {};
        }
        
        // 遍历所有串，按汇流箱ID分组
        combinerBoxIds.forEach(boxId => {
            if (boxId === null || boxId === undefined) return; // 跳过空值
            
            combinerGroups[boxId] = [];
            
            // 遍历整个阵列查找此汇流箱ID对应的串位置
            for (let row = 0; row < arrayGrouping.length; row++) {
                for (let col = 0; col < arrayGrouping[row].length; col++) {
                    if (arrayGrouping[row][col] === boxId) {
                        // 找到一个匹配的串，记录其行列位置
                        combinerGroups[boxId].push([row, col]);
                    }
                }
            }
            
            console.log(`汇流箱 #${boxId} 有 ${combinerGroups[boxId].length} 个串连接`);
        });
        
        return combinerGroups;
    }

    // 计算所有汇流箱的最优位置
    function calculateOptimalCombinerPositions(arrayGrouping) {
        // 分析分组数组，获取汇流箱分组
        const combinerGroups = analyzeArrayGrouping(arrayGrouping);
        console.log('分组配置数组 combinerGroups:', combinerGroups);
        const optimalPositions = {};
        
        // 依次计算每个汇流箱的最优位置
        for (const [combinerBoxId, stringPositions] of Object.entries(combinerGroups)) {

            // 计算最优位置
            const optimalPosition = findOptimalCombinerPosition(stringPositions);
            
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
            
            // 将计算好的位置直接映射到页面坐标
            const layoutParams = window.layoutParams || { 
                moduleWidth: 60, 
                moduleHeight: 8, 
                marginY: 4 
            };
            
            // 简单地使用行列位置直接计算坐标
            // position.row和position.col是基于计算得到的最优位置
            const moduleWidth = layoutParams.moduleWidth;
            const moduleHeight = layoutParams.moduleHeight + layoutParams.marginY;
            
            // 计算汇流箱位置，直接使用position中的行列坐标
            const x = position.col * moduleWidth;
            const y = position.row * moduleHeight;
            
            // 设置位置，放在组件中心
            box.style.left = `${x + moduleWidth/2}px`;
            box.style.top = `${y + moduleHeight/2}px`;
            
            // 设置样式
            box.style.backgroundColor = '#FF5500';
            box.style.borderColor = '#CC4400';
            box.style.width = '25px';
            box.style.height = '25px';
            box.style.position = 'absolute';
            box.style.transform = 'translate(-50%, -50%)'; // 居中定位
            box.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.5)';
            box.style.zIndex = '100';
            
            // 设置提示信息
            box.setAttribute('title', `汇流箱 #${combinerBoxId}
位置: 第${position.row + 1}行, 第${position.col + 1}列
物理坐标: (${position.realX.toFixed(2)}m, ${position.realY.toFixed(2)}m)
总距离: ${position.totalDistance.toFixed(2)}m
连接串数: ${position.stringCount || '未知'}`);
            
            // 添加ID标签显示
            const label = document.createElement('span');
            label.textContent = parseInt(combinerBoxId)+1;
            label.style.position = 'absolute';
            label.style.top = '50%';
            label.style.left = '50%';
            label.style.transform = 'translate(-50%, -50%)';
            label.style.color = '#FFFFFF';
            label.style.fontWeight = 'bold';
            label.style.fontSize = '12px';
            label.style.textShadow = '0 0 2px #000';
            box.appendChild(label);
            
            // 点击事件
            box.addEventListener('click', function(e) {
                e.stopPropagation();
                if (window.showCombinerBoxDetails) {
                    window.showCombinerBoxDetails(combinerBoxId, position);
                }
            });
            
            pvArray.appendChild(box);
            
            console.log(`创建汇流箱 #${combinerBoxId}，位置: 行=${position.row}，列=${position.col}，坐标=(${box.style.left}, ${box.style.top})`);
        } catch (error) {
            console.error(`创建汇流箱失败: ${error.message}`);
        }
    }

    // 启动优化过程
    function startOptimization(rows, columns, arrayGrouping) {
        console.log('开始优化汇流箱位置');
        console.log('参数: rows=', rows, 'columns=', columns);
        console.log('arrayGrouping 类型:', typeof arrayGrouping);
        console.log('arrayGrouping 长度:', arrayGrouping ? arrayGrouping.length : 0);
        
        const pvArray = document.getElementById('pv-array');
        if (!pvArray) {
            console.error('找不到pv-array元素');
            return;
        }
        
        if (!arrayGrouping || arrayGrouping.length === 0) {
            console.error('数组分组数据为空，无法执行优化');
            alert('分组数据不可用，请先执行分组运算');
            return;
        }
        
        try {
            // 获取DOM中可能存储的分组信息
            if (pvArray.dataset.arrayGroupingJson) {
                try {
                    const jsonData = JSON.parse(pvArray.dataset.arrayGroupingJson);
                    if (jsonData && jsonData.length > 0) {
                        console.log('使用DOM中存储的分组信息');
                        arrayGrouping = jsonData;
                    }
                } catch (e) {
                    console.error('解析DOM分组数据失败:', e);
                }
            }
            
            const optimalPositions = calculateOptimalCombinerPositions(arrayGrouping);
            console.log('计算出的最优位置:', optimalPositions);
            
            renderCombinerBoxes(optimalPositions, pvArray);
            console.log('已渲染汇流箱到页面');
            
            // 显示优化结果
            displayOptimizationResults(optimalPositions);
            
            // 确保结果区域可见
            const resultsArea = document.getElementById('optimization-results');
            if (resultsArea) {
                resultsArea.style.display = 'block';
                // 滚动到结果区域
                setTimeout(() => {
                    resultsArea.scrollIntoView({behavior: 'smooth'});
                    console.log('滚动到优化结果区域');
                }, 200);
            }
            
            return optimalPositions;
        } catch (error) {
            console.error('优化过程中出错:', error);
            alert('优化过程中发生错误: ' + error.message);
        }
    }

    // 显示优化计算结果
    function displayOptimizationResults(optimalPositions) {
        console.log('显示优化结果:', optimalPositions);
        const resultsContent = document.getElementById('results-content');
        if (!resultsContent) {
            console.error('无法找到结果容器元素');
            return;
        }

        // 清空结果容器
        resultsContent.innerHTML = '';

        // 如果没有位置数据
        if (!optimalPositions || Object.keys(optimalPositions).length === 0) {
            resultsContent.innerHTML = '<p>未能计算出优化位置。请检查分组数据。</p>';
            return;
        }

        // 计算总距离
        let totalDistance = 0;
        for (const [boxId, position] of Object.entries(optimalPositions)) {
            const distance = position.totalDistance || 0;
            totalDistance += distance;
        }


        // 创建结果显示
        const resultDiv = document.createElement('div');
        resultDiv.className = 'total-distance-result';
        resultDiv.innerHTML = `<p style="font-size: 16px; font-weight: bold; text-align: center;">总距离: <span style="color: #2980b9;">${totalDistance.toFixed(2)}m</span></p>`;
        resultsContent.appendChild(resultDiv);

        // 显示计算完成时间
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        timestamp.textContent = `计算完成时间: ${new Date().toLocaleString()}`;
        resultsContent.appendChild(timestamp);
    }

    // 显示优化设置UI
    function showOptimizerSettings() {
        const container = document.getElementById('optimizer-container');
        if (container) {
            container.style.display = 'block';
            // 初始化事件监听器
            setupEventListeners();
            // 更新输入字段值为当前配置
            updateSettingsUI();
        }
    }
    
    // 隐藏优化设置UI
    function hideOptimizerSettings() {
        const container = document.getElementById('optimizer-container');
        if (container) {
            container.style.display = 'none';
        }
    }
    
    // 更新设置UI的输入值为当前配置
    function updateSettingsUI() {
        const lengthInput = document.getElementById('module-length');
        const widthInput = document.getElementById('module-width');
        const mountTypeSelect = document.getElementById('mount-type');
        const rowSpacingInput = document.getElementById('row-spacing');
        const columnSpacingInput = document.getElementById('column-spacing');
        
        if (lengthInput) lengthInput.value = moduleDimensions.length;
        if (widthInput) widthInput.value = moduleDimensions.width;
        if (mountTypeSelect) mountTypeSelect.value = moduleDimensions.mountType;
        if (rowSpacingInput) rowSpacingInput.value = moduleDimensions.rowSpacing;
        if (columnSpacingInput) columnSpacingInput.value = moduleDimensions.columnSpacing;
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
            // 直接添加点击事件监听器
            optimizeButton.onclick = function() {
                console.log('优化按钮被点击');
                if (!window.arrayGrouping || window.arrayGrouping.length === 0) {
                    alert('请先执行分组运算，获取阵列分组信息');
                    return;
                }
                
                const rows = window.layoutParams ? window.layoutParams.rows : 52;
                const columns = window.layoutParams ? window.layoutParams.columns : 4;
                
                startOptimization(rows, columns, window.arrayGrouping);
            };
        }
    }

    // 在DOM加载完成后初始化
    document.addEventListener('DOMContentLoaded', function() {
        // 监听分组状态变化
        const checkGroupStatus = function() {
            if (window.groupCalculationActive) {
                showOptimizerSettings();
            } else {
                hideOptimizerSettings();
            }
        };
        
        // 初始检查一次
        setTimeout(checkGroupStatus, 1000);
        
        // 设置定期检查
        setInterval(checkGroupStatus, 500);
    });
    
    // 暴露公共接口
    window.CombinerBoxOptimizer = {
        startOptimization,
        setModuleDimensions: function(dimensions) {
            Object.assign(moduleDimensions, dimensions);
        },
        getModuleDimensions: function() {
            return Object.assign({}, moduleDimensions);
        },
        showSettings: showOptimizerSettings,
        hideSettings: hideOptimizerSettings,
        displayResults: displayOptimizationResults,
       

    };
})(); 