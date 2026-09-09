import { httpError } from "./localDb";
import { supabaseAuth } from "./supabaseAuth";
import { requireSupabase } from "./supabaseClient";

const ENTITY_NAMES = ["Analysis", "DiscrepancyReport", "ArticleVerification", "CalculatorTierSettings", "Project", "SavedCalculation", "User"];

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

const ACTIVE_ACCESS_TYPES = new Set([
  "permanent",
  "paid",
  "external_company",
  "company_seat",
  "buildrpro_included",
  "app_store",
  "google_play",
  "apple_app_store",
]);

const AUTHENTICATED_SHARED_RECORDS = new Set(["ArticleVerification", "CalculatorTierSettings"]);
const PLATFORM_ADMIN_SHARED_RECORDS = new Set(["ArticleVerification", "DiscrepancyReport", "CalculatorTierSettings"]);

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
    plan_key: profile.plan_key || null,
    customer_tier_id: profile.customer_tier_id || null,
    calculator_tier_id: profile.calculator_tier_id || null,
    calculator_limit: positiveNumber(profile.calculator_limit),
    has_nec_tables: Boolean(profile.has_nec_tables),
    can_export_complete_reports: Boolean(profile.can_export_complete_reports),
    company_seat_limit: positiveNumber(profile.company_seat_limit),
    seat_limit: positiveNumber(profile.seat_limit),
    is_platform_admin: Boolean(profile.is_platform_admin),
    created_date: profile.created_date || profile.created_at,
    updated_date: profile.updated_date || profile.updated_at,
  };
}

function activeEntitlement(entitlement) {
  if (!entitlement || entitlement.status !== "active") return false;
  if (!entitlement.expires_at) return true;
  return new Date(entitlement.expires_at).getTime() >= Date.now();
}

function entitlementMetadata(entitlement) {
  const metadata = entitlement?.metadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
}

function positiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const PLAN_LIMITS = {
  free: 5,
  individual_6_15: 15,
  individual_16_25: 25,
  individual_26_35: 35,
  individual_36_plus: null,
  company_0_10: null,
  company_11_20: null,
  company_unlimited: null,
  owner_full_access: null,
};

const PLAN_TABLES = {
  free: false,
};
const KNOWN_PLAN_KEYS = new Set(Object.keys(PLAN_LIMITS));

function planKeyForEntitlement(entitlement) {
  const metadata = entitlementMetadata(entitlement);
  if (KNOWN_PLAN_KEYS.has(metadata.plan_key)) return metadata.plan_key;
  if (KNOWN_PLAN_KEYS.has(metadata.calculator_tier_id)) return metadata.calculator_tier_id;
  if (entitlement.source === "owner_grant" || entitlement.access_type === "permanent") return "owner_full_access";
  if (entitlement.org_id || String(metadata.customer_tier_id || "").startsWith("company")) return "company_unlimited";
  return "individual_36_plus";
}

function entitlementScore(entitlement) {
  const planKey = planKeyForEntitlement(entitlement);
  const limit = PLAN_LIMITS[planKey];
  if (limit == null) return 1000;
  return Number(limit) || 0;
}

function mostPermissiveEntitlement(entitlements) {
  return [...entitlements]
    .filter(activeEntitlement)
    .sort((a, b) => {
      const scoreDiff = entitlementScore(b) - entitlementScore(a);
      if (scoreDiff) return scoreDiff;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    })[0];
}

function applyEntitlement(profile, entitlements = []) {
  if (profile.access_status === "disabled") return profile;
  const entitlement = mostPermissiveEntitlement(entitlements);
  if (!entitlement) return profile;
  const metadata = entitlementMetadata(entitlement);
  const planKey = planKeyForEntitlement(entitlement);
  const calculatorLimit = PLAN_LIMITS[planKey];
  const hasNecTables = PLAN_TABLES[planKey] ?? true;
  return {
    ...profile,
    access_type: entitlement.access_type || profile.access_type,
    access_status: "active",
    subscription_status: entitlement.subscription_status || profile.subscription_status || "active",
    purchase_source: entitlement.source || profile.purchase_source,
    trial_end_date: entitlement.expires_at ? entitlement.expires_at.slice(0, 10) : profile.trial_end_date,
    plan_key: planKey,
    customer_tier_id: metadata.customer_tier_id || profile.customer_tier_id || null,
    calculator_tier_id: metadata.calculator_tier_id || planKey,
    calculator_limit: calculatorLimit == null ? null : positiveNumber(metadata.calculator_limit) ?? calculatorLimit,
    has_nec_tables: Boolean(metadata.has_nec_tables ?? hasNecTables),
    can_export_complete_reports: Boolean(metadata.can_export_complete_reports ?? hasNecTables),
    company_seat_limit: positiveNumber(metadata.company_seat_limit),
    seat_limit: positiveNumber(metadata.seat_limit) ?? positiveNumber(entitlement.seats) ?? positiveNumber(profile.seat_limit),
  };
}

async function entitlementsForProfiles(client, profiles = []) {
  if (!profiles.length) return new Map();

  const profileIds = profiles.map((profile) => profile.id).filter(Boolean);
  const orgIds = [...new Set(profiles.map((profile) => profile.org_id).filter(Boolean))];
  const byProfileId = new Map(profileIds.map((id) => [id, []]));
  const seenEntitlementIds = new Set();

  async function addEntitlements(request) {
    const { data = [], error } = await request.order("created_at", { ascending: false });
    if (error) throw error;
    for (const entitlement of data) {
      if (seenEntitlementIds.has(entitlement.id)) continue;
      seenEntitlementIds.add(entitlement.id);

      if (entitlement.profile_id && byProfileId.has(entitlement.profile_id)) {
        byProfileId.get(entitlement.profile_id).push(entitlement);
      }
      if (entitlement.org_id) {
        for (const profile of profiles) {
          if (profile.org_id === entitlement.org_id) {
            byProfileId.get(profile.id)?.push(entitlement);
          }
        }
      }
    }
  }

  if (profileIds.length) {
    await addEntitlements(client.from("entitlements").select("*").in("profile_id", profileIds));
  }
  if (orgIds.length) {
    await addEntitlements(client.from("entitlements").select("*").in("org_id", orgIds));
  }

  return byProfileId;
}

async function orgsForProfiles(client, profiles = []) {
  const orgIds = [...new Set(profiles.map((profile) => profile.org_id).filter(Boolean))];
  const orgsById = new Map();
  if (!orgIds.length) return orgsById;

  const { data: orgs = [], error } = await client.from("organizations").select("*").in("id", orgIds);
  if (error) throw error;
  for (const org of orgs) orgsById.set(org.id, org);
  return orgsById;
}

async function profileWithAccess(client, id) {
  const { data: profile, error } = await client.from("profiles").select("*").eq("id", id).single();
  if (error) throw error;

  const orgsById = await orgsForProfiles(client, [profile]);
  const entitlementsByProfile = await entitlementsForProfiles(client, [profile]);
  return mapProfile(applyEntitlement(profile, entitlementsByProfile.get(profile.id)), orgsById.get(profile.org_id));
}

function normalizeAccessUpdates(target, patch) {
  const updates = { ...patch };
  const nextStatus = updates.access_status ?? target.access_status;
  const nextType = updates.access_type ?? target.access_type ?? "trial";

  if (nextStatus === "active" && nextType === "trial") {
    updates.access_type = "permanent";
    if (!updates.purchase_source || updates.purchase_source === "manual") {
      updates.purchase_source = "admin";
    }
  }

  const activeType = updates.access_type ?? target.access_type;
  if (ACTIVE_ACCESS_TYPES.has(activeType) && !updates.access_status) {
    updates.access_status = "active";
  }

  return updates;
}

function isMissingRpc(error) {
  const message = String(error?.message || error?.details || "");
  return error?.code === "PGRST202"
    || message.includes("grant_profile_access")
    || message.includes("schema cache")
    || message.includes("does not exist");
}

async function grantAccess(client, profileId, updates, source) {
  const rpcPayload = {
    target_profile_id: profileId,
    access_updates: updates,
    grant_source: source,
  };

  const { error: rpcError } = await client.rpc("grant_profile_access", rpcPayload);
  if (!rpcError) return;
  if (!isMissingRpc(rpcError)) throw rpcError;

  const { error: functionError } = await client.functions.invoke("grant-access", {
    body: {
      profileId,
      updates,
      source,
    },
  });
  if (!functionError) return;

  const message = [
    "Access grant failed.",
    "Install the Supabase helper in supabase/fixes/fix-admin-access-grants.sql or deploy a grant-access Edge Function.",
    functionError.message || rpcError.message,
  ].filter(Boolean).join(" ");
  throw new Error(message);
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

  const orgsById = await orgsForProfiles(client, profiles);
  const entitlementsByProfile = await entitlementsForProfiles(client, profiles);

  let records = profiles.map((profile) => (
    mapProfile(applyEntitlement(profile, entitlementsByProfile.get(profile.id)), orgsById.get(profile.org_id))
  ));
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
  const normalizedUpdates = normalizeAccessUpdates(target, updates);
  normalizedUpdates.updated_date = new Date().toISOString();

  const requestedFields = Object.keys(normalizedUpdates).filter((key) => key !== "updated_date");
  const accessUpdateRequested = requestedFields.some((key) => !SELF_UPDATE_FIELDS.has(key));
  if (accessUpdateRequested && !currentUser.is_platform_admin) {
    throw httpError("Access changes must be granted by a platform administrator.", 403);
  }

  if (accessUpdateRequested) {
    await grantAccess(client, id, normalizedUpdates, currentUser.is_platform_admin ? "admin" : "company_external");
    return profileWithAccess(client, id);
  }

  const { data: updated, error } = await client
    .from("profiles")
    .update(normalizedUpdates)
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

  if (
    !AUTHENTICATED_SHARED_RECORDS.has(name)
    && !(currentUser.is_platform_admin && PLATFORM_ADMIN_SHARED_RECORDS.has(name))
  ) {
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
      if (name === "CalculatorTierSettings" && !currentUser.is_platform_admin) {
        throw httpError("Calculator tier settings require platform admin access.", 403);
      }
      const row = toRecordRow(name, currentUser, data);
      const { data: created, error } = await client.from("app_records").insert(row).select("*").single();
      if (error) throw error;
      return mapRecord(created);
    },

    async update(id, patch) {
      if (name === "User") return updateUser(id, patch);
      const client = requireSupabase();
      const currentUser = await supabaseAuth.me();
      if (name === "CalculatorTierSettings" && !currentUser.is_platform_admin) {
        throw httpError("Calculator tier settings require platform admin access.", 403);
      }
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
      const currentUser = await supabaseAuth.me();
      if (name === "CalculatorTierSettings" && !currentUser.is_platform_admin) {
        throw httpError("Calculator tier settings require platform admin access.", 403);
      }
      await this.get(id);
      const { error } = await client.from("app_records").delete().eq("id", id);
      if (error) throw error;
      return { ok: true };
    },

    async deleteMany(query) {
      if (name === "CalculatorTierSettings") {
        const currentUser = await supabaseAuth.me();
        if (!currentUser.is_platform_admin) {
          throw httpError("Calculator tier settings require platform admin access.", 403);
        }
      }
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
