import { ensureAuthReady, findUserByEmail, json, options, publicUser, refreshCookie, signTokens, verifyPassword } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    await ensureAuthReady();
    const user = findUserByEmail(email);

    if (!user || !(await verifyPassword(user, password))) {
      return json({ success: false, error: "Invalid email or password." }, 401, {}, request);
    }

    const tokens = signTokens(user);
    return json(
      {
        success: true,
        data: {
          accessToken: tokens.accessToken,
          user: publicUser(user),
        },
      },
      200,
      { "Set-Cookie": refreshCookie(tokens.refreshToken) },
      request,
    );
  } catch {
    return json({ success: false, error: "Login failed." }, 400, {}, request);
  }
}
