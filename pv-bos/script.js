document.addEventListener('DOMContentLoaded', function() {
    // 布局配置
    const layouts = {
        layout1: {
            color: 'rgba(231, 76, 60, 0.7)',
            border: 'rgba(192, 57, 43, 0.8)'
        },
        layout2: {
            color: 'rgba(46, 204, 113, 0.7)',
            border: 'rgba(39, 174, 96, 0.8)'
        },
        layout3: {
            color: 'rgba(52, 152, 219, 0.7)',
            border: 'rgba(41, 128, 185, 0.8)'
        }
    };

    // 光伏组件参数
    const moduleParams = {
        power: 0.63, // kWp (630Wp)
        width: 20,  // 宽度单位
        height: 4,  // 高度单位
        margin: 5   // 间距单位
    };

    // 布局参数
    let layoutParams = {
        rows: 5,
        columns: 4,
        moduleWidth: moduleParams.width,
        moduleHeight: moduleParams.height,
        marginX: moduleParams.margin,
        marginY: moduleParams.margin * 2
    };

    // 当前选择的布局
    let currentLayout = 'layout1';

    // DOM元素
    const pvArray = document.getElementById('pv-array');
    const layoutSelect = document.getElementById('layout-select');
    const rowSlider = document.getElementById('row-slider');
    const columnSlider = document.getElementById('column-slider');
    const rowValue = document.getElementById('row-value');
    const columnValue = document.getElementById('column-value');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetViewBtn = document.getElementById('reset-view');
    const selectionDetails = document.getElementById('selection-details');
    const arrayWidth = document.getElementById('array-width');
    const arrayHeight = document.getElementById('array-height');
    const totalPanelsSpan = document.getElementById('total-panels');
    const totalPowerSpan = document.getElementById('total-power');

    // 视图状态
    let viewState = {
        scale: 1,
        translateX: 0,
        translateY: 0,
        dragging: false,
        lastX: 0,
        lastY: 0
    };

    // 计算阵列尺寸
    function calculateArrayDimensions() {
        const width = layoutParams.columns * (layoutParams.moduleWidth + layoutParams.marginX) + layoutParams.marginX;
        const height = layoutParams.rows * (layoutParams.moduleHeight + layoutParams.marginY) + layoutParams.marginY;
        return { width, height };
    }

    // 更新阵列尺寸显示
    function updateDimensionsDisplay() {
        const dimensions = calculateArrayDimensions();
        arrayWidth.textContent = dimensions.width.toFixed(1);
        arrayHeight.textContent = dimensions.height.toFixed(1);
    }

    // 初始化光伏阵列布局
    function initPVArray() {
        // 清空现有阵列
        pvArray.innerHTML = '';
        pvArray.className = 'pv-array ' + currentLayout;
        
        const dimensions = calculateArrayDimensions();
        
        // 设置阵列容器尺寸
        pvArray.style.width = `${dimensions.width}px`;
        pvArray.style.height = `${dimensions.height}px`;
        
        // 更新尺寸显示
        updateDimensionsDisplay();
        
        // 计算总组件数
        const totalModules = layoutParams.rows * layoutParams.columns;
        
        // 更新系统信息
        totalPanelsSpan.textContent = totalModules;
        totalPowerSpan.textContent = (totalModules * moduleParams.power / 1000).toFixed(2);
        
        // 创建光伏组件
        for (let row = 0; row < layoutParams.rows; row++) {
            for (let col = 0; col < layoutParams.columns; col++) {
                const moduleIndex = row * layoutParams.columns + col;
                
                // 计算组件位置
                const x = layoutParams.marginX + col * (layoutParams.moduleWidth + layoutParams.marginX);
                const y = layoutParams.marginY + row * (layoutParams.moduleHeight + layoutParams.marginY);
                
                // 创建组件
                createPVModule(x, y, moduleIndex);
            }
        }
        
        updateView();
    }

    // 创建光伏组件（长条形，包含三个连接的部分）
    function createPVModule(x, y, index) {
        const module = document.createElement('div');
        module.className = 'pv-module';
        module.dataset.index = index;
        module.style.left = `${x}px`;
        module.style.top = `${y}px`;
        module.style.width = `${layoutParams.moduleWidth}px`;
        module.style.height = `${layoutParams.moduleHeight}px`;
        
        // 设置模块颜色
        module.style.backgroundColor = layouts[currentLayout].color;
        module.style.borderColor = layouts[currentLayout].border;
        
        // 添加点击事件
        module.addEventListener('click', function() {
            showModuleDetails(index);
        });
        
        pvArray.appendChild(module);
    }

    // 显示组件详情
    function showModuleDetails(index) {
        const row = Math.floor(index / layoutParams.columns) + 1;
        const column = (index % layoutParams.columns) + 1;
        
        selectionDetails.innerHTML = `
            <h4>光伏组件 #${index + 1}</h4>
            <p>位置: 第${row}行, 第${column}列</p>
            <p>功率: ${moduleParams.power} kWp</p>
            <p>尺寸: ${layoutParams.moduleWidth} × ${layoutParams.moduleHeight} 单位</p>
        `;
    }

    // 更新视图
    function updateView() {
        pvArray.style.transform = `scale(${viewState.scale}) translate(${viewState.translateX}px, ${viewState.translateY}px)`;
    }
    
    // 更新布局
    function updateLayout() {
        currentLayout = layoutSelect.value;
        layoutParams.rows = parseInt(rowSlider.value);
        layoutParams.columns = parseInt(columnSlider.value);
        
        initPVArray();
    }

    // 事件监听器
    layoutSelect.addEventListener('change', updateLayout);
    
    // 滑块事件监听
    rowSlider.addEventListener('input', function() {
        rowValue.textContent = this.value;
        layoutParams.rows = parseInt(this.value);
        initPVArray();
    });
    
    columnSlider.addEventListener('input', function() {
        columnValue.textContent = this.value;
        layoutParams.columns = parseInt(this.value);
        initPVArray();
    });
    
    zoomInBtn.addEventListener('click', function() {
        viewState.scale = Math.min(viewState.scale * 1.2, 5);
        updateView();
    });

    zoomOutBtn.addEventListener('click', function() {
        viewState.scale = Math.max(viewState.scale / 1.2, 0.2);
        updateView();
    });

    resetViewBtn.addEventListener('click', function() {
        viewState.scale = 1;
        viewState.translateX = 0;
        viewState.translateY = 0;
        updateView();
    });

    // 拖拽功能
    pvArray.addEventListener('mousedown', function(e) {
        viewState.dragging = true;
        viewState.lastX = e.clientX;
        viewState.lastY = e.clientY;
        pvArray.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', function(e) {
        if (viewState.dragging) {
            const dx = (e.clientX - viewState.lastX) / viewState.scale;
            const dy = (e.clientY - viewState.lastY) / viewState.scale;
            viewState.translateX += dx;
            viewState.translateY += dy;
            viewState.lastX = e.clientX;
            viewState.lastY = e.clientY;
            updateView();
        }
    });

    document.addEventListener('mouseup', function() {
        viewState.dragging = false;
        pvArray.style.cursor = 'grab';
    });

    // 初始化
    initPVArray();
}); 