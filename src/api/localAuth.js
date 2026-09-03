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

function getCrypto() {
  return typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  const cryptoApi = getCrypto();
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
    return bytes;
  }
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

function rightRotate(value, bits) {
  return (value >>> bits) | (value << (32 - bits));
}

function sha256Fallback(bytes) {
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 1 + 8) / 64) * 64;
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 0x80;

  const bitLengthHi = Math.floor(bitLength / 0x100000000);
  const bitLengthLo = bitLength >>> 0;
  data[paddedLength - 8] = (bitLengthHi >>> 24) & 0xff;
  data[paddedLength - 7] = (bitLengthHi >>> 16) & 0xff;
  data[paddedLength - 6] = (bitLengthHi >>> 8) & 0xff;
  data[paddedLength - 5] = bitLengthHi & 0xff;
  data[paddedLength - 4] = (bitLengthLo >>> 24) & 0xff;
  data[paddedLength - 3] = (bitLengthLo >>> 16) & 0xff;
  data[paddedLength - 2] = (bitLengthLo >>> 8) & 0xff;
  data[paddedLength - 1] = bitLengthLo & 0xff;

  const w = new Array(64);
  for (let offset = 0; offset < data.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const index = offset + i * 4;
      w[i] = (
        (data[index] << 24)
        | (data[index + 1] << 16)
        | (data[index + 2] << 8)
        | data[index + 3]
      ) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let hh = h[7];

    for (let i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + s1 + ch + k[i] + w[i]) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  const digest = new Uint8Array(32);
  for (let i = 0; i < h.length; i++) {
    digest[i * 4] = (h[i] >>> 24) & 0xff;
    digest[i * 4 + 1] = (h[i] >>> 16) & 0xff;
    digest[i * 4 + 2] = (h[i] >>> 8) & 0xff;
    digest[i * 4 + 3] = h[i] & 0xff;
  }
  return digest;
}

async function sha256(bytes) {
  const cryptoApi = getCrypto();
  if (cryptoApi?.subtle?.digest) {
    return cryptoApi.subtle.digest("SHA-256", bytes);
  }
  return sha256Fallback(bytes);
}

async function hashPassword(password, saltB64) {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const material = new Uint8Array(salt.length + enc.encode(password).length);
  material.set(salt, 0);
  material.set(enc.encode(password), salt.length);
  const digest = await sha256(material);
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
