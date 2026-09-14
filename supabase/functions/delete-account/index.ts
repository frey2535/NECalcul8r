import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireUser, serviceClient } from "../_shared/supabase.ts";

const REPORT_BUCKET = Deno.env.get("SUPABASE_REPORT_BUCKET") || "discrepancy-report-attachments";

async function removeUserReportAttachments(client: ReturnType<typeof serviceClient>, userId: string) {
  const paths: string[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await client.storage
      .from(REPORT_BUCKET)
      .list(userId, { limit, offset });
    if (error) {
      console.warn("Could not list report attachments for account deletion", error.message);
      break;
    }
    if (!data?.length) break;
    paths.push(...data.filter((item) => item.name).map((item) => `${userId}/${item.name}`));
    if (data.length < limit) break;
    offset += limit;
  }

  if (paths.length === 0) return;
  const { error } = await client.storage.from(REPORT_BUCKET).remove(paths);
  if (error) {
    console.warn("Could not remove all report attachments for account deletion", error.message);
  }
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const { client, user } = await requireUser(req);
    const userId = user.id;

    const { data: profile } = await client
      .from("profiles")
      .select("org_id")
      .eq("id", userId)
      .maybeSingle();

    await removeUserReportAttachments(client, userId);

    if (profile?.org_id) {
      const { count } = await client
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("org_id", profile.org_id)
        .neq("id", userId);

      if (count === 0) {
        const { error: orgError } = await client
          .from("organizations")
          .delete()
          .eq("id", profile.org_id);
        if (orgError) {
          console.warn("Could not remove empty organization during account deletion", orgError.message);
        }
      }
    }

    const { error } = await client.auth.admin.deleteUser(userId);
    if (error) throw error;

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Account deletion failed" },
      error instanceof Error && error.message === "Authentication required" ? 401 : 500,
    );
  }
});
