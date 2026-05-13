import { ensureDataReady, isSellerApproved, ok, products, saveProduct } from "@/lib/data";
import { getCurrentUser, json, options } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return json({ success: false, error: "Unauthorized." }, 401, {}, request);
    if (user.role !== "SELLER") return json({ success: false, error: "Only seller accounts can update products." }, 403, {}, request);
    if (!isSellerApproved(user)) {
      return json({ success: false, error: "Your seller account must be approved by an admin before you can sell products." }, 403, {}, request);
    }
    await ensureDataReady();
    const body = await request.json();
    const ids = Array.isArray(body.ids) ? body.ids : [];
    products.forEach((product) => {
      if (product.vendorId === user.id && (!ids.length || ids.includes(product.id))) {
        if (body.pricePercent) product.price = Math.round(product.price * (1 + Number(body.pricePercent) / 100));
        if (body.stockDelta) product.stock = Math.max(0, product.stock + Number(body.stockDelta));
        if (body.status) product.status = body.status;
        product.updatedAt = new Date().toISOString();
        void saveProduct(product);
      }
    });
    return ok(request, products);
  } catch {
    return json({ success: false, error: "Bulk update failed." }, 400, {}, request);
  }
}
