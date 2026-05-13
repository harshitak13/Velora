import { createUser, ensureAuthReady, json, options, publicUser, refreshCookie, signTokens } from "@/lib/auth";
import { addVendorForSeller, ensureDataReady } from "@/lib/data";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const role = body.role;
    const storeName = body.storeName ? String(body.storeName) : undefined;

    if (!name) return json({ success: false, error: "Name is required." }, 400, {}, request);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ success: false, error: "Enter a valid email address." }, 400, {}, request);
    }
    if (password.length < 8) {
      return json({ success: false, error: "Password must be at least 8 characters." }, 400, {}, request);
    }
    if (role === "SELLER" && !storeName?.trim()) {
      return json({ success: false, error: "Store name is required for seller accounts." }, 400, {}, request);
    }

    await ensureAuthReady();
    await ensureDataReady();
    const user = await createUser({ name, email, password, role, storeName });
    addVendorForSeller(user);
    const tokens = signTokens(user);

    return json(
      {
        success: true,
        data: {
          accessToken: tokens.accessToken,
          user: publicUser(user),
        },
      },
      201,
      { "Set-Cookie": refreshCookie(tokens.refreshToken) },
      request,
    );
  } catch (error) {
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed.",
      },
      400,
      {},
      request,
    );
  }
}
