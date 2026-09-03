import { httpError } from "./localDb";
import { supabaseAuth } from "./supabaseAuth";
import { requireSupabase } from "./supabaseClient";

const ENTITY_NAMES = ["Analysis", "DiscrepancyReport", "ArticleVerification", "Project", "SavedCalculation", "User"];

const USER_UPDATE_FIELDS = [
  "full_name",
  "access_type",
  "access_status",
  "trial_start_date",
  "trial_end_date",
  "purchase_source",
  "subscription_status",
];

const SELF_UPDATE_FIELDS = new Set(["full_name"]);

const RECORD_METADATA_FIELDS = new Set([
  "id",
  "created_date",
  "updated_date",
  "created_by_id",
  "created_by",
  "org_id",
]);

function matchesQuery(record, query) {
  if (!query || typeof query !== "object") return true;
  return Object.entries(query).every(([key, value]) => {
    if (value === undefined) return true;
    return record[key] === value;
  });
}

function sortRecords(records, sort) {
  if (!sort) return records;
  const desc = String(sort).startsWith("-");
  const field = desc ? String(sort).slice(1) : String(sort);
  return [...records].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
}

function mapRecord(row) {
  return {
    id: row.id,
    ...(row.data || {}),
    org_id: row.org_id || null,
    created_by_id: row.created_by_id,
    created_by: row.created_by,
    created_date: row.created_date || row.created_at,
    updated_date: row.updated_date || row.updated_at,
  };
}

function toRecordRow(name, user, data = {}) {
  const payload = Object.fromEntries(
    Object.entries(data || {}).filter(([key]) => !RECORD_METADATA_FIELDS.has(key))
  );
  return {
    entity_type: name,
    org_id: data.org_id || user.org_id || null,
    created_by_id: data.created_by_id || user.id,
    created_by: data.created_by || user.email,
    data: payload,
  };
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
    is_platform_admin: Boolean(profile.is_platform_admin),
    created_date: profile.created_date || profile.created_at,
    updated_date: profile.updated_date || profile.updated_at,
  };
}

async function listUsers(sort, limit, query) {
  const client = requireSupabase();
  const currentUser = await supabaseAuth.me();

  let request = client.from("profiles").select("*");
  if (!currentUser.is_platform_admin) {
    if (currentUser.org_role === "owner" && currentUser.org_id) {
      request = request.eq("org_id", currentUser.org_id);
    } else {
      request = request.eq("id", currentUser.id);
    }
  }

  const { data: profiles = [], error } = await request;
  if (error) throw error;

  const orgIds = [...new Set(profiles.map((profile) => profile.org_id).filter(Boolean))];
  const orgsById = new Map();
  if (orgIds.length) {
    const { data: orgs = [], error: orgError } = await client.from("organizations").select("*").in("id", orgIds);
    if (orgError) throw orgError;
    for (const org of orgs) orgsById.set(org.id, org);
  }

  let records = profiles.map((profile) => mapProfile(profile, orgsById.get(profile.org_id)));
  records = records.filter((record) => matchesQuery(record, query));
  records = sortRecords(records, sort || "-created_date");
  if (typeof limit === "number") records = records.slice(0, limit);
  return records;
}

async function updateUser(id, patch) {
  const client = requireSupabase();
  const currentUser = await supabaseAuth.me();
  const { data: target, error: targetError } = await client.from("profiles").select("*").eq("id", id).single();
  if (targetError) throw targetError;

  const canUpdate = currentUser.is_platform_admin
    || currentUser.id === id
    || (currentUser.org_role === "owner" && currentUser.org_id && currentUser.org_id === target.org_id);
  if (!canUpdate) throw httpError("Forbidden", 403);

  const updates = Object.fromEntries(
    Object.entries(patch || {}).filter(([key]) => USER_UPDATE_FIELDS.includes(key))
  );
  updates.updated_date = new Date().toISOString();

  const requestedFields = Object.keys(updates).filter((key) => key !== "updated_date");
  const accessUpdateRequested = requestedFields.some((key) => !SELF_UPDATE_FIELDS.has(key));
  if (currentUser.id === id && accessUpdateRequested && !currentUser.is_platform_admin) {
    throw httpError("Access changes must be granted by an administrator.", 403);
  }

  if (accessUpdateRequested) {
    const { error: grantError } = await client.functions.invoke("grant-access", {
      body: {
        profileId: id,
        updates,
        source: currentUser.is_platform_admin ? "admin" : "company_external",
      },
    });
    if (grantError) throw grantError;
    const { data: refreshed, error: refreshError } = await client
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    if (refreshError) throw refreshError;
    return mapProfile(refreshed, null);
  }

  const { data: updated, error } = await client
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;

  let org = null;
  if (updated.org_id) {
    const { data: orgData, error: orgError } = await client
      .from("organizations")
      .select("*")
      .eq("id", updated.org_id)
      .maybeSingle();
    if (orgError) throw orgError;
    org = orgData;
  }
  return mapProfile(updated, org);
}

async function listRecords(name, sort, limit, query) {
  const client = requireSupabase();
  const currentUser = await supabaseAuth.me();
  let request = client.from("app_records").select("*").eq("entity_type", name);

  if (name !== "ArticleVerification" && !currentUser.is_platform_admin) {
    request = request.eq("created_by_id", currentUser.id);
  }

  const { data: rows = [], error } = await request;
  if (error) throw error;

  let records = rows.map(mapRecord).filter((record) => matchesQuery(record, query));
  records = sortRecords(records, sort || "-created_date");
  if (typeof limit === "number") records = records.slice(0, limit);
  return records;
}

function createEntityApi(name) {
  return {
    async list(sort, limit, query) {
      if (name === "User") return listUsers(sort, limit, query);
      return listRecords(name, sort, limit, query);
    },

    async filter(query, sort, limit) {
      return this.list(sort, limit, query);
    },

    async get(id) {
      if (name === "User") {
        const found = (await listUsers(undefined, undefined, { id })).find((record) => record.id === id);
        if (!found) throw httpError("User not found", 404);
        return found;
      }
      const found = (await listRecords(name, undefined, undefined, { id })).find((record) => record.id === id);
      if (!found) throw httpError(`${name} not found`, 404);
      return found;
    },

    async create(data) {
      if (name === "User") throw httpError("Create users through registration");
      const client = requireSupabase();
      const currentUser = await supabaseAuth.me();
      const row = toRecordRow(name, currentUser, data);
      const { data: created, error } = await client.from("app_records").insert(row).select("*").single();
      if (error) throw error;
      return mapRecord(created);
    },

    async update(id, patch) {
      if (name === "User") return updateUser(id, patch);
      const client = requireSupabase();
      const existing = await this.get(id);
      const existingData = Object.fromEntries(
        Object.entries(existing || {}).filter(([key]) => !RECORD_METADATA_FIELDS.has(key))
      );
      const { data: updated, error } = await client
        .from("app_records")
        .update({
          data: { ...existingData, ...(patch || {}) },
          updated_date: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return mapRecord(updated);
    },

    async delete(id) {
      if (name === "User") throw httpError("User delete is not supported");
      const client = requireSupabase();
      await this.get(id);
      const { error } = await client.from("app_records").delete().eq("id", id);
      if (error) throw error;
      return { ok: true };
    },

    async deleteMany(query) {
      const records = await this.list(undefined, undefined, query);
      if (!records.length) return { deleted: 0 };
      const client = requireSupabase();
      const { error } = await client.from("app_records").delete().in("id", records.map((record) => record.id));
      if (error) throw error;
      return { deleted: records.length };
    },

    async bulkCreate(records) {
      const created = [];
      for (const data of records || []) {
        created.push(await this.create(data));
      }
      return created;
    },
  };
}

export const supabaseEntities = Object.fromEntries(ENTITY_NAMES.map((name) => [name, createEntityApi(name)]));
