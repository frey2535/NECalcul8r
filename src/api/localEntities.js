import { requireUser } from "./localAuth";
import { httpError, loadDb, newId, publicUser, saveDb } from "./localDb";

const ENTITY_NAMES = ["Analysis", "DiscrepancyReport", "ArticleVerification", "Project", "SavedCalculation", "User"];

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

function getCollection(db, name) {
  if (name === "User") return db.users.map((u) => publicUser(u, db));
  if (!db.entities[name]) db.entities[name] = [];
  return db.entities[name];
}

function scopedList(db, user, name, records) {
  if (name === "User") {
    if (user.role === "admin" || user.org_role === "owner") {
      return records.filter((r) => r.org_id && r.org_id === user.org_id);
    }
    return records.filter((r) => r.id === user.id);
  }
  // Reference data shared by everyone in the product.
  if (name === "ArticleVerification") return records;
  // Analyses, discrepancy reports, and any future saved calculations stay
  // private to the signed-in user — including org admins.
  return records.filter((r) => r.created_by_id === user.id);
}

function createEntityApi(name) {
  return {
    async list(sort, limit, query) {
      const { db, user } = requireUser();
      let records = scopedList(db, user, name, getCollection(db, name));
      records = records.filter((r) => matchesQuery(r, query));
      records = sortRecords(records, sort || "-created_date");
      if (typeof limit === "number") records = records.slice(0, limit);
      return records;
    },

    async filter(query, sort, limit) {
      return this.list(sort, limit, query);
    },

    async get(id) {
      const { db, user } = requireUser();
      const records = scopedList(db, user, name, getCollection(db, name));
      const found = records.find((r) => r.id === id);
      if (!found) throw httpError(`${name} not found`, 404);
      return found;
    },

    async create(data) {
      const { db, user } = requireUser();
      if (name === "User") throw httpError("Create users through registration");
      const now = new Date().toISOString();
      const record = {
        ...data,
        id: newId(name.toLowerCase()),
        created_date: now,
        updated_date: now,
        created_by_id: user.id,
        created_by: user.email,
        org_id: user.org_id || null,
      };
      db.entities[name].push(record);
      saveDb(db);
      return record;
    },

    async update(id, patch) {
      const { db, user } = requireUser();
      if (name === "User") {
        if (user.role !== "admin" && user.org_role !== "owner" && user.id !== id) throw httpError("Forbidden", 403);
        const target = db.users.find((u) => u.id === id);
        if (!target) throw httpError("User not found", 404);
        if (user.id !== id && target.org_id !== user.org_id) throw httpError("Forbidden", 403);
        Object.assign(target, patch, { updated_date: new Date().toISOString() });
        saveDb(db);
        return publicUser(target, db);
      }
      const idx = db.entities[name].findIndex((r) => r.id === id);
      if (idx === -1) throw httpError(`${name} not found`, 404);
      const existing = db.entities[name][idx];
      if (name !== "ArticleVerification" && existing.created_by_id !== user.id) {
        throw httpError("Forbidden", 403);
      }
      const updated = {
        ...existing,
        ...patch,
        id: existing.id,
        created_date: existing.created_date,
        created_by_id: existing.created_by_id,
        org_id: existing.org_id,
        updated_date: new Date().toISOString(),
      };
      db.entities[name][idx] = updated;
      if (name === "Project" && patch.name && db.entities.SavedCalculation) {
        for (const calc of db.entities.SavedCalculation) {
          if (calc.project_id === existing.id) calc.project_name = updated.name;
        }
      }
      saveDb(db);
      return updated;
    },

    async delete(id) {
      const { db, user } = requireUser();
      if (name === "User") throw httpError("User delete is not supported");
      const idx = db.entities[name].findIndex((r) => r.id === id);
      if (idx === -1) throw httpError(`${name} not found`, 404);
      const existing = db.entities[name][idx];
      if (existing.created_by_id !== user.id) {
        throw httpError("Forbidden", 403);
      }
      db.entities[name].splice(idx, 1);
      if (name === "Project" && db.entities.SavedCalculation) {
        db.entities.SavedCalculation = db.entities.SavedCalculation.filter(
          (r) => r.project_id !== existing.id
        );
      }
      saveDb(db);
      return { ok: true };
    },

    async deleteMany(query) {
      const { db, user } = requireUser();
      if (name === "ArticleVerification") {
        if (user.role !== "admin") throw httpError("Admin access required", 403);
        const before = db.entities[name].length;
        db.entities[name] = db.entities[name].filter((r) => !matchesQuery(r, query));
        saveDb(db);
        return { deleted: before - db.entities[name].length };
      }
      const before = db.entities[name].length;
      db.entities[name] = db.entities[name].filter((r) => {
        if (r.created_by_id !== user.id) return true;
        return !matchesQuery(r, query);
      });
      saveDb(db);
      return { deleted: before - db.entities[name].length };
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

export const localEntities = Object.fromEntries(ENTITY_NAMES.map((name) => [name, createEntityApi(name)]));

export function seedIfNeeded(seedRecords) {
  try {
    const db = loadDb();
    if (db.seeded) return;
    const now = new Date().toISOString();
    db.entities.ArticleVerification = (seedRecords || []).map((row) => ({
      ...row,
      id: newId("articleverification"),
      created_date: now,
      updated_date: now,
      created_by_id: "system",
      created_by: "system",
    }));
    db.seeded = true;
    saveDb(db);
  } catch (error) {
    console.warn("Article verification seed skipped:", error);
  }
}
