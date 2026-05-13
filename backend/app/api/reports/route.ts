import { createNotification, ensureDataReady, ok, reports, saveReport } from "@/lib/data";
import { getCurrentUser, json, options } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return json({ success: false, error: "Unauthorized." }, 401, {}, request);
  await ensureDataReady();
  if (user.role === "ADMIN") return ok(request, reports);
  return ok(request, reports.filter((report) => report.reporterRole === user.role));
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return json({ success: false, error: "Sign in to submit a report." }, 401, {}, request);
    if (user.role === "ADMIN") return json({ success: false, error: "Admin accounts cannot raise buyer or seller reports." }, 403, {}, request);
    await ensureDataReady();
    const body = await request.json();
    const report = {
      id: `rep_${Date.now()}`,
      type: body.type || "PRODUCT",
      reporterRole: user.role,
      targetId: String(body.targetId || ""),
      targetName: String(body.targetName || "Unknown target"),
      reason: String(body.reason || "Report"),
      details: String(body.details || ""),
      status: "OPEN" as const,
      createdAt: new Date().toISOString(),
    };
    await saveReport(report);
    await createNotification({
      type: "report",
      title: "New report submitted",
      body: `${user.name} reported ${report.targetName}: ${report.reason}.`,
      role: "ADMIN",
      href: "admin/disputes.html",
    });
    return ok(request, report);
  } catch {
    return json({ success: false, error: "Could not submit report." }, 400, {}, request);
  }
}
