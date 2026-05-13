import { ensureDataReady, orders } from "@/lib/data";
import { getCurrentUser, json, listUsers, options } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) return json({ success: false, error: "Unauthorized." }, 401, {}, request);
  if (currentUser.role !== "ADMIN") return json({ success: false, error: "Only admin accounts can view users." }, 403, {}, request);
  await ensureDataReady();
  const users = listUsers()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.role === "SELLER" ? user.sellerStatus || "PENDING" : "ACTIVE",
      orders: orders.filter((order) => order.buyerId === user.id).length,
      gmv: orders.filter((order) => order.buyerId === user.id).reduce((sum, order) => sum + order.total, 0),
      createdAt: user.createdAt,
    }));

  return json({ success: true, data: users }, 200, {}, request);
}
