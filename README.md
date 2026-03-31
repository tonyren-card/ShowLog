# 📺 ShowLog

**A Letterboxd-style app for TV shows** — track what you watch, rate your favorites, and discover new series.

![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Browse** trending, popular, and top-rated TV shows
- **Search** any TV show with real-time results
- **Show Details** — synopsis, ratings, cast, seasons, network info
- **Watchlist** — save shows you want to watch
- **Diary** — log and rate everything you've watched
- **Profile** — view your stats and recently watched shows

## Tech Stack

- **React 18** — UI framework
- **Anthropic API** — powers search and data retrieval via Claude + web search
- **TMDB Data** — real TV show metadata, posters, and ratings

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm or yarn

### Install & Run

```bash
git clone https://github.com/YOUR_USERNAME/showlog.git
cd showlog
npm install
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000).

## How It Works

ShowLog uses the Anthropic Messages API with the `web_search` tool to fetch live TV show data from TMDB. This means:

- No TMDB API key required
- Real show data including posters, ratings, cast, and seasons
- Search powered by Claude AI

## Project Structure

```
showlog/
├── public/
│   └── index.html
├── src/
│   ├── index.js        # React entry point
│   └── App.js          # Main ShowLog application
├── package.json
├── CLAUDE.md           # Context file for Claude Code
└── README.md
```

## Developing with Claude Code

This project includes a `CLAUDE.md` file for use with [Claude Code](https://code.claude.com). Just run `claude` in the project directory and start building.

## License

MIT

## Credits

- TV show data from [The Movie Database (TMDB)](https://www.themoviedb.org/)
- Powered by [Anthropic Claude API](https://docs.anthropic.com/)
