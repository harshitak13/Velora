import { ensureDataReady, ok, reports, saveReport } from "@/lib/data";
import { getCurrentUser, json, options } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return json({ success: false, error: "Unauthorized." }, 401, {}, request);
  if (user.role !== "ADMIN") return json({ success: false, error: "Only admin accounts can view disputes." }, 403, {}, request);
  await ensureDataReady();
  const disputes = reports.map((report) => ({
    id: report.id,
    buyer: report.reporterRole === "BUYER" ? "Reporting buyer" : report.targetName,
    vendor: report.reporterRole === "SELLER" ? "Reporting seller" : "Reported store",
    reason: report.reason,
    status: report.status,
    amount: 0,
    priority: report.status === "OPEN" ? "High" : "Medium",
    openedAt: report.createdAt,
    notes: report.details,
    targetName: report.targetName,
    type: report.type,
  }));
  return ok(request, disputes);
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return json({ success: false, error: "Unauthorized." }, 401, {}, request);
    if (user.role !== "ADMIN") return json({ success: false, error: "Only admin accounts can update disputes." }, 403, {}, request);
    await ensureDataReady();
    const body = await request.json();
    const ids = Array.isArray(body.ids) ? body.ids : [body.id];
    reports.forEach((report) => {
      if (ids.includes(report.id)) {
        report.status = body.status;
        void saveReport(report);
      }
    });
    return ok(request, reports);
  } catch {
    return json({ success: false, error: "Could not update reports." }, 400, {}, request);
  }
}
