// Global variables
let playerData = [];
let visibleColumns = [];
let currentSort = { column: null, direction: 'asc' };

// Add this at the top of scripttablefilter.js, near other constants
const columnDisplayNames = {
    rank: '#',
    player: 'Player',
    pos: 'Position',
    team: 'Team',
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
    stl: 'STL',
    blk: 'BLK',
    to: 'TO',
    usage: 'USG%',
    ballhog: 'Ball Hog Rating',
    total: 'TOTAL'
};

// DOM Elements
const table = document.getElementById('playerStatsTable');
const thead = table?.querySelector('thead');
const tbody = table?.querySelector('tbody');
const positionFilter = document.getElementById('positionFilter');
const teamFilter = document.getElementById('teamFilter');
const playerSearch = document.getElementById('playerSearch');
const columnSelector = document.getElementById('columnSelector');
const loadingSpinner = document.getElementById('loadingSpinner');
const statRankingFilter = document.getElementById('statRankingFilter');
const sortOrderFilter = document.getElementById('sortOrderFilter');

// Column tooltips configuration
const columnTooltips = {
    rank: "Rank",
    player: "Player Name",
    pos: "Position",
    team: "Team",
    ballhog: "Ball Hog Rating",
    usage: "Usage Percentage",
    min: "Minutes",
    fgm: "Field Goal per Minute",
    fga: "Field Goal Average",
    "fg%": "Field Goal Percentage",
    ftm: "Free Throw per Minute",
    fta: "Free Throw Average",
    "ft%": "Free Throw Percentage",
    "3ptm": "Three Pointers Made",
    pts: "Points",
    reb: "Rebounds",
    ast: "Assists",
    stl: "Steals",
    blk: "Blocks",
    to: "Turnovers",
    total: "Total Rating"
};

// Default visible columns
const defaultColumns = [
    'rank',
    'player',
    'pos',
    'team',
    'min',
    'pts',
    'reb',
    'ast',
    'stl',
    'blk',
    'fg%',
    'ft%',
    '3ptm'
];

// Stat thresholds for visual feedback
const statRatings = {
    pts: { elite: 27, veryGood: 23, good: 18, average: 14, belowAverage: 10 },
    reb: { elite: 12, veryGood: 9, good: 7, average: 5, belowAverage: 3 },
    ast: { elite: 9, veryGood: 7, good: 5, average: 3, belowAverage: 2 },
    stl: { elite: 2.2, veryGood: 1.8, good: 1.4, average: 1, belowAverage: 0.6 },
    blk: { elite: 2.2, veryGood: 1.8, good: 1.4, average: 0.8, belowAverage: 0.4 },
    "fg%": { elite: 0.58, veryGood: 0.53, good: 0.48, average: 0.44, belowAverage: 0.40 },
    "ft%": { elite: 0.90, veryGood: 0.85, good: 0.80, average: 0.75, belowAverage: 0.70 },
    "3ptm": { elite: 3.5, veryGood: 2.8, good: 2.2, average: 1.5, belowAverage: 1.0 }
};

// Validate required DOM elements
function validateDOMElements() {
    const requiredElements = [
        { element: table, name: 'playerStatsTable' },
        { element: thead, name: 'thead' },
        { element: tbody, name: 'tbody' },
        { element: positionFilter, name: 'positionFilter' },
        { element: teamFilter, name: 'teamFilter' },
        { element: playerSearch, name: 'playerSearch' },
        { element: columnSelector, name: 'columnSelector' },
        { element: statRankingFilter, name: 'statRankingFilter' },
        { element: sortOrderFilter, name: 'sortOrderFilter' }
    ];

    const missingElements = requiredElements
        .filter(({ element }) => !element)
        .map(({ name }) => name);

    if (missingElements.length > 0) {
        throw new Error(`Missing required DOM elements: ${missingElements.join(', ')}`);
    }
}

// Show/Hide loading spinner
function showLoadingSpinner() {
    if (loadingSpinner) loadingSpinner.classList.remove('hidden');
}

function hideLoadingSpinner() {
    if (loadingSpinner) loadingSpinner.classList.add('hidden');
}

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-message">${message}</span>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Fetch player data from API
async function fetchPlayerData() {
    try {
        const response = await fetch('/api/players');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        showToast('Failed to fetch player data', 'error');
        throw error;
    }
}

// Initialize page
async function initializePage() {
    try {
        validateDOMElements();
        showLoadingSpinner();
        
        playerData = await fetchPlayerData();
        
        if (!Array.isArray(playerData) || playerData.length === 0) {
            throw new Error('No player data received');
        }
        
        visibleColumns = [...defaultColumns];
        
        setupColumnSelector();
        populateFilters();
        setupEventListeners();
        createBackToTopButton();
        
        filterAndUpdateTable();
        showToast('Data loaded successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Set up column selector
function setupColumnSelector() {
    if (!columnSelector) return;
    
    columnSelector.innerHTML = '';
    const availableColumns = Object.keys(columnTooltips);
    
    availableColumns.forEach(column => {
        const div = document.createElement('div');
        div.className = 'checkbox-group';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `col-${column}`;
        checkbox.checked = defaultColumns.includes(column);
        checkbox.className = 'checkbox-input';
        checkbox.addEventListener('change', () => toggleColumn(column, checkbox.checked));
        
        const label = document.createElement('label');
        label.htmlFor = `col-${column}`;
        label.className = 'checkbox-label';
        label.textContent = columnTooltips[column] || column;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        columnSelector.appendChild(div);
    });
}

// Get stat class based on value
function getStatClass(value, statType) {
    if (!statRatings[statType] || value === null || value === undefined) return '';
    
    const ratings = statRatings[statType];
    const numValue = parseFloat(value);
    
    if (numValue >= ratings.elite) return 'stat-elite';
    if (numValue >= ratings.veryGood) return 'stat-very-good';
    if (numValue >= ratings.good) return 'stat-good';
    if (numValue >= ratings.average) return 'stat-average';
    if (numValue >= ratings.belowAverage) return 'stat-below-average';
    return 'stat-not-good';
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
    populateStatRankingFilter();
}

// Populate filter options
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

// Populate stat ranking filter
function populateStatRankingFilter() {
    if (!statRankingFilter) return;

    const stats = Object.keys(columnTooltips).filter(col => 
        ['pts', 'reb', 'ast', 'stl', 'blk', 'fg%', 'ft%', '3ptm', 'min', 'usage', 'ballhog'].includes(col)
    );

    stats.forEach(stat => {
        const option = document.createElement('option');
        option.value = stat;
        option.textContent = columnTooltips[stat];
        statRankingFilter.appendChild(option);
    });
}

// Set up event listeners
function setupEventListeners() {
    try {
        if (positionFilter) {
            positionFilter.addEventListener('change', filterAndUpdateTable);
        }
        if (teamFilter) {
            teamFilter.addEventListener('change', filterAndUpdateTable);
        }
        if (playerSearch) {
            playerSearch.addEventListener('input', debounce(filterAndUpdateTable, 300));
        }
        if (statRankingFilter) {
            statRankingFilter.addEventListener('change', handleStatRankingChange);
        }
        if (sortOrderFilter) {
            sortOrderFilter.addEventListener('change', handleSortOrderChange);
        }
        
        if (thead) {
            thead.addEventListener('click', (e) => {
                const th = e.target.closest('th');
                if (th && th.dataset.column) {
                    sortTable(th.dataset.column);
                }
            });
        }

        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', debounce(handleResize, 250));
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        showToast('Failed to set up event handlers', 'error');
    }
}

// Handle stat ranking change
function handleStatRankingChange() {
    const selectedStat = statRankingFilter.value;
    if (selectedStat) {
        const direction = sortOrderFilter.value || 'desc';
        sortTable(selectedStat, direction);
    }
    filterAndUpdateTable();
}

// Handle sort order change
function handleSortOrderChange() {
    const selectedStat = statRankingFilter.value;
    if (selectedStat) {
        sortTable(selectedStat, sortOrderFilter.value);
    }
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
    try {
        const position = positionFilter?.value.toLowerCase() || '';
        const team = teamFilter?.value.toLowerCase() || '';
        const searchTerm = playerSearch?.value.toLowerCase() || '';

        const filteredData = playerData.filter(player => {
            const matchesPosition = !position || player.pos.toLowerCase() === position;
            const matchesTeam = !team || player.team.toLowerCase() === team;
            const matchesSearch = !searchTerm || 
                player.player.toLowerCase().includes(searchTerm) || 
                player.team.toLowerCase().includes(searchTerm);
            
            return matchesPosition && matchesTeam && matchesSearch;
        });

        updateTableWithData(filteredData);
        
        const totalResults = document.getElementById('totalResults');
        if (totalResults) {
            totalResults.textContent = `Showing ${filteredData.length} players`;
        }
    } catch (error) {
        console.error('Error filtering table:', error);
        showToast('Failed to filter data', 'error');
    }
}

function updateTableWithData(data) {
    try {
        if (!thead || !tbody) return;
        
        // Update headers
        thead.innerHTML = '';
        const headerRow = document.createElement('tr');
        visibleColumns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = columnDisplayNames[column] || column;
            th.dataset.column = column;
            th.title = columnTooltips[column] || column;
            
            if (currentSort.column === column) {
                th.classList.add(`sorted-${currentSort.direction}`);
            }
            
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Update rows
        tbody.innerHTML = '';
        data.forEach((player, index) => {
            const row = document.createElement('tr');
            
            visibleColumns.forEach(column => {
                const cell = document.createElement('td');
                
                if (column === 'rank') {
                    cell.className = 'text-xl font-bold text-white px-4 py-4 sticky-column';
                    cell.textContent = (index + 1);
                }
                else if (column === 'player') {
                    const nameParts = player.player.split(' ');
                    const firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
                    const lastName = nameParts[nameParts.length - 1].charAt(0).toUpperCase() + 
                        nameParts[nameParts.length - 1].slice(1).toLowerCase();
                    const imageFileName = `${firstName}-${lastName}.jpg`;

                    cell.className = 'px-4 py-4 sticky-column';
                    cell.innerHTML = `
                        <div class="flex items-center">
                            <img src="/public/nbaheadshots/player_images/${imageFileName}" 
                                 alt="${player.player}"
                                 onerror="this.src='/public/nbaheadshots/player_images/default-player.jpg'"
                                 loading="lazy">
                            <div>
                                <div class="font-semibold text-white text-base">
                                    ${player.player}
                                </div>
                                <div class="text-gray-300 text-sm">
                                    ${player.team} • ${player.pos}
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    cell.className = 'px-4 py-4 text-center text-white';
                    let value = player[column];
                    
                    // Format percentage values
                    if (column === 'fgp' || column === 'ftp') {
                        value = parseFloat(value);
                        if (!isNaN(value)) {
                            value = `${(value * 100).toFixed(1)}%`;
                        }
                    }
                    // Format decimal values
                    else if (!isNaN(value) && typeof value !== 'boolean') {
                        value = parseFloat(value).toFixed(1);
                    }

                    cell.textContent = value || '-';
                    
                    // Add stat coloring based on value
                    const statClass = getStatClass(value, column);
                    if (statClass) {
                        cell.classList.add(statClass);
                    }
                }
                
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });

        // Hide loading spinner after update
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.classList.add('hidden');
        }

    } catch (error) {
        console.error('Error updating table:', error);
        showToast('Failed to update table', 'error');
        
        // Hide loading spinner on error
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) {
            loadingSpinner.classList.add('hidden');
        }
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

function formatPlayerNameForImage(playerName) {
    const nameParts = playerName.split(' ');
    const firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase();
    const lastName = nameParts[nameParts.length - 1].charAt(0).toUpperCase() + 
        nameParts[nameParts.length - 1].slice(1).toLowerCase();
    return `${firstName}-${lastName}.jpg`;
}

// Sort table
function sortTable(column, direction = null) {
    try {
        direction = direction || (currentSort.column === column && currentSort.direction === 'asc' ? 'desc' : 'asc');
        currentSort = { column, direction };

        const sortedData = [...playerData].sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

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
    } catch (error) {
        console.error('Error sorting table:', error);
        showToast('Failed to sort table', 'error');
    }
}

// Export to CSV
function exportTableToCSV() {
    try {
        if (!tbody) return;

        const rows = Array.from(tbody.querySelectorAll('tr'));
        const csvContent = [
            visibleColumns.map(col => columnTooltips[col] || col).join(','),
            ...rows.map(row => 
                Array.from(row.querySelectorAll('td'))
                    .map(cell => {
                        let content = cell.textContent;
                        return content.includes(',') ? `"${content}"` : content;
                    })
                    .join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'player_stats.csv';
        link.click();

        showToast('Data exported successfully');
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        showToast('Failed to export data', 'error');
    }
}

// Print table
function printTable() {
    try {
        if (!table) return;

        const printWindow = window.open('', '_blank');
        const tableClone = table.cloneNode(true);
        
        const styles = `
            <style>
                table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f8f9fa; }
                .stat-elite { color: #2da44e; font-weight: 600; }
                .stat-very-good { color: #8bcd50; font-weight: 500; }
                .stat-good { color: #b1e474; }
                .stat-average { color: #6B7280; }
                .stat-below-average { color: #e47474; }
                .stat-not-good { color: #d73a4a; }
                @media print {
                    th { background-color: #f8f9fa !important; -webkit-print-color-adjust: exact; }
                }
            </style>
        `;
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Player Statistics</title>
                    ${styles}
                </head>
                <body>
                    <h1>Player Statistics</h1>
                    ${tableClone.outerHTML}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();

        showToast('Print preview opened');
    } catch (error) {
        console.error('Error printing table:', error);
        showToast('Failed to open print preview', 'error');
    }
}

// Handle resize for responsive design
function handleResize() {
    try {
        const tableContainer = document.querySelector('.table-container');
        if (!tableContainer) return;

        if (window.innerWidth <= 768) {
            tableContainer.classList.add('mobile-view');
        } else {
            tableContainer.classList.remove('mobile-view');
        }
    } catch (error) {
        console.warn('Error handling resize:', error);
    }
}

// Handle scroll for sticky header
function handleScroll() {
    try {
        const backToTop = document.querySelector('.back-to-top');
        if (backToTop) {
            if (window.pageYOffset > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        }

        if (thead) {
            const tableRect = table.getBoundingClientRect();
            if (tableRect.top < 0) {
                thead.classList.add('sticky-header');
            } else {
                thead.classList.remove('sticky-header');
            }
        }
    } catch (error) {
        console.warn('Error handling scroll:', error);
    }
}

// Create back to top button
function createBackToTopButton() {
    try {
        const backToTop = document.querySelector('.back-to-top');
        if (!backToTop) return;

        backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    } catch (error) {
        console.warn('Failed to create back to top button:', error);
    }
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

// Handle online/offline status
window.addEventListener('online', () => {
    showToast('Connection restored. Refreshing data...');
    initializePage();
});

window.addEventListener('offline', () => {
    showToast('You are offline. Some features may be unavailable.', 'error');
});

// Clean up function for page unload
window.addEventListener('unload', () => {
    // Clear any intervals or timeouts
    const timeouts = window.performance.getEntriesByType('resource')
        .filter(entry => entry.initiatorType === 'timeout');
    timeouts.forEach(timeout => clearTimeout(timeout));
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);