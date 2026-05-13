import { ensureDataReady, listNotificationsForUser, markNotificationsRead, ok } from "@/lib/data";
import { getCurrentUser, json, options } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return json({ success: false, error: "Unauthorized." }, 401, {}, request);
  await ensureDataReady();
  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  return ok(request, listNotificationsForUser(user, limit));
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return json({ success: false, error: "Unauthorized." }, 401, {}, request);
  await ensureDataReady();
  return ok(request, await markNotificationsRead(user));
}
