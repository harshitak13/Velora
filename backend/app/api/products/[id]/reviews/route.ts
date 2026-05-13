import { ok } from "@/lib/data";
import { options } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function GET(request: Request) {
  return ok(request, [
    { buyerName: "Sarah M.", rating: 5, title: "Absolutely love it", body: "Beautiful quality and exactly as described.", createdAt: "2026-05-08" },
    { buyerName: "James T.", rating: 4, title: "Great quality", body: "Fast shipping and thoughtful packaging.", createdAt: "2026-05-03" },
    { buyerName: "Elena R.", rating: 5, title: "Perfect gift", body: "The recipient loved it. I would order again.", createdAt: "2026-04-28" },
  ]);
}
