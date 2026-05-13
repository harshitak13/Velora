import { ensureAuthReady, findUserById, getBearerToken, json, options, publicUser, verifyAccessToken } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) return json({ success: false, error: "Unauthorized." }, 401, {}, request);

    await ensureAuthReady();
    const payload = verifyAccessToken(token);
    const user = findUserById(String(payload.sub || ""));
    if (!user) return json({ success: false, error: "User not found." }, 404, {}, request);

    return json({ success: true, data: publicUser(user) }, 200, {}, request);
  } catch {
    return json({ success: false, error: "Unauthorized." }, 401, {}, request);
  }
}
