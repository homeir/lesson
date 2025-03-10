/**
 * ESS项目信息管理系统
 * 使用Cheetah Grid显示和编辑项目数据
 * 通过treeql接口与API交互
 */

// 全局变量
let grid;
let gridData = [];
let originalData = [];
let changedRows = new Set();

// API URL
const API_URL = 'https://oska-api.yunxing.hu/records/ess_projects';

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    initGrid();
    fetchData();
    setupEventListeners();
});

// 初始化表格
function initGrid() {
    const gridElement = document.getElementById('grid');
    
    // 定义表格列
    const columns = [
        {
            field: 'id',
            caption: 'ID',
            width: 80,
            sort: true,
            readonly: true
        },
        {
            field: 'project_name',
            caption: '项目名称',
            width: 200,
            sort: true,
            editor: 'text'
        },
        {
            field: 'project_code',
            caption: '项目代码',
            width: 120,
            sort: true,
            editor: 'text'
        },
        {
            field: 'client_name',
            caption: '客户名称',
            width: 150,
            sort: true,
            editor: 'text'
        },
        {
            field: 'start_date',
            caption: '开始日期',
            width: 120,
            sort: true,
            editor: 'text',
            format: value => formatDate(value)
        },
        {
            field: 'end_date',
            caption: '结束日期',
            width: 120,
            sort: true,
            editor: 'text',
            format: value => formatDate(value)
        },
        {
            field: 'budget',
            caption: '预算(元)',
            width: 120,
            sort: true,
            editor: 'number',
            format: value => formatNumber(value)
        },
        {
            field: 'status',
            caption: '状态',
            width: 100,
            sort: true,
            editor: {
                type: 'select',
                options: [
                    {value: '进行中', label: '进行中'},
                    {value: '已完成', label: '已完成'},
                    {value: '已暂停', label: '已暂停'},
                    {value: '已取消', label: '已取消'}
                ]
            }
        },
        {
            field: 'manager',
            caption: '项目经理',
            width: 120,
            sort: true,
            editor: 'text'
        },
        {
            field: 'description',
            caption: '描述',
            width: 200,
            sort: true,
            editor: 'text'
        }
    ];

    // 创建表格实例
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

    // 监听单元格值变化
    grid.listen('CHANGED_VALUE', (e) => {
        const { row, field, value } = e;
        gridData[row][field] = value;
        changedRows.add(row);
    });
}

// 格式化日期
function formatDate(dateStr) {
    if (!dateStr) return '';
    
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        return date.toISOString().split('T')[0];
    } catch (e) {
        return dateStr;
    }
}

// 格式化数字
function formatNumber(num) {
    if (num === null || num === undefined) return '';
    return Number(num).toLocaleString('zh-CN');
}

// 获取数据
async function fetchData() {
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 保存原始数据用于比较
        originalData = JSON.parse(JSON.stringify(data));
        gridData = data;
        
        // 更新表格数据
        grid.data = gridData;
        
        // 重置变更记录
        changedRows.clear();
        
        console.log('数据加载成功', data);
    } catch (error) {
        console.error('获取数据失败:', error);
        alert('获取数据失败，请检查网络连接或API状态');
    }
}

// 保存数据
async function saveData() {
    if (changedRows.size === 0) {
        alert('没有需要保存的更改');
        return;
    }
    
    try {
        const changedData = Array.from(changedRows).map(rowIndex => gridData[rowIndex]);
        
        // 对每个更改的行进行保存
        for (const row of changedData) {
            const response = await fetch(`${API_URL}/${row.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(row)
            });
            
            if (!response.ok) {
                throw new Error(`保存ID为${row.id}的数据失败: ${response.status}`);
            }
        }
        
        alert('保存成功');
        
        // 重新获取数据
        await fetchData();
    } catch (error) {
        console.error('保存数据失败:', error);
        alert(`保存数据失败: ${error.message}`);
    }
}

// 添加新项目
async function addNewProject() {
    const newProject = {
        project_name: '新项目',
        project_code: '',
        client_name: '',
        start_date: formatDate(new Date()),
        end_date: '',
        budget: 0,
        status: '进行中',
        manager: '',
        description: ''
    };
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newProject)
        });
        
        if (!response.ok) {
            throw new Error(`添加项目失败: ${response.status}`);
        }
        
        alert('添加项目成功');
        
        // 重新获取数据
        await fetchData();
    } catch (error) {
        console.error('添加项目失败:', error);
        alert(`添加项目失败: ${error.message}`);
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 添加按钮
    document.getElementById('addButton').addEventListener('click', addNewProject);
    
    // 保存按钮
    document.getElementById('saveButton').addEventListener('click', saveData);
    
    // 刷新按钮
    document.getElementById('refreshButton').addEventListener('click', fetchData);
    
    // 窗口大小变化时调整表格大小
    window.addEventListener('resize', () => {
        if (grid) {
            grid.updateSize();
        }
    });
} 