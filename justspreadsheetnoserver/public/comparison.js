const teamNames = {
    'ATL': 'Atlanta Hawks',
    'BOS': 'Boston Celtics',
    'BKN': 'Brooklyn Nets',
    'CHA': 'Charlotte Hornets',
    'CHI': 'Chicago Bulls',
    'CLE': 'Cleveland Cavaliers',
    'DAL': 'Dallas Mavericks',
    'DEN': 'Denver Nuggets',
    'DET': 'Detroit Pistons',
    'GSW': 'Golden State Warriors',
    'HOU': 'Houston Rockets',
    'IND': 'Indiana Pacers',
    'LAC': 'Los Angeles Clippers',
    'LAL': 'Los Angeles Lakers',
    'MEM': 'Memphis Grizzlies',
    'MIA': 'Miami Heat',
    'MIL': 'Milwaukee Bucks',
    'MIN': 'Minnesota Timberwolves',
    'NOP': 'New Orleans Pelicans',
    'NYK': 'New York Knicks',
    'OKC': 'Oklahoma City Thunder',
    'ORL': 'Orlando Magic',
    'PHI': 'Philadelphia 76ers',
    'PHX': 'Phoenix Suns',
    'POR': 'Portland Trail Blazers',
    'SAC': 'Sacramento Kings',
    'SAS': 'San Antonio Spurs',
    'TOR': 'Toronto Raptors',
    'UTA': 'Utah Jazz',
    'WAS': 'Washington Wizards'
};

const positions = {
    'C': 'Center',
    'PF': 'Power Forward',
    'SF': 'Small Forward',
    'SG': 'Shooting Guard',
    'PG': 'Point Guard',
    'F': 'Forward',
    'G': 'Guard',
    'F-C': 'Forward-Center',
    'C-F': 'Center-Forward',
    'G-F': 'Guard-Forward',
    'F-G': 'Forward-Guard'
};

let playersData = {};

document.addEventListener('DOMContentLoaded', () => {
    fetchPlayersData().then(() => {
        console.log('Players data loaded:', playersData);
        setupEventListeners();
        initializePlayerSelection('trading');
        initializePlayerSelection('receiving');
        checkSelection();
    }).catch(error => {
        console.error('Error loading player data:', error);
    });
});

async function fetchPlayersData() {
    try {
        const response = await fetch('http://localhost:3000/api/players');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Raw data from API:', data);
        processPlayersData(data);
    } catch (error) {
        console.error('Error fetching player data:', error);
    }
}

function processPlayersData(data) {
    console.log('Processing players data...');
    playersData = data.reduce((acc, player) => {
        if (player && player.player) {
            acc[player.player] = player;
        } else {
            console.warn('Invalid player data:', player);
        }
        return acc;
    }, {});
    console.log('Processed players data:', playersData);
    console.log('Number of players:', Object.keys(playersData).length);
    if (Object.keys(playersData).length === 0) {
        console.error('No valid player data processed');
    }
}

function setupEventListeners() {
    const addTradingPlayerButton = document.getElementById('add-trading-player');
    const addReceivingPlayerButton = document.getElementById('add-receiving-player');
    const compareButton = document.getElementById('compareButton');
    const aiAnalysisButton = document.getElementById('aiAnalysisButton');
    const closePopup = document.querySelector('.close-popup');

    if (addTradingPlayerButton) {
        addTradingPlayerButton.addEventListener('click', () => addPlayer('trading'));
    }
    if (addReceivingPlayerButton) {
        addReceivingPlayerButton.addEventListener('click', () => addPlayer('receiving'));
    }
    if (compareButton) {
        compareButton.addEventListener('click', comparePlayers);
    }
    if (aiAnalysisButton) {
        aiAnalysisButton.addEventListener('click', handleAIAnalysis);
    }
    if (closePopup) {
        closePopup.addEventListener('click', () => {
            const aiAnalysisPopup = document.getElementById('aiAnalysisPopup');
            if (aiAnalysisPopup) {
                aiAnalysisPopup.style.display = 'none';
            }
        });
    }
}

function filterPlayers(input, playerId) {
    console.log(`Filtering players for input: "${input.value}" and playerId: "${playerId}"`);
    
    const query = input.value.toLowerCase();
    let resultsContainer = document.getElementById(`${playerId}-results`);
    
    if (!resultsContainer) {
        console.log('Creating new results container');
        resultsContainer = document.createElement('div');
        resultsContainer.id = `${playerId}-results`;
        resultsContainer.className = 'search-results';
        input.parentNode.appendChild(resultsContainer);
    }

    resultsContainer.style.position = 'absolute';
    resultsContainer.style.top = `${input.offsetTop + input.offsetHeight}px`;
    resultsContainer.style.left = `${input.offsetLeft}px`;
    resultsContainer.style.width = `${input.offsetWidth}px`;
    resultsContainer.style.maxHeight = '200px';
    resultsContainer.style.overflowY = 'auto';
    resultsContainer.style.backgroundColor = 'white';
    resultsContainer.style.border = '1px solid #ddd';
    resultsContainer.style.zIndex = '1000';

    const players = Object.keys(playersData);
    console.log('Number of available players:', players.length);
    console.log('First few players:', players.slice(0, 5));
    
    resultsContainer.innerHTML = '';

    if (query.length === 0) {
        console.log('Empty query, hiding results');
        resultsContainer.style.display = 'none';
        return;
    }

    const filteredPlayers = players.filter(player => 
        player.toLowerCase().includes(query)
    );

    console.log('Number of filtered players:', filteredPlayers.length);
    console.log('First few filtered players:', filteredPlayers.slice(0, 5));

    if (filteredPlayers.length === 0) {
        console.log('No matching players found');
        resultsContainer.style.display = 'none';
        return;
    }

    filteredPlayers.forEach(player => {
        const div = document.createElement('div');
        div.textContent = player;
        div.style.padding = '5px';
        div.style.cursor = 'pointer';
        div.addEventListener('click', () => {
            console.log(`Player selected: ${player}`);
            selectPlayer(input, player, playerId);
        });
        div.addEventListener('mouseover', () => div.style.backgroundColor = '#f0f0f0');
        div.addEventListener('mouseout', () => div.style.backgroundColor = 'white');
        resultsContainer.appendChild(div);
    });

    console.log(`Displaying ${filteredPlayers.length} filtered players`);
    resultsContainer.style.display = 'block';
}

function initializePlayerSelection(type) {
    const container = document.getElementById(`${type}-players`);
    if (container) {
        addPlayerField(container, type, 0);
    }
}

function addPlayerField(container, type, count) {
    const playerId = `${type}-player${count + 1}`;
    const playerCard = document.createElement('div');
    playerCard.className = 'player-card';
    playerCard.id = playerId;

    // Create the delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-player-button';
    deleteButton.innerHTML = '&times;';
    deleteButton.addEventListener('click', () => deletePlayer(playerId));

    // Create the input field for player search
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Search for a player (Player ${count + 1})`;
    input.className = 'player-card-dropdown';
    input.addEventListener('input', (event) => filterPlayers(event.target, playerId));

    // Append the delete button before the input
    playerCard.appendChild(deleteButton);
    playerCard.appendChild(input);

    container.appendChild(playerCard);
}

function deletePlayer(playerId) {
    const playerCard = document.getElementById(playerId);
    if (playerCard) {
        playerCard.remove();  // Removes the player field from the DOM
        checkSelection();  // Optionally update the state after removal
    }
}


function addPlayer(type) {
    const container = document.getElementById(`${type}-players`);
    if (container) {
        const count = container.children.length;
        if (count < 5) {
            addPlayerField(container, type, count);
            if (count === 4) {
                const addPlayerButton = document.getElementById(`add-${type}-player`);
                if (addPlayerButton) {
                    addPlayerButton.style.display = 'none';
                }
            }
            checkSelection(); // Add this line to check selection after adding a player
        }
    }
}

function selectPlayer(input, playerName, playerId) {
    input.value = playerName;
    const resultsContainer = document.getElementById(`${playerId}-results`);
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }

    const playerCard = document.getElementById(playerId);
    if (playerCard) {
        updatePlayerCard(playerCard, playerName);
    }
    
    checkSelection(); // Add this line
}

function updatePlayerCard(card, playerName) {
    const playerInfo = playersData[playerName] || {};

    let img = card.querySelector('img');
    if (!img) {
        img = document.createElement('img');
        img.src = `nbaheadshots/player_images/${playerName.replace(' ', '-')}.jpg`;
        img.alt = playerName;
        card.appendChild(img);
    } else {
        img.src = `nbaheadshots/player_images/${playerName.replace(' ', '-')}.jpg`;
        img.alt = playerName;
    }

    let infoContainer = card.querySelector('.player-info-container');
    if (!infoContainer) {
        infoContainer = document.createElement('div');
        infoContainer.className = 'player-info-container';
        card.appendChild(infoContainer);
    }

    infoContainer.innerHTML = `
        <div class="player-info">
            <div class="player-ranking">Rank: ${playerInfo.rank || 'N/A'}</div>
            <div class="player-position">Position: ${playerInfo.pos || 'N/A'}</div>
            <div class="player-team">Team: ${playerInfo.team || 'N/A'}</div>
        </div>
    `;
}

function checkSelection() {
    console.log('Checking player selection...');
    const tradingPlayers = document.querySelectorAll('#trading-players .player-card input');
    const receivingPlayers = document.querySelectorAll('#receiving-players .player-card input');
    const compareButton = document.getElementById('compareButton');

    let validTradingPlayer = false;
    let validReceivingPlayer = false;

    tradingPlayers.forEach(input => {
        if (input.value.trim() && playersData[input.value.trim()]) {
            validTradingPlayer = true;
        }
    });

    receivingPlayers.forEach(input => {
        if (input.value.trim() && playersData[input.value.trim()]) {
            validReceivingPlayer = true;
        }
    });

    const canCompare = validTradingPlayer && validReceivingPlayer;
    console.log(`Can compare: ${canCompare}`);

    if (compareButton) {
        compareButton.disabled = !canCompare;
        compareButton.style.opacity = canCompare ? '1' : '0.5';
        compareButton.style.cursor = canCompare ? 'pointer' : 'not-allowed';
    } else {
        console.error('Compare button not found');
    }
}

function comparePlayers() {
    const tradingPlayers = document.querySelectorAll('#trading-players .player-card input');
    const receivingPlayers = document.querySelectorAll('#receiving-players .player-card input');

    const tradingStats = {};
    const receivingStats = {};

    tradingPlayers.forEach(input => {
        const playerName = input.value.trim();
        if (playerName && playersData[playerName]) {
            combineStats(tradingStats, playersData[playerName]);
        }
    });

    receivingPlayers.forEach(input => {
        const playerName = input.value.trim();
        if (playerName && playersData[playerName]) {
            combineStats(receivingStats, playersData[playerName]);
        }
    });

    updateComparisonTable(tradingStats, receivingStats);

    // Enable the AI analysis button after comparison
    const aiAnalysisButton = document.getElementById('aiAnalysisButton');
    if (aiAnalysisButton) {
        aiAnalysisButton.disabled = false;
    }
}

function combineStats(accumulatedStats, playerStats) {
    for (let stat in playerStats) {
        if (stat !== 'rank' && stat !== 'player_name' && stat !== 'position' && stat !== 'team') {
            accumulatedStats[stat] = (accumulatedStats[stat] || 0) + parseFloat(playerStats[stat] || 0);
        }
    }
}

function updateComparisonTable(tradingStats, receivingStats) {
    const comparisonTableBody = document.getElementById('comparisonTable').querySelector('tbody');
    if (comparisonTableBody) {
        comparisonTableBody.innerHTML = '';

        const allStats = new Set([
            ...Object.keys(tradingStats),
            ...Object.keys(receivingStats)
        ]);

        // Exclude 'player' and 'pos' from the table
        const excludedStats = ['rank', 'player', 'position', 'team', 'pos'];

        allStats.forEach(stat => {
            if (!excludedStats.includes(stat.toLowerCase())) { // Exclude unwanted stats
                const row = comparisonTableBody.insertRow();
                const statCell = row.insertCell(0);
                statCell.textContent = formatStatName(stat);
                statCell.style.fontWeight = 'bold';

                const tradingValue = tradingStats[stat] !== undefined ? tradingStats[stat].toFixed(2) : 'N/A';
                const receivingValue = receivingStats[stat] !== undefined ? receivingStats[stat].toFixed(2) : 'N/A';

                row.insertCell(1).textContent = tradingValue;
                row.insertCell(2).textContent = receivingValue;

                const projectionCell = row.insertCell(3);
                const difference = (receivingStats[stat] || 0) - (tradingStats[stat] || 0);
                projectionCell.textContent = `${difference >= 0 ? '+' : ''}${difference.toFixed(2)}`;
                projectionCell.style.color = difference >= 0 ? 'green' : 'red';
            }
        });
    }
}


function formatStatName(stat) {
    return stat.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

async function handleAIAnalysis() {
    const tradingPlayers = getSelectedPlayers('trading-players');
    const receivingPlayers = getSelectedPlayers('receiving-players');

    const tradeData = {
        tradedPlayers: tradingPlayers,
        receivedPlayers: receivingPlayers
    };

    try {
        const response = await fetch('/api/analyze-trade', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tradeData),
        });

        if (!response.ok) {
            throw new Error('Failed to get AI analysis');
        }

        const analysisResult = await response.json();
        displayAIAnalysis(analysisResult.analysis);
    } catch (error) {
        console.error('Error getting AI analysis:', error);
        displayAIAnalysis('An error occurred while analyzing the trade. Please try again.');
    }
}

function getSelectedPlayers(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    
    const playerInputs = container.querySelectorAll('.player-card input');
    return Array.from(playerInputs).map(input => {
        const playerName = input.value.trim();
        const playerData = playersData[playerName] || {};
        return {
            name: playerName,
            stats: {
                gamesPlayed: playerData.games_played || 'N/A',
                minutesPerGame: playerData.minutes_per_game || 'N/A',
                fieldGoalPercentage: playerData.field_goal_percentage || 'N/A',
                points: playerData.points_per_game || 'N/A',
                rebounds: playerData.rebounds_per_game || 'N/A',
                assists: playerData.assists_per_game || 'N/A',
                turnovers: playerData.turnovers_per_game || 'N/A',
                lastSeasonInjuries: 'Data not available' // You might want to add this information to your data source
            }
        };
    });
}

function displayAIAnalysis(analysis) {
    const popup = document.getElementById('aiAnalysisPopup');
    const content = document.getElementById('aiAnalysisText');
    if (popup && content) {
        content.textContent = analysis;
        popup.style.display = 'block';
    }
}

// Close popup when clicking outside
window.addEventListener('click', function(event) {
    const popup = document.getElementById('aiAnalysisPopup');
    if (event.target === popup) {
        popup.style.display = 'none';
    }
});