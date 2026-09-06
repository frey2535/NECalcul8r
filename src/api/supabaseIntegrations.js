import { localIntegrations } from "./localIntegrations";
import { requireSupabase } from "./supabaseClient";

const REPORT_BUCKET = import.meta.env.VITE_SUPABASE_REPORT_BUCKET || "discrepancy-report-attachments";
const SUPABASE_STORAGE_REF_PREFIX = "supabase-storage://";

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
  if (data?.publicUrl && import.meta.env.VITE_SUPABASE_PUBLIC_REPORT_ATTACHMENTS === "true") {
    return { file_url: data.publicUrl };
  }
  return { file_url: `${SUPABASE_STORAGE_REF_PREFIX}${REPORT_BUCKET}/${objectPath}` };
}

async function createSignedReportFileUrl(fileUrl, expiresInSeconds = 60 * 10) {
  if (!String(fileUrl || "").startsWith(SUPABASE_STORAGE_REF_PREFIX)) {
    return fileUrl;
  }

  const storageRef = String(fileUrl).slice(SUPABASE_STORAGE_REF_PREFIX.length);
  const separator = storageRef.indexOf("/");
  if (separator <= 0) throw new Error("Invalid report attachment reference.");

  const bucket = storageRef.slice(0, separator);
  const objectPath = storageRef.slice(separator + 1);
  const client = requireSupabase();
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresInSeconds);
  if (error) throw new Error(`Attachment preview failed: ${error.message}`);
  if (!data?.signedUrl) throw new Error("Attachment preview did not return a signed URL.");
  return data.signedUrl;
}

export const supabaseIntegrations = {
  Core: {
    ...localIntegrations.Core,
    UploadFile: uploadReportFile,
    CreateSignedFileUrl: createSignedReportFileUrl,
  },
};
