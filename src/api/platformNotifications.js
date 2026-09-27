import { requireSupabase } from "./supabaseClient";

export async function listReliabilityScans(limit = 10) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("reliability_scans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message || "Could not load reliability scans.");
  return data || [];
}

export async function listPlatformNotifications(limit = 20) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("platform_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message || "Could not load notifications.");
  return data || [];
}

export async function countUnreadPlatformNotifications() {
  const client = requireSupabase();
  const { count, error } = await client
    .from("platform_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw new Error(error.message || "Could not count notifications.");
  return count || 0;
}

export async function markPlatformNotificationRead(id) {
  const client = requireSupabase();
  const { error } = await client
    .from("platform_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw new Error(error.message || "Could not mark notification read.");
}

export async function markAllPlatformNotificationsRead() {
  const client = requireSupabase();
  const { error } = await client
    .from("platform_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw new Error(error.message || "Could not mark notifications read.");
}
