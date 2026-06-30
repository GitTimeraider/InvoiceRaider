import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { backendGet, SESSION_COOKIE } from "$lib/backend";
import { getMaintainer } from "$lib/version";

type Invoice = {
  id: string;
  invoiceNumber: string;
  customer?: { name?: string };
  issueDate?: string | Date;
  dueDate?: string | Date;
  updatedAt?: string | Date;
  currency?: string;
  status?: "draft" | "sent" | "complete" | "paid" | "overdue" | "voided";
  total?: number;
};

export const load: PageServerLoad = async ({ locals, cookies }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }

  const token = cookies.get(SESSION_COOKIE);
  const auth = token ? `Bearer ${token}` : "";

  const user = locals.user;
  const canViewInvoices =
    user.isAdmin ||
    user.permissions?.some(
      (p) => p.resource === "invoices" && p.action === "read",
    );
  const canViewCustomers =
    user.isAdmin ||
    user.permissions?.some(
      (p) => p.resource === "customers" && p.action === "read",
    );

  try {
    const [invoices, customers, settings] = await Promise.all([
      canViewInvoices
        ? (backendGet("/api/v1/invoices", auth) as Promise<Invoice[]>)
        : Promise.resolve([] as Invoice[]),
      canViewCustomers
        ? (backendGet("/api/v1/customers", auth) as Promise<unknown[]>)
        : Promise.resolve([] as unknown[]),
      backendGet("/api/v1/settings", auth).catch(() => ({})) as Promise<
        Record<string, unknown>
      >,
    ]);

    const currency = (invoices[0]?.currency as string) || "USD";
    const dateFormat = String(settings.dateFormat || "YYYY-MM-DD");
    const billed = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
    const paid = invoices
      .filter((i) => i.status === "paid" || i.status === "complete")
      .reduce((s, i) => s + (i.total || 0), 0);
    const outstanding = invoices
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((s, i) => s + (i.total || 0), 0);
    const status = {
      draft: invoices.filter((i) => i.status === "draft").length,
      sent: invoices.filter((i) => i.status === "sent").length,
      complete: invoices.filter((i) => i.status === "complete").length,
      paid: invoices.filter((i) => i.status === "paid").length,
      overdue: invoices.filter((i) => i.status === "overdue").length,
      voided: invoices.filter((i) => i.status === "voided").length,
    };

    const recent = invoices
      .slice()
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.issueDate || 0).getTime() -
          new Date(a.updatedAt || a.issueDate || 0).getTime(),
      )
      .slice(0, 5);

    const now = new Date();
    const monthStarts = Array.from({ length: 6 }, (_v, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      return d;
    });
    const monthIndex = new Map<string, number>(
      monthStarts.map((d, idx) => [
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        idx,
      ]),
    );
    const trend = monthStarts.map((d) => ({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-US", { month: "short" }),
      amount: 0,
      count: 0,
    }));
    for (const inv of invoices) {
      const date = new Date(inv.issueDate || inv.updatedAt || 0);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const idx = monthIndex.get(key);
      if (idx == null) continue;
      trend[idx].amount += Number(inv.total || 0);
      trend[idx].count += 1;
    }

    const aging = {
      current: 0,
      d1_30: 0,
      d31_60: 0,
      d61_plus: 0,
    };
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (const inv of invoices) {
      if (inv.status !== "sent" && inv.status !== "overdue") continue;
      const amount = Number(inv.total || 0);
      if (amount <= 0) continue;
      const due = new Date(inv.dueDate || inv.issueDate || 0);
      if (Number.isNaN(due.getTime())) {
        aging.current += amount;
        continue;
      }
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const diffDays = Math.floor(
        (startOfToday.getTime() - dueDay.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays <= 0) {
        aging.current += amount;
      } else if (diffDays <= 30) {
        aging.d1_30 += amount;
      } else if (diffDays <= 60) {
        aging.d31_60 += amount;
      } else {
        aging.d61_plus += amount;
      }
    }

    const topCustomerMap = new Map<string, { name: string; total: number; count: number }>();
    for (const inv of invoices) {
      const name = inv.customer?.name || "Unknown";
      const existing = topCustomerMap.get(name) || { name, total: 0, count: 0 };
      existing.total += Number(inv.total || 0);
      existing.count += 1;
      topCustomerMap.set(name, existing);
    }
    const topCustomers = Array.from(topCustomerMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let billedCurrentMonth = 0;
    let billedPreviousMonth = 0;
    let outstandingCurrentMonth = 0;
    let outstandingPreviousMonth = 0;

    for (const inv of invoices) {
      const date = new Date(inv.issueDate || inv.updatedAt || 0);
      if (Number.isNaN(date.getTime())) continue;
      const amount = Number(inv.total || 0);
      const isOutstanding = inv.status === "sent" || inv.status === "overdue";

      if (date >= currentMonthStart && date < nextMonthStart) {
        billedCurrentMonth += amount;
        if (isOutstanding) outstandingCurrentMonth += amount;
      } else if (date >= previousMonthStart && date < currentMonthStart) {
        billedPreviousMonth += amount;
        if (isOutstanding) outstandingPreviousMonth += amount;
      }
    }

    function toDelta(current: number, previous: number) {
      if (previous <= 0) {
        if (current > 0) return { change: current, percent: 100, direction: "up" as const };
        return { change: 0, percent: 0, direction: "flat" as const };
      }
      const change = current - previous;
      const percent = (change / previous) * 100;
      return {
        change,
        percent,
        direction: change > 0 ? ("up" as const) : change < 0 ? ("down" as const) : ("flat" as const),
      };
    }

    const deltas = {
      billedMoM: toDelta(billedCurrentMonth, billedPreviousMonth),
      outstandingMoM: toDelta(outstandingCurrentMonth, outstandingPreviousMonth),
    };

    const maintainer = getMaintainer();

    return {
      counts: { invoices: invoices.length, customers: customers.length },
      money: { billed, paid, outstanding, currency },
      status,
      recent,
      trend,
      aging,
      topCustomers,
      deltas,
      maintainer,
      dateFormat,
    };
  } catch (err) {
    return { error: String(err) };
  }
};
