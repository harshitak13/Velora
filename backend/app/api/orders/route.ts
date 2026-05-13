import { createNotification, ensureDataReady, ok, orders, products, saveOrder, saveProduct } from "@/lib/data";
import { getCurrentUser, json, options } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return json({ success: false, error: "Unauthorized." }, 401, {}, request);
  if (user.role !== "BUYER") return json({ success: false, error: "Only buyer accounts can view buyer orders." }, 403, {}, request);
  await ensureDataReady();
  return ok(request, orders.filter((order) => order.buyerId === user.id));
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return json({ success: false, error: "Sign in with a buyer account to place orders." }, 401, {}, request);
    if (user.role !== "BUYER") return json({ success: false, error: "Seller and admin accounts cannot buy products. Use a buyer account to purchase." }, 403, {}, request);
    await ensureDataReady();

    const body = await request.json();
    const orderItems = (Array.isArray(body.items) ? body.items : []).map((item: { productId: string; quantity: number; price: number }) => {
      const product = products.find((p) => p.id === item.productId);
      const quantity = Math.max(1, Number(item.quantity || 1));
      if (product) {
        product.stock = Math.max(0, product.stock - quantity);
        product.sales += quantity;
        product.updatedAt = new Date().toISOString();
        void saveProduct(product);
      }
      return {
        productId: item.productId,
        vendorId: product?.vendorId,
        name: product?.name || "Product",
        image: product?.images?.[0],
        vendorName: product?.vendorName || "Seller",
        quantity,
        price: Number(item.price || product?.price || 0),
      };
    });

    const order = {
      id: `ord_${Date.now()}`,
      buyerId: user.id,
      buyerName: user.name,
      buyerEmail: user.email,
      status: "PENDING",
      total: Number(body.total || orderItems.reduce((sum: number, item: (typeof orderItems)[number]) => sum + item.price * item.quantity, 0)),
      createdAt: new Date().toISOString(),
      items: orderItems,
      shippingAddress: body.shippingAddress,
    };

    await saveOrder(order);
    await createOrderNotifications(order);
    return ok(request, order);
  } catch {
    return json({ success: false, error: "Could not create order." }, 400, {}, request);
  }
}

async function createOrderNotifications(order: (typeof orders)[number]) {
  const firstItem = order.items[0];
  await createNotification({
    type: "order_update",
    title: "Order placed",
    body: `Your order ${order.id} has been placed successfully.`,
    userId: order.buyerId,
    href: "orders.html",
    image: firstItem?.image,
  });

  const sellerIds = [...new Set(order.items.map((item) => item.vendorId).filter(Boolean))] as string[];
  await Promise.all(
    sellerIds.map((sellerId) => {
      const sellerItems = order.items.filter((item) => item.vendorId === sellerId);
      const itemCount = sellerItems.reduce((sum, item) => sum + item.quantity, 0);
      return createNotification({
        type: "new_sale",
        title: "New sale",
        body: `${order.buyerName || "A buyer"} purchased ${itemCount} item${itemCount === 1 ? "" : "s"}.`,
        userId: sellerId,
        href: "seller/orders.html",
        image: sellerItems[0]?.image,
      });
    }),
  );

  await createNotification({
    type: "system",
    title: "New marketplace order",
    body: `${order.buyerName || "A buyer"} placed ${order.id}.`,
    role: "ADMIN",
    href: "admin/dashboard.html",
    image: firstItem?.image,
  });
}
