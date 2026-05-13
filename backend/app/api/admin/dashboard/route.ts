import { ensureDataReady, orders, reports, vendors } from "@/lib/data";
import { getCurrentUser, json, options } from "@/lib/auth";

export function OPTIONS(request: Request) {
  return options(request);
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return json({ success: false, error: "Unauthorized." }, 401, {}, request);
  if (user.role !== "ADMIN") return json({ success: false, error: "Only admin accounts can view admin dashboards." }, 403, {}, request);
  await ensureDataReady();

  const gmv = orders.reduce((sum, order) => sum + order.total, 0) || vendors.reduce((sum, vendor) => sum + vendor.gmv, 0);
  const openDisputes = reports.filter((report) => report.status !== "RESOLVED");
  const pendingVendors = vendors.filter((vendor) => vendor.status === "PENDING");

  return json(
    {
      success: true,
      data: {
        metrics: {
          gmv,
          fees: Math.round(gmv * 0.1),
          pendingVendors: pendingVendors.length,
          openDisputes: openDisputes.length,
        },
        gmvSeries: Array(12).fill(0),
        queue: [
          { label: "Vendor applications", count: pendingVendors.length, href: "vendors.html", badge: pendingVendors.length ? "badge-warning" : "badge-gray" },
          { label: "Open disputes", count: openDisputes.length, href: "disputes.html", badge: openDisputes.length ? "badge-error" : "badge-gray" },
          { label: "Users under review", count: 0, href: "users.html", badge: "badge-gray" },
        ],
        vendors: pendingVendors.slice(0, 3),
        disputes: openDisputes.slice(0, 3).map((report) => ({
          id: report.id,
          reason: report.reason,
          status: report.status,
          amount: 0,
        })),
      },
    },
    200,
    {},
    request,
  );
}
