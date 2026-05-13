import { ensureAuthReady, findUserById, getCookie, json, options, refreshCookie, signTokens, verifyRefreshToken } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function POST(request: Request) {
  try {
    const token = getCookie(request, "vm_refresh_token");
    if (!token) return json({ success: false, error: "Missing refresh token." }, 401, {}, request);

    await ensureAuthReady();
    const payload = verifyRefreshToken(token);
    const user = findUserById(String(payload.sub || ""));
    if (!user) return json({ success: false, error: "User not found." }, 404, {}, request);

    const tokens = signTokens(user);
    return json(
      { success: true, data: { accessToken: tokens.accessToken } },
      200,
      { "Set-Cookie": refreshCookie(tokens.refreshToken) },
      request,
    );
  } catch {
    return json({ success: false, error: "Invalid refresh token." }, 401, {}, request);
  }
}
