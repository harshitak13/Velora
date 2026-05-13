import { corsOptions, ensureDataReady, filterProducts, isSellerApproved, ok, productImages, saveProduct } from "@/lib/data";
import { getCurrentUser, json } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return corsOptions(request);
}

export async function GET(request: Request) {
  await ensureDataReady();
  const { rows, meta } = filterProducts(request);
  return ok(request, rows, meta);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await getCurrentUser(request);
    if (!user) return json({ success: false, error: "Sign in with a seller account to create products." }, 401, {}, request);
    if (user.role !== "SELLER") {
      return json({ success: false, error: "Only seller accounts can create products." }, 403, {}, request);
    }
    if (!isSellerApproved(user)) {
      return json({ success: false, error: "Your seller account must be approved by an admin before you can sell products." }, 403, {}, request);
    }
    await ensureDataReady();
    const vendorId = user.id;
    const vendorName = user?.storeName || user?.name || "My Store";
    const now = new Date().toISOString();
    const product = {
      id: `prd_${Date.now()}`,
      name: String(body.name || "Untitled product"),
      category: String(body.category || "home").toLowerCase(),
      vendorId,
      vendorName,
      vendor: { id: vendorId, storeName: vendorName },
      price: Number(body.price || 0),
      comparePrice: body.comparePrice ? Number(body.comparePrice) : null,
      stock: Number(body.stock || 0),
      description: String(body.description || ""),
      images: body.images?.length ? body.images : productImages(String(body.name || "Untitled product"), vendorName),
      avgRating: 0,
      reviewCount: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      tags: [],
      sales: 0,
      status: body.status || "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    await saveProduct(product);
    return ok(request, product);
  } catch {
    return json({ success: false, error: "Could not save product." }, 400, {}, request);
  }
}
