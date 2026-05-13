import { json, options, type Role, type UserRecord, type SellerApprovalStatus } from "@/lib/auth";
import {
  connectMongo,
  mongoEnabled,
  NotificationModel,
  OrderModel,
  ProductModel,
  ReportModel,
  SellerSettingsModel,
  stripMongo,
  VendorModel,
} from "@/lib/mongodb";

export type Product = {
  id: string;
  name: string;
  category: string;
  vendorId: string;
  vendorName: string;
  vendor?: { id: string; storeName: string };
  price: number;
  comparePrice?: number | null;
  stock: number;
  description: string;
  images: string[];
  avgRating: number;
  reviewCount: number;
  ratingDistribution: Record<number, number>;
  tags: string[];
  sales: number;
  status: "ACTIVE" | "DRAFT" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
};

export type Vendor = {
  id: string;
  name: string;
  owner: string;
  email: string;
  status: "APPROVED" | "PENDING" | "SUSPENDED" | "REJECTED";
  category: string;
  gmv: number;
  rating: number;
  submittedAt: string;
};

export type Report = {
  id: string;
  type: "STORE" | "BUYER" | "PRODUCT";
  reporterRole: "BUYER" | "SELLER" | "ADMIN";
  targetId: string;
  targetName: string;
  reason: string;
  details: string;
  status: "OPEN" | "REVIEW" | "RESOLVED";
  createdAt: string;
};

export type SellerSettings = {
  storeName: string;
  slug: string;
  bio: string;
  supportEmail: string;
  phone: string;
  processingTime: string;
  shipsFrom: string;
  freeShipping: boolean;
  internationalShipping: boolean;
};

export type OrderRecord = {
  id: string;
  buyerId: string;
  buyerName?: string;
  buyerEmail?: string;
  status: string;
  total: number;
  createdAt: string;
  items: Array<{
    productId: string;
    vendorId?: string;
    name: string;
    image?: string;
    vendorName: string;
    quantity: number;
    price: number;
  }>;
  trackingNumber?: string;
  shippingAddress?: { name?: string; line1?: string; city?: string; state?: string; postalCode?: string; country?: string };
};

export type NotificationRecord = {
  id: string;
  type: "order_update" | "system" | "payout" | "new_sale" | "report" | "approval";
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  userId?: string;
  role?: Role;
  href?: string;
  image?: string;
};

const globalData = globalThis as typeof globalThis & {
  __veloraProducts?: Product[];
  __veloraVendors?: Vendor[];
  __veloraReports?: Report[];
  __veloraSellerSettings?: Map<string, SellerSettings>;
  __veloraOrders?: OrderRecord[];
  __veloraNotifications?: NotificationRecord[];
  __veloraDataReady?: Promise<void>;
};

function svgImage(label: string, colorA: string, colorB: string) {
  const lower = label.toLowerCase();
  const icon =
    lower.includes("mug") ? "☕" :
    lower.includes("print") ? "🖼️" :
    lower.includes("macrame") ? "🧶" :
    lower.includes("candle") ? "🕯️" :
    lower.includes("journal") ? "📔" :
    lower.includes("wreath") || lower.includes("flower") ? "💐" :
    lower.includes("scarf") ? "🧣" :
    lower.includes("earring") || lower.includes("hoop") ? "💍" :
    lower.includes("postcard") ? "✉️" :
    lower.includes("tea") ? "🍵" :
    lower.includes("board") ? "🪵" :
    lower.includes("basket") ? "🧺" :
    "🛍️";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colorA}"/><stop offset="1" stop-color="${colorB}"/></linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#312E81" flood-opacity=".18"/></filter>
      </defs>
      <rect width="900" height="900" rx="42" fill="url(#g)"/>
      <circle cx="700" cy="182" r="118" fill="rgba(255,255,255,.28)"/>
      <circle cx="210" cy="704" r="170" fill="rgba(255,255,255,.20)"/>
      <ellipse cx="450" cy="670" rx="230" ry="46" fill="rgba(30,27,46,.13)"/>
      <g filter="url(#shadow)">
        <rect x="230" y="230" width="440" height="380" rx="44" fill="rgba(255,255,255,.78)"/>
        <rect x="270" y="270" width="360" height="300" rx="32" fill="rgba(255,255,255,.46)"/>
        <text x="450" y="472" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif" font-size="174">${icon}</text>
      </g>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const vendors =
  globalData.__veloraVendors ??
  [
    { id: "v1", name: "PotteryHaven", owner: "Mira Stone", email: "mira@pottery.example", status: "APPROVED", category: "Home", gmv: 4285000, rating: 4.8, submittedAt: "2025-08-08" },
    { id: "v2", name: "GreenStudio", owner: "Nora Fields", email: "nora@green.example", status: "APPROVED", category: "Art", gmv: 2160000, rating: 4.7, submittedAt: "2025-09-18" },
    { id: "v3", name: "KnotCraft", owner: "Eli Weaver", email: "eli@knot.example", status: "APPROVED", category: "Home", gmv: 1894000, rating: 4.6, submittedAt: "2025-11-05" },
    { id: "v4", name: "Stone & Thread", owner: "Olivia Grant", email: "olivia@stone.example", status: "PENDING", category: "Fashion", gmv: 0, rating: 0, submittedAt: "2026-05-12" },
    { id: "v5", name: "Northline Goods", owner: "Henry Park", email: "henry@northline.example", status: "PENDING", category: "Vintage", gmv: 0, rating: 0, submittedAt: "2026-05-11" },
  ] satisfies Vendor[];

globalData.__veloraVendors = vendors;

export function addVendorForSeller(user: UserRecord) {
  if (user.role !== "SELLER") return null;
  const existing = vendors.find((vendor) => vendor.id === user.id);
  if (existing) return existing;
  const vendor: Vendor = {
    id: user.id,
    name: user.storeName || user.name,
    owner: user.name,
    email: user.email,
    status: user.sellerStatus || "PENDING",
    category: "General",
    gmv: 0,
    rating: 0,
    submittedAt: user.createdAt.slice(0, 10),
  };
  vendors.unshift(vendor);
  void persist("vendor", vendor);
  void createNotification({
    type: "system",
    title: "Store review requested",
    body: `${vendor.name} is waiting for admin approval.`,
    role: "ADMIN",
    href: "admin/vendors.html",
  });
  return vendor;
}

export function setVendorStatus(ids: string[], status: SellerApprovalStatus) {
  vendors.forEach((vendor) => {
    if (ids.includes(vendor.id)) {
      vendor.status = status;
      void persist("vendor", vendor);
    }
  });
}

export function sellerApprovalStatus(user?: UserRecord | null) {
  if (!user || user.role !== "SELLER") return null;
  return vendors.find((vendor) => vendor.id === user.id)?.status || user.sellerStatus || "PENDING";
}

export function isSellerApproved(user?: UserRecord | null) {
  return sellerApprovalStatus(user) === "APPROVED";
}

export const products =
  globalData.__veloraProducts ??
  [
    product("1", "Handcrafted Ceramic Mug", "home", "v1", "PotteryHaven", 2800, 3500, 24, "This beautifully handcrafted ceramic mug is made using traditional pottery techniques. Each piece is unique, with slight variations in glaze and texture that make it truly one-of-a-kind.", "#E8DCFF", "#C4B5FD", 127, 4.8, ["handmade", "ceramic", "mug", "pottery"], 168),
    product("2", "Botanical Art Print Set", "art", "v2", "GreenStudio", 4500, null, 31, "A coordinated set of botanical prints on archival matte paper, ready to frame for calm, natural interiors.", "#D1FAE5", "#A7F3D0", 92, 4.7, ["art", "print", "botanical"], 98),
    product("3", "Macrame Wall Hanging", "home", "v3", "KnotCraft", 6750, null, 12, "Hand-knotted cotton wall hanging with warm texture and a modern geometric pattern.", "#FEF3C7", "#FDE68A", 66, 4.6, ["fiber", "decor", "wall"], 74),
    product("4", "Beeswax Candle Bundle", "home", "v1", "PotteryHaven", 3200, 4000, 8, "Naturally scented beeswax candles poured in small batches for a clean, warm glow.", "#DBEAFE", "#BFDBFE", 84, 4.5, ["candle", "home", "gift"], 108),
    product("5", "Leather Journal Cover", "vintage", "v5", "Northline Goods", 5400, null, 18, "A durable leather journal cover designed to age beautifully with daily use.", "#FCE7F3", "#FBCFE8", 51, 4.4, ["leather", "journal", "gift"], 42),
    product("6", "Dried Flower Wreath", "home", "v2", "GreenStudio", 3900, null, 15, "A seasonal dried flower wreath made with preserved stems and soft natural color.", "#EDE9FE", "#DDD6FE", 43, 4.6, ["floral", "decor", "wreath"], 61),
    product("7", "Hand-dyed Silk Scarf", "fashion", "v4", "Stone & Thread", 7200, 8500, 3, "A light silk scarf hand-dyed in layered color for an expressive, wearable finish.", "#D1FAE5", "#6EE7B7", 38, 4.9, ["fashion", "silk", "scarf"], 74),
    product("8", "Silver Hoop Earrings", "jewelry", "v1", "PotteryHaven", 3300, null, 16, "Simple polished silver hoops made for everyday wear.", "#F3F4F6", "#E5E7EB", 27, 4.3, ["jewelry", "silver"], 31),
    product("9", "Vintage Postcard Set", "vintage", "v5", "Northline Goods", 1800, null, 40, "A curated bundle of vintage-style postcards for notes, scrapbooks, and display.", "#FEF3C7", "#FDE68A", 19, 4.2, ["vintage", "paper"], 22),
    product("10", "Organic Tea Collection", "home", "v2", "GreenStudio", 2600, null, 22, "A calming loose-leaf tea sampler with floral, green, and herbal blends.", "#D1FAE5", "#A7F3D0", 58, 4.7, ["tea", "gift"], 89),
    product("11", "Wooden Serving Board", "home", "v3", "KnotCraft", 4850, null, 10, "A smooth wooden serving board for cheese, bread, and small gatherings.", "#FEF9C3", "#FEF08A", 33, 4.5, ["wood", "kitchen"], 46),
    product("12", "Woven Basket Set", "home", "v3", "KnotCraft", 5600, 6900, 7, "Three nesting woven baskets for storage with a soft natural finish.", "#EDE9FE", "#DDD6FE", 41, 4.5, ["basket", "storage"], 52),
  ];

globalData.__veloraProducts = products;

export const reports = globalData.__veloraReports ?? [] satisfies Report[];

globalData.__veloraReports = reports;

const sellerSettings = globalData.__veloraSellerSettings ?? new Map<string, SellerSettings>();
globalData.__veloraSellerSettings = sellerSettings;

export const orders = globalData.__veloraOrders ?? [] satisfies OrderRecord[];
globalData.__veloraOrders = orders;

export const notifications = globalData.__veloraNotifications ?? [] satisfies NotificationRecord[];
globalData.__veloraNotifications = notifications;

globalData.__veloraDataReady = globalData.__veloraDataReady ?? hydrateData();

export async function ensureDataReady() {
  await globalData.__veloraDataReady;
}

export async function saveOrder(order: OrderRecord) {
  const index = orders.findIndex((item) => item.id === order.id);
  if (index >= 0) orders[index] = order;
  else orders.unshift(order);
  await persist("order", order);
}

export async function saveProduct(product: Product) {
  const index = products.findIndex((item) => item.id === product.id);
  if (index >= 0) products[index] = product;
  else products.unshift(product);
  await persist("product", product);
}

export async function saveReport(report: Report) {
  const index = reports.findIndex((item) => item.id === report.id);
  if (index >= 0) reports[index] = report;
  else reports.unshift(report);
  await persist("report", report);
}

export async function createNotification(input: Omit<NotificationRecord, "id" | "isRead" | "createdAt"> & Partial<Pick<NotificationRecord, "id" | "isRead" | "createdAt">>) {
  const notification: NotificationRecord = {
    id: input.id || `not_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type: input.type,
    title: input.title,
    body: input.body,
    isRead: input.isRead ?? false,
    createdAt: input.createdAt || new Date().toISOString(),
    userId: input.userId,
    role: input.role,
    href: input.href,
    image: input.image,
  };
  notifications.unshift(notification);
  await persist("notification", notification);
  return notification;
}

export function listNotificationsForUser(user: UserRecord, limit = 20) {
  return notifications
    .filter((item) => item.userId === user.id || item.role === user.role)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function markNotificationsRead(user: UserRecord) {
  const relevant = notifications.filter((item) => item.userId === user.id || item.role === user.role);
  relevant.forEach((item) => {
    item.isRead = true;
  });
  if (mongoEnabled() && relevant.length) {
    try {
      await connectMongo();
      await NotificationModel.updateMany({ id: { $in: relevant.map((item) => item.id) } }, { $set: { isRead: true } });
    } catch (error) {
      console.warn("MongoDB notification update skipped:", error);
    }
  }
  return relevant;
}

export function defaultSellerSettings(user: UserRecord): SellerSettings {
  const storeName = user.storeName || user.name || "My Store";
  const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    storeName,
    slug,
    bio: "",
    supportEmail: user.email,
    phone: "",
    processingTime: "2 business days",
    shipsFrom: "India",
    freeShipping: true,
    internationalShipping: false,
  };
}

export function getSellerSettings(user: UserRecord) {
  if (!sellerSettings.has(user.id)) {
    sellerSettings.set(user.id, defaultSellerSettings(user));
  }
  return sellerSettings.get(user.id)!;
}

export function saveSellerSettings(user: UserRecord, input: Partial<SellerSettings>) {
  const current = getSellerSettings(user);
  const next = {
    ...current,
    ...input,
    storeName: input.storeName?.trim() || current.storeName,
    slug: input.slug?.trim() || current.slug,
    supportEmail: input.supportEmail?.trim() || current.supportEmail,
  };
  sellerSettings.set(user.id, next);
  const vendor = vendors.find((item) => item.id === user.id);
  if (vendor) {
    vendor.name = next.storeName;
    vendor.email = next.supportEmail;
    void persist("vendor", vendor);
  }
  void persist("sellerSettings", { userId: user.id, settings: next });
  return next;
}

function product(
  id: string,
  name: string,
  category: string,
  vendorId: string,
  vendorName: string,
  price: number,
  comparePrice: number | null,
  stock: number,
  description: string,
  colorA: string,
  colorB: string,
  reviewCount: number,
  avgRating: number,
  tags: string[],
  sales: number,
): Product {
  return {
    id,
    name,
    category,
    vendorId,
    vendorName,
    vendor: { id: vendorId, storeName: vendorName },
    price,
    comparePrice,
    stock,
    description,
    images: productImages(name, vendorName, colorA, colorB),
    avgRating,
    reviewCount,
    ratingDistribution: { 5: Math.round(reviewCount * 0.7), 4: Math.round(reviewCount * 0.2), 3: Math.round(reviewCount * 0.07), 2: Math.round(reviewCount * 0.02), 1: Math.max(1, Math.round(reviewCount * 0.01)) },
    tags,
    sales,
    status: "ACTIVE",
    createdAt: "2026-05-01T10:00:00Z",
    updatedAt: "2026-05-12T10:00:00Z",
  };
}

export function productImages(name: string, vendorName = "Velora Seller", colorA = "#E8DCFF", colorB = "#C4B5FD") {
  return [svgImage(name, colorA, colorB), svgImage(`${name} detail`, colorB, colorA), svgImage(vendorName, "#F5F0FF", colorA)];
}

export function filterProducts(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("search") || url.searchParams.get("q") || "").toLowerCase();
  const category = (url.searchParams.get("category") || "").toLowerCase();
  const vendorId = url.searchParams.get("vendorId") || "";
  const vendorSlug = (url.searchParams.get("vendor") || "").toLowerCase();
  const minPrice = Number(url.searchParams.get("minPrice") || 0) * 100;
  const maxPriceRaw = Number(url.searchParams.get("maxPrice") || 0);
  const maxPrice = maxPriceRaw ? maxPriceRaw * 100 : Infinity;
  const rating = Number(url.searchParams.get("rating") || 0);
  const inStock = url.searchParams.get("inStock") === "true";
  const onSale = url.searchParams.get("onSale") === "true";
  const sort = url.searchParams.get("sort") || "newest";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.max(1, Number(url.searchParams.get("limit") || 24));

  let rows = products.filter((p) => {
    const vendor = vendors.find((item) => item.id === p.vendorId);
    return p.status === "ACTIVE" && (!vendor || vendor.status === "APPROVED");
  });
  if (q) rows = rows.filter((p) => [p.name, p.vendorName, p.category, p.description, ...p.tags].join(" ").toLowerCase().includes(q));
  if (category && category !== "all") rows = rows.filter((p) => p.category.toLowerCase() === category);
  if (vendorId) rows = rows.filter((p) => p.vendorId === vendorId);
  if (vendorSlug) rows = rows.filter((p) => p.vendorName.toLowerCase().replaceAll(" ", "-") === vendorSlug || p.vendorId === vendorSlug);
  rows = rows.filter((p) => p.price >= minPrice && p.price <= maxPrice);
  if (rating) rows = rows.filter((p) => p.avgRating >= rating);
  if (inStock) rows = rows.filter((p) => p.stock > 0);
  if (onSale) rows = rows.filter((p) => p.comparePrice && p.comparePrice > p.price);

  rows = [...rows].sort((a, b) => {
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "rating") return b.avgRating - a.avgRating;
    if (sort === "popular") return b.sales - a.sales;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const total = rows.length;
  rows = rows.slice((page - 1) * limit, page * limit);
  return { rows, meta: { total, page, limit } };
}

export function corsOptions(request: Request) {
  return options(request);
}

export function ok(request: Request, data: unknown, meta?: unknown) {
  return json({ success: true, data, ...(meta ? { meta } : {}) }, 200, {}, request);
}

async function hydrateData() {
  if (!mongoEnabled()) return;
  try {
    await connectMongo();
    const [dbVendors, dbProducts, dbReports, dbOrders, dbNotifications, dbSettings] = await Promise.all([
      VendorModel.find({}).lean(),
      ProductModel.find({}).lean(),
      ReportModel.find({}).lean(),
      OrderModel.find({}).lean(),
      NotificationModel.find({}).lean(),
      SellerSettingsModel.find({}).lean(),
    ]);

    if (dbVendors.length) vendors.splice(0, vendors.length, ...(dbVendors.map(stripMongo) as Vendor[]));
    else await Promise.all(vendors.map((vendor) => persist("vendor", vendor)));

    if (dbProducts.length) products.splice(0, products.length, ...(dbProducts.map(stripMongo) as Product[]));
    else await Promise.all(products.map((product) => persist("product", product)));

    if (dbReports.length) reports.splice(0, reports.length, ...(dbReports.map(stripMongo) as Report[]));
    if (dbOrders.length) orders.splice(0, orders.length, ...(dbOrders.map(stripMongo) as OrderRecord[]));
    if (dbNotifications.length) notifications.splice(0, notifications.length, ...(dbNotifications.map(stripMongo) as NotificationRecord[]));

    dbSettings.forEach((row) => {
      const saved = stripMongo(row) as { userId?: string; settings?: SellerSettings };
      if (saved.userId && saved.settings) sellerSettings.set(saved.userId, saved.settings);
    });
  } catch (error) {
    console.warn("MongoDB data hydration skipped:", error);
  }
}

async function persist(type: "vendor" | "product" | "report" | "order" | "notification" | "sellerSettings", value: unknown) {
  if (!mongoEnabled()) return;
  try {
    await connectMongo();
    const payload = value as Record<string, unknown>;
    if (type === "vendor") await updateDocument(VendorModel, { id: (value as Vendor).id }, payload);
    if (type === "product") await updateDocument(ProductModel, { id: (value as Product).id }, payload);
    if (type === "report") await updateDocument(ReportModel, { id: (value as Report).id }, payload);
    if (type === "order") await updateDocument(OrderModel, { id: (value as OrderRecord).id }, payload);
    if (type === "notification") await updateDocument(NotificationModel, { id: (value as NotificationRecord).id }, payload);
    if (type === "sellerSettings") {
      const settings = value as { userId: string; settings: SellerSettings };
      await updateDocument(SellerSettingsModel, { userId: settings.userId }, settings);
    }
  } catch (error) {
    console.warn(`MongoDB ${type} persistence skipped:`, error);
  }
}

function updateDocument(model: unknown, filter: Record<string, unknown>, payload: Record<string, unknown>) {
  const collection = model as {
    updateOne: (filter: Record<string, unknown>, update: { $set: Record<string, unknown> }, options: { upsert: boolean }) => Promise<unknown>;
  };
  return collection.updateOne(filter, { $set: payload }, { upsert: true });
}
