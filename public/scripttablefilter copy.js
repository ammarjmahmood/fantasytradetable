// Global variables
let playerData = [];
let visibleColumns = [];
let currentSort = { column: null, direction: 'asc' };
let currentRanking = null;

// DOM Elements
const table = document.getElementById('playerStatsTable');
const thead = table?.querySelector('thead tr');
const tbody = table?.querySelector('tbody');
const positionFilter = document.getElementById('positionFilter');
const teamFilter = document.getElementById('teamFilter');
const playerSearch = document.getElementById('playerSearch');
const columnSelector = document.getElementById('columnSelector');
const loadingSpinner = document.getElementById('loadingSpinner');
const statRankingFilter = document.getElementById('statRankingFilter');

// Default columns configuration
const defaultColumns = [
    'rank',
    'player',
    'min',
    'fgm',
    'fga',
    'fgp',
    'ftm',
    'fta',
    'ftp',
    'tpm',
    'pts',
    'reb',
    'ast',
    'stl'
];

// Column display names mapping
const columnDisplayNames = {
    rank: '#',
    player: 'Player',
    min: 'MIN',
    fgm: 'FGM',
    fga: 'FGA',
    fgp: 'FG%',
    ftm: 'FTM',
    fta: 'FTA',
    ftp: 'FT%',
    tpm: '3PTM',
    pts: 'PTS',
    reb: 'REB',
    ast: 'AST',
    stl: 'STL'
};

// Validate DOM elements
function validateDOMElements() {
    const requiredElements = [
        { element: table, name: 'playerStatsTable' },
        { element: thead, name: 'thead tr' },
        { element: tbody, name: 'tbody' },
        { element: positionFilter, name: 'positionFilter' },
        { element: teamFilter, name: 'teamFilter' },
        { element: playerSearch, name: 'playerSearch' },
        { element: columnSelector, name: 'columnSelector' },
        { element: statRankingFilter, name: 'statRankingFilter' }
    ];

    const missingElements = requiredElements
        .filter(({ element }) => !element)
        .map(({ name }) => name);

    if (missingElements.length > 0) {
        throw new Error(`Missing required DOM elements: ${missingElements.join(', ')}`);
    }
}

// Show/hide loading spinner
function toggleLoadingSpinner(show) {
    if (loadingSpinner) {
        loadingSpinner.classList.toggle('hidden', !show);
    }
}

// Error handling with toast notifications
function showError(message) {
    console.error(message);
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Fetch player data from API
async function fetchPlayerData() {
    try {
        toggleLoadingSpinner(true);
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
    } finally {
        toggleLoadingSpinner(false);
    }
}

// Initialize page
async function initializePage() {
    try {
        validateDOMElements();
        
        playerData = await fetchPlayerData();
        console.log('Fetched player data:', playerData);

        if (!Array.isArray(playerData) || playerData.length === 0) {
            throw new Error('No player data received or invalid data format');
        }

        visibleColumns = [...defaultColumns];

        setupColumnSelector();
        populateFilters();
        setupEventListeners();

        filterAndUpdateTable();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize page: ' + error.message);
    }
}

// Set up event listeners
function setupEventListeners() {
    positionFilter.addEventListener('change', filterAndUpdateTable);
    teamFilter.addEventListener('change', filterAndUpdateTable);
    playerSearch.addEventListener('input', debounce(filterAndUpdateTable, 300));
    
    if (statRankingFilter) {
        statRankingFilter.addEventListener('change', (e) => {
            currentRanking = e.target.value;
            filterAndUpdateTable();
        });
    }

    thead.addEventListener('click', (e) => {
        const th = e.target.closest('th');
        if (th && th.dataset.column) {
            const column = th.dataset.column;
            const newDirection = currentSort.column === column && currentSort.direction === 'asc' ? 'desc' : 'asc';
            currentSort = { column, direction: newDirection };
            filterAndUpdateTable();
        }
    });
}

// Setup column selector
function setupColumnSelector() {
    if (!columnSelector) return;

    columnSelector.innerHTML = '';
    Object.entries(columnDisplayNames).forEach(([column, displayName]) => {
        const div = document.createElement('div');
        div.className = 'flex items-center mb-2';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `col-${column}`;
        checkbox.checked = defaultColumns.includes(column);
        checkbox.className = 'form-checkbox h-4 w-4 text-orange-500 rounded border-gray-300';
        checkbox.addEventListener('change', () => toggleColumn(column, checkbox.checked));

        const label = document.createElement('label');
        label.htmlFor = `col-${column}`;
        label.className = 'ml-2 text-sm text-white';
        label.textContent = displayName;

        div.appendChild(checkbox);
        div.appendChild(label);
        columnSelector.appendChild(div);
    });
}

// Populate filters
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
    if (!selectElement) return;

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

// Toggle column visibility
function toggleColumn(column, visible) {
    if (visible && !visibleColumns.includes(column)) {
        visibleColumns.push(column);
    } else if (!visible) {
        visibleColumns = visibleColumns.filter(col => col !== column);
    }
    filterAndUpdateTable();
}

// Filter and update table
function filterAndUpdateTable() {
    try {
        const position = positionFilter.value.toLowerCase();
        const team = teamFilter.value.toLowerCase();
        const searchTerm = playerSearch.value.toLowerCase();

        let filteredData = playerData.filter(player => {
            const matchesPosition = !position || (player.pos && player.pos.toLowerCase() === position);
            const matchesTeam = !team || (player.team && player.team.toLowerCase() === team);
            const matchesSearch = !searchTerm || 
                (player.player && player.player.toLowerCase().includes(searchTerm)) || 
                (player.team && player.team.toLowerCase().includes(searchTerm));

            return matchesPosition && matchesTeam && matchesSearch;
        });

        // Apply sorting
        if (currentSort.column) {
            filteredData.sort((a, b) => {
                let aVal = a[currentSort.column];
                let bVal = b[currentSort.column];

                // Handle numerical sorting
                if (!isNaN(aVal) && !isNaN(bVal)) {
                    aVal = parseFloat(aVal);
                    bVal = parseFloat(bVal);
                }

                if (currentSort.direction === 'asc') {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });
        }

        updateTableWithData(filteredData);
    } catch (error) {
        console.error('Error filtering table:', error);
        showError('Failed to update table with filters');
    }
}

// Update table with data
function updateTableWithData(data) {
    try {
        // Update headers
        thead.innerHTML = '';
        visibleColumns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = columnDisplayNames[column];
            th.className = 'text-sm text-gray-300 font-medium px-4 py-3 text-center';
            if (column === 'player') {
                th.className += ' text-left';
            }
            th.dataset.column = column;
            thead.appendChild(th);
        });

        // Update rows
        tbody.innerHTML = '';
        data.forEach((player, index) => {
            const row = document.createElement('tr');
            row.className = 'bg-[#3d4675] mb-2 hover:translate-x-2 transition-transform duration-200';

            visibleColumns.forEach(column => {
                const cell = document.createElement('td');
                
                if (column === 'rank') {
                    cell.className = 'text-xl font-bold text-white px-4 py-4';
                    cell.textContent = (index + 1);
                }
                else if (column === 'player') {
                    // Format the player name for the image path with capital first and last letters
                    const nameParts = player.player.split(' ');
                    const firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
                    const lastName = nameParts[nameParts.length - 1].charAt(0).toUpperCase() + nameParts[nameParts.length - 1].slice(1).toLowerCase();
                    const imageFileName = `${firstName}-${lastName}.jpg`;

                    cell.className = 'px-4 py-4';
                    cell.innerHTML = `
                        <div class="flex items-center">
                            <img src="/public/nbaheadshots/player_images/${imageFileName}" 
                                 alt="${player.player}"
                                 class="w-12 h-12 rounded-lg mr-4 object-cover"
                                 onerror="this.src='/public/nbaheadshots/player_images/default-player.jpg'">
                            <div>
                                <div class="font-semibold text-white text-base">
                                    ${player.player}
                                </div>
                                <div class="text-gray-300 text-sm">
                                    ${player.team} - ${player.pos}
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    cell.className = 'px-4 py-4 text-center text-white';
                    cell.textContent = formatValue(player[column], column);
                }
                
                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error updating table:', error);
        showError('Failed to update table display');
    }
}

// Format cell values
function formatValue(value, column) {
    if (value === null || value === undefined) return '-';

    // Handle percentage values
    if (['fgp', 'ftp'].includes(column)) {
        const numValue = parseFloat(value);
        return !isNaN(numValue) ? `${(numValue * 100).toFixed(1)}%` : value;
    }

    // Handle numeric values
    if (!isNaN(value) && typeof value !== 'boolean') {
        return parseFloat(value).toFixed(1);
    }

    return value;
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);