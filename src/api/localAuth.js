import {
  daysFromNow,
  getSessionToken,
  httpError,
  loadDb,
  makeInviteCode,
  newId,
  publicUser,
  saveDb,
  setSessionToken,
  todayISODate,
} from "./localDb";

function bytesToB64(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function hashPassword(password, saltB64) {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const material = new Uint8Array(salt.length + enc.encode(password).length);
  material.set(salt, 0);
  material.set(enc.encode(password), salt.length);
  const digest = await crypto.subtle.digest("SHA-256", material);
  return bytesToB64(digest);
}

function findUserByEmail(db, email) {
  const needle = String(email || "").trim().toLowerCase();
  return db.users.find((u) => String(u.email || "").toLowerCase() === needle);
}

function currentUserFromDb(db) {
  const token = getSessionToken();
  if (!token) return null;
  return db.users.find((u) => u.sessionToken === token) || null;
}

export function requireUser() {
  const db = loadDb();
  const user = currentUserFromDb(db);
  if (!user) throw httpError("Authentication required", 401);
  return { db, user };
}

export function requireAdmin() {
  const { db, user } = requireUser();
  if (user.role !== "admin") throw httpError("Admin access required", 403);
  return { db, user };
}

function issueSession(db, user) {
  const token = newId("sess");
  user.sessionToken = token;
  saveDb(db);
  setSessionToken(token);
  return token;
}

function findOrgByInvite(db, code) {
  const needle = String(code || "").trim().toUpperCase();
  if (!needle) return null;
  return (db.orgs || []).find((o) => String(o.invite_code || "").toUpperCase() === needle) || null;
}

function resolveOrg(db, { organizationName, inviteCode }) {
  const invited = findOrgByInvite(db, inviteCode);
  if (invited) return { org: invited, org_role: "member", role: "user" };

  const name = String(organizationName || "").trim();
  if (!name) throw httpError("Enter a company name, or an invite code from your team.");

  const org = {
    id: newId("org"),
    name,
    invite_code: makeInviteCode(),
    created_date: new Date().toISOString(),
  };
  db.orgs.push(org);
  return { org, org_role: "owner", role: "admin" };
}

async function buildUser(db, { email, passwordHash, passwordSalt, organizationName, inviteCode }) {
  const isFirstUser = db.users.length === 0;
  const { org, org_role, role } = resolveOrg(db, { organizationName, inviteCode });
  return {
    id: newId("user"),
    email,
    full_name: email.split("@")[0],
    org_id: org.id,
    org_role,
    role: isFirstUser ? "admin" : role,
    access_type: isFirstUser || org_role === "owner" ? "permanent" : "trial",
    access_status: isFirstUser || org_role === "owner" ? "active" : "trial",
    trial_start_date: todayISODate(),
    trial_end_date: daysFromNow(30),
    purchase_source: isFirstUser || org_role === "owner" ? "admin" : "manual",
    subscription_status: null,
    created_date: new Date().toISOString(),
    passwordHash,
    passwordSalt,
    sessionToken: null,
  };
}

async function createAndSignIn(db, email, password, extras = {}) {
  const salt = bytesToB64(randomBytes(16));
  const user = await buildUser(db, {
    email,
    passwordHash: await hashPassword(password, salt),
    passwordSalt: salt,
    organizationName: extras.organizationName,
    inviteCode: extras.inviteCode,
  });
  db.users.push(user);
  delete db.pendingRegistrations[email.toLowerCase()];
  const access_token = issueSession(db, user);
  return { access_token, user: publicUser(user, db) };
}

export const localAuth = {
  async me() {
    const { db, user } = requireUser();
    return publicUser(user, db);
  },

  async loginViaEmailPassword(email, password) {
    const db = loadDb();
    const normalized = String(email || "").trim();
    if (!normalized || !password) throw httpError("Email and password are required");

    const user = findUserByEmail(db, normalized);
    if (user) {
      const hash = await hashPassword(password, user.passwordSalt);
      if (hash !== user.passwordHash) throw httpError("Invalid email or password");
      issueSession(db, user);
      return publicUser(user, db);
    }

    const pending = db.pendingRegistrations[normalized.toLowerCase()];
    if (pending) {
      const hash = await hashPassword(password, pending.passwordSalt);
      if (hash === pending.passwordHash) {
        const created = await buildUser(db, pending);
        db.users.push(created);
        delete db.pendingRegistrations[normalized.toLowerCase()];
        issueSession(db, created);
        return publicUser(created, db);
      }
    }

    throw httpError("No local account for this email. Create one — Base44 logins were not imported.");
  },

  async register({ email, password, organizationName, inviteCode }) {
    const db = loadDb();
    const normalized = String(email || "").trim();
    if (!normalized || !password) throw httpError("Email and password are required");
    if (password.length < 6) throw httpError("Password must be at least 6 characters");
    if (findUserByEmail(db, normalized)) {
      throw httpError("An account with this email already exists. Log in instead.");
    }
    return createAndSignIn(db, normalized, password, { organizationName, inviteCode });
  },

  async verifyOtp({ email, otpCode }) {
    const db = loadDb();
    const key = String(email || "").trim().toLowerCase();
    const pending = db.pendingRegistrations[key];
    if (!pending) {
      const existing = findUserByEmail(db, email);
      if (existing?.sessionToken) {
        setSessionToken(existing.sessionToken);
        return { access_token: existing.sessionToken, user: publicUser(existing, db) };
      }
      throw httpError("No pending registration for this email");
    }
    if (pending.otp && pending.otp !== String(otpCode || "").trim()) {
      throw httpError("Invalid verification code");
    }
    const user = await buildUser(db, pending);
    db.users.push(user);
    delete db.pendingRegistrations[key];
    const access_token = issueSession(db, user);
    return { access_token, user: publicUser(user, db) };
  },

  async resendOtp(email) {
    const db = loadDb();
    const key = String(email || "").trim().toLowerCase();
    const pending = db.pendingRegistrations[key];
    if (!pending) throw httpError("No pending registration for this email");
    pending.otp = String(Math.floor(100000 + Math.random() * 900000));
    saveDb(db);
    return { otp: pending.otp };
  },

  setToken(token) {
    setSessionToken(token);
  },

  logout(redirectUrl) {
    const db = loadDb();
    const token = getSessionToken();
    if (token) {
      const user = db.users.find((u) => u.sessionToken === token);
      if (user) user.sessionToken = null;
      saveDb(db);
    }
    setSessionToken(null);
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
    throw httpError("Google sign-in is not available in this self-hosted copy. Use email and password.");
  },

  async resetPasswordRequest(email) {
    const db = loadDb();
    const user = findUserByEmail(db, email);
    if (!user) return { ok: true };
    const token = newId("reset");
    db.resetTokens[token] = {
      userId: user.id,
      expires: Date.now() + 1000 * 60 * 60,
    };
    saveDb(db);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return { ok: true, reset_url: `${origin}/reset-password?token=${token}` };
  },

  async resetPassword({ resetToken, newPassword }) {
    const db = loadDb();
    const rec = db.resetTokens[resetToken];
    if (!rec || rec.expires < Date.now()) throw httpError("This reset link is invalid or has expired");
    if (!newPassword || newPassword.length < 6) throw httpError("Password must be at least 6 characters");
    const user = db.users.find((u) => u.id === rec.userId);
    if (!user) throw httpError("User not found");
    const salt = bytesToB64(randomBytes(16));
    user.passwordSalt = salt;
    user.passwordHash = await hashPassword(newPassword, salt);
    user.sessionToken = null;
    delete db.resetTokens[resetToken];
    saveDb(db);
    return { ok: true };
  },
};
