document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成');
    const debugInfo = document.getElementById('debug-info');
    
    function logDebug(message) {
        console.log(message);
        if (debugInfo) {
            debugInfo.innerHTML += `<p>${message}</p>`;
        }
    }
    
    logDebug('开始初始化光伏阵列模拟器');
    let arrayGrouping = []; // 阵列的分组配置
    // 布局配置
    const layouts = {
        layout1: {
            color: 'rgba(231, 76, 60, 0.7)',
            border: 'rgba(192, 57, 43, 0.8)',
            stringColor: 'rgba(241, 196, 15, 0.7)',
            stringBorder: 'rgba(243, 156, 18, 0.8)'
        },
        layout2: {
            color: 'rgba(46, 204, 113, 0.7)',
            border: 'rgba(39, 174, 96, 0.8)',
            stringColor: 'rgba(241, 196, 15, 0.7)',
            stringBorder: 'rgba(243, 156, 18, 0.8)'
        },
        layout3: {
            color: 'rgba(52, 152, 219, 0.7)',
            border: 'rgba(41, 128, 185, 0.8)',
            stringColor: 'rgba(231, 76, 60, 0.7)',
            stringBorder: 'rgba(192, 57, 43, 0.8)'
        }
    };

    // 光伏组件参数
    const moduleParams = {
        power: 0.63, // kWp (630Wp)
        width: 180,  // 宽度调整为更好地显示
        height: 8,   // 减小高度，使更多行能够显示
        margin: 2    // 减小间距
    };

    // 布局参数
    let layoutParams = {
        rows: 52,
        columns: 4,
        moduleWidth: moduleParams.width,
        moduleHeight: moduleParams.height,
        marginX: 0,   // 列间距设为零
        marginY: moduleParams.margin * 2,
        modulesPerString: 28,  // 每串组件数量
        modulePower: 630,      // 单组件功率，单位Wp
        inverterModel: 'SG9375UD-MV-20', // 默认逆变器型号
        inverterPower: 9375    // 默认逆变器功率，单位kW
    };

    // 汇流箱配置
    let combinerBoxGroups = [
        {
            id: 1,
            count: 4,            // 汇流箱数量
            stringsPerBox: 13,   // 每个汇流箱的串数
            totalStrings: 52     // 总串数 = count * stringsPerBox
        }
    ];

    // 逆变器型号配置
    const inverters = {
        'SG9375UD-MV-20': {
            power: 9375  // 功率，单位kW
        },
        '8800': {
            power: 8800  // 功率，单位kW
        }
    };

    // 当前选择的布局
    let currentLayout = 'layout1';

    // DOM元素
    const pvArray = document.getElementById('pv-array');
    if (!pvArray) {
        logDebug('错误: 找不到pv-array元素!');
        return;
    }
    
    logDebug('找到pv-array元素');
    
    const layoutSelect = document.getElementById('layout-select');
    const rowInput = document.getElementById('row-input');
    const columnInput = document.getElementById('column-input');
    const modulePowerInput = document.getElementById('module-power');
    const modulesPerStringInput = document.getElementById('modules-per-string');
    const inverterModelSelect = document.getElementById('inverter-model');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetViewBtn = document.getElementById('reset-view');
    const showStringsCheckbox = document.getElementById('show-strings');
    const showCombinerBoxesCheckbox = document.getElementById('show-combiner-boxes');
    const selectionDetails = document.getElementById('selection-details');
    const arrayWidth = document.getElementById('array-width');
    const arrayHeight = document.getElementById('array-height');
    const totalPowerSpan = document.getElementById('total-power');
    const dcCapacitySpan = document.getElementById('dc-capacity');
    const totalStringsSpan = document.getElementById('total-strings');
    const stringCountSpan = document.getElementById('string-count');
    const boxCountSpan = document.getElementById('box-count');
    const combinerCountSpan = document.getElementById('combiner-count');
    const modulePowerDisplay = document.getElementById('module-power-display');
    const modulePowerDisplay2 = document.getElementById('module-power-display2');
    const modulesPerStringDisplay = document.getElementById('modules-per-string-display');
    const inverterModelDisplay = document.getElementById('inverter-model-display');
    const inverterPowerDisplay = document.getElementById('inverter-power-display');
    const dcAcRatioDisplay = document.getElementById('dc-ac-ratio');
    const combinerBoxGroupsContainer = document.getElementById('combiner-box-groups');
    const addCombinerGroupBtn = document.getElementById('add-combiner-group');
    const totalCombinerBoxesSpan = document.getElementById('total-combiner-boxes');
    const totalConfiguredStringsSpan = document.getElementById('total-configured-strings');
    const totalArrayStringsSpan = document.getElementById('total-array-strings');
    const stringsMatchStatusSpan = document.getElementById('strings-match-status');
    const groupCalculationBtn = document.getElementById('group-calculation-btn');

    // 视图状态
    const viewState = {
        scale: 1.0,
        translateX: 0,
        translateY: 0,
        isDragging: false,
        lastX: 0,
        lastY: 0
    };

    // 分组计算的状态
    let groupCalculationActive = false;
    
    // 将分组状态暴露给窗口对象，以便string-grouping.js可以访问
    window.groupCalculationActive = groupCalculationActive;

    // 计算总串数
    function calculateTotalStrings() {
        const totalModules = layoutParams.rows * layoutParams.columns;
        return totalModules * 3; // 每个模块3串
    }

    // 计算DC容量
    function calculateDCCapacity() {
        const totalStrings = calculateTotalStrings();
        const dcCapacity = totalStrings * layoutParams.modulesPerString * layoutParams.modulePower / 1000000; // 转换为MWp
        return dcCapacity.toFixed(2);
    }

    // 计算DC/AC比率
    function calculateDCACRatio() {
        const dcCapacity = parseFloat(calculateDCCapacity());
        const acCapacity = layoutParams.inverterPower / 1000; // 转换为MW
        const ratio = dcCapacity / acCapacity;
        return ratio.toFixed(2);
    }

    // 计算阵列尺寸
    function calculateArrayDimensions() {
        const width = layoutParams.columns * layoutParams.moduleWidth;
        const height = layoutParams.rows * (layoutParams.moduleHeight + layoutParams.marginY);
        return { width, height };
    }

    // 更新阵列尺寸显示
    function updateDimensionsDisplay() {
        const dimensions = calculateArrayDimensions();
        if (arrayWidth) arrayWidth.textContent = dimensions.width.toFixed(1);
        if (arrayHeight) arrayHeight.textContent = dimensions.height.toFixed(1);
    }

    // 更新系统信息显示
    function updateSystemInfo() {
        const totalModules = layoutParams.rows * layoutParams.columns;
        const totalStrings = calculateTotalStrings();
        const combinerBoxCount = calculateTotalCombinerBoxes();
        const dcCapacity = calculateDCCapacity();
        const dcAcRatio = calculateDCACRatio();
        
        // 更新显示
        if (totalPowerSpan) totalPowerSpan.textContent = (totalModules * moduleParams.power).toFixed(2);
        if (dcCapacitySpan) dcCapacitySpan.textContent = dcCapacity;
        if (totalStringsSpan) totalStringsSpan.textContent = totalStrings;
        if (stringCountSpan) stringCountSpan.textContent = totalStrings;
        if (boxCountSpan) boxCountSpan.textContent = combinerBoxCount;
        if (combinerCountSpan) combinerCountSpan.textContent = combinerBoxCount;
        if (modulePowerDisplay) modulePowerDisplay.textContent = layoutParams.modulePower;
        if (modulePowerDisplay2) modulePowerDisplay2.textContent = layoutParams.modulePower;
        if (modulesPerStringDisplay) modulesPerStringDisplay.textContent = layoutParams.modulesPerString;
        if (inverterModelDisplay) inverterModelDisplay.textContent = layoutParams.inverterModel;
        if (inverterPowerDisplay) inverterPowerDisplay.textContent = layoutParams.inverterPower;
        if (dcAcRatioDisplay) dcAcRatioDisplay.textContent = dcAcRatio;
        
        // 更新汇流箱信息
        updateCombinerSummary();
        
        // 更新串颜色
        if (window.StringColoring && pvArray) {
            window.StringColoring.updateStringColors(pvArray, combinerBoxGroups, totalStrings);
        }
        
        // 判断配置是否匹配并更新状态显示
        if (window.StringColoring) {
            const isConfigMatched = window.StringColoring.checkConfigurationMatch(combinerBoxGroups, totalStrings);
            
            // 更新匹配状态显示
            if (stringsMatchStatusSpan) {
                if (isConfigMatched) {
                    stringsMatchStatusSpan.textContent = '已匹配';
                    stringsMatchStatusSpan.className = 'match-status matched';
                } else {
                    stringsMatchStatusSpan.textContent = '未匹配';
                    stringsMatchStatusSpan.className = 'match-status unmatched';
                }
            }
            
            // 显示或隐藏分组运算按钮
            if (groupCalculationBtn) {
                groupCalculationBtn.style.display = isConfigMatched ? 'inline-block' : 'none';
                
                // 如果配置不匹配但按钮是激活的，则重置按钮状态
                if (!isConfigMatched && groupCalculationActive) {
                    groupCalculationActive = false;
                    groupCalculationBtn.classList.remove('active');
                    groupCalculationBtn.textContent = '分组运算';
                }
            }
        }
        
        logDebug(`更新系统信息: 总DC容量=${dcCapacity}MWp, 总串数=${totalStrings}, DC/AC比率=${dcAcRatio}`);
    }

    // 计算汇流箱总数
    function calculateTotalCombinerBoxes() {
        let total = 0;
        combinerBoxGroups.forEach(group => {
            total += group.count;
        });
        return total;
    }

    // 计算配置的总串数
    function calculateConfiguredStrings() {
        let total = 0;
        combinerBoxGroups.forEach(group => {
            total += group.count * group.stringsPerBox;
        });
        return total;
    }

    // 更新汇流箱配置摘要
    function updateCombinerSummary() {
        const totalCombinerBoxes = calculateTotalCombinerBoxes();
        const configuredStrings = calculateConfiguredStrings();
        const totalArrayStrings = calculateTotalStrings();
        
        if (totalCombinerBoxesSpan) totalCombinerBoxesSpan.textContent = totalCombinerBoxes;
        if (totalConfiguredStringsSpan) totalConfiguredStringsSpan.textContent = configuredStrings;
        if (totalArrayStringsSpan) totalArrayStringsSpan.textContent = totalArrayStrings;
        
        if (stringsMatchStatusSpan) {
            if (configuredStrings === totalArrayStrings) {
                stringsMatchStatusSpan.textContent = '已匹配';
                stringsMatchStatusSpan.className = 'match-status matched';
            } else {
                stringsMatchStatusSpan.textContent = '未匹配';
                stringsMatchStatusSpan.className = 'match-status unmatched';
            }
        }
    }

    // 更新单个汇流箱组信息
    function updateGroupInfo(groupId) {
        const group = combinerBoxGroups.find(g => g.id === groupId);
        if (!group) return;
        
        const totalGroupStrings = group.count * group.stringsPerBox;
        const groupTotalStrings = document.getElementById(`group-total-strings-${groupId}`);
        
        if (groupTotalStrings) groupTotalStrings.textContent = totalGroupStrings;
        
        // 更新总摘要
        updateCombinerSummary();
        
        // 更新串颜色
        if (window.StringColoring && pvArray) {
            const totalStrings = calculateTotalStrings();
            window.StringColoring.updateStringColors(pvArray, combinerBoxGroups, totalStrings);
        }
    }

    // 渲染汇流箱组界面
    function renderCombinerGroups() {
        if (!combinerBoxGroupsContainer) return;
        
        // 清空现有的组
        combinerBoxGroupsContainer.innerHTML = '';
        
        // 为每个组创建UI
        for (const group of combinerBoxGroups) {
            const groupEl = createCombinerGroupUI(group);
            combinerBoxGroupsContainer.appendChild(groupEl);
        }
        
        // 更新摘要
        updateCombinerSummary();
    }

    // 创建汇流箱组UI
    function createCombinerGroupUI(group) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'combiner-group';
        groupDiv.dataset.groupId = group.id;
        
        groupDiv.innerHTML = `
            <div class="group-header">
                <h4>汇流箱组 #${group.id}</h4>
                <button class="remove-group" data-group-id="${group.id}">删除</button>
            </div>
            <div class="horizontal-controls">
                <div class="control-group inline">
                    <label for="combiner-count-${group.id}">汇流箱数量:</label>
                    <input type="number" id="combiner-count-${group.id}" class="combiner-count" 
                        min="1" max="50" value="${group.count}" data-group-id="${group.id}">
                </div>
                <div class="control-group inline">
                    <label for="strings-per-combiner-${group.id}">每汇流箱串数:</label>
                    <input type="number" id="strings-per-combiner-${group.id}" class="strings-per-combiner" 
                        min="1" max="30" value="${group.stringsPerBox}" data-group-id="${group.id}">
                </div>
                <div class="group-summary inline">
                    总串数: <span class="group-total-strings" id="group-total-strings-${group.id}">${group.count * group.stringsPerBox}</span>
                </div>
            </div>
        `;
        
        // 添加事件监听器
        const combinerCountInput = groupDiv.querySelector(`#combiner-count-${group.id}`);
        if (combinerCountInput) {
            combinerCountInput.addEventListener('change', function() {
                const groupId = parseInt(this.dataset.groupId);
                const groupIndex = combinerBoxGroups.findIndex(g => g.id === groupId);
                if (groupIndex === -1) return;
                
                combinerBoxGroups[groupIndex].count = parseInt(this.value);
                updateGroupInfo(groupId);
                updateSystemInfo();
                initPVArray(); // 重新绘制阵列
            });
            
            combinerCountInput.addEventListener('input', function() {
                const groupId = parseInt(this.dataset.groupId);
                const groupIndex = combinerBoxGroups.findIndex(g => g.id === groupId);
                if (groupIndex === -1) return;
                
                combinerBoxGroups[groupIndex].count = parseInt(this.value);
                updateGroupInfo(groupId);
                updateSystemInfo();
            });
        }
        
        const stringsPerCombinerInput = groupDiv.querySelector(`#strings-per-combiner-${group.id}`);
        if (stringsPerCombinerInput) {
            stringsPerCombinerInput.addEventListener('change', function() {
                const groupId = parseInt(this.dataset.groupId);
                const groupIndex = combinerBoxGroups.findIndex(g => g.id === groupId);
                if (groupIndex === -1) return;
                
                combinerBoxGroups[groupIndex].stringsPerBox = parseInt(this.value);
                updateGroupInfo(groupId);
                updateSystemInfo();
                initPVArray(); // 重新绘制阵列
            });
            
            stringsPerCombinerInput.addEventListener('input', function() {
                const groupId = parseInt(this.dataset.groupId);
                const groupIndex = combinerBoxGroups.findIndex(g => g.id === groupId);
                if (groupIndex === -1) return;
                
                combinerBoxGroups[groupIndex].stringsPerBox = parseInt(this.value);
                updateGroupInfo(groupId);
                updateSystemInfo();
            });
        }
        
        const removeButton = groupDiv.querySelector(`.remove-group[data-group-id="${group.id}"]`);
        if (removeButton) {
            removeButton.addEventListener('click', function() {
                const groupId = parseInt(this.dataset.groupId);
                removeCombinerGroup(groupId);
            });
        }
        
        return groupDiv;
    }

    // 添加新的汇流箱组
    function addCombinerGroup() {
        // 找到最大ID
        const maxId = combinerBoxGroups.reduce((max, group) => Math.max(max, group.id), 0);
        const newId = maxId + 1;
        
        // 创建新组
        const newGroup = {
            id: newId,
            count: 1,
            stringsPerBox: 13,
            totalStrings: 13
        };
        
        // 添加到数组
        combinerBoxGroups.push(newGroup);
        
        // 更新UI
        const groupEl = createCombinerGroupUI(newGroup);
        document.getElementById('combiner-box-groups').appendChild(groupEl);
        
        // 更新摘要
        updateCombinerSummary();
        updateSystemInfo();
        
        // 全部重绘以更新颜色
        initPVArray();
        
        logDebug(`添加了新汇流箱组 #${newId}`);
    }

    // 删除汇流箱组
    function removeCombinerGroup(groupId) {
        // 至少保留一个组
        if (combinerBoxGroups.length <= 1) {
            logDebug('无法删除最后一个汇流箱组');
            return;
        }
        
        // 从数组中移除
        const groupIndex = combinerBoxGroups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;
        
        combinerBoxGroups.splice(groupIndex, 1);
        
        // 从DOM中移除
        const groupEl = document.querySelector(`.combiner-group[data-group-id="${groupId}"]`);
        if (groupEl) {
            groupEl.remove();
        }
        
        // 更新摘要
        updateCombinerSummary();
        updateSystemInfo();
        
        // 全部重绘以更新颜色
        initPVArray();
        
        logDebug(`删除了汇流箱组 #${groupId}`);
    }

    // 创建列之间的虚线
    function createColumnLine(x, y, height) {
        try {
            const line = document.createElement('div');
            line.className = 'column-line';
            line.style.left = `${x}px`;
            line.style.top = `${y}px`;
            line.style.height = `${height}px`;
            
            pvArray.appendChild(line);
            logDebug(`创建虚线: x=${x}, y=${y}, height=${height}`);
        } catch (error) {
            logDebug(`创建虚线失败: ${error.message}`);
        }
    }

    // 初始化光伏阵列布局
    function initPVArray() {
        logDebug('初始化阵列布局');
        try {
            // 清空现有阵列
            pvArray.innerHTML = '';
            pvArray.className = 'pv-array ' + currentLayout;
            
            const dimensions = calculateArrayDimensions();
            logDebug(`阵列尺寸: 宽=${dimensions.width}, 高=${dimensions.height}`);
            
            // 设置阵列容器尺寸
            pvArray.style.width = `${dimensions.width}px`;
            pvArray.style.height = `${dimensions.height}px`;
            
            // 更新尺寸显示
            updateDimensionsDisplay();
            
            // 更新系统信息
            updateSystemInfo();
            
            // 创建列之间的虚线
            for (let col = 1; col < layoutParams.columns; col++) {
                const lineX = col * layoutParams.moduleWidth;
                createColumnLine(lineX, 0, dimensions.height);
            }
            
            // 创建光伏组件和串
            for (let row = 0; row < layoutParams.rows; row++) {
                for (let col = 0; col < layoutParams.columns; col++) {
                    const moduleIndex = row * layoutParams.columns + col;
                    
                    // 计算组件位置
                    const x = col * layoutParams.moduleWidth;
                    const y = layoutParams.marginY + row * (layoutParams.moduleHeight + layoutParams.marginY);
                    
                    // 创建光伏组件(跟踪器)
                    createTrackerRow(x, y, moduleIndex);
                    
                    // 创建串
                    for (let s = 0; s < 3; s++) { // 每个组件3个串
                        const stringX = x + (s * layoutParams.moduleWidth / 3);
                        const stringY = y;
                        const stringWidth = layoutParams.moduleWidth / 3;
                        createString(stringX, stringY, stringWidth, layoutParams.moduleHeight, moduleIndex * 3 + s);
                    }
                }
            }
            
            logDebug(`创建了 ${layoutParams.rows * layoutParams.columns} 个光伏组件`);
            
            // 应用串颜色分配
            if (window.StringColoring) {
                const totalStrings = calculateTotalStrings();
                
                // 根据分组运算状态选择颜色模式
                if (groupCalculationActive) {
                    // 执行特殊分组计算
                    window.StringColoring.applyCustomGrouping(pvArray, combinerBoxGroups, totalStrings, 
                        layoutParams.rows, layoutParams.columns);
                    logDebug('应用了自定义分组颜色');
                } else {
                    window.StringColoring.initStringColors(pvArray, combinerBoxGroups, totalStrings);
                    logDebug('应用了默认串颜色分配');
                }
            } else {
                logDebug('串颜色分配模块未加载');
            }
            
            updateView();
        } catch (error) {
            logDebug(`初始化阵列失败: ${error.message}`);
        }
    }

    // 创建跟踪器行
    function createTrackerRow(x, y, index) {
        try {
            const tracker = document.createElement('div');
            tracker.className = 'tracker-row';
            tracker.dataset.index = index;
            tracker.style.left = `${x}px`;
            tracker.style.top = `${y}px`;
            tracker.style.width = `${layoutParams.moduleWidth}px`;
            tracker.style.height = `${layoutParams.moduleHeight}px`;
            tracker.style.backgroundColor = layouts[currentLayout].color;
            tracker.style.borderColor = layouts[currentLayout].border;
            
            tracker.addEventListener('click', function() {
                showTrackerDetails(index);
            });
            
            pvArray.appendChild(tracker);
        } catch (error) {
            logDebug(`创建跟踪器失败: ${error.message}`);
        }
    }

    // 创建串
    function createString(x, y, width, height, index) {
        try {
            const string = document.createElement('div');
            string.className = 'string';
            string.dataset.index = index;
            string.style.left = `${x}px`;
            string.style.top = `${y}px`;
            string.style.width = `${width}px`;
            string.style.height = `${height}px`;
            
            // 这里不再设置默认颜色，将由颜色分配算法处理
            // string.style.backgroundColor = layouts[currentLayout].stringColor;
            // string.style.borderColor = layouts[currentLayout].stringBorder;
            
            string.addEventListener('click', function() {
                showStringDetails(index);
            });
            
            pvArray.appendChild(string);
        } catch (error) {
            logDebug(`创建串失败: ${error.message}`);
        }
    }

    // 显示跟踪器详情
    function showTrackerDetails(index) {
        if (!selectionDetails) return;
        
        const row = Math.floor(index / layoutParams.columns) + 1;
        const column = (index % layoutParams.columns) + 1;
        const singleModulePower = layoutParams.modulePower / 1000;
        
        selectionDetails.innerHTML = `
            <h4>光伏组件 #${index + 1}</h4>
            <p>位置: 第${row}行, 第${column}列</p>
            <p>功率: ${(singleModulePower * 3).toFixed(2)} kWp (3串)</p>
            <p>每串组件数: ${layoutParams.modulesPerString}个</p>
            <p>每串功率: ${(singleModulePower * layoutParams.modulesPerString).toFixed(2)} kWp</p>
        `;
    }

    // 显示串详情
    function showStringDetails(index) {
        if (!selectionDetails) return;
        
        const moduleIndex = Math.floor(index / 3);
        const stringInModule = (index % 3) + 1;
        const singleModulePower = layoutParams.modulePower / 1000;
        
        selectionDetails.innerHTML = `
            <h4>串 #${index + 1}</h4>
            <p>所属组件: #${moduleIndex + 1}</p>
            <p>组件内串编号: 第${stringInModule}串</p>
            <p>组件数量: ${layoutParams.modulesPerString}个</p>
            <p>单组件功率: ${(singleModulePower).toFixed(3)} kWp</p>
            <p>串总功率: ${(singleModulePower * layoutParams.modulesPerString).toFixed(2)} kWp</p>
        `;
    }

    // 显示汇流箱详情
    function showCombinerBoxDetails(index) {
        if (!selectionDetails) return;
        
        // 确定该汇流箱所属的组
        let groupInfo = null;
        let boxIdx = index;
        let totalBoxesBefore = 0;
        
        for (const group of combinerBoxGroups) {
            if (boxIdx < group.count) {
                groupInfo = group;
                break;
            }
            boxIdx -= group.count;
            totalBoxesBefore += group.count;
        }
        
        const stringsPerBox = groupInfo ? groupInfo.stringsPerBox : 13;
        const singleModulePower = layoutParams.modulePower / 1000;
        const groupId = groupInfo ? groupInfo.id : '未知';
        
        selectionDetails.innerHTML = `
            <h4>汇流箱 #${index + 1}</h4>
            <p>所属组: 汇流箱组 #${groupId}</p>
            <p>组内序号: ${boxIdx + 1}</p>
            <p>连接串数: ${stringsPerBox}串</p>
            <p>每串组件数: ${layoutParams.modulesPerString}个</p>
            <p>总功率: ${(stringsPerBox * layoutParams.modulesPerString * singleModulePower).toFixed(2)} kWp</p>
        `;
    }

    // 更新视图
    function updateView() {
        try {
            pvArray.style.transform = `scale(${viewState.scale}) translate(${viewState.translateX}px, ${viewState.translateY}px)`;
            
            // 更新串和汇流箱的可见性
            if (showStringsCheckbox) {
                const strings = document.querySelectorAll('.string');
                strings.forEach(string => {
                    string.style.display = showStringsCheckbox.checked ? 'block' : 'none';
                });
            }
            
            if (showCombinerBoxesCheckbox) {
                const boxes = document.querySelectorAll('.combiner-box');
                boxes.forEach(box => {
                    box.style.display = showCombinerBoxesCheckbox.checked ? 'block' : 'none';
                });
            }
        } catch (error) {
            logDebug(`更新视图失败: ${error.message}`);
        }
    }
    
    // 更新布局
    function updateLayout() {
        try {
            currentLayout = layoutSelect.value;
            layoutParams.rows = parseInt(rowInput.value);
            layoutParams.columns = parseInt(columnInput.value);
            
            logDebug(`更新布局: 布局=${currentLayout}, 行=${layoutParams.rows}, 列=${layoutParams.columns}`);
            
            initPVArray();
        } catch (error) {
            logDebug(`更新布局失败: ${error.message}`);
        }
    }

    // 更新组件参数
    function updateModuleParams() {
        try {
            layoutParams.modulePower = parseInt(modulePowerInput.value);
            layoutParams.modulesPerString = parseInt(modulesPerStringInput.value);
            moduleParams.power = layoutParams.modulePower / 1000; // 转换为kWp
            
            logDebug(`更新组件参数: 功率=${layoutParams.modulePower}Wp, 每串数量=${layoutParams.modulesPerString}`);
            
            // 更新系统信息但不重新创建阵列
            updateSystemInfo();
        } catch (error) {
            logDebug(`更新组件参数失败: ${error.message}`);
        }
    }

    // 更新逆变器参数
    function updateInverterParams() {
        try {
            const selectedModel = inverterModelSelect.value;
            layoutParams.inverterModel = selectedModel;
            layoutParams.inverterPower = inverters[selectedModel].power;
            
            logDebug(`更新逆变器参数: 型号=${selectedModel}, 功率=${layoutParams.inverterPower}kW`);
            
            // 更新系统信息但不重新创建阵列
            updateSystemInfo();
        } catch (error) {
            logDebug(`更新逆变器参数失败: ${error.message}`);
        }
    }

    // 执行分组运算
    function performGroupCalculation() {
        const totalStrings = calculateTotalStrings();
        
        if (!window.StringColoring || !window.StringColoring.checkConfigurationMatch(combinerBoxGroups, totalStrings)) {
            logDebug('无法执行分组运算：汇流箱配置不匹配');
            return;
        }
        
        logDebug('开始执行分组运算');
        
        // 切换按钮状态
        groupCalculationActive = !groupCalculationActive;
        // 同步更新窗口对象上的状态
        window.groupCalculationActive = groupCalculationActive;
        
        if (groupCalculationBtn) {
            if (groupCalculationActive) {
                groupCalculationBtn.classList.add('active');
                groupCalculationBtn.textContent = '取消分组';
                
                // 分组完成后直接调用优化器的显示函数
                if (window.CombinerBoxOptimizer) {
                    // 先触发分组计算，然后显示优化设置
                    setTimeout(() => {
                        if (window.arrayGrouping && window.arrayGrouping.length > 0) {
                            logDebug('分组完成，显示汇流箱位置优化设置');
                            window.CombinerBoxOptimizer.showSettings();
                        }
                    }, 300);
                }
            } else {
                groupCalculationBtn.classList.remove('active');
                groupCalculationBtn.textContent = '分组运算';
                
                // 取消分组时清除汇流箱
                const combinerBoxes = document.querySelectorAll('.combiner-box');
                combinerBoxes.forEach(box => box.remove());
                
                // 隐藏优化设置
                if (window.CombinerBoxOptimizer) {
                    window.CombinerBoxOptimizer.hideSettings();
                }
            }
        }
        
        // 更新颜色显示
        initPVArray();
    }

    // 事件监听器
    if (layoutSelect) {
        layoutSelect.addEventListener('change', updateLayout);
    }
    
    // 输入框事件监听
    if (rowInput) {
        rowInput.addEventListener('change', function() {
            layoutParams.rows = parseInt(this.value);
            initPVArray();
        });
        
        rowInput.addEventListener('input', function() {
            layoutParams.rows = parseInt(this.value);
            updateSystemInfo();
        });
    }
    
    if (columnInput) {
        columnInput.addEventListener('change', function() {
            layoutParams.columns = parseInt(this.value);
            initPVArray();
        });
        
        columnInput.addEventListener('input', function() {
            layoutParams.columns = parseInt(this.value);
            updateSystemInfo();
        });
    }
    
    // 组件参数输入监听
    if (modulePowerInput) {
        modulePowerInput.addEventListener('change', updateModuleParams);
        modulePowerInput.addEventListener('input', updateModuleParams);
    }
    
    if (modulesPerStringInput) {
        modulesPerStringInput.addEventListener('change', updateModuleParams);
        modulesPerStringInput.addEventListener('input', updateModuleParams);
    }
    
    // 逆变器型号选择监听
    if (inverterModelSelect) {
        inverterModelSelect.addEventListener('change', updateInverterParams);
    }
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function() {
            viewState.scale = Math.min(viewState.scale * 1.2, 5);
            updateView();
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function() {
            viewState.scale = Math.max(viewState.scale / 1.2, 0.2);
            updateView();
        });
    }

    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', function() {
            viewState.scale = 1;
            viewState.translateX = 0;
            viewState.translateY = 0;
            updateView();
        });
    }

    // 显示/隐藏串和汇流箱
    if (showStringsCheckbox) {
        showStringsCheckbox.addEventListener('change', updateView);
    }
    
    if (showCombinerBoxesCheckbox) {
        showCombinerBoxesCheckbox.addEventListener('change', updateView);
    }

    // 鼠标事件处理
    pvArray.addEventListener('mousedown', function(e) {
        if (e.button === 0) { // 左键
            viewState.isDragging = true;
            viewState.lastX = e.clientX;
            viewState.lastY = e.clientY;
            pvArray.style.cursor = 'grabbing';
        }
    });
    
    document.addEventListener('mousemove', function(e) {
        if (viewState.isDragging) {
            const deltaX = e.clientX - viewState.lastX;
            const deltaY = e.clientY - viewState.lastY;
            
            viewState.translateX += deltaX;
            viewState.translateY += deltaY;
            
            updateView();
            
            viewState.lastX = e.clientX;
            viewState.lastY = e.clientY;
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (viewState.isDragging) {
            viewState.isDragging = false;
            pvArray.style.cursor = 'grab';
        }
    });

    // 汇流箱配置相关监听器
    if (addCombinerGroupBtn) {
        addCombinerGroupBtn.addEventListener('click', addCombinerGroup);
    }
    
    // 分组运算按钮监听器
    if (groupCalculationBtn) {
        groupCalculationBtn.addEventListener('click', performGroupCalculation);
    }

    // 初始化
    logDebug('开始初始化光伏阵列');
    
    // 初始设置
    if (rowInput) rowInput.value = layoutParams.rows;
    if (columnInput) columnInput.value = layoutParams.columns;
    if (modulePowerInput) modulePowerInput.value = layoutParams.modulePower;
    if (modulesPerStringInput) modulesPerStringInput.value = layoutParams.modulesPerString;
    if (inverterModelSelect) inverterModelSelect.value = layoutParams.inverterModel;
    
    // 渲染汇流箱组
    renderCombinerGroups();
    
    initPVArray();
    logDebug('初始化完成');
}); 