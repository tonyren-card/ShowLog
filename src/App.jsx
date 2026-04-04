import { useState, useEffect, useCallback, useRef } from "react";

// ── Anthropic API powered TMDB search ──
// Uses Claude + web_search to fetch TV show data since artifacts can't call external APIs directly

const TMDB_IMG = "https://image.tmdb.org/t/p/";

async function askClaude(prompt, systemPrompt) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: systemPrompt || "You are a helpful assistant that returns structured JSON data about TV shows. Always respond with valid JSON only — no markdown, no backticks, no preamble.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok || data.type === "error") throw new Error(data.error?.message || `API ${res.status}`);
  // Extract text from response
  const text = data.content
    ?.filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return text;
}

async function fetchTMDBViaSearch(query) {
  const prompt = `Search TMDB (The Movie Database) for TV shows matching: "${query}"

Return ONLY a JSON array (no markdown, no backticks) of up to 12 TV shows. Each object must have exactly these fields:
{
  "id": number (TMDB ID),
  "name": "show title",
  "overview": "brief description",
  "first_air_date": "YYYY-MM-DD",
  "vote_average": number (0-10),
  "vote_count": number,
  "poster_path": "/path.jpg" or null,
  "backdrop_path": "/path.jpg" or null,
  "genre_names": ["Genre1", "Genre2"]
}

Use real TMDB data from the search results. For poster_path and backdrop_path, use the actual TMDB image paths if found.`;

  const text = await askClaude(prompt);
  try {
    const clean = text.replace(/```json\s?|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    // Try to extract JSON array from the response
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return [];
  }
}

async function fetchShowCategory(category) {
  const prompt = `Search for the current ${category} TV shows on TMDB (The Movie Database) as of 2025-2026.

Return ONLY a JSON array (no markdown, no backticks) of exactly 12 TV shows. Each object must have:
{
  "id": number (real TMDB ID),
  "name": "show title",
  "overview": "brief description",
  "first_air_date": "YYYY-MM-DD",
  "vote_average": number (0-10),
  "vote_count": number,
  "poster_path": "/path.jpg" or null,
  "backdrop_path": "/path.jpg" or null,
  "genre_names": ["Genre1", "Genre2"]
}

Use real TMDB data. Include actual TMDB poster_path values when available.`;

  const text = await askClaude(prompt);
  try {
    const clean = text.replace(/```json\s?|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return [];
  }
}

async function fetchShowDetails(showName, showId) {
  const prompt = `Search for detailed information about the TV show "${showName}" (TMDB ID: ${showId}) on TMDB.

Return ONLY a JSON object (no markdown, no backticks) with:
{
  "id": ${showId},
  "name": "${showName}",
  "overview": "full description",
  "first_air_date": "YYYY-MM-DD",
  "vote_average": number,
  "vote_count": number,
  "poster_path": "/path.jpg" or null,
  "backdrop_path": "/path.jpg" or null,
  "genre_names": ["Genre1"],
  "number_of_seasons": number,
  "status": "Returning Series" or "Ended" etc,
  "networks": ["Network Name"],
  "cast": [{"name": "Actor Name", "character": "Character Name"}] (top 10),
  "seasons": [{"season_number": 1, "episode_count": 10, "name": "Season 1"}]
}`;

  const text = await askClaude(prompt);
  try {
    const clean = text.replace(/```json\s?|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return null;
  }
}

// ── Components ──
const StarRating = ({ rating, size = 16, interactive = false, onChange }) => {
  const [hovered, setHovered] = useState(0);
  const stars5 = (rating || 0) / 2;
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((s) => {
        const val = interactive ? hovered || (onChange ? rating : 0) : stars5;
        const filled = val >= s;
        const half = !filled && val >= s - 0.5;
        return (
          <span key={s} onClick={() => interactive && onChange?.(s)}
            onMouseEnter={() => interactive && setHovered(s)}
            onMouseLeave={() => interactive && setHovered(0)}
            style={{ fontSize: size, cursor: interactive ? "pointer" : "default", color: filled || half ? "#00e054" : "#456", transition: "all 0.15s", transform: interactive && hovered === s ? "scale(1.3)" : "scale(1)", display: "inline-block" }}>★</span>
        );
      })}
    </div>
  );
};

const Placeholder = ({ title, aspect }) => (
  <div style={{ width: "100%", height: "100%", aspectRatio: aspect, background: "linear-gradient(135deg, #1c2228 0%, #2a1538 50%, #1c2228 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#567", fontSize: 12, fontFamily: "'DM Sans',sans-serif", textAlign: "center", padding: 8 }}>
    {title || "No Image"}
  </div>
);

const posterUrl = (path, size = "w500") => path ? `${TMDB_IMG}${size}${path}` : null;
const backdropUrl = (path) => path ? `${TMDB_IMG}w1280${path}` : null;

const ShowCard = ({ show, onClick, delay = 0 }) => {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const img = posterUrl(show.poster_path, "w342");
  return (
    <div onClick={() => onClick(show)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", borderRadius: 8, overflow: "hidden", cursor: "pointer", aspectRatio: "2/3", animation: `fadeSlideUp 0.5s ease ${delay}ms both`, transform: hovered ? "scale(1.03)" : "scale(1)", transition: "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)", boxShadow: hovered ? "0 16px 40px rgba(0,0,0,0.6)" : "0 4px 12px rgba(0,0,0,0.3)" }}>
      {img && !imgError ? <img src={img} alt={show.name} onError={() => setImgError(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
        : <Placeholder title={show.name} />}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "40px 10px 10px", background: "linear-gradient(transparent, rgba(0,0,0,0.9))", opacity: hovered ? 1 : 0, transition: "opacity 0.3s" }}>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{show.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StarRating rating={show.vote_average} size={11} />
          <span style={{ fontSize: 11, color: "#9ab", fontFamily: "'DM Mono',monospace" }}>{(show.first_air_date || "").slice(0, 4)}</span>
        </div>
      </div>
      <div style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 600, color: "#00e054", fontFamily: "'DM Mono',monospace", opacity: hovered ? 1 : 0, transition: "opacity 0.2s" }}>
        {show.vote_average?.toFixed?.(1) || "—"}
      </div>
    </div>
  );
};

const LoadingDots = ({ text = "Loading" }) => {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 400);
    return () => clearInterval(t);
  }, []);
  return <span style={{ color: "#567", fontSize: 14 }}>{text}{dots}</span>;
};

const ShowDetail = ({ show, onClose, watchlist, toggleWatchlist, watched, toggleWatched, addToDiary }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [tab, setTab] = useState("about");

  useEffect(() => {
    setLoading(true);
    fetchShowDetails(show.name, show.id).then(d => { if (d) setDetails(d); }).catch(console.error).finally(() => setLoading(false));
  }, [show.id, show.name]);

  const isInWatchlist = watchlist.has(show.id);
  const isWatched = watched.has(show.id);
  const d = details || show;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", overflowY: "auto", animation: "fadeIn 0.3s ease" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 860, margin: "40px auto", background: "#14181c", borderRadius: 16, overflow: "hidden", border: "1px solid #2c3440", animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ position: "relative", height: 300, overflow: "hidden", background: "#0d1117" }}>
          {backdropUrl(d.backdrop_path) && <img src={backdropUrl(d.backdrop_path)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => e.target.style.display = "none"} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 30%, #14181c 100%)" }} />
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: 18, backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          <div style={{ position: "absolute", bottom: 20, left: 32, width: 90, height: 135, borderRadius: 6, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", border: "1px solid #2c3440", background: "#1c2228" }}>
            {posterUrl(d.poster_path, "w342") ? <img src={posterUrl(d.poster_path, "w342")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => e.target.parentElement.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#456;font-size:11px">No Poster</div>'} /> : <Placeholder />}
          </div>
          <div style={{ position: "absolute", bottom: 24, left: 140, right: 32 }}>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 38, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.1, textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>{d.name}</h1>
            <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "#9ab" }}>{(d.first_air_date || "").slice(0, 4)}</span>
              {details?.number_of_seasons && <><span style={{ color: "#456" }}>•</span><span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "#9ab" }}>{details.number_of_seasons} Season{details.number_of_seasons !== 1 ? "s" : ""}</span></>}
              <span style={{ color: "#456" }}>•</span>
              {(d.genre_names || []).map((g) => <span key={g} style={{ background: "rgba(0,224,84,0.12)", color: "#00e054", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{g}</span>)}
            </div>
          </div>
        </div>

        <div style={{ padding: "0 32px 32px" }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <button onClick={() => toggleWatched(show.id)} style={{ background: isWatched ? "#00e054" : "transparent", border: isWatched ? "none" : "1px solid #456", color: isWatched ? "#14181c" : "#9ab", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.2s" }}>
              {isWatched ? "✓ Watched" : "👁 Mark as Watched"}</button>
            <button onClick={() => toggleWatchlist(show.id)} style={{ background: isInWatchlist ? "rgba(0,224,84,0.15)" : "transparent", border: isInWatchlist ? "1px solid #00e054" : "1px solid #456", color: isInWatchlist ? "#00e054" : "#9ab", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.2s" }}>
              {isInWatchlist ? "★ In Watchlist" : "☆ Add to Watchlist"}</button>
            <button onClick={() => setShowReviewInput(!showReviewInput)} style={{ background: "transparent", border: "1px solid #456", color: "#9ab", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>✎ Log / Review</button>
          </div>

          {showReviewInput && (
            <div style={{ background: "#1c2228", borderRadius: 12, padding: 20, marginBottom: 24, border: "1px solid #2c3440", animation: "fadeIn 0.3s" }}>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: "#9ab", marginRight: 12 }}>Your Rating</span>
                <StarRating rating={userRating} size={24} interactive onChange={setUserRating} />
              </div>
              <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Add your review..."
                style={{ width: "100%", minHeight: 100, background: "#14181c", border: "1px solid #2c3440", borderRadius: 8, color: "#cde", padding: 14, fontFamily: "'DM Sans',sans-serif", fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              <button onClick={() => {
                if (userRating > 0) {
                  addToDiary({ showId: show.id, showData: d, rating: userRating, review: reviewText, date: new Date().toISOString().split("T")[0] });
                  setShowReviewInput(false); setReviewText(""); setUserRating(0);
                }
              }} style={{ marginTop: 12, background: userRating > 0 ? "#00e054" : "#2c3440", color: userRating > 0 ? "#14181c" : "#567", border: "none", padding: "10px 24px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: userRating > 0 ? "pointer" : "default" }}>Save Entry</button>
            </div>
          )}

          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #2c3440", marginBottom: 24 }}>
            {["about", "cast", "seasons"].map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", borderBottom: tab === t ? "2px solid #00e054" : "2px solid transparent", color: tab === t ? "#fff" : "#678", padding: "12px 20px", cursor: "pointer", fontWeight: 600, fontSize: 13, textTransform: "uppercase", letterSpacing: 1, transition: "all 0.2s" }}>{t}</button>
            ))}
          </div>

          {loading && <div style={{ textAlign: "center", padding: 40 }}><LoadingDots text="Fetching details" /></div>}

          {!loading && tab === "about" && (
            <div style={{ animation: "fadeIn 0.3s" }}>
              <p style={{ fontSize: 15, color: "#9ab", lineHeight: 1.7, margin: 0 }}>{d.overview || "No overview available."}</p>
              <div style={{ display: "flex", gap: 40, marginTop: 24, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#567", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Rating</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StarRating rating={d.vote_average} size={16} />
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, color: "#00e054", fontWeight: 700 }}>{d.vote_average?.toFixed?.(1) || "—"}</span>
                  </div>
                </div>
                {d.vote_count && <div>
                  <div style={{ fontSize: 11, color: "#567", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Votes</div>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, color: "#fff" }}>{d.vote_count?.toLocaleString?.() || d.vote_count}</span>
                </div>}
                {details?.networks?.length > 0 && <div>
                  <div style={{ fontSize: 11, color: "#567", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Network</div>
                  <span style={{ fontSize: 15, color: "#fff" }}>{details.networks.join(", ")}</span>
                </div>}
                {details?.status && <div>
                  <div style={{ fontSize: 11, color: "#567", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Status</div>
                  <span style={{ fontSize: 15, color: details.status === "Returning Series" ? "#00e054" : "#9ab" }}>{details.status}</span>
                </div>}
              </div>
            </div>
          )}

          {!loading && tab === "cast" && details?.cast && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, animation: "fadeIn 0.3s" }}>
              {details.cast.slice(0, 12).map((p, i) => (
                <div key={i} style={{ background: "#1c2228", borderRadius: 8, padding: 14, border: "1px solid #2c3440" }}>
                  <div style={{ fontSize: 14, color: "#cde", fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "#567", marginTop: 2 }}>as {p.character}</div>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === "seasons" && details?.seasons && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, animation: "fadeIn 0.3s" }}>
              {details.seasons.map((s, i) => (
                <div key={i} style={{ background: "#1c2228", borderRadius: 8, padding: 14, border: "1px solid #2c3440" }}>
                  <div style={{ fontSize: 14, color: "#cde", fontWeight: 600 }}>{s.name || `Season ${s.season_number}`}</div>
                  <div style={{ fontSize: 12, color: "#567", marginTop: 4 }}>{s.episode_count} episodes</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main App ──
export default function ShowLog() {
  const [currentView, setCurrentView] = useState("home");
  const [selectedShow, setSelectedShow] = useState(null);
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const [watchlist, setWatchlist] = useState(new Set());
  const [watched, setWatched] = useState(new Set());
  const [diary, setDiary] = useState([]);
  const showCache = useRef(new Map());

  const toggleWatchlist = (id) => setWatchlist(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleWatched = (id) => setWatched(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const addToDiary = (entry) => { setDiary(prev => [entry, ...prev]); toggleWatched(entry.showId); if (entry.showData) showCache.current.set(entry.showId, entry.showData); };

  const handleShowClick = (show) => { setSelectedShow(show); showCache.current.set(show.id, show); };

  // Load initial data (sequential to avoid rate limits)
  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const t = await fetchShowCategory("trending");
        const p = await fetchShowCategory("most popular");
        const tr = await fetchShowCategory("top rated critically acclaimed");
        setTrending(t); setPopular(p); setTopRated(tr);
        [...t, ...p, ...tr].forEach(s => showCache.current.set(s.id, s));
      } catch (e) {
        setError("Failed to load shows. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      setSearching(true);
      fetchTMDBViaSearch(searchQuery).then(r => { setSearchResults(r); r.forEach(s => showCache.current.set(s.id, s)); }).finally(() => setSearching(false));
    }, 600);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const navItems = [
    { key: "home", label: "Home", icon: "◉" },
    { key: "watchlist", label: "Watchlist", icon: "☆" },
    { key: "diary", label: "Diary", icon: "◔" },
    { key: "profile", label: "Profile", icon: "⬡" },
  ];

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", color: "#cde", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #2c3440; border-radius: 3px; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 20px rgba(0,224,84,0.1); } 50% { box-shadow: 0 0 30px rgba(0,224,84,0.2); } }
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        textarea:focus, input:focus { outline: none; }
      `}</style>

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(13,17,23,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(44,52,64,0.5)", padding: "0 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => { setCurrentView("home"); setSearchQuery(""); }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #00e054, #00b848)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📺</div>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>ShowLog</span>
          </div>
          <nav style={{ display: "flex", gap: 4 }}>
            {navItems.map(item => (
              <button key={item.key} onClick={() => { setCurrentView(item.key); setSearchQuery(""); }}
                style={{ background: currentView === item.key ? "rgba(0,224,84,0.1)" : "transparent", border: "none", color: currentView === item.key ? "#00e054" : "#678", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>{item.label}
              </button>
            ))}
          </nav>
          <div style={{ position: "relative" }}>
            <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if (e.target.value) setCurrentView("search"); }}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} placeholder="Search TV shows..."
              style={{ background: searchFocused ? "#1c2228" : "#14181c", border: searchFocused ? "1px solid #00e054" : "1px solid #2c3440", borderRadius: 8, color: "#cde", padding: "8px 14px 8px 36px", fontSize: 13, width: searchFocused ? 280 : 220, transition: "all 0.3s" }} />
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#567" }}>⌕</span>
          </div>
        </div>
      </header>

      {/* Loading state */}
      {loading && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
          <div style={{ textAlign: "center", padding: "60px 0 40px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #00e054, #00b848)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 20px" }}>📺</div>
            <LoadingDots text="Loading TV shows from TMDB" />
            <p style={{ color: "#456", fontSize: 12, marginTop: 8 }}>Powered by Claude + TMDB web search</p>
          </div>
          {/* Skeleton cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, marginTop: 24 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ aspectRatio: "2/3", borderRadius: 8, background: "linear-gradient(90deg, #14181c 25%, #1c2228 50%, #14181c 75%)", backgroundSize: "800px", animation: "shimmer 1.5s infinite", animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </div>
      )}

      {error && <div style={{ textAlign: "center", padding: 80, color: "#ff4444", fontSize: 14 }}>{error}</div>}

      {!loading && !error && (
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

          {/* HOME */}
          {currentView === "home" && (
            <div>
              {trending[0] && (
                <div onClick={() => handleShowClick(trending[0])} style={{ position: "relative", margin: "24px 0", borderRadius: 16, overflow: "hidden", height: 380, animation: "fadeIn 0.6s", cursor: "pointer" }}>
                  {backdropUrl(trending[0].backdrop_path) && <img src={backdropUrl(trending[0].backdrop_path)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => e.target.style.display = "none"} />}
                  <div style={{ position: "absolute", inset: 0, background: trending[0].backdrop_path ? "linear-gradient(90deg, rgba(13,17,23,0.95) 35%, transparent 70%)" : "linear-gradient(135deg, #1a2744, #0d1117)" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 50%, rgba(13,17,23,1))" }} />
                  {posterUrl(trending[0].poster_path, "w342") && (
                    <div style={{ position: "absolute", top: 40, right: 40, width: 130, height: 195, borderRadius: 8, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <img src={posterUrl(trending[0].poster_path, "w342")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => e.target.parentElement.style.display = "none"} />
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 48, left: 48, maxWidth: 500 }}>
                    <div style={{ fontSize: 11, color: "#00e054", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>Trending</div>
                    <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 44, fontWeight: 900, color: "#fff", lineHeight: 1, marginBottom: 12 }}>{trending[0].name}</h2>
                    <p style={{ fontSize: 14, color: "#9ab", lineHeight: 1.6, marginBottom: 16, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{trending[0].overview}</p>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <StarRating rating={trending[0].vote_average} size={16} />
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: "#00e054" }}>{trending[0].vote_average?.toFixed?.(1)}</span>
                    </div>
                  </div>
                </div>
              )}

              {[["Trending", trending.slice(1, 7)], ["Popular", popular.slice(0, 6)], ["Top Rated", topRated.slice(0, 6)]].map(([title, shows]) => shows.length > 0 && (
                <section key={title} style={{ marginBottom: 48 }}>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 20 }}>{title}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
                    {shows.map((s, i) => <ShowCard key={s.id} show={s} onClick={handleShowClick} delay={i * 70} />)}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* SEARCH */}
          {currentView === "search" && (
            <div style={{ paddingTop: 32 }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                {searchQuery ? `Results for "${searchQuery}"` : "Search for a show"}
              </h2>
              {searching ? (
                <div style={{ padding: "40px 0" }}><LoadingDots text="Searching TMDB" /></div>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: "#678", marginBottom: 28 }}>{searchResults.length} result{searchResults.length !== 1 ? "s" : ""}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
                    {searchResults.map((s, i) => <ShowCard key={s.id} show={s} onClick={handleShowClick} delay={i * 50} />)}
                  </div>
                </>
              )}
            </div>
          )}

          {/* WATCHLIST */}
          {currentView === "watchlist" && (
            <div style={{ paddingTop: 32 }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Your Watchlist</h2>
              <p style={{ fontSize: 14, color: "#678", marginBottom: 28 }}>{watchlist.size} show{watchlist.size !== 1 ? "s" : ""} queued</p>
              {watchlist.size > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
                  {[...watchlist].map((id, i) => { const s = showCache.current.get(id); return s ? <ShowCard key={id} show={s} onClick={handleShowClick} delay={i * 70} /> : null; })}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 80, color: "#456" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>☆</div>
                  <p style={{ fontSize: 16, fontWeight: 600 }}>Your watchlist is empty</p>
                  <p style={{ fontSize: 14, marginTop: 8 }}>Click any show and add it to your watchlist</p>
                </div>
              )}
            </div>
          )}

          {/* DIARY */}
          {currentView === "diary" && (
            <div style={{ paddingTop: 32 }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Your Diary</h2>
              <p style={{ fontSize: 14, color: "#678", marginBottom: 28 }}>Your personal TV journal</p>
              {diary.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {diary.map((entry, i) => {
                    const show = entry.showData;
                    if (!show) return null;
                    return (
                      <div key={i} onClick={() => handleShowClick(show)}
                        style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", background: i % 2 === 0 ? "#14181c" : "transparent", borderRadius: 8, cursor: "pointer", animation: `fadeSlideUp 0.4s ease ${i * 60}ms both`, transition: "background 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#1c2228"} onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#14181c" : "transparent"}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#567", width: 90, flexShrink: 0 }}>{entry.date}</span>
                        <div style={{ width: 36, height: 54, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: "#1c2228" }}>
                          {posterUrl(show.poster_path, "w92") ? <img src={posterUrl(show.poster_path, "w92")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Placeholder />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>{show.name}</div>
                          {entry.review && <div style={{ fontSize: 12, color: "#678", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.review}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {[...Array(entry.rating)].map((_, j) => <span key={j} style={{ color: "#00e054", fontSize: 14 }}>★</span>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 80, color: "#456" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>◔</div>
                  <p style={{ fontSize: 16, fontWeight: 600 }}>No diary entries yet</p>
                </div>
              )}
            </div>
          )}

          {/* PROFILE */}
          {currentView === "profile" && (
            <div style={{ paddingTop: 32 }}>
              <div style={{ display: "flex", gap: 32, marginBottom: 40, alignItems: "center", animation: "fadeIn 0.5s" }}>
                <div style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg, #00e054, #40bcf4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 900, color: "#14181c", fontFamily: "'Playfair Display',serif", animation: "pulseGlow 3s ease infinite" }}>Y</div>
                <div>
                  <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 4 }}>ShowLog User</h2>
                  <p style={{ fontSize: 14, color: "#678", marginBottom: 12 }}>Powered by Claude + TMDB</p>
                  <div style={{ display: "flex", gap: 32 }}>
                    {[["Watched", watched.size, "#00e054"], ["Diary", diary.length, "#fff"], ["Watchlist", watchlist.size, "#fff"]].map(([label, val, color]) => (
                      <div key={label}><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 24, fontWeight: 700, color }}>{val}</div><div style={{ fontSize: 11, color: "#567", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div></div>
                    ))}
                  </div>
                </div>
              </div>
              {watched.size > 0 && (
                <>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Recently Watched</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
                    {[...watched].slice(-6).reverse().map((id, i) => { const s = showCache.current.get(id); return s ? <ShowCard key={id} show={s} onClick={handleShowClick} delay={i * 70} /> : null; })}
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      )}

      <footer style={{ borderTop: "1px solid #1c2228", marginTop: 64, padding: "32px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>📺</span>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: "#456" }}>ShowLog</span>
          </div>
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#345" }}>Powered by Claude AI + TMDB Data</p>
        </div>
      </footer>

      {selectedShow && <ShowDetail show={selectedShow} onClose={() => setSelectedShow(null)} watchlist={watchlist} toggleWatchlist={toggleWatchlist} watched={watched} toggleWatched={toggleWatched} addToDiary={addToDiary} />}
    </div>
  );
}
