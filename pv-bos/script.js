document.addEventListener('DOMContentLoaded', function() {
    // 光伏阵列系统参数
    const systemParams = {
        totalPower: 11.01, // MWp
        moduleType: '1P84',
        modulesPower: 0.63, // kWp
        moduleCount: 84, // 每个跟踪器的光伏板数量
        stringsPerRow: 3, // 每行有3串，每串28块光伏板
        modulesPerString: 28, // 每串28块光伏板
        stringsPerCombiner: 13, // 每个汇流箱连接13串
        combinerBoxCount: 48, // 汇流箱总数
        totalStrings: 624, // 总串数
    };

    // 布局参数
    const layoutParams = {
        // 根据图片中的尺寸 384.6 x 383.5
        width: 384.6,
        height: 383.5,
        // 计算跟踪器行数和列数
        rowCount: Math.ceil(systemParams.totalStrings / systemParams.stringsPerCombiner / 4), // 大约12行
        columnCount: 4, // 每行大约4个汇流箱区域
        rowSpacing: 20, // 行间距
        columnSpacing: 10, // 列间距
        trackerWidth: 85, // 跟踪器宽度
        trackerHeight: 5, // 跟踪器高度
    };

    // 计算出每个汇流箱的串数
    const stringsPerCombinerBox = Math.ceil(systemParams.totalStrings / systemParams.combinerBoxCount); // 13

    // DOM元素
    const pvArray = document.getElementById('pv-array');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetViewBtn = document.getElementById('reset-view');
    const showStringsCheckbox = document.getElementById('show-strings');
    const showCombinerBoxesCheckbox = document.getElementById('show-combiner-boxes');
    const selectionDetails = document.getElementById('selection-details');

    // 视图状态
    let viewState = {
        scale: 1,
        translateX: 0,
        translateY: 0,
        dragging: false,
        lastX: 0,
        lastY: 0
    };

    // 初始化光伏阵列布局
    function initPVArray() {
        // 设置阵列容器尺寸
        pvArray.style.width = `${layoutParams.width * 5}px`;
        pvArray.style.height = `${layoutParams.height * 5}px`;
        
        // 创建跟踪器行和串
        let stringCounter = 0;
        let combinerBoxCounter = 0;
        
        // 计算每个汇流箱区域中的跟踪器数量
        const trackersPerCombinerArea = systemParams.stringsPerCombiner / systemParams.stringsPerRow;
        
        // 创建汇流箱区域
        for (let row = 0; row < layoutParams.rowCount; row++) {
            for (let col = 0; col < layoutParams.columnCount; col++) {
                if (combinerBoxCounter >= systemParams.combinerBoxCount) break;
                
                // 汇流箱的位置
                const boxX = col * (layoutParams.trackerWidth + layoutParams.columnSpacing) * 3 + layoutParams.trackerWidth / 2;
                const boxY = row * (layoutParams.trackerHeight + layoutParams.rowSpacing) * 4 + layoutParams.trackerHeight * 2;
                
                // 创建汇流箱
                createCombinerBox(boxX, boxY, combinerBoxCounter);
                
                // 在汇流箱周围创建跟踪器
                for (let t = 0; t < trackersPerCombinerArea && stringCounter < systemParams.totalStrings; t++) {
                    // 计算跟踪器在汇流箱区域内的相对位置
                    const trackerRow = Math.floor(t / 3);
                    const trackerCol = t % 3;
                    
                    const trackerX = col * (layoutParams.trackerWidth + layoutParams.columnSpacing) * 3 + trackerCol * (layoutParams.trackerWidth + 5);
                    const trackerY = row * (layoutParams.trackerHeight + layoutParams.rowSpacing) * 4 + trackerRow * layoutParams.trackerHeight * 1.5;
                    
                    // 创建跟踪器行
                    createTrackerRow(trackerX, trackerY, stringCounter);
                    
                    // 为每个跟踪器创建3个串
                    for (let s = 0; s < systemParams.stringsPerRow && stringCounter < systemParams.totalStrings; s++) {
                        const stringX = trackerX + (s * (layoutParams.trackerWidth / systemParams.stringsPerRow));
                        const stringY = trackerY;
                        const stringWidth = layoutParams.trackerWidth / systemParams.stringsPerRow;
                        
                        createString(stringX, stringY, stringWidth, layoutParams.trackerHeight, stringCounter);
                        stringCounter++;
                    }
                }
                
                combinerBoxCounter++;
            }
        }
        
        updateView();
    }

    // 创建跟踪器行
    function createTrackerRow(x, y, index) {
        const tracker = document.createElement('div');
        tracker.className = 'tracker-row';
        tracker.dataset.index = index;
        tracker.style.left = `${x}px`;
        tracker.style.top = `${y}px`;
        tracker.style.width = `${layoutParams.trackerWidth}px`;
        tracker.style.height = `${layoutParams.trackerHeight}px`;
        
        tracker.addEventListener('click', function() {
            showTrackerDetails(index);
        });
        
        pvArray.appendChild(tracker);
    }

    // 创建串
    function createString(x, y, width, height, index) {
        const string = document.createElement('div');
        string.className = 'string';
        string.dataset.index = index;
        string.style.left = `${x}px`;
        string.style.top = `${y}px`;
        string.style.width = `${width}px`;
        string.style.height = `${height}px`;
        
        string.addEventListener('click', function() {
            showStringDetails(index);
        });
        
        pvArray.appendChild(string);
    }

    // 创建汇流箱
    function createCombinerBox(x, y, index) {
        const box = document.createElement('div');
        box.className = 'combiner-box';
        box.dataset.index = index;
        box.style.left = `${x}px`;
        box.style.top = `${y}px`;
        
        box.addEventListener('click', function(e) {
            e.stopPropagation();
            showCombinerBoxDetails(index);
        });
        
        pvArray.appendChild(box);
    }

    // 显示跟踪器详情
    function showTrackerDetails(index) {
        selectionDetails.innerHTML = `
            <h4>跟踪器 #${index + 1}</h4>
            <p>型号: ${systemParams.moduleType}</p>
            <p>光伏板数量: ${systemParams.moduleCount}</p>
            <p>串数: ${systemParams.stringsPerRow}</p>
            <p>功率: ${(systemParams.modulesPower * systemParams.moduleCount).toFixed(2)} kWp</p>
        `;
    }

    // 显示串详情
    function showStringDetails(index) {
        selectionDetails.innerHTML = `
            <h4>串 #${index + 1}</h4>
            <p>光伏板数量: ${systemParams.modulesPerString}</p>
            <p>每块功率: ${systemParams.modulesPower} kWp</p>
            <p>总功率: ${(systemParams.modulesPower * systemParams.modulesPerString).toFixed(2)} kWp</p>
            <p>所属汇流箱: #${Math.floor(index / systemParams.stringsPerCombiner) + 1}</p>
        `;
    }

    // 显示汇流箱详情
    function showCombinerBoxDetails(index) {
        const stringsStart = index * systemParams.stringsPerCombiner + 1;
        const stringsEnd = Math.min((index + 1) * systemParams.stringsPerCombiner, systemParams.totalStrings);
        
        selectionDetails.innerHTML = `
            <h4>汇流箱 #${index + 1}</h4>
            <p>连接串数: ${stringsEnd - stringsStart + 1}</p>
            <p>串编号范围: ${stringsStart} - ${stringsEnd}</p>
            <p>总功率: ${((stringsEnd - stringsStart + 1) * systemParams.modulesPerString * systemParams.modulesPower).toFixed(2)} kWp</p>
        `;
    }

    // 更新视图
    function updateView() {
        pvArray.style.transform = `scale(${viewState.scale}) translate(${viewState.translateX}px, ${viewState.translateY}px)`;
        
        // 更新串的可见性
        const strings = document.querySelectorAll('.string');
        strings.forEach(string => {
            string.style.display = showStringsCheckbox.checked ? 'block' : 'none';
        });
        
        // 更新汇流箱的可见性
        const boxes = document.querySelectorAll('.combiner-box');
        boxes.forEach(box => {
            box.style.display = showCombinerBoxesCheckbox.checked ? 'block' : 'none';
        });
    }

    // 事件监听器
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

    showStringsCheckbox.addEventListener('change', updateView);
    showCombinerBoxesCheckbox.addEventListener('change', updateView);

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