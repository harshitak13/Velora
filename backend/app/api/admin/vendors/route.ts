import { createNotification, ensureDataReady, ok, setVendorStatus, vendors } from "@/lib/data";
import { getCurrentUser, json, options, updateUserSellerStatus } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return json({ success: false, error: "Unauthorized." }, 401, {}, request);
  if (user.role !== "ADMIN") return json({ success: false, error: "Only admin accounts can view vendors." }, 403, {}, request);
  await ensureDataReady();
  return ok(request, vendors);
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return json({ success: false, error: "Unauthorized." }, 401, {}, request);
    if (user.role !== "ADMIN") return json({ success: false, error: "Only admin accounts can update vendors." }, 403, {}, request);
    await ensureDataReady();
    const body = await request.json();
    const ids: string[] = (Array.isArray(body.ids) ? body.ids : [body.id]).filter(Boolean).map(String);
    setVendorStatus(ids, body.status);
    ids.forEach((id) => updateUserSellerStatus(id, body.status));
    await Promise.all(ids.map((id) => notifyVendorStatus(id, body.status)));
    return ok(request, vendors);
  } catch {
    return json({ success: false, error: "Could not update vendors." }, 400, {}, request);
  }
}

async function notifyVendorStatus(id: string, status: string) {
  const vendor = vendors.find((item) => item.id === id);
  if (!vendor) return;
  const approved = status === "APPROVED";
  await createNotification({
    type: "approval",
    title: approved ? "Store approved" : `Store ${String(status).toLowerCase()}`,
    body: approved
      ? `${vendor.name} is approved. You can now list and sell products.`
      : `Your store status changed to ${String(status).toLowerCase()}.`,
    userId: id,
    href: "seller/dashboard.html",
  });
}
