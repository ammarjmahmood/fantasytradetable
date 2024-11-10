# BallHog NBA Stats Application 🏀

A modern web application for viewing and analyzing NBA player statistics, powered by Google Sheets data integration.

## Features
- Real-time NBA player statistics
- Advanced filtering capabilities
- Position and team-based filters
- Player search functionality
- Trade analysis powered by Google's Gemini AI
- Responsive design for mobile and desktop
- Hourly data updates from Google Sheets

## Prerequisites
- Node.js (LTS version) - Download from https://nodejs.org/

## Installation

### For macOS/Linux users:
1. Clone the repository
2. Give execute permission to the setup script:
```bash
chmod +x setup.sh
```
3. Run the setup script:
```bash
./setup.sh
```

### For Windows users:
1. Clone the repository
2. Install Node.js from https://nodejs.org/
3. Open Command Prompt or PowerShell and run:
```bash
npm install
```

### Required Configuration
1. Create a `.env` file in the root directory with:
```
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```

2. Place the `Ballhog IAM Admin.json` (Google Sheets credentials) in the root directory

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The application will be available at:
- Main application: http://localhost:3000
- HTML table view: http://localhost:3000/htmltable
- API endpoint: http://localhost:3000/api/players

## Data Updates
The application automatically pulls new data from Google Sheets every hour to ensure statistics are up to date.

## Available API Endpoints
- `GET /api/players` - Retrieve all player statistics
- `GET /htmltable` - View statistics in HTML table format
- `POST /api/analyze-trade` - Get AI-powered trade analysis

## Credits
Created by Ballhog Analytics Team 🏀 Ammar & Radin