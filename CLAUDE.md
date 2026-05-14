# ShowLog - TV Show Tracker (Letterboxd for TV)

## Tech Stack
- React (JSX artifacts / Next.js)
- Anthropic API with web_search for TMDB data
- Persistent storage for user data

## Architecture
- Single-page React app
- Uses Anthropic Messages API as backend proxy to search TMDB
- Watchlist, diary, and ratings stored client-side

## Conventions
- Functional components with hooks
- DM Sans / Playfair Display typography
- Dark theme (#0d1117 base)
- Green accent (#00e054)

## Supabase — New Table Boilerplate (effective May 30, 2026)

New tables in the `public` schema are **not** exposed to the Data API by default. Every new `public` table that needs to be accessible via `supabase-js` or PostgREST must include explicit grants and RLS in the same migration:

```sql
grant select on public.<table> to anon;
grant select, insert, update, delete on public.<table> to authenticated;
grant select, insert, update, delete on public.<table> to service_role;

alter table public.<table> enable row level security;

create policy "users can read their own rows"
  on public.<table> for select to authenticated
  using (auth.uid() = user_id);
```

Adjust grants and policies to match the actual access requirements. Never create a table in `public` without this boilerplate if it needs API access.
```

4. **Start developing with Claude Code:**
```
cd showlog
claude