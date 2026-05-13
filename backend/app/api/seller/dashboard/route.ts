import { ensureDataReady, ok, products, sellerApprovalStatus } from "@/lib/data";
import { getCurrentUser, json, options } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return json({ success: false, error: "Unauthorized." }, 401, {}, request);
  if (user.role !== "SELLER") return json({ success: false, error: "Only seller accounts can view seller dashboards." }, 403, {}, request);
  await ensureDataReady();
  const approvalStatus = sellerApprovalStatus(user) || "PENDING";
  const sellerProducts = user ? products.filter((product) => product.vendorId === user.id) : [];
  const activeProducts = sellerProducts.filter((product) => product.status === "ACTIVE");
  const revenue = sellerProducts.reduce((sum, product) => sum + product.price * product.sales, 0);
  const orders = sellerProducts.reduce((sum, product) => sum + product.sales, 0);
  const payout = Math.round(revenue * 0.9);
  const lowStock = sellerProducts
    .filter((product) => product.stock <= 5)
    .map((product) => ({ name: product.name, stock: product.stock, sold: product.sales }));

  return ok(request, {
    metrics: {
      revenue,
      orders,
      conversion: orders ? 4.8 : 0,
      payout,
      revenueChange: revenue ? "+0% this month" : "No sales yet",
    },
    revenueSeries: Array(12).fill(0),
    orders: [],
    alerts: lowStock,
    health: [
      { label: "Admin approval", value: approvalStatus, badge: approvalStatus === "APPROVED" ? "badge-success" : approvalStatus === "PENDING" ? "badge-warning" : "badge-error" },
      { label: "Stripe Connect", value: "Not connected", badge: "badge-warning" },
      { label: "Active listings", value: String(activeProducts.length), badge: activeProducts.length ? "badge-success" : "badge-gray" },
      { label: "Review rating", value: "No reviews", badge: "badge-gray" },
    ],
  });
}
