import { ensureDataReady, orders } from "@/lib/data";
import { getCurrentUser, json, options } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return json({ success: false, error: "Unauthorized." }, 401, {}, request);
  if (user.role !== "SELLER") return json({ success: false, error: "Only seller accounts can view seller orders." }, 403, {}, request);
  await ensureDataReady();

  const sellerOrders = orders
    .map((order) => {
      const items = order.items.filter((item) => item.vendorId === user.id);
      if (!items.length) return null;
      return {
        id: order.id,
        buyer: order.buyerName || "Buyer",
        email: order.buyerEmail || "",
        status: order.status,
        tracking: order.trackingNumber || "",
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        createdAt: order.createdAt,
        items: items.map((item) => ({ name: item.name, qty: item.quantity })),
        address: order.shippingAddress
          ? [order.shippingAddress.line1, order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode, order.shippingAddress.country].filter(Boolean).join(", ")
          : "",
      };
    })
    .filter(Boolean);

  return json({ success: true, data: sellerOrders }, 200, {}, request);
}
