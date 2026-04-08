# ShowLog — Roadmap & Feature Tracker

**Last updated:** Apr 8, 2026 | [showlogd.netlify.app](https://showlogd.netlify.app) | Stack: React + Vite + Netlify Functions + TMDB API + Supabase

---

## 🚀 Releases

### v1.0 — Apr 4, 2026

#### v1.0.2
<sub>Deployed 2026-04-08 to Netlify</sub>

**User authentication, diary editing, and date logging.**

##### Features
- **INF-04: User Authentication** — Added Supabase Auth with email + password sign-up/login. `AuthModal` component handles both modes with inline error and confirmation messaging. App works in read-only browse mode when logged out; Watchlist, Diary, and rating actions require sign-in and prompt the `AuthModal` when triggered unauthenticated. `onAuthStateChange` listener handles session restore, data reload on sign-in, and state clear on sign-out.
- **Username support** — Users can set a display username (stored in Supabase user metadata). Profile page shows username with an inline edit field (✎); email shown as secondary if a username is set. Header avatar uses first letter of username (falls back to email initial). Username persists across sessions via `user.user_metadata.username`.
- **Profile page** — Shows display name, email, member-since date, Watched/Diary/Watchlist stats, and a Sign Out button.
- **Diary entry editing** — Each diary row now has a pencil (✎) button that opens an inline edit form. Users can update the date watched, star rating, and review text. Save does an optimistic state update then persists to Supabase; Cancel restores original values.
- **Diary entry deletion** — Delete button inside the edit form with a two-step confirm ("Remove this entry? / Yes, delete / No") to prevent accidental removal. Optimistic removal from state with background Supabase delete.
- **Date picker for logging** — The "Log / Review" form in the show detail modal now includes a "Date Watched" date input (capped at today) so users can backfill past entries. Defaults to today; resets after saving.

##### Fixes
- **Watched toggle bug** — Logging a show via the diary was calling `toggleWatched` unconditionally, which unwatched already-watched shows. Fixed to only mark as watched if the show wasn't already in the watched set.

---

#### v1.0.1
<sub>Deployed 2026-04-04 to Netlify</sub>

**Supabase backend — data now persists across devices.**

##### Features
- **INF-03: Supabase Backend** — Replaced in-memory state with Supabase. Schema: `watchlist_entries`, `diary_entries`, `watched_shows` — all with `user_id`, `show_id`, `show_data jsonb`, and timestamps. Row-level security enabled so each user can only access their own data. Anonymous sessions via Supabase Auth ensure data persists per-browser with no sign-up required.

---

#### v1.0.0
<sub>Deployed 2026-04-04 to Netlify</sub>

**Direct TMDB API integration and version number display.**

##### Features
- **INF-02: TMDB Direct API Integration** — Replaced all Claude + web_search show-data calls with direct TMDB REST API calls. Endpoints: `GET /3/trending/tv/week`, `GET /3/tv/popular`, `GET /3/tv/top_rated`, `GET /3/search/tv`, `GET /3/tv/{id}`, `GET /3/tv/{id}/credits`. Real poster/backdrop paths — no more hallucinated data. All three homepage categories now load in parallel. `VITE_TMDB_API_KEY` stored as Netlify env var.
- **Version display** — Version number injected at build time from `package.json` via Vite `define`. Displayed in the footer as `v{version}`.

---

### v0.2 — Apr 1, 2026

#### v0.2.0
<sub>Deployed 2026-04-01 to Netlify</sub>

**Netlify deployment, server-side API proxy, and build fixes.**

##### Features
- **INF-01: Netlify Deploy** — App deployed to [classy-alpaca-fd100e.netlify.app](https://classy-alpaca-fd100e.netlify.app). Build pipeline: `npm run build` → `dist/` published via `netlify.toml`. `.gitignore` added covering `.env`, `node_modules/`, `dist/`, `.sfdx/`.
- **INF-01b: Netlify Function API Proxy** — Created `netlify/functions/claude.js` — a server-side Edge Function that proxies all Anthropic API calls. Frontend `askClaude()` now hits `/api/claude` instead of `api.anthropic.com` directly. API key stored as a Netlify env var (`ANTHROPIC_API_KEY`), never exposed in the browser bundle. Removes the CORS issue from direct browser-to-Anthropic calls.

##### Fixes
- **BUG-01: Black screen on load** — `index.html` was in `public/` instead of the project root. Vite requires `index.html` at root as the entry point; moved it.
- **BUG-02: Anthropic API calls failing** — `askClaude()` was missing `x-api-key`, `anthropic-version`, and `anthropic-dangerous-direct-browser-access` headers (app was originally built as a Claude artifact where the key is injected automatically). Fixed by routing calls through the Netlify proxy instead.
- **BUG-03: Netlify detecting project as Next.js** — `package.json` had stray `next` and `react-scripts` dependencies from the initial scaffold. Removed both; Netlify now correctly identifies the project as a plain Vite app.
- **BUG-04: Outdated model ID** — `askClaude()` was using `claude-sonnet-4-20250514` (deprecated). Updated to `claude-haiku-4-5-20251001` — faster and cheaper for show data fetching.

---

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
| FEA-07 | **Season & Episode Tracking** | Feature | High | Let users log at the episode or season level rather than just per-show. Track "currently watching", "up to S03E05", "completed season 2". Show detail page would have a season accordion where each episode can be checked off. Progress bar per show on the watchlist. This is the core differentiator from a simple "have I seen it" tracker — granular progress is what makes ShowLog sticky. |
| FEA-08 | **Year in Review / Stats Page** | Feature | High | Annual wrapped-style stats: total shows watched, total episodes, top genres, most-watched network, average rating, watching streaks, first and last log of the year. Shareable as an image card (like Letterboxd's year in review). Data comes from diary entries + Supabase aggregations. |

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
| INF-03 | **Supabase Backend** — Watchlist, diary, and watched state persisted to Supabase. Anonymous sessions via Supabase Auth. RLS-secured tables: `watchlist_entries`, `diary_entries`, `watched_shows`. | Infra → Done | Apr 4 |
| INF-02 | **TMDB Direct API Integration** — Replaced Claude + web_search with direct TMDB REST API calls. Parallel category loading. Real poster/backdrop paths. `VITE_TMDB_API_KEY` as Netlify env var. | Infra → Done | Apr 4 |
| INF-01 | **Netlify Deploy + API Proxy** — App live at showlogd.netlify.app. Netlify Function proxies Anthropic API server-side; key stored as env var. Fixed stray `next`/`react-scripts` deps, misplaced `index.html`, outdated model ID. | Infra → Done | Apr 1 |
| FEA-01 | **Show Search** — Search for TV shows via TMDB, returns up to 12 results with poster/overview/genres. | Feature → Done | Apr 1 |
| FEA-02 | **Browsable Categories** — Trending, Top Rated, Currently Airing via Claude + web_search. | Feature → Done | Apr 1 |
| FEA-03 | **Show Detail Modal** — Backdrop, title, genres, rating, overview, action buttons. | Feature → Done | Apr 1 |
| FEA-04 | **Watchlist** — Add/remove with localStorage persistence. | Feature → Done | Apr 1 |
| FEA-05 | **Diary** — Log watch events with date, notes, season. Reverse-chronological view. | Feature → Done | Apr 1 |
| FEA-06 | **Star Ratings** — 0.5–5 stars per show, stored in localStorage. | Feature → Done | Apr 1 |

</details>
