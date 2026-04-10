# ShowLog

**A Letterboxd-style app for TV shows** — track what you watch, rate your favorites, and discover new series.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![Version](https://img.shields.io/badge/version-1.0.3-green)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Browse** trending, popular, and top-rated TV shows
- **Search** any TV show with real-time results
- **Show Details** — synopsis, ratings, cast, seasons, network info
- **Accounts** — email + password sign-up/login via Supabase Auth
- **Watchlist** — save shows you want to watch (requires sign-in)
- **Diary** — log and rate everything you've watched (requires sign-in)
- **Profile** — username, member-since date, stats, and recently watched shows

## Tech Stack

- **React 19** + Vite — UI framework and build tool
- **TMDB API** — TV show metadata, posters, ratings, cast, and seasons
- **Supabase** — auth (email + password), persistent storage for watchlist, diary, and watched shows
- **Netlify** — hosting and serverless functions (Anthropic API proxy at `/api/claude`)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [TMDB API key](https://www.themoviedb.org/settings/api)
- A [Supabase](https://supabase.com/) project
- (Optional) An [Anthropic API key](https://console.anthropic.com/) for the `/api/claude` proxy

### Install & Run

```bash
git clone https://github.com/YOUR_USERNAME/showlog.git
cd showlog
npm install
```

Create a `.env` file in the project root:

```
VITE_TMDB_API_KEY=your_tmdb_api_key
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key   # only needed for /api/claude
```

Then start the dev server:

```bash
npm run dev
```

The app runs at [http://localhost:5173](http://localhost:5173) (or the next available port).

> **Note:** The Netlify function at `/api/claude` only works when deployed to Netlify or when running locally via `netlify dev`. It is not used by the main app, which calls the TMDB API directly.

## Project Structure

```
showlog/
├── netlify/
│   └── functions/
│       └── claude.js       # Anthropic API proxy (Netlify function)
├── src/
│   ├── main.jsx            # React entry point
│   ├── App.jsx             # Main ShowLog application
│   └── supabase.js         # Supabase client
├── netlify.toml
├── vite.config.js
├── package.json
├── CLAUDE.md               # Context file for Claude Code
└── README.md
```

## Deploying

This project is configured for Netlify. Push to your repo and connect it in the Netlify dashboard — `netlify.toml` handles the build settings. Set the environment variables in the Netlify UI.

## License

MIT

## Credits

- TV show data from [The Movie Database (TMDB)](https://www.themoviedb.org/)
- Backend storage by [Supabase](https://supabase.com/)
