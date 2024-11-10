// Global variables
let playerData = [];
let visibleColumns = [];
let currentSort = { column: null, direction: 'asc' };

// DOM Elements
const table = document.getElementById('playerStatsTable');
const thead = table.querySelector('thead tr');
const tbody = table.querySelector('tbody');
const positionFilter = document.getElementById('positionFilter');
const teamFilter = document.getElementById('teamFilter');
const playerSearch = document.getElementById('playerSearch');
const columnSelector = document.getElementById('columnSelector');
const loadingSpinner = document.getElementById('loadingSpinner');

// Default columns configuration
const defaultColumns = [
    'player',
    'pos',
    'team',
    'min',
    'usage',
    'pts',
    'reb',
    'ast',
    'stl',
    'blk'
];

// Column display names mapping
const columnDisplayNames = {
    rank: 'Rank',
    player: 'Player Name',
    pos: 'POS',
    team: 'Team',
    min: 'MPG',
    usage: 'USG%',
    pts: 'PPG',
    reb: 'RPG',
    ast: 'APG',
    stl: 'SPG',
    blk: 'BPG',
    fgm: 'FGM',
    fga: 'FGA',
    ftm: 'FTM',
    fta: 'FTA',
    fg: 'FG%',
    ft: 'FT%',
    tov: 'TOV',
    ballhog: 'Ball Hog Rating'
};

// Stat thresholds for visual feedback
const statThresholds = {
    pts: { excellent: 25, good: 20, average: 15 },
    reb: { excellent: 10, good: 7, average: 5 },
    ast: { excellent: 8, good: 5, average: 3 },
    stl: { excellent: 2, good: 1.5, average: 1 },
    blk: { excellent: 2, good: 1, average: 0.5 },
    fg: { excellent: 0.55, good: 0.48, average: 0.44 }
};

// Show loading spinner
function showLoadingSpinner() {
    if (loadingSpinner) {
        loadingSpinner.classList.remove('hidden');
    }
}

// Hide loading spinner
function hideLoadingSpinner() {
    if (loadingSpinner) {
        loadingSpinner.classList.add('hidden');
    }
}

// Error handling
function showError(message) {
    console.error(message);
    // Create error toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-red-50 border-l-4 border-red-500 p-4 shadow-lg rounded';
    toast.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
            </div>
            <div class="ml-3">
                <p class="text-sm text-red-700">${message}</p>
            </div>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Fetch player data from API
async function fetchPlayerData() {
    try {
        const response = await fetch('/api/players');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched data:', data);
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        throw new Error('Failed to fetch player data: ' + error.message);
    }
}

// Initialize page content
async function initializePage() {
    showLoadingSpinner();
    try {
        playerData = await fetchPlayerData();
        console.log('Fetched player data:', playerData);
        
        if (!Array.isArray(playerData) || playerData.length === 0) {
            throw new Error('No player data received or invalid data format');
        }
        
        // Initialize visible columns with defaults
        visibleColumns = [...defaultColumns];
        
        // Set up UI components
        setupColumnSelector();
        populateFilters();
        setupEventListeners();
        
        // Initial table render with all data
        filterAndUpdateTable();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize page: ' + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

// Set up column selector checkboxes
function setupColumnSelector() {
    columnSelector.innerHTML = '';
    // Get all available columns from the first player object
    const availableColumns = playerData.length > 0 ? Object.keys(playerData[0]) : defaultColumns;
    
    availableColumns.forEach(column => {
        const div = document.createElement('div');
        div.className = 'flex items-center';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `col-${column}`;
        checkbox.checked = defaultColumns.includes(column);
        checkbox.className = 'form-checkbox h-4 w-4 text-ballhog-orange rounded border-gray-300';
        checkbox.addEventListener('change', () => toggleColumn(column, checkbox.checked));
        
        const label = document.createElement('label');
        label.htmlFor = `col-${column}`;
        label.className = 'ml-2 text-sm text-gray-700';
        label.textContent = columnDisplayNames[column] || column.toUpperCase();
        
        div.appendChild(checkbox);
        div.appendChild(label);
        columnSelector.appendChild(div);
    });
}

// Populate filter dropdowns
function populateFilters() {
    const positions = new Set();
    const teams = new Set();

    playerData.forEach(player => {
        if (player.pos) positions.add(player.pos);
        if (player.team) teams.add(player.team);
    });

    populateFilterOptions(positionFilter, positions);
    populateFilterOptions(teamFilter, teams);
}

// Helper function to populate filter dropdowns
function populateFilterOptions(selectElement, options) {
    const currentValue = selectElement.value;
    selectElement.innerHTML = '<option value="">All</option>';
    [...options].sort().forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        selectElement.appendChild(optionElement);
    });
    selectElement.value = currentValue;
}

// Set up event listeners
function setupEventListeners() {
    positionFilter.addEventListener('change', filterAndUpdateTable);
    teamFilter.addEventListener('change', filterAndUpdateTable);
    playerSearch.addEventListener('input', debounce(filterAndUpdateTable, 300));
    
    thead.addEventListener('click', (e) => {
        const th = e.target.closest('th');
        if (th && th.dataset.column) {
            sortTable(th.dataset.column);
        }
    });
}

// Toggle column visibility
function toggleColumn(column, visible) {
    if (visible && !visibleColumns.includes(column)) {
        visibleColumns.push(column);
    } else if (!visible) {
        visibleColumns = visibleColumns.filter(col => col !== column);
    }
    updateTableWithData(playerData);
}

// Filter and update table
function filterAndUpdateTable() {
    const position = positionFilter.value.toLowerCase();
    const team = teamFilter.value.toLowerCase();
    const searchTerm = playerSearch.value.toLowerCase();

    const filteredData = playerData.filter(player => {
        const matchesPosition = !position || (player.pos && player.pos.toLowerCase() === position);
        const matchesTeam = !team || (player.team && player.team.toLowerCase() === team);
        const matchesSearch = !searchTerm || 
            (player.player && player.player.toLowerCase().includes(searchTerm)) || 
            (player.team && player.team.toLowerCase().includes(searchTerm));
        
        return matchesPosition && matchesTeam && matchesSearch;
    });

    updateTableWithData(filteredData);
}

// Update table with data
function updateTableWithData(data) {
    console.log('Updating table with data:', data);
    
    // Update headers
    thead.innerHTML = '';
    visibleColumns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = columnDisplayNames[column] || column;
        th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100';
        th.dataset.column = column;
        
        if (currentSort.column === column) {
            th.classList.add(`sorted-${currentSort.direction}`);
        }
        
        thead.appendChild(th);
    });

    // Update rows
    tbody.innerHTML = '';
    if (!Array.isArray(data)) {
        console.error('Data is not an array:', data);
        return;
    }

    data.forEach(player => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        visibleColumns.forEach(column => {
            const cell = document.createElement('td');
            const value = player[column] ?? '-';
            cell.textContent = formatValue(value, column);
            cell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';
            
            // Add color coding for stats
            if (statThresholds[column]) {
                const thresholds = statThresholds[column];
                const numValue = parseFloat(value);
                if (numValue >= thresholds.excellent) {
                    cell.classList.add('stat-excellent');
                } else if (numValue >= thresholds.good) {
                    cell.classList.add('stat-good');
                } else if (numValue >= thresholds.average) {
                    cell.classList.add('stat-average');
                }
            }
            
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
}

// Format cell values
function formatValue(value, column) {
    if (value === null || value === undefined) return '-';
    
    // Handle percentage values
    if (['fg', 'ft', 'usage'].includes(column)) {
        return `${(parseFloat(value) * 100).toFixed(1)}%`;
    }
    
    // Handle numeric values
    if (!isNaN(value) && typeof value !== 'boolean') {
        return parseFloat(value).toFixed(1);
    }
    
    return value;
}

// Sort table
function sortTable(column) {
    const direction = currentSort.column === column && currentSort.direction === 'asc' ? 'desc' : 'asc';
    currentSort = { column, direction };

    const sortedData = [...playerData].sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        // Handle numerical sorting
        if (!isNaN(aVal) && !isNaN(bVal)) {
            aVal = parseFloat(aVal);
            bVal = parseFloat(bVal);
        }

        if (direction === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });

    updateTableWithData(sortedData);
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize the page when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);