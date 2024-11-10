const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const cors = require('cors');
const cron = require('node-cron');
const { google } = require('googleapis');
const fs = require('fs');
const NodeCache = require('node-cache');

// Initialize cache with 1 hour TTL
const dataCache = new NodeCache({ stdTTL: 3600 });

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: err.message 
    });
});

let credentials;
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  // We're on Heroku, use the environment variable
  const credentialsJSON = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8');
  credentials = JSON.parse(credentialsJSON);
} else {
  // We're running locally, read from file
  credentials = JSON.parse(fs.readFileSync('Ballhog IAM Admin.json'));
}

// Authenticate using the service account
const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

let sheetData = [];

// Data transformation helper
function transformPlayerData(player) {
    const numericFields = ['games_played', 'minutes_per_game', 'points', 'rebounds', 'assists', 'steals', 'blocks', 'turnovers', 'field_goal_percentage'];
    
    numericFields.forEach(field => {
        if (player[field]) {
            if (field.includes('percentage')) {
                player[field] = parseFloat(player[field]).toFixed(1);
            } else {
                player[field] = parseFloat(player[field]).toFixed(2);
            }
        }
    });
    
    return player;
}

// Serve static files from project root and set correct MIME types
app.use(express.static(__dirname, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
        } else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        }
    }
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Get the spreadsheet data
async function getSheetData() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1QCfd6RRMKMvakUWcm1fA8Kof1hjrH_0nwkD_iWngEiM',
    range: 'Sheet1!A1:U351',
  });

  return res.data.values;
}

// Function to update data
async function updateData() {
  console.log('\nUpdating data...');
  try {
    sheetData = await getSheetData();
    // Clear the cache when new data is fetched
    dataCache.flushAll();
    console.log('Data update completed successfully');
  } catch (error) {
    console.error('Error updating data:', error);
  }
}

// CORS Configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like file:// or curl requests)
    if (!origin || origin === `http://localhost:${PORT}`) {
      return callback(null, true);  // Allow localhost and null origin (like file://)
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Trade table page
});

app.get('/filtertable', (req, res) => {
    res.sendFile(path.join(__dirname, 'filtertable.html')); // Filter table page
});

// Create an endpoint to fetch all player data as JSON
app.get('/api/players', async (req, res, next) => {
    try {
        let players = dataCache.get('players');
        
        if (!players) {
            console.log('Cache miss - fetching fresh data');
            if (!Array.isArray(sheetData) || sheetData.length < 2) {
                throw new Error('Invalid or empty sheet data');
            }

            const headers = sheetData[0].map(header => 
                header.toLowerCase().replace(/ /g, '_')
            );

            players = sheetData.slice(1).map(row => {
                const player = {};
                headers.forEach((header, index) => {
                    player[header] = row[index];
                });
                return transformPlayerData(player);
            });

            dataCache.set('players', players);
        }

        // Handle sorting if requested
        const { sort, order } = req.query;
        if (sort && players[0].hasOwnProperty(sort)) {
            players.sort((a, b) => {
                const aVal = parseFloat(a[sort]) || 0;
                const bVal = parseFloat(b[sort]) || 0;
                return order === 'desc' ? bVal - aVal : aVal - bVal;
            });
        }

        res.json(players);
    } catch (err) {
        next(err);
    }
});

// Create an endpoint to display data as HTML
app.get('/htmltable', (req, res) => {
  try {
    const tableRows = sheetData.map(row => `
      <tr>
        ${row.map(cell => `<td>${cell}</td>`).join('')}
      </tr>
    `).join('');

    res.send(`
      <html>
        <head>
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <table>
            ${tableRows}
          </table>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred');
  }
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/analyze-trade', async (req, res) => {
  try {
    const { tradedPlayers, receivedPlayers } = req.body;

    // Ensure we have exactly two players for comparison
    if (tradedPlayers.length !== 1 || receivedPlayers.length !== 1) {
      throw new Error('This analysis requires exactly two players (one traded, one received)');
    }

    const player1 = tradedPlayers[0];
    const player2 = receivedPlayers[0];

    // Prepare the prompt for Gemini
    const prompt = `I need help evaluating a potential trade between two players based on their current season's stats, injury history, and overall performance. Here are the detailed stats for both players:

Player 1 (${player1.name}):
Games Played: ${player1.stats.gamesPlayed}
Minutes Per Game: ${player1.stats.minutesPerGame}
Field Goal Percentage: ${player1.stats.fieldGoalPercentage}
Points: ${player1.stats.points}
Rebounds: ${player1.stats.rebounds}
Assists: ${player1.stats.assists}
Turnovers: ${player1.stats.turnovers}
Last Season Injuries: ${player1.stats.lastSeasonInjuries}

Player 2 (${player2.name}):
Games Played: ${player2.stats.gamesPlayed}
Minutes Per Game: ${player2.stats.minutesPerGame}
Field Goal Percentage: ${player2.stats.fieldGoalPercentage}
Points: ${player2.stats.points}
Rebounds: ${player2.stats.rebounds}
Assists: ${player2.stats.assists}
Turnovers: ${player2.stats.turnovers}
Last Season Injuries: ${player2.stats.lastSeasonInjuries}

Please provide the analysis in the following format:

Start by summarizing the games played and who has the edge in health and availability. Discuss the injury history of both players, mentioning any significant injuries and missed games. Compare their performance stats (points, efficiency, rebounds, assists, etc.). Conclude by discussing versatility and reliability, identifying who is the better trade overall, and why.`;

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();

    res.json({ analysis });
  } catch (error) {
    console.error('Error analyzing trade:', error);
    res.status(500).json({ error: 'An error occurred while analyzing the trade' });
  }
});

// Update data immediately when server starts
updateData();

// Schedule data update to run every hour
cron.schedule('0 * * * *', updateData);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Filter table available at http://localhost:${PORT}/filtertable`);
    console.log(`View HTML table at http://localhost:${PORT}/htmltable`);
    console.log(`View comparison at http://localhost:${PORT}/api/players`);
});