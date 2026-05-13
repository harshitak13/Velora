import mongoose, { Schema } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

const globalMongo = globalThis as typeof globalThis & {
  __veloraMongoPromise?: Promise<typeof mongoose> | null;
};

export function mongoEnabled() {
  return Boolean(MONGODB_URI);
}

export async function connectMongo() {
  if (!MONGODB_URI) return null;
  if (!globalMongo.__veloraMongoPromise) {
    globalMongo.__veloraMongoPromise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      dbName: process.env.MONGODB_DB || "velora_market",
    });
  }
  return globalMongo.__veloraMongoPromise;
}

const loose = { strict: false, versionKey: false } as const;

const UserSchema = new Schema({ email: { type: String, unique: true, index: true }, id: { type: String, unique: true, index: true } }, loose);
const VendorSchema = new Schema({ id: { type: String, unique: true, index: true } }, loose);
const ProductSchema = new Schema({ id: { type: String, unique: true, index: true }, vendorId: { type: String, index: true } }, loose);
const ReportSchema = new Schema({ id: { type: String, unique: true, index: true } }, loose);
const OrderSchema = new Schema({ id: { type: String, unique: true, index: true }, buyerId: { type: String, index: true } }, loose);
const NotificationSchema = new Schema(
  {
    id: { type: String, unique: true, index: true },
    userId: { type: String, index: true },
    role: { type: String, index: true },
  },
  loose,
);
const SellerSettingsSchema = new Schema({ userId: { type: String, unique: true, index: true } }, loose);

export const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
export const VendorModel = mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);
export const ProductModel = mongoose.models.Product || mongoose.model("Product", ProductSchema);
export const ReportModel = mongoose.models.Report || mongoose.model("Report", ReportSchema);
export const OrderModel = mongoose.models.Order || mongoose.model("Order", OrderSchema);
export const NotificationModel = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
export const SellerSettingsModel = mongoose.models.SellerSettings || mongoose.model("SellerSettings", SellerSettingsSchema);

export function stripMongo<T>(doc: T): T {
  if (!doc || typeof doc !== "object") return doc;
  const candidate = doc as unknown as { toObject?: () => T };
  const raw = typeof candidate.toObject === "function" ? candidate.toObject() : doc;
  const clean = { ...(raw as T & { _id?: unknown }) };
  delete clean._id;
  return clean as T;
}
