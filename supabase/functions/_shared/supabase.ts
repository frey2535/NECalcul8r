import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function serviceClient() {
  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Authentication required");

  const client = serviceClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) throw new Error("Authentication required");
  return { client, user: data.user };
}

export async function requireProfile(req: Request) {
  const { client, user } = await requireUser(req);
  const { data: profile, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error || !profile) throw new Error("Profile not found");
  return { client, user, profile };
}
