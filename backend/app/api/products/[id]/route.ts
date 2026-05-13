import { ensureDataReady, isSellerApproved, ok, products, saveProduct, vendors } from "@/lib/data";
import { getCurrentUser, json, options } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export function OPTIONS(request: Request) {
  return options(request);
}

export async function GET(request: Request, { params }: Params) {
  await ensureDataReady();
  const { id } = await params;
  const product = products.find((item) => item.id === id);
  if (!product) return json({ success: false, error: "Product not found." }, 404, {}, request);
  const vendor = vendors.find((item) => item.id === product.vendorId);
  if (product.status !== "ACTIVE" || (vendor && vendor.status !== "APPROVED")) {
    return json({ success: false, error: "Product not found." }, 404, {}, request);
  }
  return ok(request, product);
}

export async function PUT(request: Request, { params }: Params) {
  const user = await getCurrentUser(request);
  if (!user) return json({ success: false, error: "Unauthorized." }, 401, {}, request);
  if (user.role !== "SELLER") return json({ success: false, error: "Only seller accounts can update products." }, 403, {}, request);
  if (!isSellerApproved(user)) {
    return json({ success: false, error: "Your seller account must be approved by an admin before you can sell products." }, 403, {}, request);
  }
  await ensureDataReady();
  const { id } = await params;
  const index = products.findIndex((item) => item.id === id);
  if (index < 0) return json({ success: false, error: "Product not found." }, 404, {}, request);
  if (products[index].vendorId !== user.id) return json({ success: false, error: "You can only update your own products." }, 403, {}, request);
  const body = await request.json();
  products[index] = { ...products[index], ...body, id, updatedAt: new Date().toISOString() };
  await saveProduct(products[index]);
  return ok(request, products[index]);
}

export async function PATCH(request: Request, args: Params) {
  return PUT(request, args);
}
