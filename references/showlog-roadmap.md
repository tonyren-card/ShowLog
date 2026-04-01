# ShowLog — Roadmap & Feature Tracker

**Last updated:** Apr 1, 2026 | Stack: React + Vite + Anthropic API + localStorage

---

## 🚀 Releases

### v0.1 — Apr 1, 2026

#### v0.1.0
<sub>Initial commit</sub>

**Core app scaffold: show discovery, watchlist, diary, and ratings.**

##### Features
- **FEA-01: Show Search** — Search for TV shows via Claude + `web_search` tool proxying TMDB. Returns up to 12 results with poster, overview, genre tags, and rating. Results cached in component state.
- **FEA-02: Browsable Categories** — Homepage shows Trending, Top Rated, and Currently Airing categories, each fetched via Claude + web_search and displayed in a horizontal scroll grid of poster cards.
- **FEA-03: Show Detail Modal** — Click any show card to open a full detail view: backdrop image, title, genres, rating, overview, and action buttons (Add to Watchlist, Log, Rate).
- **FEA-04: Watchlist** — Add/remove shows to a personal watchlist. Stored in `localStorage`. Watchlist tab shows poster grid with remove option.
- **FEA-05: Diary** — Log a watch event per show (date watched, optional notes, season context). Entries stored in `localStorage`. Diary tab shows reverse-chronological log with show posters.
- **FEA-06: Star Ratings** — 0.5–5 star ratings per show. Ratings stored in `localStorage`. Shown inline on diary entries and show cards.

---

## 🔧 Next Up

| ID | Item | Type | Priority | Details |
|----|------|------|----------|---------|
| INF-01 | **Deploy to Vercel** | Infra | **Critical** | Deploy the Vite + React app to Vercel. The Anthropic API key is currently hardcoded client-side which is a security issue — this must be resolved before any public deployment. Steps: (1) set up a Vercel project from the GitHub repo, (2) create a `/api/claude` serverless function (Node.js) that accepts `{prompt, systemPrompt}` and proxies the Anthropic API call server-side, keeping the key in Vercel env vars, (3) update all `askClaude()` calls in the frontend to hit `/api/claude` instead of `api.anthropic.com` directly, (4) configure CORS and rate-limiting on the proxy endpoint. Custom domain optional for now. |
| INF-02 | **TMDB Direct API Integration** | Infra | **High** | Replace all Claude + web_search show-data calls with direct TMDB REST API calls. TMDB has a free API (themoviedb.org) with endpoints for search, trending, top-rated, on-the-air, and show details. (1) Register for a TMDB API key and store as env var in Vercel, (2) create `/api/tmdb` proxy endpoint to forward requests without exposing the key client-side, (3) replace `fetchTMDBViaSearch()` and `fetchShowCategory()` with direct TMDB calls — `GET /3/search/tv`, `GET /3/trending/tv/week`, `GET /3/tv/top_rated`, `GET /3/tv/on_the_air`, `GET /3/tv/{id}`, (4) TMDB returns real `poster_path` and `backdrop_path` values, so images will be reliable. This eliminates hallucinated TMDB IDs and broken poster paths from the current Claude-mediated approach. Keep Claude for features that genuinely need it (e.g. recommendations, natural language queries). |
| INF-03 | **Supabase Backend** | Infra | **High** | Replace `localStorage` with a real database so data persists across devices and sets up the foundation for social features. (1) Create a Supabase project, (2) schema: `users`, `watchlist_entries` (user_id, show_id, tmdb_data jsonb, added_at), `diary_entries` (user_id, show_id, watched_at, season, notes, rating), `show_ratings` (user_id, show_id, rating, rated_at), (3) add Supabase client to the frontend, (4) migrate localStorage reads/writes to Supabase queries. Auth is a prerequisite — at minimum anonymous sessions so data is persisted per-browser until the user creates an account. |
| INF-04 | **User Authentication** | Infra | **High** | Add Supabase Auth so users have real accounts and data persists across devices. (1) Email + password sign-up/login as the baseline, (2) optionally add Google OAuth for frictionless onboarding, (3) auth gate: app works in read-only browse mode when logged out, but Watchlist/Diary/Ratings require sign-in, (4) user profile page showing username, member since, and stats summary. **Depends on:** INF-03 (Supabase). |

---

## 🔮 Future

| ID | Item | Type | Priority | Details |
|----|------|------|----------|---------|
| FEA-07 | **Season & Episode Tracking** | Feature | High | Let users log at the episode or season level rather than just per-show. Track "currently watching", "up to S03E05", "completed season 2". Show detail page would have a season accordion where each episode can be checked off. Progress bar per show on the watchlist. This is the core differentiator from a simple "have I seen it" tracker — granular progress is what makes ShowLog sticky. |
| FEA-08 | **Year in Review / Stats Page** | Feature | High | Annual wrapped-style stats: total shows watched, total episodes, top genres, most-watched network, average rating, watching streaks, first and last log of the year. Shareable as an image card (like Letterboxd's year in review). Data comes from diary entries + Supabase aggregations. |
| FEA-09 | **AI Recommendations** | Feature | Medium | Use Claude to recommend shows based on the user's diary and ratings. Prompt includes top-rated shows and genres from the user's history; Claude returns 6–10 personalized picks with explanations. Powered by a `/api/recommend` endpoint that pulls the user's Supabase data and sends it as context. Different from search — this is a "surprise me" discovery flow, not query-driven. |
| FEA-10 | **Import from Trakt / IMDb** | Feature | Medium | Let users migrate their existing watch history from Trakt (JSON export) or IMDb (CSV export). Parser maps their format to ShowLog diary entries + ratings, deduplicates against existing entries, shows a preview with New/Existing badges before committing. This removes the biggest friction point for new users who already have a history somewhere. |
| FEA-11 | **Social / Friends Feed** | Feature | Medium | Follow other users and see their recent diary entries in a feed. Show detail pages display friends' ratings inline. "Popular with friends" section on the homepage. Requires auth (INF-04) and public/private profile settings. This is Letterboxd's core social hook — watching becomes more fun when you see what your friends are watching. |
| FEA-12 | **Show Lists** | Feature | Medium | Create and share curated lists (e.g. "Best HBO Shows", "Comfort Watches", "Watch Before You Die"). Lists have a title, description, and ordered set of shows. Public lists are discoverable. Inspired by Letterboxd lists. Good outlet for the curation instinct without needing full social graph. |
| FEA-13 | **Streaming Availability** | Feature | Medium | Show which streaming platforms a show is currently available on (Netflix, HBO, Hulu, etc.) using the JustWatch API or TMDB's `watch/providers` endpoint. Display platform logos on show cards and detail pages. Filter watchlist by "shows available on [platform]". Critical for turning discovery into action. |
| FEA-14 | **Reviews & Notes** | Feature | Low | Let users write longer-form reviews on shows (not just a star rating). Reviews can be public or private. Show detail page lists recent community reviews if social is enabled. For now, private notes (already partially there via diary entry notes) are the priority. |
| FEA-15 | **PWA / Mobile Experience** | Feature | Low | Service worker for offline access to watchlist and diary. PWA manifest for Add to Home Screen. The app is naturally mobile-first in terms of use case (checking "did I watch this?" on the couch), so a smooth mobile experience matters. Key flows: search → log, open watchlist, quick-rate. |
| UI-01 | **Profile Page & Public Profile URL** | UI | Medium | `/u/username` public profile showing watch stats, recent diary entries, top shows, and ratings distribution (like Letterboxd's profile). Private by default with a toggle to go public. Shareable link. Stat cards: shows watched, episodes, avg rating, this year count. |

---

<details>
<summary><strong>✅ Completed</strong></summary>

| ID | Item | Type | Completed |
|----|------|------|-----------|
| FEA-01 | **Show Search** — Claude + web_search proxying TMDB, returns up to 12 results with poster/overview/genres. | Feature → Done | Apr 1 |
| FEA-02 | **Browsable Categories** — Trending, Top Rated, Currently Airing via Claude + web_search. | Feature → Done | Apr 1 |
| FEA-03 | **Show Detail Modal** — Backdrop, title, genres, rating, overview, action buttons. | Feature → Done | Apr 1 |
| FEA-04 | **Watchlist** — Add/remove with localStorage persistence. | Feature → Done | Apr 1 |
| FEA-05 | **Diary** — Log watch events with date, notes, season. Reverse-chronological view. | Feature → Done | Apr 1 |
| FEA-06 | **Star Ratings** — 0.5–5 stars per show, stored in localStorage. | Feature → Done | Apr 1 |

</details>
