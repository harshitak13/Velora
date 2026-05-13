import { ensureDataReady, ok, products } from "@/lib/data";
import { getCurrentUser, json, options } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return json({ success: false, error: "Unauthorized." }, 401, {}, request);
  if (user.role !== "SELLER") return json({ success: false, error: "Only seller accounts can view seller products." }, 403, {}, request);
  await ensureDataReady();
  return ok(request, products.filter((product) => product.vendorId === user.id));
}
