const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const cors = require('cors');
const cron = require('node-cron');
const { google } = require('googleapis');
const fs = require('fs');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Load your service account credentials
const credentials = JSON.parse(fs.readFileSync('Ballhog IAM Admin.json'));

// Authenticate using the service account
const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

let sheetData = [];

// Get the spreadsheet data
async function getSheetData() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1OGVWwKgwZVZ-uHAt6DqodCclY4gl1SRhtoowKaY2qIg',
    range: 'Sheet1!A1:T348',
  });

  return res.data.values;
}

// Function to update data
async function updateData() {
  console.log('\nUpdating data...');
  try {
    sheetData = await getSheetData();
    console.log('Data update completed successfully');
  } catch (error) {
    console.error('Error updating data:', error);
  }
}

// Allow requests from localhost:3000
app.use(cors({ origin: `http://localhost:${PORT}` }));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Create an endpoint to fetch all player data as JSON
app.get('/api/players', (req, res) => {
  try {
    console.log('Fetching player data...');
    console.log('Sheet data length:', sheetData.length);
    
    if (!Array.isArray(sheetData) || sheetData.length < 2) {
      throw new Error('Invalid or empty sheet data');
    }

    const headers = sheetData[0];
    console.log('Headers:', headers);

    const players = sheetData.slice(1).map(row => {
      const player = {};
      headers.forEach((header, index) => {
        player[header.toLowerCase().replace(/ /g, '_')] = row[index];
      });
      return player;
    });

    console.log('Number of players processed:', players.length);
    console.log('Sample player:', players[0]);

    res.json(players);
  } catch (err) {
    console.error('Error in /api/players:', err);
    res.status(500).json({ error: 'An error occurred while fetching player data', details: err.message });
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

Start by summarizing the games played and who has the edge in health and availability. Discuss the injury history of both players, mentioning any significant injuries and missed games. Compare their performance stats (points, efficiency, rebounds, assists, etc.). Conclude by discussing versatility and reliability, identifying who is the better trade overall, and why. 

I want an answer exactly like this format:

'Based on the provided stats and last season's performance:

Games Played: [Player 1] played X games, while [Player 2] played Y, giving [Player 1/2] the edge in terms of health and availability.

Injuries: [Player 1] had multiple injury issues last season, including [details], whereas [Player 2] missed [X] games and remained [injury status].

Performance Stats: While [Player 1] scores more points per game (X vs. Y), [Player 2] has better overall efficiency, with a higher field goal percentage (X% vs. Y%), fewer turnovers (X vs. Y), and superior [rebounds/assists/other categories].

Versatility and Reliability: [Player 2] offers a more balanced stat line, contributing heavily in multiple areas with fewer injury risks and more consistency across the board.

Given [Player 2]'s superior availability, fewer injuries, and all-around game, trading [Player 1] for [Player 2] would likely be a good decision if you're seeking more reliability and balanced contributions, despite losing some [category] output.'

Make sure to include detailed analysis of the players' stats and their injury history for an informed decision.`;

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
    console.log(`View HTML table at http://localhost:${PORT}/htmltable`);
});