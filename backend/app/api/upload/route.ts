import { json, options } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return json({ success: false, error: "No file uploaded." }, 400, {}, request);
    }

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const { v2: cloudinary } = await import("cloudinary");
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: "velora/products" }, (error, uploadResult) => {
          if (error || !uploadResult) reject(error);
          else resolve({ secure_url: uploadResult.secure_url, public_id: uploadResult.public_id });
        });
        stream.end(buffer);
      });
      return json({ success: true, data: { url: result.secure_url, publicId: result.public_id, provider: "cloudinary" } }, 200, {}, request);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
    return json({ success: true, data: { url: dataUrl, publicId: `local_${Date.now()}`, provider: "local-preview" } }, 200, {}, request);
  } catch {
    return json({ success: false, error: "Upload failed." }, 500, {}, request);
  }
}
