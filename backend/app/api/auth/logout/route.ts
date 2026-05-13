import { clearRefreshCookie, json, options } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function POST(request: Request) {
  return json(
    { success: true, data: null },
    200,
    { "Set-Cookie": clearRefreshCookie() },
    request,
  );
}
