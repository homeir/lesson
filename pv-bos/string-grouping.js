/**
 * 串颜色分配算法
 * 根据汇流箱配置为光伏阵列中的串分配不同颜色
 */

// 预定义颜色集
const STRING_COLORS = [
    { bg: 'rgba(155, 89, 182, 0.7)', border: 'rgba(142, 68, 173, 0.8)' },   // 紫色
    { bg: 'rgba(241, 196, 15, 0.7)', border: 'rgba(243, 156, 18, 0.8)' },   // 黄色
    { bg: 'rgba(231, 76, 60, 0.7)', border: 'rgba(192, 57, 43, 0.8)' },     // 红色
    { bg: 'rgba(52, 152, 219, 0.7)', border: 'rgba(41, 128, 185, 0.8)' },   // 蓝色
    { bg: 'rgba(46, 204, 113, 0.7)', border: 'rgba(39, 174, 96, 0.8)' },    // 绿色
    { bg: 'rgba(230, 126, 34, 0.7)', border: 'rgba(211, 84, 0, 0.8)' },     // 橙色
    { bg: 'rgba(149, 165, 166, 0.7)', border: 'rgba(127, 140, 141, 0.8)' }, // 灰色
    { bg: 'rgba(26, 188, 156, 0.7)', border: 'rgba(22, 160, 133, 0.8)' }    // 青绿色
];

/**
 * 检查汇流箱配置是否与阵列总串数匹配
 * @param {Array} combinerBoxGroups - 汇流箱组配置
 * @param {number} totalStrings - 总串数
 * @returns {boolean} - 是否匹配
 */
function isConfigurationMatched(combinerBoxGroups, totalStrings) {
    const configuredStrings = combinerBoxGroups.reduce((sum, group) => sum + (group.count * group.stringsPerBox), 0);
    const isMatched = configuredStrings === totalStrings;
    
    console.log(`汇流箱配置检查: 配置串数=${configuredStrings}, 实际串数=${totalStrings}, 匹配=${isMatched}`);
    return isMatched;
}

/**
 * 获取默认串颜色映射（无分组）
 * @param {number} totalStrings - 总串数
 * @returns {Object} - 串索引到颜色的映射
 */
function getDefaultColorMapping(totalStrings) {
    const colorMapping = {};
    const defaultColor = STRING_COLORS[1]; // 使用黄色作为默认颜色
    
    for (let i = 0; i < totalStrings; i++) {
        colorMapping[i] = defaultColor;
    }
    
    return colorMapping;
}

/**
 * 获取串的颜色映射（每3列为一组）
 * @param {Array} combinerBoxGroups - 汇流箱组配置
 * @param {number} totalStrings - 总串数
 * @param {number} rows - 行数
 * @param {number} columns - 列数
 * @returns {Object} - 串索引到颜色的映射
 */
function getStringColorMapping(combinerBoxGroups, totalStrings, rows, columns) {
    // 无论配置是否匹配，都使用黄色作为默认颜色
    console.log('初始状态，使用黄色作为默认颜色');
    return getDefaultColorMapping(totalStrings);
}

/**
 * 计算汇流箱总数
 * @param {Array} combinerBoxGroups - 汇流箱组配置
 * @returns {number} - 汇流箱总数
 */
function calculateTotalCombinerBoxes(combinerBoxGroups) {
    let total = 0;
    combinerBoxGroups.forEach(group => {
        total += group.count;
    });
    return total;
}

/**
 * 应用颜色到串元素
 * @param {HTMLElement} pvArray - PV阵列容器元素
 * @param {Object} colorMapping - 串索引到颜色的映射
 */
function applyStringColors(pvArray, colorMapping) {
    const stringElements = pvArray.querySelectorAll('.string');
    
    stringElements.forEach(element => {
        const stringIndex = parseInt(element.dataset.index);
        const color = colorMapping[stringIndex];
        
        if (color) {
            element.style.backgroundColor = color.bg;
            element.style.borderColor = color.border;
        }
    });
}

/**
 * 获取汇流箱颜色
 * @param {number} column - 列索引
 * @param {boolean} isConfigMatched - 配置是否匹配
 * @returns {Object} - 颜色对象
 */
function getCombinerBoxColor(column, isConfigMatched) {
    // 在初始状态下，所有汇流箱都使用黄色
    if (!isConfigMatched || !window.groupCalculationActive) {
        return STRING_COLORS[1]; // 默认黄色
    }
    
    // 只有在分组运算模式下才根据列索引分配颜色
    const colorIndex = column % STRING_COLORS.length;
    return STRING_COLORS[colorIndex];
}

/**
 * 计算最优分组并生成分组数组
 * @param {Array} combinerBoxGroups - 汇流箱组配置
 * @param {number} rows - 行数
 * @param {number} columns - 列数
 * @returns {Array} - 二维数组表示所有串的分组
 */
function calculateOptimalGrouping(combinerBoxGroups, rows, columns) {
    console.log(`计算最优分组: 行=${rows}, 列=${columns}`);
    
    // 计算总串数
    const totalStrings = rows * columns * 3; // 每个模块有3个串
    console.log(`总串数: ${totalStrings}`,combinerBoxGroups);
    
    // 创建一维数组形式的串映射，稍后会转换为二维数组
    // 使用蛇形排列，将整个阵列看作一个大的一维数组，初始值为0
    const stringsFlat = Array(totalStrings).fill(0);
    
    // 获取每个汇流箱组的串数量和配置信息
    console.log('汇流箱组配置:');
    let stringIndex = 0;
    
    // 为每个汇流箱组分配ID和串数
    for (let groupIndex = 0, boxIndex = 0; groupIndex < combinerBoxGroups.length; groupIndex++) {
        const group = combinerBoxGroups[groupIndex];
        let groupId = groupIndex + 1; // 组ID从1开始
        // 为该组中的每个汇流箱单独分配
        for (let currentBoxIdex=0;currentBoxIdex < group.count;currentBoxIdex++ ) {
            // 为当前汇流箱分配串
            for (let stringInBox = 0; stringInBox < group.stringsPerBox; stringInBox++) {
                if (stringIndex < totalStrings) { // 如果串索引小于总串数
                    stringsFlat[stringIndex] = boxIndex;
                    stringIndex++;
                }
                
            }
            boxIndex++
            console.log(`组#${groupId}: 汇流箱#${boxIndex}, ${stringIndex} `);
        
        }
        
    }
    
    console.log('stringsFlat',stringsFlat);

    
    // 将一维数组转换为二维数组，表示实际布局
    // 先按照3
    const width = 3; // 每列有3个串
    const stringArray = [];
    
    // 蛇形排列逻辑: 将一维数组按照蛇形方式填充到二维数组中
    // 思路: 每列宽度为3，从左到右、从上到下进行填充
    for (let i = 0; i < rows*columns; i++) {
        const row = [];
        for (let j = 0; j < width; j++) {
            // 计算一维数组中的索引 - 蛇形排列
            const index = i * width + j;
            if (index < stringsFlat.length) {
                row.push(stringsFlat[index]);
            } else {
                row.push(0); // 超出范围填充0
            }
        }
        stringArray.push(row);
    }
    // 现在需要把stringArray切割成Columns段，然后拼接成 rows行，columns*3列
   
    return transformMatrix(stringArray,columns);
}
/**
 * 将输入矩阵按照规则转换成新矩阵
 * @param {Array} inputMatrix - 输入矩阵，每行是一个数组，可能有多列
 * @param {Number} n - 要分割成的组数
 * @returns {Array} - 转换后的矩阵
 */
function transformMatrix(inputMatrix, n) {
    // 确保输入矩阵是有效的
    if (!inputMatrix || inputMatrix.length === 0) {
      return [];
    }
    
    // 计算每组的大小
    const groupSize = Math.ceil(inputMatrix.length / n);
    
    // 将输入矩阵分成n组
    const groups = [];
    for (let i = 0; i < n; i++) {
      const start = i * groupSize;
      const end = Math.min(start + groupSize, inputMatrix.length);
      if (start < inputMatrix.length) {
        groups.push(inputMatrix.slice(start, end));
      }
    }
    
    // 确定结果矩阵的行数（取最大组的长度）
    const rows = Math.max(...groups.map(group => group.length));
    
    // 创建结果矩阵
    const result = Array(rows).fill().map(() => []);
    
    // 填充结果矩阵
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      
      // 对偶数索引的组进行处理（即第2、4、6...组）
      const processedGroup = i % 2 === 1 ? [...group].reverse() : group;
      
      // 将当前组的元素添加到结果矩阵的相应行中
      for (let j = 0; j < rows; j++) {
        if (j < processedGroup.length) {
          // 获取当前行的所有列值，并将它们添加到结果中
          const rowValues = processedGroup[j];
          result[j].push(...rowValues);
        } else {
          // 如果该行在当前组中没有对应的元素，添加占位符
          // 确定应该添加多少个占位符（使用输入矩阵的第一行作为参考）
          const columnCount = inputMatrix[0].length;
          for (let k = 0; k < columnCount; k++) {
            result[j].push(null);
          }
        }
      }
    }
    
    return result;
  }
/**
 * 应用自定义分组
 * @param {HTMLElement} pvArray - 光伏阵列容器元素
 * @param {Array} combinerBoxGroups - 汇流箱组配置
 * @param {number} totalStrings - 总串数
 * @param {number} rows - 行数
 * @param {number} columns - 列数
 */
function applyCustomGrouping(pvArray, combinerBoxGroups, totalStrings, rows, columns) {
    console.log('应用自定义分组', combinerBoxGroups, totalStrings);
    
    // 检查配置是否匹配
    if (isConfigurationMatched(combinerBoxGroups, totalStrings)) {
        // 计算最优分组
        const arrayGrouping = calculateOptimalGrouping(combinerBoxGroups, rows, columns);
        
        // 在控制台输出分组数组
        console.log('分组结果 (arrayGrouping):');
        
        // 输出每行的更详细信息
        console.log(`总行数: ${arrayGrouping.length}`);
        console.log(`每行列数: ${arrayGrouping[0].length}`);
        
        // 只输出前20行和最后5行以避免控制台溢出
        const maxRowsToShow = 20;
        const maxEndRowsToShow = 5;
        
        if (arrayGrouping.length <= maxRowsToShow + maxEndRowsToShow) {
            // 如果行数较少，直接全部输出
            arrayGrouping.forEach((row, index) => {
                console.log(`行 ${index+1}: ${JSON.stringify(row)}`);
            });
        } else {
            // 输出前maxRowsToShow行
            for (let i = 0; i < maxRowsToShow; i++) {
                console.log(`行 ${i+1}: ${JSON.stringify(arrayGrouping[i])}`);
            }
            
            console.log('...... (中间行省略) ......');
            
            // 输出最后maxEndRowsToShow行
            for (let i = arrayGrouping.length - maxEndRowsToShow; i < arrayGrouping.length; i++) {
                console.log(`行 ${i+1}: ${JSON.stringify(arrayGrouping[i])}`);
            }
        }
        
        // 将分组数组保存到全局变量和DOM属性中
        window.arrayGrouping = arrayGrouping;
        pvArray.dataset.arrayGroupingJson = JSON.stringify(arrayGrouping);
        
        console.log('已生成并保存分组数据，用于汇流箱位置优化');
        
        // 根据分组结果设置颜色映射
        const colorMapping = {};
        const stringsPerModule = 3; // 每个模块有3个串
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                for (let s = 0; s < stringsPerModule; s++) {
                    const moduleIndex = row * columns + col;
                    const stringIndex = moduleIndex * stringsPerModule + s;
                    const colOffset = col * 3 + s;
                    
                    if (row < arrayGrouping.length && colOffset < arrayGrouping[0].length) {
                        const groupId = arrayGrouping[row][colOffset];
                        // 使用组ID来选择颜色（对应颜色数组的索引）
                        const colorIndex = (groupId - 1) % STRING_COLORS.length;
                        colorMapping[stringIndex] = STRING_COLORS[colorIndex];
                    }
                }
            }
        }
        
        // 应用颜色
        applyStringColors(pvArray, colorMapping);
        
        // 输出分组统计信息
        const groupCounts = {};
        arrayGrouping.forEach(row => {
            row.forEach(groupId => {
                if (!groupCounts[groupId]) {
                    groupCounts[groupId] = 0;
                }
                groupCounts[groupId]++;
            });
        });
        
        console.log('分组统计:');
        for (const [groupId, count] of Object.entries(groupCounts)) {
            console.log(`组 #${groupId}: ${count}串`);
        }
    } else {
        // 如果配置不匹配，使用默认颜色映射
        const colorMapping = getDefaultColorMapping(totalStrings);
        applyStringColors(pvArray, colorMapping);
    }
    
    // 添加数据属性以标识当前是在自定义分组模式
    pvArray.dataset.customGrouping = 'true';
}

/**
 * 初始化串颜色
 * @param {HTMLElement} pvArray - PV阵列容器元素
 * @param {Array} combinerBoxGroups - 汇流箱组配置
 * @param {number} totalStrings - 总串数
 */
function initStringColors(pvArray, combinerBoxGroups, totalStrings) {
    console.log('初始化串颜色（每3列一组）', combinerBoxGroups, totalStrings);
    
    // 获取当前布局参数
    const rowInput = document.getElementById('row-input');
    const columnInput = document.getElementById('column-input');
    
    if (!rowInput || !columnInput) {
        console.error('无法获取行列输入元素');
        return;
    }
    
    const rows = parseInt(rowInput.value);
    const columns = parseInt(columnInput.value);
    
    const colorMapping = getStringColorMapping(combinerBoxGroups, totalStrings, rows, columns);
    applyStringColors(pvArray, colorMapping);
}

/**
 * 生成串数组表示
 * @param {number} rows - 行数
 * @param {number} columns - 列数
 * @returns {Array} - 二维数组表示所有串
 */
function generateStringArray(rows, columns) {
    // 计算数组大小：【列×3】× 行
    const width = columns * 3; // 每列有3个串
    const height = rows;
    console.log(`生成串数组: ${width} × ${height}`);
    
    // 创建二维数组并初始化为1
    const stringArray = [];
    for (let i = 0; i < height; i++) {
        const row = [];
        for (let j = 0; j < width; j++) {
            row.push(1);
        }
        stringArray.push(row);
    }
    
    return stringArray;
}

/**
 * 显示串数组在调试栏
 * @param {Array} stringArray - 串数组
 */
function displayStringArray(stringArray) {
    console.log('串数组内容:');
    stringArray.forEach((row, index) => {
        console.log(`行 ${index+1}: ${JSON.stringify(row)}`);
    });
}

/**
 * 更新串颜色
 * @param {HTMLElement} pvArray - PV阵列容器元素
 * @param {Array} combinerBoxGroups - 汇流箱组配置
 * @param {number} totalStrings - 总串数
 */
function updateStringColors(pvArray, combinerBoxGroups, totalStrings) {
    // 检查是否处于自定义分组模式
    if (pvArray.dataset.customGrouping === 'true') {
        // 获取当前布局参数
        const rowInput = document.getElementById('row-input');
        const columnInput = document.getElementById('column-input');
        
        if (!rowInput || !columnInput) {
            console.error('无法获取行列输入元素');
            return;
        }
        
        const rows = parseInt(rowInput.value);
        const columns = parseInt(columnInput.value);
        
        applyCustomGrouping(pvArray, combinerBoxGroups, totalStrings, rows, columns);
    } else {
        initStringColors(pvArray, combinerBoxGroups, totalStrings);
    }
}

/**
 * 检查配置是否匹配
 * @param {Array} combinerBoxGroups - 汇流箱组配置
 * @param {number} totalStrings - 总串数
 * @returns {boolean} - 是否匹配
 */
function checkConfigurationMatch(combinerBoxGroups, totalStrings) {
    return isConfigurationMatched(combinerBoxGroups, totalStrings);
}

// 确保导出新函数
window.StringColoring = {
    initStringColors,
    updateStringColors,
    getStringColorMapping,
    getCombinerBoxColor,
    checkConfigurationMatch,
    applyCustomGrouping,
    generateStringArray,
    displayStringArray,
    calculateOptimalGrouping
}; 