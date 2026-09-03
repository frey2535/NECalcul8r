import { requireSupabase } from "./supabaseClient";

export async function invokeSupabaseFunction(name, payload = {}) {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke(name, { body: payload });
  if (error) throw error;
  return data;
}
