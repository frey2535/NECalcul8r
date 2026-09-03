const DB_KEY = "necalcul8r_db_v1";
const SESSION_KEY = "necalcul8r_session";

const EMPTY_DB = () => ({
  users: [],
  orgs: [],
  pendingRegistrations: {},
  resetTokens: {},
  files: {},
  entities: {
    Analysis: [],
    DiscrepancyReport: [],
    ArticleVerification: [],
    Project: [],
    SavedCalculation: [],
  },
  seeded: false,
});

export function makeInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function migrateTenancy(db) {
  if (!Array.isArray(db.orgs)) db.orgs = [];
  const unassigned = (db.users || []).filter((u) => !u.org_id && !u.org_role);
  if (unassigned.length > 0) {
    const org = {
      id: newId("org"),
      name: "My company",
      invite_code: makeInviteCode(),
      created_date: new Date().toISOString(),
    };
    db.orgs.push(org);
    for (const user of unassigned) {
      user.org_id = org.id;
      user.org_role = user.role === "admin" ? "owner" : "member";
    }
  }
  for (const user of db.users || []) {
    if (!user.org_id && !user.org_role) {
      user.org_role = "individual";
    }
    if (user.org_role === "owner") {
      user.role = "admin";
    } else if (user.role === "admin") {
      user.role = "user";
    }
  }
  return db;
}

export function loadDb() {
  if (typeof window === "undefined") return EMPTY_DB();
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (!raw) {
      const initial = EMPTY_DB();
      saveDb(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    const db = {
      ...EMPTY_DB(),
      ...parsed,
      orgs: parsed.orgs || [],
      entities: {
        ...EMPTY_DB().entities,
        ...(parsed.entities || {}),
      },
    };
    return migrateTenancy(db);
  } catch {
    const initial = EMPTY_DB();
    try {
      saveDb(initial);
    } catch {
      /* ignore quota errors during recovery */
    }
    return initial;
  }
}

export function saveDb(db) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    throw httpError("Could not save your account in this browser. Clear site data for localhost and try again.");
  }
}

export function getSessionToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function setSessionToken(token) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(SESSION_KEY, token);
  else window.localStorage.removeItem(SESSION_KEY);
}

export function publicUser(user, db) {
  if (!user) return null;
  const { passwordHash, passwordSalt, sessionToken, ...safe } = user;
  const source = db || (typeof window !== "undefined" ? loadDb() : { orgs: [] });
  const org = (source.orgs || []).find((o) => o.id === user.org_id);
  const canSeeInvite = user.org_role === "owner";
  return {
    ...safe,
    org_id: user.org_id || null,
    org_name: org?.name || null,
    org_role: user.org_role || (user.org_id ? "member" : "individual"),
    invite_code: canSeeInvite ? org?.invite_code || null : null,
  };
}

export function todayISODate() {
  return new Date().toISOString().split("T")[0];
}

export function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export function newId(prefix = "id") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}
