import { daysFromNow, httpError, todayISODate } from "./localDb";
import { requireSupabase } from "./supabaseClient";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function makeInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function activeEntitlement(entitlement) {
  if (!entitlement || entitlement.status !== "active") return false;
  if (!entitlement.expires_at) return true;
  return new Date(entitlement.expires_at).getTime() >= Date.now();
}

function applyEntitlement(profile, entitlements = []) {
  const entitlement = entitlements.find(activeEntitlement);
  if (!entitlement) return profile;
  return {
    ...profile,
    access_type: entitlement.access_type || profile.access_type,
    access_status: "active",
    subscription_status: entitlement.subscription_status || profile.subscription_status || "active",
    purchase_source: entitlement.source || profile.purchase_source,
    trial_end_date: entitlement.expires_at ? entitlement.expires_at.slice(0, 10) : profile.trial_end_date,
  };
}

async function getOrgByInvite(client, inviteCode) {
  const code = String(inviteCode || "").trim().toUpperCase();
  if (!code) return null;
  const { data, error } = await client.rpc("organization_by_invite", { code });
  if (error) throw error;
  return Array.isArray(data) ? data[0] || null : data;
}

async function createOrganization(client, organizationName) {
  const name = String(organizationName || "").trim();
  if (!name) return null;
  const { data, error } = await client
    .from("organizations")
    .insert({
      name,
      invite_code: makeInviteCode(),
      access_status: "trial",
      purchase_source: "manual",
      seat_limit: 1,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function profileFor(authUser) {
  const client = requireSupabase();
  const { data: profile, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();
  if (error) throw error;

  if (!profile) {
    const { data: created, error: createError } = await client
      .from("profiles")
      .insert({
        id: authUser.id,
        email: normalizeEmail(authUser.email),
        full_name: normalizeEmail(authUser.email).split("@")[0],
        org_id: null,
        org_role: "individual",
        role: "user",
        access_type: "trial",
        access_status: "trial",
        trial_start_date: todayISODate(),
        trial_end_date: daysFromNow(30),
        purchase_source: "manual",
      })
      .select("*")
      .single();
    if (createError) throw createError;
    return mapProfile(created, null, []);
  }

  let org = null;
  if (profile.org_id) {
    const { data: orgData, error: orgError } = await client
      .from("organizations")
      .select("*")
      .eq("id", profile.org_id)
      .maybeSingle();
    if (orgError) throw orgError;
    org = orgData;
  }

  const entitlementFilters = [`profile_id.eq.${authUser.id}`];
  if (profile.org_id) entitlementFilters.push(`org_id.eq.${profile.org_id}`);
  const { data: entitlements = [], error: entitlementError } = await client
    .from("entitlements")
    .select("*")
    .or(entitlementFilters.join(","))
    .order("created_at", { ascending: false });
  if (entitlementError) throw entitlementError;

  return mapProfile(applyEntitlement(profile, entitlements), org, entitlements);
}

function mapProfile(profile, org) {
  const orgRole = profile.org_role || (profile.org_id ? "member" : "individual");
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name || String(profile.email || "").split("@")[0],
    role: profile.role || "user",
    org_id: profile.org_id || null,
    org_name: org?.name || null,
    org_role: orgRole,
    invite_code: orgRole === "owner" ? org?.invite_code || null : null,
    access_type: profile.access_type || "trial",
    access_status: profile.access_status || "trial",
    trial_start_date: profile.trial_start_date,
    trial_end_date: profile.trial_end_date,
    purchase_source: profile.purchase_source || "manual",
    subscription_status: profile.subscription_status || null,
    created_date: profile.created_date || profile.created_at,
    updated_date: profile.updated_date || profile.updated_at,
  };
}

async function buildProfilePayload(client, authUser, { organizationName, inviteCode }) {
  const invitedOrg = await getOrgByInvite(client, inviteCode);
  const createdOrg = invitedOrg ? null : await createOrganization(client, organizationName);
  const org = invitedOrg || createdOrg;
  const isOwner = Boolean(createdOrg);
  return {
    id: authUser.id,
    email: normalizeEmail(authUser.email),
    full_name: normalizeEmail(authUser.email).split("@")[0],
    org_id: org?.id || null,
    org_role: isOwner ? "owner" : org ? "member" : "individual",
    role: isOwner ? "admin" : "user",
    access_type: isOwner ? "permanent" : "trial",
    access_status: isOwner ? "active" : "trial",
    trial_start_date: todayISODate(),
    trial_end_date: daysFromNow(30),
    purchase_source: isOwner ? "admin" : "manual",
    subscription_status: null,
  };
}

export const supabaseAuth = {
  async me() {
    const client = requireSupabase();
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) throw httpError("Authentication required", 401);
    return profileFor(data.user);
  },

  async loginViaEmailPassword(email, password) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (error) throw error;
    return profileFor(data.user);
  },

  async register({ email, password, organizationName, inviteCode }) {
    const client = requireSupabase();
    const normalized = normalizeEmail(email);
    if (!normalized || !password) throw httpError("Email and password are required");
    if (password.length < 6) throw httpError("Password must be at least 6 characters");

    const { data, error } = await client.auth.signUp({
      email: normalized,
      password,
    });
    if (error) throw error;
    if (!data?.user) throw httpError("Registration did not return a user.");

    const profile = await buildProfilePayload(client, data.user, { organizationName, inviteCode });
    const { error: profileError } = await client.from("profiles").upsert(profile);
    if (profileError) throw profileError;

    return {
      access_token: data.session?.access_token || null,
      user: await profileFor(data.user),
    };
  },

  async resetPasswordRequest(email) {
    const client = requireSupabase();
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await client.auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo });
    if (error) throw error;
    return { ok: true };
  },

  async resetPassword({ newPassword }) {
    if (!newPassword || newPassword.length < 6) {
      throw httpError("Password must be at least 6 characters");
    }
    const client = requireSupabase();
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { ok: true };
  },

  setToken() {
    // Supabase persists its own session; this keeps the existing auth facade compatible.
  },

  async logout(redirectUrl) {
    const client = requireSupabase();
    await client.auth.signOut();
    if (typeof window !== "undefined") {
      window.location.href = typeof redirectUrl === "string" && redirectUrl.startsWith("/")
        ? redirectUrl
        : "/landing";
    }
  },

  redirectToLogin() {
    if (typeof window !== "undefined") window.location.href = "/login";
  },

  loginWithProvider() {
    throw httpError("Google sign-in is not configured for this app.");
  },
};
