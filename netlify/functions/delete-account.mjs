export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  // Verify the token and get the user
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "apikey": serviceRoleKey,
    },
  });

  if (!userRes.ok) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const userData = await userRes.json();
  const userId = userData.id;

  if (!userId) {
    return new Response(JSON.stringify({ error: "Could not identify user" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const headers = {
    "Content-Type": "application/json",
    "apikey": serviceRoleKey,
    "Authorization": `Bearer ${serviceRoleKey}`,
  };

  // Delete all user data from application tables
  await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/watchlist_entries?user_id=eq.${userId}`, { method: "DELETE", headers }),
    fetch(`${supabaseUrl}/rest/v1/diary_entries?user_id=eq.${userId}`, { method: "DELETE", headers }),
    fetch(`${supabaseUrl}/rest/v1/watched_shows?user_id=eq.${userId}`, { method: "DELETE", headers }),
    fetch(`${supabaseUrl}/rest/v1/show_progress?user_id=eq.${userId}`, { method: "DELETE", headers }),
  ]);

  // Delete the auth user
  const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers,
  });

  if (!deleteRes.ok) {
    const err = await deleteRes.json().catch(() => ({}));
    return new Response(JSON.stringify({ error: err.message || "Failed to delete account" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
};

export const config = { path: "/api/delete-account" };
