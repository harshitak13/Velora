import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectMongo, mongoEnabled, stripMongo, UserModel } from "@/lib/mongodb";

export type Role = "BUYER" | "SELLER" | "ADMIN";
export type SellerApprovalStatus = "APPROVED" | "PENDING" | "SUSPENDED" | "REJECTED";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: Role;
  sellerStatus?: SellerApprovalStatus;
  storeName?: string;
  avatarUrl?: string;
  passwordHash: string;
  createdAt: string;
};

type PublicUser = Omit<UserRecord, "passwordHash">;

const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";
const JWT_SECRET = process.env.JWT_SECRET || "dev-access-secret-change-me";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";

const globalStore = globalThis as typeof globalThis & {
  __veloraUsers?: Map<string, UserRecord>;
  __veloraAuthReady?: Promise<void>;
};

const users = globalStore.__veloraUsers ?? new Map<string, UserRecord>();
globalStore.__veloraUsers = users;

globalStore.__veloraAuthReady = globalStore.__veloraAuthReady ?? hydrateUsers();

export function json(data: unknown, status = 200, extraHeaders: HeadersInit = {}, request?: Request) {
  return Response.json(data, {
    status,
    headers: {
      ...corsHeaders(request),
      ...extraHeaders,
    },
  });
}

export function corsHeaders(request?: Request) {
  const requestOrigin = request?.headers.get("origin") || "";
  const configuredOrigin = process.env.FRONTEND_ORIGIN || "";
  const isLocalFrontend =
    /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(requestOrigin) ||
    requestOrigin === "null";
  const origin =
    requestOrigin === configuredOrigin || isLocalFrontend
      ? requestOrigin
      : "http://127.0.0.1:5173";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Vary": "Origin",
  };
}

export function options(request?: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function publicUser(user: UserRecord): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export function findUserByEmail(email: string) {
  return users.get(email.toLowerCase());
}

export function findUserById(id: string) {
  return Array.from(users.values()).find((user) => user.id === id);
}

export function listUsers() {
  return Array.from(users.values()).map(publicUser);
}

export function updateUserSellerStatus(userId: string, status: SellerApprovalStatus) {
  const user = findUserById(userId);
  if (user && user.role === "SELLER") {
    user.sellerStatus = status;
    void persistUser(user);
  }
  return user;
}

export async function ensureAuthReady() {
  await globalStore.__veloraAuthReady;
}

export async function getCurrentUser(request: Request) {
  await ensureAuthReady();
  const token = getBearerToken(request);
  if (!token) return null;
  try {
    const payload = verifyAccessToken(token);
    const userId = typeof payload.sub === "string" ? payload.sub : "";
    return userId ? findUserById(userId) ?? null : null;
  } catch {
    return null;
  }
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role?: Role;
  storeName?: string;
}) {
  const email = input.email.toLowerCase().trim();
  if (users.has(email)) {
    throw new Error("An account with this email already exists.");
  }

  const user: UserRecord = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email,
    role: normalizeRole(input.role),
    sellerStatus: normalizeRole(input.role) === "SELLER" ? "PENDING" : undefined,
    storeName: input.storeName?.trim() || undefined,
    passwordHash: await bcrypt.hash(input.password, 10),
    createdAt: new Date().toISOString(),
  };

  users.set(email, user);
  void persistUser(user);
  return user;
}

export async function verifyPassword(user: UserRecord, password: string) {
  return bcrypt.compare(password, user.passwordHash);
}

export function signTokens(user: UserRecord) {
  const payload = { sub: user.id, role: user.role, email: user.email };
  return {
    accessToken: jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL }),
    refreshToken: jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL }),
  };
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, JWT_REFRESH_SECRET) as jwt.JwtPayload;
}

export function refreshCookie(refreshToken: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `vm_refresh_token=${refreshToken}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${secure}`;
}

export function clearRefreshCookie() {
  return "vm_refresh_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax";
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

export function getCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function normalizeRole(role?: Role): Role {
  if (role === "SELLER" || role === "ADMIN") return role;
  return "BUYER";
}

async function hydrateUsers() {
  seedAdmin();
  if (!mongoEnabled()) return;
  try {
    await connectMongo();
    const rows = await UserModel.find({}).lean();
    rows.forEach((row) => {
      const user = stripMongo(row) as UserRecord;
      if (user.email) users.set(user.email.toLowerCase(), user);
    });
    seedAdmin();
    const admin = users.get("admin@velora.com");
    if (admin) await persistUser(admin);
  } catch (error) {
    console.warn("MongoDB user hydration skipped:", error);
  }
}

async function persistUser(user: UserRecord) {
  if (!mongoEnabled()) return;
  try {
    await connectMongo();
    await UserModel.updateOne({ email: user.email }, { $set: user }, { upsert: true });
  } catch (error) {
    console.warn("MongoDB user persistence skipped:", error);
  }
}

function seedAdmin() {
  const email = "admin@velora.com";
  if (users.has(email)) return;
  users.set(email, {
    id: "admin_default",
    name: "Velora Admin",
    email,
    role: "ADMIN",
    passwordHash: bcrypt.hashSync("Admin123!", 10),
    createdAt: new Date().toISOString(),
  });
}
