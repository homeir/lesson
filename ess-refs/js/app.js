/**
 * ESS Project Reference Database
 * Using Cheetah Grid for display and editing
 * Interacting with API via TreeQL interface
 */

// Global variables
let grid;
let gridData = [];
let originalData = [];
let changedRows = new Set();

// API URL
const API_URL = 'https://oska-api.yunxing.hu/records/ess_projects';

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    initGrid();
    await fetchData();
    setupEventListeners();
});

// Initialize grid
function initGrid() {
    const gridElement = document.getElementById('grid');
    
    // Define grid columns
    const columns = [
        {
            field: 'id',
            caption: 'ID',
            width: 60
        },
        {
            field: 'ess_count',
            caption: 'ESS Count',
            width: 80,
            columnType: 'number'
        }
    /**,
        {
            field: 'project_name',
            caption: 'Project Name',
            width: 300,
            sort: true,
            editor: 'text'
        },
        {
            field: 'project_application',
            caption: 'Application',
            width: 100,
            sort: true,
            editor: {
                type: 'select',
                options: [
                    {value: 'Utility', label: 'Utility'},
                    {value: 'C&I', label: 'C&I'}
                ]
            }
        },
        {
            field: 'area',
            caption: 'Area',
            width: 100,
            sort: true,
            editor: {
                type: 'select',
                options: [
                    {value: 'China', label: 'China'},
                    {value: 'APAC', label: 'APAC'},
                    {value: 'MEA', label: 'MEA'},
                    {value: 'Europe', label: 'Europe'},
                    {value: 'America', label: 'America'}
                ]
            }
        },
        {
            field: 'country_city',
            caption: 'Country/City',
            width: 120,
            sort: true,
            editor: 'text'
        },
        {
            field: 'mw',
            caption: 'MW',
            width: 80,
            sort: true,
            editor: 'number',
            format: value => formatNumber(value)
        },
        {
            field: 'mwh',
            caption: 'MWh',
            width: 80,
            sort: true,
            editor: 'number',
            format: value => formatNumber(value)
        },
        {
            field: 'battery_supplier',
            caption: 'Battery Supplier',
            width: 200,
            sort: true,
            editor: 'text'
        },
        {
            field: 'battery_chemistry',
            caption: 'Chemistry',
            width: 80,
            sort: true,
            editor: {
                type: 'select',
                options: [
                    {value: 'LFP', label: 'LFP'}
                ]
            }
        },
        {
            field: 'pcs_model',
            caption: 'PCS Model',
            width: 100,
            sort: true,
            editor: 'text'
        },
        {
            field: 'pcs_numbers',
            caption: 'PCS Qty',
            width: 80,
            sort: true,
            editor: 'number'
        },
        {
            field: 'ess_model1',
            caption: 'ESS Model 1',
            width: 120,
            sort: true,
            editor: 'text'
        },
        {
            field: 'ess_model2',
            caption: 'ESS Model 2',
            width: 120,
            sort: true,
            editor: 'text'
        },
        {
            field: 'ess_numbers1',
            caption: 'ESS Qty 1',
            width: 80,
            sort: true,
            editor: 'number'
        },
        {
            field: 'ess_numbers2',
            caption: 'ESS Qty 2',
            width: 80,
            sort: true,
            editor: 'number'
        },
        {
            field: 'altitude',
            caption: 'Altitude',
            width: 100,
            sort: true,
            editor: 'text'
        },
        {
            field: 'min_temperature',
            caption: 'Min Temp',
            width: 80,
            sort: true,
            editor: 'text'
        },
        {
            field: 'max_temperature',
            caption: 'Max Temp',
            width: 80,
            sort: true,
            editor: 'text'
        },
        {
            field: 'contract_time',
            caption: 'Contract Date',
            width: 120,
            sort: true,
            editor: 'text'
        },
        {
            field: 'crm_or_c4',
            caption: 'CRM/C4',
            width: 140,
            sort: true,
            editor: 'text'
        },
        {
            field: 'client',
            caption: 'Client',
            width: 200,
            sort: true,
            editor: 'text'
        },
        {
            field: 'tech_support',
            caption: 'Tech Support',
            width: 100,
            sort: true,
            editor: 'text'
        }
            */
    ];

    // Create grid instance with initial empty data
    grid = new cheetahGrid.ListGrid({
        parentElement: gridElement,
        columns: columns,
        frozenColCount: 1,
        defaultRowHeight: 40,
        headerRowHeight: 45,
        records: [], // Initialize with empty array
        theme: {
            borderColor: '#ddd',
            textAlign: 'left',
            color: '#333',
            frozenRowsBgColor: '#f8f8f8',
            selectionBgColor: 'rgba(50, 150, 250, 0.1)'
        }
    });

    // Listen for cell value changes
    grid.listen('CHANGED_VALUE', (e) => {
        const { row, field, value } = e;
        if (gridData[row]) {
            gridData[row][field] = value;
            changedRows.add(row);
            updateGridData();
        }
    });
}

// Format numbers
function formatNumber(num) {
    if (num === null || num === undefined) return '';
    return Number(num).toFixed(2);
}

// Update grid data
function updateGridData() {
    if (grid && gridData) {
        grid.records = gridData;
        console.log('updateGridData gridData', gridData);
    }
}

// Fetch data
async function fetchData() {
    try {
        const response = await fetch(API_URL);
        console.log('fetchData response', response);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fetched data:', data);
        
        if (data && data.records && Array.isArray(data.records)) {
            // Save original data for comparison
            originalData = JSON.parse(JSON.stringify(data.records));
            gridData = data.records;
            
            // Update grid with new data
            updateGridData();
            
            // Reset change tracking
            changedRows.clear();
            
            console.log('Data loaded successfully', gridData);
        } else {
            throw new Error('Invalid data format received from API');
        }
    } catch (error) {
        console.error('Failed to fetch data:', error);
        alert('Failed to fetch data. Please check network connection or API status.');
    }
}

// Save data
async function saveData() {
    if (changedRows.size === 0) {
        alert('No changes to save');
        return;
    }
    
    try {
        const changedData = Array.from(changedRows).map(rowIndex => gridData[rowIndex]);
        
        // Save each changed row
        for (const row of changedData) {
            if (!row || !row.id) {
                console.error('Invalid row data:', row);
                continue;
            }
            
            const response = await fetch(`${API_URL}/${row.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(row)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save data for ID ${row.id}: ${response.status}`);
            }
        }
        
        alert('Changes saved successfully');
        
        // Refresh data
        await fetchData();
    } catch (error) {
        console.error('Failed to save data:', error);
        alert(`Failed to save data: ${error.message}`);
    }
}

// Add new project
async function addNewProject() {
    const newProject = {
        ess_count: 0,
        project_name: 'New Project',
        project_application: 'Utility',
        area: '',
        country_city: '',
        mw: 0,
        mwh: 0,
        battery_supplier: '',
        battery_chemistry: 'LFP',
        pcs_model: '',
        pcs_numbers: 0,
        ess_model1: '',
        ess_model2: '',
        ess_numbers1: 0,
        ess_numbers2: 0,
        altitude: '',
        min_temperature: '',
        max_temperature: '',
        contract_time: '',
        crm_or_c4: '',
        client: '',
        tech_support: ''
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
            throw new Error(`Failed to add project: ${response.status}`);
        }
        
        alert('Project added successfully');
        
        // Refresh data
        await fetchData();
    } catch (error) {
        console.error('Failed to add project:', error);
        alert(`Failed to add project: ${error.message}`);
    }
}

// Export to Excel
function exportToExcel() {
    // Create CSV content
    const headers = grid.header.map(col => col.caption).join(',');
    const rows = gridData.map(row => {
        return grid.header
            .map(col => {
                const value = row[col.field];
                return `"${value !== null && value !== undefined ? value : ''}"`;
            })
            .join(',');
    });
    
    const csv = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ess_projects.csv';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Setup event listeners
function setupEventListeners() {
    // Add button
    document.getElementById('addButton').addEventListener('click', addNewProject);
    
    // Save button
    document.getElementById('saveButton').addEventListener('click', saveData);
    
    // Refresh button
    document.getElementById('refreshButton').addEventListener('click', fetchData);
    
    // Export button
    document.getElementById('exportButton').addEventListener('click', exportToExcel);
    
    // Window resize handler
    window.addEventListener('resize', () => {
        if (grid) {
            grid.updateSize();
        }
    });
} 