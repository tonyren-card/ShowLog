import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";

const TMDB_IMG = "https://image.tmdb.org/t/p/";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;

const GENRE_MAP = {
  10759: "Action & Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 10762: "Kids",
  9648: "Mystery", 10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy",
  10766: "Soap", 10767: "Talk", 10768: "War & Politics", 37: "Western",
};

async function tmdb(path, params = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

function normalizeShow(s) {
  return {
    id: s.id,
    name: s.name,
    overview: s.overview,
    first_air_date: s.first_air_date,
    vote_average: s.vote_average,
    vote_count: s.vote_count,
    poster_path: s.poster_path,
    backdrop_path: s.backdrop_path,
    genre_names: (s.genre_ids || s.genres?.map(g => g.id) || []).map(id => GENRE_MAP[id]).filter(Boolean),
  };
}

async function fetchTMDBViaSearch(query) {
  const data = await tmdb("/search/tv", { query, page: 1 });
  return data.results.slice(0, 12).map(normalizeShow);
}

async function fetchShowCategory(category) {
  const endpoints = {
    trending: "/trending/tv/week",
    "most popular": "/tv/popular",
    "top rated critically acclaimed": "/tv/top_rated",
  };
  const data = await tmdb(endpoints[category] || "/tv/popular");
  return data.results.slice(0, 12).map(normalizeShow);
}

async function fetchShowDetails(showName, showId) {
  const [details, credits] = await Promise.all([
    tmdb(`/tv/${showId}`),
    tmdb(`/tv/${showId}/credits`),
  ]);
  return {
    id: details.id,
    name: details.name,
    overview: details.overview,
    first_air_date: details.first_air_date,
    vote_average: details.vote_average,
    vote_count: details.vote_count,
    poster_path: details.poster_path,
    backdrop_path: details.backdrop_path,
    genre_names: details.genres?.map(g => g.name) || [],
    number_of_seasons: details.number_of_seasons,
    status: details.status,
    networks: details.networks?.map(n => n.name) || [],
    cast: credits.cast?.slice(0, 10).map(c => ({ name: c.name, character: c.character })) || [],
    seasons: details.seasons?.map(s => ({ season_number: s.season_number, episode_count: s.episode_count, name: s.name })) || [],
  };
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
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [tab, setTab] = useState("about");
  const today = new Date().toISOString().split("T")[0];

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
            <button onClick={() => toggleWatched(show.id, d)} style={{ background: isWatched ? "#00e054" : "transparent", border: isWatched ? "none" : "1px solid #456", color: isWatched ? "#14181c" : "#9ab", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.2s" }}>
              {isWatched ? "✓ Watched" : "👁 Mark as Watched"}</button>
            <button onClick={() => toggleWatchlist(show.id, d)} style={{ background: isInWatchlist ? "rgba(0,224,84,0.15)" : "transparent", border: isInWatchlist ? "1px solid #00e054" : "1px solid #456", color: isInWatchlist ? "#00e054" : "#9ab", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.2s" }}>
              {isInWatchlist ? "★ In Watchlist" : "☆ Add to Watchlist"}</button>
            <button onClick={() => setShowReviewInput(!showReviewInput)} style={{ background: "transparent", border: "1px solid #456", color: "#9ab", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>✎ Log / Review</button>
          </div>

          {showReviewInput && (
            <div style={{ background: "#1c2228", borderRadius: 12, padding: 20, marginBottom: 24, border: "1px solid #2c3440", animation: "fadeIn 0.3s" }}>
              <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#567", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Date Watched</div>
                  <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} max={today}
                    style={{ background: "#14181c", border: "1px solid #2c3440", borderRadius: 6, color: "#cde", padding: "7px 10px", fontSize: 13, fontFamily: "'DM Mono',monospace" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#567", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Your Rating</div>
                  <StarRating rating={userRating} size={24} interactive onChange={setUserRating} />
                </div>
              </div>
              <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Add your review..."
                style={{ width: "100%", minHeight: 100, background: "#14181c", border: "1px solid #2c3440", borderRadius: 8, color: "#cde", padding: 14, fontFamily: "'DM Sans',sans-serif", fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              <button onClick={() => {
                if (userRating > 0) {
                  addToDiary({ showId: show.id, showData: d, rating: userRating, review: reviewText, date: logDate });
                  setShowReviewInput(false); setReviewText(""); setUserRating(0); setLogDate(today);
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

// ── Diary Entry ──
const DiaryEntry = ({ entry, index, onUpdate, onDelete, onShowClick }) => {
  const today = new Date().toISOString().split("T")[0];
  const [editing, setEditing] = useState(false);
  const [draftRating, setDraftRating] = useState(entry.rating || 0);
  const [draftReview, setDraftReview] = useState(entry.review || "");
  const [draftDate, setDraftDate] = useState(entry.date || today);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const show = entry.showData;
  if (!show) return null;

  const save = async () => {
    setSaving(true);
    await onUpdate(entry.id, { rating: draftRating, review: draftReview, date: draftDate });
    setEditing(false);
    setSaving(false);
  };

  const rowBg = index % 2 === 0 ? "#14181c" : "transparent";

  return (
    <div style={{ animation: `fadeSlideUp 0.4s ease ${index * 60}ms both` }}>
      {!editing ? (
        <div onClick={() => onShowClick(show)}
          style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", background: rowBg, borderRadius: 8, cursor: "pointer", transition: "background 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.background = "#1c2228"}
          onMouseLeave={e => e.currentTarget.style.background = rowBg}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#567", width: 90, flexShrink: 0 }}>{entry.date}</span>
          <div style={{ width: 36, height: 54, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: "#1c2228" }}>
            {posterUrl(show.poster_path, "w92") ? <img src={posterUrl(show.poster_path, "w92")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Placeholder />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>{show.name}</div>
            {entry.review && <div style={{ fontSize: 12, color: "#678", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.review}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 3 }}>
              {[...Array(entry.rating || 0)].map((_, j) => <span key={j} style={{ color: "#00e054", fontSize: 14 }}>★</span>)}
            </div>
            <button onClick={e => { e.stopPropagation(); setDraftRating(entry.rating || 0); setDraftReview(entry.review || ""); setDraftDate(entry.date || today); setEditing(true); }}
              style={{ background: "none", border: "none", color: "#456", fontSize: 15, cursor: "pointer", padding: "4px 6px", borderRadius: 6, lineHeight: 1 }}>✎</button>
          </div>
        </div>
      ) : (
        <div style={{ background: "#1c2228", borderRadius: 8, padding: 16, margin: "2px 0", border: "1px solid #2c3440" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 36, height: 54, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: "#14181c" }}>
              {posterUrl(show.poster_path, "w92") ? <img src={posterUrl(show.poster_path, "w92")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Placeholder />}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>{show.name}</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#567", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Date Watched</div>
                  <input type="date" value={draftDate} onChange={e => setDraftDate(e.target.value)} max={today}
                    style={{ background: "#0d1117", border: "1px solid #2c3440", borderRadius: 6, color: "#cde", padding: "6px 10px", fontSize: 13, fontFamily: "'DM Mono',monospace" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#567", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Rating</div>
                  <StarRating rating={draftRating} size={20} interactive onChange={setDraftRating} />
                </div>
              </div>
              <textarea value={draftReview} onChange={e => setDraftReview(e.target.value)} placeholder="Add your review..."
                style={{ background: "#0d1117", border: "1px solid #2c3440", borderRadius: 6, color: "#cde", padding: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", resize: "vertical", minHeight: 70, outline: "none", width: "100%", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={save} disabled={saving || draftRating === 0}
                    style={{ background: draftRating > 0 ? "#00e054" : "#2c3440", color: draftRating > 0 ? "#14181c" : "#567", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: draftRating > 0 && !saving ? "pointer" : "default" }}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button onClick={() => { setEditing(false); setConfirmingDelete(false); }}
                    style={{ background: "transparent", border: "1px solid #456", color: "#9ab", borderRadius: 6, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                </div>
                {!confirmingDelete ? (
                  <button onClick={() => setConfirmingDelete(true)}
                    style={{ background: "transparent", border: "1px solid #5a2020", color: "#a05050", borderRadius: 6, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Delete</button>
                ) : (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#9ab" }}>Remove this entry?</span>
                    <button onClick={() => onDelete(entry.id)}
                      style={{ background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Yes, delete</button>
                    <button onClick={() => setConfirmingDelete(false)}
                      style={{ background: "transparent", border: "1px solid #456", color: "#9ab", borderRadius: 6, padding: "6px 10px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>No</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Profile View ──
const ProfileView = ({ user, setUser, watched, diary, watchlist, showCache, handleShowClick }) => {
  const username = user.user_metadata?.username || "";
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(username);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const displayName = username || user.email;
  const avatarLetter = (username?.[0] || user.email?.[0] || "U").toUpperCase();

  const saveUsername = async () => {
    const trimmed = input.trim();
    if (!trimmed) { setError("Username can't be empty."); return; }
    setSaving(true); setError("");
    const { data, error: err } = await supabase.auth.updateUser({ data: { username: trimmed } });
    if (err) { setError(err.message); setSaving(false); return; }
    setUser(data.user);
    setEditing(false);
    setSaving(false);
  };

  return (
    <>
      <div style={{ display: "flex", gap: 32, marginBottom: 40, alignItems: "center", animation: "fadeIn 0.5s", flexWrap: "wrap" }}>
        <div style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg, #00e054, #40bcf4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 900, color: "#14181c", fontFamily: "'Playfair Display',serif", animation: "pulseGlow 3s ease infinite", flexShrink: 0 }}>
          {avatarLetter}
        </div>
        <div style={{ flex: 1 }}>
          {editing ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
              <input value={input} onChange={e => { setInput(e.target.value); setError(""); }} onKeyDown={e => { if (e.key === "Enter") saveUsername(); if (e.key === "Escape") setEditing(false); }} autoFocus placeholder="Enter username"
                style={{ background: "#1c2228", border: "1px solid #00e054", borderRadius: 8, color: "#fff", padding: "8px 14px", fontSize: 22, fontFamily: "'Playfair Display',serif", fontWeight: 700, width: 260, outline: "none" }} />
              <button onClick={saveUsername} disabled={saving} style={{ background: "#00e054", color: "#14181c", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: saving ? "default" : "pointer" }}>{saving ? "Saving…" : "Save"}</button>
              <button onClick={() => { setEditing(false); setInput(username); setError(""); }} style={{ background: "transparent", border: "1px solid #456", color: "#9ab", borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              {error && <p style={{ fontSize: 13, color: "#ff6b6b", margin: 0, width: "100%" }}>{error}</p>}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: "#fff", margin: 0 }}>{displayName}</h2>
              <button onClick={() => { setInput(username); setEditing(true); }} title="Edit username" style={{ background: "none", border: "none", color: "#567", fontSize: 16, cursor: "pointer", padding: "4px 6px", borderRadius: 6, lineHeight: 1 }}>✎</button>
            </div>
          )}
          {username && <p style={{ fontSize: 13, color: "#456", marginBottom: 4 }}>{user.email}</p>}
          <p style={{ fontSize: 13, color: "#567", marginBottom: 16 }}>Member since {new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
          <div style={{ display: "flex", gap: 32, marginBottom: 20 }}>
            {[["Watched", watched.size, "#00e054"], ["Diary", diary.length, "#fff"], ["Watchlist", watchlist.size, "#fff"]].map(([label, val, color]) => (
              <div key={label}><div style={{ fontFamily: "'DM Mono',monospace", fontSize: 24, fontWeight: 700, color }}>{val}</div><div style={{ fontSize: 11, color: "#567", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div></div>
            ))}
          </div>
          <button onClick={() => supabase.auth.signOut()} style={{ background: "transparent", border: "1px solid #456", color: "#9ab", borderRadius: 8, padding: "8px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Sign Out</button>
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
    </>
  );
};

// ── Auth Modal ──
const AuthModal = ({ onClose }) => {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMessage(error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setMessage(error.message);
        else setMessage("Check your email to confirm your account, then sign in.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = { width: "100%", background: "#14181c", border: "1px solid #2c3440", borderRadius: 8, color: "#cde", padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" };
  const isError = message && !message.includes("Check your email");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#14181c", borderRadius: 16, border: "1px solid #2c3440", padding: 40, width: 380, animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #00e054, #00b848)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📺</div>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 900, color: "#fff" }}>ShowLog</span>
        </div>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{mode === "signin" ? "Welcome back" : "Create account"}</h2>
        <p style={{ fontSize: 13, color: "#678", marginBottom: 24 }}>{mode === "signin" ? "Sign in to access your watchlist and diary." : "Track what you watch, rate your favorites."}</p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
          {message && <p style={{ fontSize: 13, color: isError ? "#ff6b6b" : "#00e054", margin: 0 }}>{message}</p>}
          <button type="submit" disabled={submitting} style={{ background: submitting ? "#2c3440" : "#00e054", color: submitting ? "#567" : "#14181c", border: "none", borderRadius: 8, padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: submitting ? "default" : "pointer", transition: "all 0.2s" }}>
            {submitting ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>
        <p style={{ textAlign: "center", fontSize: 13, color: "#678", marginTop: 20 }}>
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }} style={{ background: "none", border: "none", color: "#00e054", cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0 }}>
            {mode === "signin" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};

// ── Auth Gate Banner ──
const AuthBanner = ({ onSignIn, message }) => (
  <div style={{ textAlign: "center", padding: 80, color: "#456" }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
    <p style={{ fontSize: 16, fontWeight: 600, color: "#9ab", marginBottom: 8 }}>{message}</p>
    <p style={{ fontSize: 14, marginBottom: 24 }}>Sign in to access this feature</p>
    <button onClick={onSignIn} style={{ background: "#00e054", color: "#14181c", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Sign In / Create Account</button>
  </div>
);

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
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const showCache = useRef(new Map());

  const requireAuth = () => { if (!user) { setShowAuthModal(true); return false; } return true; };

  const loadUserData = useCallback(async (uid) => {
    const [watchlistRes, diaryRes, watchedRes] = await Promise.allSettled([
      supabase.from("watchlist_entries").select("show_id, show_data").eq("user_id", uid),
      supabase.from("diary_entries").select("*").eq("user_id", uid).order("watched_at", { ascending: false }),
      supabase.from("watched_shows").select("show_id, show_data").eq("user_id", uid),
    ]);
    if (watchlistRes.status === "fulfilled" && watchlistRes.value.data) {
      setWatchlist(new Set(watchlistRes.value.data.map(e => e.show_id)));
      watchlistRes.value.data.forEach(e => { if (e.show_data) showCache.current.set(e.show_id, e.show_data); });
    }
    if (diaryRes.status === "fulfilled" && diaryRes.value.data) {
      setDiary(diaryRes.value.data.map(e => ({ id: e.id, showId: e.show_id, showData: e.show_data, rating: e.rating, review: e.notes, date: e.watched_at })));
    }
    if (watchedRes.status === "fulfilled" && watchedRes.value.data) {
      setWatched(new Set(watchedRes.value.data.map(e => e.show_id)));
      watchedRes.value.data.forEach(e => { if (e.show_data) showCache.current.set(e.show_id, e.show_data); });
    }
  }, []);

  const toggleWatchlist = async (id, showData) => {
    if (!requireAuth()) return;
    const uid = user.id;
    const data = showData || showCache.current.get(id);
    if (watchlist.has(id)) {
      setWatchlist(prev => { const n = new Set(prev); n.delete(id); return n; });
      await supabase.from("watchlist_entries").delete().eq("user_id", uid).eq("show_id", id);
    } else {
      setWatchlist(prev => { const n = new Set(prev); n.add(id); return n; });
      await supabase.from("watchlist_entries").upsert({ user_id: uid, show_id: id, show_data: data });
    }
  };

  const toggleWatched = async (id, showData) => {
    if (!requireAuth()) return;
    const uid = user.id;
    const data = showData || showCache.current.get(id);
    if (watched.has(id)) {
      setWatched(prev => { const n = new Set(prev); n.delete(id); return n; });
      await supabase.from("watched_shows").delete().eq("user_id", uid).eq("show_id", id);
    } else {
      setWatched(prev => { const n = new Set(prev); n.add(id); return n; });
      await supabase.from("watched_shows").upsert({ user_id: uid, show_id: id, show_data: data });
    }
  };

  const addToDiary = async (entry) => {
    if (!requireAuth()) return;
    const uid = user.id;
    if (entry.showData) showCache.current.set(entry.showId, entry.showData);
    const tasks = [
      supabase.from("diary_entries").insert({
        user_id: uid,
        show_id: entry.showId,
        show_data: entry.showData,
        watched_at: entry.date,
        notes: entry.review,
        rating: entry.rating,
      }).select("id").single(),
    ];
    if (!watched.has(entry.showId)) {
      tasks.push(toggleWatched(entry.showId, entry.showData));
    }
    const [insertResult] = await Promise.all(tasks);
    setDiary(prev => [{ ...entry, id: insertResult.data?.id }, ...prev]);
  };

  const updateDiaryEntry = async (entryId, updates) => {
    setDiary(prev => prev.map(e => e.id === entryId ? { ...e, ...updates } : e));
    await supabase.from("diary_entries").update({
      watched_at: updates.date,
      notes: updates.review,
      rating: updates.rating,
    }).eq("id", entryId).eq("user_id", user.id);
  };

  const deleteDiaryEntry = async (entryId) => {
    setDiary(prev => prev.filter(e => e.id !== entryId));
    await supabase.from("diary_entries").delete().eq("id", entryId).eq("user_id", user.id);
  };

  const handleShowClick = (show) => { setSelectedShow(show); showCache.current.set(show.id, show); };

  // Load TMDB shows + restore session on mount
  useEffect(() => {
    setLoading(true);
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadUserData(session.user.id);
      }
      const showResults = await Promise.allSettled([
        fetchShowCategory("trending"),
        fetchShowCategory("most popular"),
        fetchShowCategory("top rated critically acclaimed"),
      ]);
      const [t, p, tr] = showResults.map(r => r.status === "fulfilled" ? r.value : []);
      if (t.length) { setTrending(t); setPopular(p); setTopRated(tr); [...t, ...p, ...tr].forEach(s => showCache.current.set(s.id, s)); }
      else setError("Failed to load shows. Please refresh and try again.");
      setLoading(false);
    }
    init().catch(() => { setError("Failed to initialize. Please refresh."); setLoading(false); });
  }, [loadUserData]);

  // Auth state changes (sign in / sign out)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        await loadUserData(session.user.id);
        setShowAuthModal(false);
      } else if (event === "USER_UPDATED" && session?.user) {
        setUser(session.user);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setWatchlist(new Set());
        setWatched(new Set());
        setDiary([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [loadUserData]);

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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if (e.target.value) setCurrentView("search"); }}
                onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} placeholder="Search TV shows..."
                style={{ background: searchFocused ? "#1c2228" : "#14181c", border: searchFocused ? "1px solid #00e054" : "1px solid #2c3440", borderRadius: 8, color: "#cde", padding: "8px 14px 8px 36px", fontSize: 13, width: searchFocused ? 240 : 200, transition: "all 0.3s" }} />
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#567" }}>⌕</span>
            </div>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div onClick={() => { setCurrentView("profile"); setSearchQuery(""); }} title={user.user_metadata?.username || user.email} style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #00e054, #40bcf4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#14181c", cursor: "pointer", flexShrink: 0 }}>
                  {(user.user_metadata?.username?.[0] || user.email?.[0] || "U").toUpperCase()}
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} style={{ background: "#00e054", color: "#14181c", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>Sign In</button>
            )}
          </div>
        </div>
      </header>

      {/* Loading state */}
      {loading && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
          <div style={{ textAlign: "center", padding: "60px 0 40px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #00e054, #00b848)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 20px" }}>📺</div>
            <LoadingDots text="Loading TV shows from TMDB" />
            <p style={{ color: "#456", fontSize: 12, marginTop: 8 }}>Powered by TMDB</p>
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
              {!user ? (
                <AuthBanner onSignIn={() => setShowAuthModal(true)} message="Your watchlist lives here" />
              ) : (
                <>
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
                </>
              )}
            </div>
          )}

          {/* DIARY */}
          {currentView === "diary" && (
            <div style={{ paddingTop: 32 }}>
              {!user ? (
                <AuthBanner onSignIn={() => setShowAuthModal(true)} message="Your diary lives here" />
              ) : (
                <>
                  <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Your Diary</h2>
                  <p style={{ fontSize: 14, color: "#678", marginBottom: 28 }}>Your personal TV journal</p>
                  {diary.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {diary.map((entry, i) => (
                        <DiaryEntry key={entry.id || i} entry={entry} index={i} onUpdate={updateDiaryEntry} onDelete={deleteDiaryEntry} onShowClick={handleShowClick} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: 80, color: "#456" }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>◔</div>
                      <p style={{ fontSize: 16, fontWeight: 600 }}>No diary entries yet</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* PROFILE */}
          {currentView === "profile" && (
            <div style={{ paddingTop: 32 }}>
              {!user ? (
                <AuthBanner onSignIn={() => setShowAuthModal(true)} message="Sign in to see your profile" />
              ) : (
                <ProfileView user={user} setUser={setUser} watched={watched} diary={diary} watchlist={watchlist} showCache={showCache} handleShowClick={handleShowClick} />
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
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#345" }}>Powered by TMDB · v{__APP_VERSION__}</p>
        </div>
      </footer>

      {selectedShow && <ShowDetail show={selectedShow} onClose={() => setSelectedShow(null)} watchlist={watchlist} toggleWatchlist={toggleWatchlist} watched={watched} toggleWatched={toggleWatched} addToDiary={addToDiary} />}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
