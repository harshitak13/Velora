import { ensureDataReady, getSellerSettings, saveSellerSettings } from "@/lib/data";
import { getCurrentUser, json, options } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

async function requireSeller(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return { error: json({ success: false, error: "Unauthorized." }, 401, {}, request) };
  if (user.role !== "SELLER") {
    return { error: json({ success: false, error: "Only seller accounts can access seller settings." }, 403, {}, request) };
  }
  return { user };
}

export async function GET(request: Request) {
  const result = await requireSeller(request);
  if ("error" in result) return result.error;
  await ensureDataReady();
  return json({ success: true, data: getSellerSettings(result.user) }, 200, {}, request);
}

export async function PUT(request: Request) {
  const result = await requireSeller(request);
  if ("error" in result) return result.error;
  await ensureDataReady();
  const body = await request.json();
  return json({ success: true, data: saveSellerSettings(result.user, body) }, 200, {}, request);
}
