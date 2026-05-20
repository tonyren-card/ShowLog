# ShowLog — Roadmap & Feature Tracker

**Last updated:** May 20, 2026 | [showlogd.netlify.app](https://showlogd.netlify.app) | Stack: React + Vite + Netlify Functions + TMDB API + Supabase

---

## Latest — v1.1.2
<sub>Published 2026-05-15</sub>

**Profile picture upload.**

### Features
- **FEA-19: Profile Picture** — Users can upload a profile picture from the Profile page. Clicking the avatar opens a file picker; the image is uploaded to a Supabase Storage `avatars/` bucket at `{userId}.jpg` (upsert). The public URL is saved to user metadata with a cache-busting timestamp so the new image appears immediately without a page refresh. The avatar is displayed on the Profile page and in the header (both desktop and mobile nav), replacing the initial letter badge. Falls back to the initial letter badge if no avatar is set. On load, `supabase.auth.getUser()` is called to fetch fresh metadata so avatars set on other platforms (e.g. iOS) appear immediately.

---

## 🔮 Future

### Known Bugs

| ID | Bug | Severity | Details |
|----|-----|----------|---------|
| BUG-05 | **Mobile search unavailable** | Critical | `.desktop-search { display: none !important; }` hides the search bar on mobile (≤640px) with no replacement in the mobile bottom nav. Users on phones cannot search for shows at all — the primary discovery mechanism is completely missing on mobile. Fix: add a Search tab to the mobile bottom nav that opens a full-screen search view, or move the search input into the page header for all breakpoints. |
| BUG-07 | **Diary entry requires a mandatory rating** | Medium | "Save Entry" is blocked when `userRating === 0` (line 372 in App.jsx). Users cannot log a show without giving a star rating — no way to backfill a watch you forgot to rate. The edit form has the same gate (line 501). Rating should be optional; the save button should be enabled whenever the user is on the form. Same bug on iOS (BUG-07). |
| BUG-08 | **"Recently Watched" on Profile shows wrong order** | Low | `watched_shows` is queried without `ORDER BY` (line 768), so the `Set`'s insertion order depends on arbitrary Supabase result order. `[...watched].slice(-6).reverse()` may not reflect actual recency. Fix: add `.order("created_at", { ascending: false })` to the `watched_shows` query and use that ordering when slicing for the profile display. |
| BUG-09 | **Half-star input not implemented** | Low | FEA-06 describes "0.5–5 stars" ratings, and the `StarRating` component has display logic for half-stars, but `onChange(s)` always passes an integer (1–5) on click. Users can only save whole-star ratings from the web UI. Fix: split each star span into two clickable zones (`left` → `s - 0.5`, `right` → `s`) to support 0.5-increment input. |
| BUG-10 | **Unused Playfair Display font import** | Low | The global `@import` in App.jsx still imports Playfair Display (line 966), which was replaced by Space Grotesk in v1.1.0 and is no longer used anywhere in the app. This adds an unnecessary Google Fonts network request on every page load. Remove it from the import URL. |

### Feature

| ID | Item | Priority | Details |
|----|------|----------|---------|
| FEA-08 | **Year in Review / Stats Page** | High | Annual wrapped-style stats: total shows watched, total episodes, top genres, most-watched network, average rating, watching streaks, first and last log of the year. Shareable as an image card (like Letterboxd's year in review). Data comes from diary entries + Supabase aggregations. |
| FEA-09 | **AI Recommendations** | Medium | Use Claude to recommend shows based on the user's diary and ratings. Prompt includes top-rated shows and genres from the user's history; Claude returns 6–10 personalized picks with explanations. Powered by a `/api/recommend` endpoint that pulls the user's Supabase data and sends it as context. |
| FEA-10 | **Import from Trakt / IMDb** | Medium | Let users migrate their existing watch history from Trakt (JSON export) or IMDb (CSV export). Parser maps their format to ShowLog diary entries + ratings, deduplicates against existing entries, shows a preview with New/Existing badges before committing. |
| FEA-11 | **Social / Friends Feed** | Medium | Follow other users and see their recent diary entries in a feed. Show detail pages display friends' ratings inline. "Popular with friends" section on the homepage. Requires public/private profile settings. |
| FEA-12 | **Show Lists** | Medium | Create and share curated lists (e.g. "Best HBO Shows", "Comfort Watches"). Lists have a title, description, and ordered set of shows. Public lists are discoverable. |
| FEA-13 | **Streaming Availability** | Medium | Show which streaming platforms a show is currently available on using TMDB's `watch/providers` endpoint. Display platform logos on show cards and detail pages. Filter watchlist by platform. |
| FEA-14 | **Reviews & Notes** | Low | Longer-form reviews on shows (not just a star rating). Public or private. Community reviews on show detail page if social is enabled. |
| FEA-15 | **PWA / Mobile Experience** | Low | Service worker for offline access to watchlist and diary. PWA manifest for Add to Home Screen. *(Web-only — FEA-15 on iOS refers to a different, already-shipped feature.)* |
| FEA-16 | **Home: Continue Watching & Recently Watched** | High | Add personalized sections to the homepage above the Trending/Popular/Top Rated rows, matching the iOS app. **Continue Watching** — horizontal scroll row of watchlist shows that have episode progress tracked (pulled from `show_progress`); shows poster, title, and an "Up to SxEx" progress label. **Recently Watched** — horizontal scroll row of the 6 most recently logged shows from `watched_shows`, ordered by log date. Both sections are hidden when empty. Requires the user to be signed in. *(Web-only — FEA-16 on iOS refers to a different, already-shipped feature. iOS equivalent is FEA-06 + FEA-15.)* |
| FEA-17 | **Recent Searches** | Low | In the search view, show a list of the user's most recent search keywords when the search field is empty (or first focused). Tapping a keyword repopulates the field and triggers the search immediately. Keywords are stored in `localStorage` (max 10 entries, newest first). A "Clear" button removes all recent searches. Persists across sessions; no account required. |
| FEA-18 | **Settings Menu** | Medium | Dedicated Settings page accessible from the Profile page. Organizes account actions and app preferences in one place. **Account** section: Sign Out and Delete Account (moved from the main Profile page). **Preferences** section: placeholder for future app-level settings (e.g. default rating scale, diary sort order). Keeps the Profile page focused on user stats and identity. |
| FEA-20 | **Localization** | Medium | Translate the app UI into multiple languages, automatically matching the user's device language setting. All static strings extracted into i18n resource files. Locale-aware date and number formatting throughout. Falls back to English for unsupported locales. |
| FEA-21 | **Light Mode & System Appearance** | Low | Add a light mode theme and a per-user appearance preference (Dark / Light / System). "System" automatically follows the OS-level light/dark setting. Preference stored in `localStorage` and applied via a CSS class on the root element. All color tokens updated to support both themes. |
| FEA-23 | **Social Sign-In** | Medium | Add one-tap sign-in via Google, Apple, and Facebook as alternatives to email + password. Powered by Supabase OAuth providers. On the auth modal, provider buttons appear above the email form with a divider. On success, Supabase creates or links the account and the app session starts as normal. Apple Sign-In is required for App Store apps that offer other third-party sign-in options. |
| FEA-24 | **Per-Episode Ratings & Reviews** | Medium | Rate (0.5–5 stars) and write an optional review for each individual episode, inline in the season accordion. A star icon on each episode row opens a small rating + notes popover; rated episodes show the star count alongside the episode title. Season headers display the average rating across rated episodes. Data stored in a new `episode_ratings` Supabase table (`user_id`, `show_id`, `season_number`, `episode_number`, `rating`, `review`, `rated_at`). Requires auth; prompts sign-in if unauthenticated. |
| FEA-25 | **Similar Shows** | Medium | "Similar" tab in the show detail modal, powered by TMDB's `GET /tv/{id}/similar` endpoint. Shows a 2-row grid of up to 12 similar shows with poster, title, year, and TMDB rating. Clicking opens a new detail modal. Natural discovery path after finishing a show or browsing its detail page. |
| FEA-26 | **Diary grouped by month/year** | Medium | Group diary entries with sticky month+year section headers (e.g. "May 2026", "April 2026") instead of a flat list. Each group shows an entry count badge. Matches how Letterboxd structures its diary view. Month headers collapse to a count row when there are more than 10 entries in the section. |
| FEA-27 | **Watchlist sort & filter** | Low | Add a sort control above the watchlist grid: sort by Date Added (newest/oldest), Title (A–Z), or TMDB Rating. Optionally filter by genre chip. Selection persists in `localStorage`. Currently shows are just displayed in Supabase query order. |
| FEA-28 | **Currently Airing section** | Low | Add a "Currently Airing" category row on the homepage using TMDB's `GET /tv/on_the_air` endpoint. Sits above or below Trending. Most relevant for active-season watchers who track shows week-to-week. |
| FEA-29 | **Load more for home categories** | Low | Each homepage category (Trending, Popular, Top Rated) currently hard-caps at 6 results. Add a "See all →" button that expands to all 12 results from the TMDB page, or links to a dedicated category page. Pairs with FEA-28 if that row is added. |
| FEA-30 | **Forgot password flow** | Medium | The `AuthModal` has no "Forgot password?" link. Add a "Reset Password" mode that calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: ... })` and shows a confirmation message. On return from the reset link, detect the `#access_token` hash and open a "Set New Password" form. Required for basic account management hygiene. |

### UI

| ID | Item | Priority | Details |
|----|------|----------|---------|
| UI-01 | **Public Profile URL** | Medium | `/u/username` public profile showing watch stats, recent diary entries, top shows, and ratings distribution. Private by default with a toggle to go public. |
| UI-03 | **Mobile search view** | High | Companion to BUG-05. Add a Search tab to the mobile bottom nav (between Home and Watchlist). Tapping it navigates to a dedicated search page with an auto-focused input and the existing search results grid. Replaces the desktop header search on mobile. |
| UI-04 | **Your rating badge on watchlist cards** | Low | In the Watchlist and Profile "Recently Watched" grids, show a small green star badge (e.g. "★ 4") on show cards where the user has a diary entry rating. Overlaid in the bottom-left corner, styled like the TMDB score chip. Reads from the `diary` state to find the most recent rating for each show. |
| UI-05 | **Watchlist quick-remove** | Low | On hover (desktop) show a subtle "✕" icon in the top-left of watchlist cards. Clicking it removes the show from the watchlist without opening the detail modal — the same as pressing "★ In Watchlist" inside the modal, but one click faster. |

---

## ✅ Completed

| ID | Item | Type | Completed |
|----|------|------|-----------|
| FEA-19 | **Profile Picture** — Upload from Profile page, stored in Supabase Storage `avatars/` bucket. Cache-busted URL saved to user metadata. Shown in header and Profile page; falls back to letter badge. Cross-platform (iOS + web) via `getUser()` on load. | Feature → Done | May 15 |
| INF-05 | **Account Deletion** — Profile page delete flow with typed confirmation. Netlify Function deletes all user data from Supabase tables then removes the auth user via Admin API. App Store compliance. | Infra → Done | May 11 |
| FEA-07 | **Season & Episode Tracking** — Season accordion in show detail with per-episode checkboxes. Season-level and series-level bulk mark. Progress bars on watchlist cards. "Up to SxEx" label. `show_progress` Supabase table. | Feature → Done | Apr 10 |
| INF-04 | **User Authentication** — Supabase Auth with email + password. Auth-gated Watchlist/Diary/rating actions. Username support in user metadata. Profile page with stats. | Infra → Done | Apr 8 |
| INF-03 | **Supabase Backend** — Watchlist, diary, and watched state persisted to Supabase. Anonymous sessions via Supabase Auth. RLS-secured tables: `watchlist_entries`, `diary_entries`, `watched_shows`. | Infra → Done | Apr 4 |
| INF-02 | **TMDB Direct API Integration** — Replaced Claude + web_search with direct TMDB REST API calls. Parallel category loading. Real poster/backdrop paths. `VITE_TMDB_API_KEY` as Netlify env var. | Infra → Done | Apr 4 |
| INF-01 | **Netlify Deploy + API Proxy** — App live at showlogd.netlify.app. Netlify Function proxies Anthropic API server-side; key stored as env var. | Infra → Done | Apr 1 |
| FEA-01 | **Show Search** — Search for TV shows via TMDB, returns up to 12 results. | Feature → Done | Apr 1 |
| FEA-02 | **Browsable Categories** — Trending, Top Rated, Currently Airing. | Feature → Done | Apr 1 |
| FEA-03 | **Show Detail Modal** — Backdrop, title, genres, rating, overview, action buttons. | Feature → Done | Apr 1 |
| FEA-04 | **Watchlist** — Add/remove with localStorage → Supabase persistence. | Feature → Done | Apr 1 |
| FEA-05 | **Diary** — Log watch events with date, notes, season. Reverse-chronological view. | Feature → Done | Apr 1 |
| FEA-06 | **Star Ratings** — 0.5–5 stars per show, stored in localStorage → Supabase. | Feature → Done | Apr 1 |

---

## 🚀 Version History

### v1.1 — Apr–May 2026

---

#### v1.1.1
<sub>Published 2026-05-11</sub>

**Account deletion for App Store compliance.**

##### Features
- **Account Deletion** — Users can permanently delete their account from the Profile page. Clicking "Delete Account" reveals a confirmation panel requiring the user to type `DELETE` before proceeding. On confirm, a `POST /api/delete-account` Netlify Function verifies the user's JWT, deletes all rows from `watchlist_entries`, `diary_entries`, `watched_shows`, and `show_progress`, then calls the Supabase Admin API to delete the auth user. The app then signs out and returns to the home screen. Added to satisfy App Store Review Guidelines requirement for account deletion in apps with user authentication.

---

#### v1.1.0
<sub>Published 2026-04-21</sub>

**Branding refresh and iOS app.**

##### Features
- **iOS App** — Native SwiftUI iOS app scaffolded as an Xcode project (`showlog-ios/`). Tabs: Home (continue watching + recent activity), Diary, Watchlist, Profile. Matches web app dark theme and green accent. Generated via xcodegen.

##### UI
- **Custom app icon** — Replaced the 📺 emoji placeholder with a bespoke SVG icon: a TV monitor displaying a show log list, with a highlighted green active row and episode progress bar. Green rounded-square background so it reads clearly against the dark UI.
- **ShowLog wordmark font** — Changed branding font from Playfair Display (serif) to Space Grotesk (modern geometric sans-serif) in the header, auth modal, and footer.
- **Heading font** — Updated all headings (h1, h2, h3) from Playfair Display to Space Grotesk for a consistent modern sans-serif look across the app.
- **Footer branding size** — Increased footer logo and wordmark to 64px / 44px to give the branding more presence.

---

### v1.0 — Apr 2026

---

#### v1.0.3
<sub>Published 2026-04-10</sub>

**Season & episode tracking.**

##### Fixes
- **Email verification redirect** — `signUp` was not passing `emailRedirectTo`, so Supabase defaulted to sending confirmation links pointing at `localhost`. Fixed by passing `options: { emailRedirectTo: "https://showlogd.netlify.app" }` in the `signUp` call. The Supabase project's Site URL and Redirect URLs were also updated in the dashboard to match the production URL.

##### Features
- **FEA-07: Season & Episode Tracking** — Seasons tab in the show detail modal is now a collapsible accordion. Each season has a checkbox to mark all episodes in that season watched (fetches episode list on demand if not yet loaded, then auto-expands). A "Mark All Episodes" series-level button fetches all seasons in parallel and marks every episode at once; toggled to "☑ All Episodes" when complete. Individual episode checkboxes are still available inside each expanded season. Episode progress persists to a new `show_progress` Supabase table (`user_id`, `show_id`, `watched_episodes jsonb`, `total_episodes`). Season headers show a mini progress bar and `X/Y` or `✓ Done` badge without requiring the season to be expanded. Watchlist poster cards show a green progress bar at the bottom and an "Up to SxEx" label below cards where the user has tracked episodes. The show detail header shows total episode progress inline (e.g. `24/96 ep`).

---

#### v1.0.2
<sub>Published 2026-04-08</sub>

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
<sub>Published 2026-04-04</sub>

**Supabase backend — data now persists across devices.**

##### Features
- **INF-03: Supabase Backend** — Replaced in-memory state with Supabase. Schema: `watchlist_entries`, `diary_entries`, `watched_shows` — all with `user_id`, `show_id`, `show_data jsonb`, and timestamps. Row-level security enabled so each user can only access their own data. Anonymous sessions via Supabase Auth ensure data persists per-browser with no sign-up required.

---

#### v1.0.0
<sub>Published 2026-04-04</sub>

**Direct TMDB API integration and version number display.**

##### Features
- **INF-02: TMDB Direct API Integration** — Replaced all Claude + web_search show-data calls with direct TMDB REST API calls. Endpoints: `GET /3/trending/tv/week`, `GET /3/tv/popular`, `GET /3/tv/top_rated`, `GET /3/search/tv`, `GET /3/tv/{id}`, `GET /3/tv/{id}/credits`. Real poster/backdrop paths — no more hallucinated data. All three homepage categories now load in parallel. `VITE_TMDB_API_KEY` stored as Netlify env var.
- **Version display** — Version number injected at build time from `package.json` via Vite `define`. Displayed in the footer as `v{version}`.

---

### v0.2 — Apr 2026

---

#### v0.2.0
<sub>Published 2026-04-01</sub>

**Netlify deployment, server-side API proxy, and build fixes.**

##### Features
- **INF-01: Netlify Deploy** — App deployed to [showlogd.netlify.app](https://showlogd.netlify.app). Build pipeline: `npm run build` → `dist/` published via `netlify.toml`.
- **INF-01b: Netlify Function API Proxy** — Created `netlify/functions/claude.js` — a server-side function that proxies all Anthropic API calls. API key stored as a Netlify env var (`ANTHROPIC_API_KEY`), never exposed in the browser bundle.

##### Fixes
- **BUG-01: Black screen on load** — `index.html` was in `public/` instead of the project root. Vite requires `index.html` at root as the entry point; moved it.
- **BUG-02: Anthropic API calls failing** — `askClaude()` was missing required headers. Fixed by routing calls through the Netlify proxy.
- **BUG-03: Netlify detecting project as Next.js** — `package.json` had stray `next` and `react-scripts` dependencies. Removed both; Netlify now correctly identifies the project as a plain Vite app.
- **BUG-04: Outdated model ID** — `askClaude()` was using a deprecated model ID. Updated to `claude-haiku-4-5-20251001`.

---

### v0.1 — Apr 2026

---

#### v0.1.0
<sub>Published 2026-04-01</sub>

**Core app scaffold: show discovery, watchlist, diary, and ratings.**

##### Features
- **FEA-01: Show Search** — Search for TV shows via Claude + `web_search` tool proxying TMDB. Returns up to 12 results with poster, overview, genre tags, and rating.
- **FEA-02: Browsable Categories** — Homepage shows Trending, Top Rated, and Currently Airing categories.
- **FEA-03: Show Detail Modal** — Backdrop, title, genres, rating, overview, and action buttons.
- **FEA-04: Watchlist** — Add/remove shows to a personal watchlist. Stored in `localStorage`.
- **FEA-05: Diary** — Log a watch event per show (date watched, optional notes, season context). Reverse-chronological log.
- **FEA-06: Star Ratings** — 0.5–5 star ratings per show. Stored in `localStorage`.

---
