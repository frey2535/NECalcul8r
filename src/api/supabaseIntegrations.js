import { localIntegrations } from "./localIntegrations";
import { requireSupabase } from "./supabaseClient";

const REPORT_BUCKET = import.meta.env.VITE_SUPABASE_REPORT_BUCKET || "discrepancy-report-attachments";

function safeFileName(name = "attachment") {
  return String(name)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "attachment";
}

function randomSuffix() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function uploadReportFile({ file }) {
  if (!file) throw new Error("No file provided");
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData?.user) throw new Error("Sign in before uploading report attachments.");

  const objectPath = `${userData.user.id}/${Date.now()}-${randomSuffix()}-${safeFileName(file.name)}`;
  const { error } = await client.storage
    .from(REPORT_BUCKET)
    .upload(objectPath, file, {
      cacheControl: "31536000",
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (error) {
    throw new Error(`Attachment upload failed: ${error.message}`);
  }

  const { data } = client.storage.from(REPORT_BUCKET).getPublicUrl(objectPath);
  if (!data?.publicUrl) throw new Error("Attachment upload did not return a public URL.");
  return { file_url: data.publicUrl };
}

export const supabaseIntegrations = {
  Core: {
    ...localIntegrations.Core,
    UploadFile: uploadReportFile,
  },
};
