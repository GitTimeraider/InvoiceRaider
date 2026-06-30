<script lang="ts">
  import { ShieldOff } from "lucide-svelte";
  import { getContext } from "svelte";

  let { data } = $props();

  let t = getContext("i18n") as (key: string) => string;
  let numberFormat = $derived(data.localization?.numberFormat || "comma");
  let dateLocale = $derived(data.localization?.locale || "en");
  let statusCounts = $derived((data.status || {}) as Record<string, number>);
  let trend = $derived((data.trend || []) as Array<{ key: string; label: string; amount: number; count: number }>);
  let topCustomers = $derived((data.topCustomers || []) as Array<{ name: string; total: number; count: number }>);
  let deltas = $derived(
    (data.deltas || {
      billedMoM: { change: 0, percent: 0, direction: "flat" },
      outstandingMoM: { change: 0, percent: 0, direction: "flat" },
    }) as {
      billedMoM: { change: number; percent: number; direction: "up" | "down" | "flat" };
      outstandingMoM: { change: number; percent: number; direction: "up" | "down" | "flat" };
    },
  );
  let aging = $derived(
    (data.aging || { current: 0, d1_30: 0, d31_60: 0, d61_plus: 0 }) as {
      current: number;
      d1_30: number;
      d31_60: number;
      d61_plus: number;
    },
  );
  let trendMax = $derived(Math.max(1, ...trend.map((m) => Number(m.amount || 0))));
  let agingTotal = $derived(Number(aging.current || 0) + Number(aging.d1_30 || 0) + Number(aging.d31_60 || 0) + Number(aging.d61_plus || 0));
  let user = $derived(data.user);
  let canViewInvoices = $derived(user?.isAdmin || user?.permissions?.some((p) => p.resource === "invoices" && p.action === "read"));
  let canViewCustomers = $derived(user?.isAdmin || user?.permissions?.some((p) => p.resource === "customers" && p.action === "read"));

  function fmtMoney(n: number) {
    const cur = data.money?.currency || "USD";
    try {
      const locale = numberFormat === "period" ? "de-DE" : "en-US";
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: cur,
      }).format(n || 0);
    } catch {
      return `${cur} ${Number(n || 0).toFixed(2)}`;
    }
  }

  function fmtDeltaPercent(value: number) {
    const abs = Math.abs(value || 0);
    return `${abs.toFixed(abs >= 10 ? 0 : 1)}%`;
  }
</script>

<style>
  .dashboard-bar {
    animation: dashboardBarGrow 600ms ease-out both;
    transform-origin: bottom;
  }

  .dashboard-enter {
    animation: dashboardEnter 380ms ease-out both;
  }

  .dashboard-enter-delay-1 {
    animation-delay: 60ms;
  }

  .dashboard-enter-delay-2 {
    animation-delay: 120ms;
  }

  .dashboard-enter-delay-3 {
    animation-delay: 180ms;
  }

  @keyframes dashboardEnter {
    from {
      opacity: 0;
      transform: translateY(10px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes dashboardBarGrow {
    from {
      transform: scaleY(0.1);
      opacity: 0.6;
    }

    to {
      transform: scaleY(1);
      opacity: 1;
    }
  }
</style>

<section class="space-y-6">
  <div class="dashboard-enter from-primary/20 via-secondary/10 to-base-100 border-base-300 rounded-box relative overflow-hidden border bg-gradient-to-br p-5 sm:p-6">
    <div class="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/30 blur-3xl"></div>
    <div class="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-black/10 blur-3xl"></div>
    <div class="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold sm:text-3xl">{t("Dashboard")}</h1>
        {#if data.money}
          <p class="mt-2 text-sm opacity-80">
            {t("Outstanding")}: <span class="font-semibold">{fmtMoney(data.money.outstanding)}</span>
          </p>
        {/if}
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <a class="btn btn-primary btn-sm sm:btn-md" href="/invoices/new">{t("Invoice")}</a>
        <a class="btn btn-outline btn-sm sm:btn-md" href="/customers/new">{t("Customer")}</a>
      </div>
    </div>
  </div>

  {#if data.error}
    <div class="alert alert-error">
      <span>{data.error}</span>
    </div>
  {/if}

  {#if !canViewInvoices}
    <div class="card bg-base-100 border-base-300 rounded-box border">
      <div class="card-body flex flex-row items-center gap-4 p-6">
        <ShieldOff size={24} class="shrink-0 opacity-50" />
        <div>
          <div class="font-semibold">{t("Invoice data hidden")}</div>
          <div class="text-sm opacity-70">
            {t("You do not have permission to view invoices. Contact an administrator to request access.")}
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if !canViewCustomers}
    <div class="card bg-base-100 border-base-300 rounded-box border">
      <div class="card-body flex flex-row items-center gap-4 p-6">
        <ShieldOff size={24} class="shrink-0 opacity-50" />
        <div>
          <div class="font-semibold">{t("Customer data hidden")}</div>
          <div class="text-sm opacity-70">
            {t("You do not have permission to view customers. Contact an administrator to request access.")}
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if data.counts}
    <div class="dashboard-enter dashboard-enter-delay-1 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="from-primary/10 to-base-100 border-primary/20 rounded-box border bg-gradient-to-br p-4 sm:p-5">
        <div class="text-sm opacity-70">{t("Invoices")}</div>
        <div class="mt-1 text-3xl font-bold tracking-tight">{data.counts.invoices}</div>
      </div>
      <div class="from-secondary/10 to-base-100 border-secondary/20 rounded-box border bg-gradient-to-br p-4 sm:p-5">
        <div class="text-sm opacity-70">{t("Customers")}</div>
        <div class="mt-1 text-3xl font-bold tracking-tight">{data.counts.customers}</div>
      </div>
      <div class="from-warning/10 to-base-100 border-warning/20 rounded-box border bg-gradient-to-br p-4 sm:p-5">
        <div class="text-sm opacity-70">{t("Open Invoices")}</div>
        <div class="mt-1 text-3xl font-bold tracking-tight">{(statusCounts.sent || 0) + (statusCounts.overdue || 0)}</div>
      </div>
      <div class="from-info/10 to-base-100 border-info/20 rounded-box border bg-gradient-to-br p-4 sm:p-5">
        <div class="text-sm opacity-70">{t("Maintainer")}</div>
        <div class="mt-1 text-3xl font-bold tracking-tight">{data.maintainer}</div>
      </div>
    </div>
  {/if}

  {#if data.money}
    <div class="dashboard-enter dashboard-enter-delay-2 grid grid-cols-1 gap-3 md:grid-cols-3">
      <div class="bg-base-100 border-base-300 rounded-box border p-4 sm:p-5">
        <div class="text-sm opacity-70">{t("Total Billed")}</div>
        <div class="mt-2 text-2xl font-semibold">{fmtMoney(data.money.billed)}</div>
        <div class="mt-2">
          <span class={`badge badge-sm ${deltas.billedMoM.direction === "up" ? "badge-success" : deltas.billedMoM.direction === "down" ? "badge-error" : "badge-ghost"}`}>
            {deltas.billedMoM.direction === "up" ? "+" : deltas.billedMoM.direction === "down" ? "-" : "~"}
            {fmtDeltaPercent(deltas.billedMoM.percent)} {t("vs last month")}
          </span>
        </div>
      </div>
      <div class="bg-base-100 border-base-300 rounded-box border p-4 sm:p-5">
        <div class="text-sm opacity-70">{t("Outstanding")}</div>
        <div class="text-warning mt-2 text-2xl font-semibold">{fmtMoney(data.money.outstanding)}</div>
        <div class="mt-2">
          <span class={`badge badge-sm ${deltas.outstandingMoM.direction === "down" ? "badge-success" : deltas.outstandingMoM.direction === "up" ? "badge-error" : "badge-ghost"}`}>
            {deltas.outstandingMoM.direction === "up" ? "+" : deltas.outstandingMoM.direction === "down" ? "-" : "~"}
            {fmtDeltaPercent(deltas.outstandingMoM.percent)} {t("vs last month")}
          </span>
        </div>
      </div>
      <div class="bg-base-100 border-base-300 rounded-box border p-4 sm:p-5">
        <div class="text-sm opacity-70">{t("Paid")}</div>
        <div class="text-success mt-2 text-2xl font-semibold">{fmtMoney(data.money.paid)}</div>
      </div>
    </div>
  {/if}

  <div class="dashboard-enter dashboard-enter-delay-3 grid grid-cols-1 gap-4 xl:grid-cols-3">
    <div class="bg-base-100 border-base-300 rounded-box border p-4 sm:p-5 xl:col-span-2">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-lg font-semibold">{t("Last 6 Months")}</h3>
        <span class="text-xs opacity-60">{t("Billed")}</span>
      </div>
      {#if trend.length > 0}
        <div class="grid grid-cols-6 gap-2">
          {#each trend as month (month.key)}
            <div class="flex flex-col items-center gap-2">
              <div class="bg-base-200 relative flex h-28 w-full items-end overflow-hidden rounded-md sm:h-32">
                <div
                  class="from-primary to-secondary dashboard-bar w-full rounded-md bg-gradient-to-t"
                  style={`height:${Math.max(8, Math.round((Number(month.amount || 0) / trendMax) * 100))}%`}
                  title={`${month.label}: ${fmtMoney(month.amount || 0)}`}
                ></div>
              </div>
              <div class="text-center text-xs opacity-70">{month.label}</div>
              <div class="text-center text-xs font-medium tabular-nums">{fmtMoney(month.amount || 0)}</div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-sm opacity-60">{t("No data yet.")}</div>
      {/if}
    </div>

    <div class="bg-base-100 border-base-300 rounded-box border p-4 sm:p-5">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-lg font-semibold">{t("Aging")}</h3>
        <span class="text-xs opacity-60">{t("Receivables")}</span>
      </div>
      <div class="space-y-2 text-sm">
        <div class="bg-base-200 flex items-center justify-between rounded-md px-3 py-2">
          <span>{t("Current")}</span>
          <span class="font-medium tabular-nums">{fmtMoney(aging.current || 0)}</span>
        </div>
        <div class="bg-base-200 flex items-center justify-between rounded-md px-3 py-2">
          <span>{t("1-30d")}</span>
          <span class="font-medium tabular-nums">{fmtMoney(aging.d1_30 || 0)}</span>
        </div>
        <div class="bg-base-200 flex items-center justify-between rounded-md px-3 py-2">
          <span>{t("31-60d")}</span>
          <span class="font-medium tabular-nums">{fmtMoney(aging.d31_60 || 0)}</span>
        </div>
        <div class="bg-base-200 flex items-center justify-between rounded-md px-3 py-2">
          <span>{t("61+d")}</span>
          <span class="font-medium tabular-nums">{fmtMoney(aging.d61_plus || 0)}</span>
        </div>
      </div>
      <div class="border-base-300 mt-3 border-t pt-3 text-sm">
        <div class="flex items-center justify-between">
          <span class="opacity-70">Total</span>
          <span class="font-semibold tabular-nums">{fmtMoney(agingTotal)}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="bg-base-100 border-base-300 rounded-box border p-4 sm:p-5">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-lg font-semibold">{t("Top Customers")}</h3>
      <span class="text-xs opacity-60">{t("By billed amount")}</span>
    </div>
    {#if topCustomers.length > 0}
      <div class="space-y-2">
        {#each topCustomers as c (c.name)}
          <div class="bg-base-200 flex items-center justify-between rounded-md px-3 py-2">
            <div class="min-w-0">
              <div class="truncate font-medium">{c.name}</div>
              <div class="text-xs opacity-60">{c.count} {t("invoices")}</div>
            </div>
            <div class="font-semibold tabular-nums">{fmtMoney(c.total)}</div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-sm opacity-60">{t("No customer data yet.")}</div>
    {/if}
  </div>

  {#if data.status}
    <div class="bg-base-100 border-base-300 rounded-box border p-4 sm:p-5">
      <div class="mb-3 text-sm font-medium opacity-70">{t("Status")}</div>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <div class="badge badge-ghost w-full justify-between px-3 py-4">{t("Draft")} <span class="font-semibold">{statusCounts.draft || 0}</span></div>
        <div class="badge badge-info w-full justify-between px-3 py-4">{t("Sent")} <span class="font-semibold">{statusCounts.sent || 0}</span></div>
        <div class="badge badge-secondary w-full justify-between px-3 py-4">{t("Complete")} <span class="font-semibold">{statusCounts.complete || 0}</span></div>
        <div class="badge badge-success w-full justify-between px-3 py-4">{t("Paid")} <span class="font-semibold">{statusCounts.paid || 0}</span></div>
        <div class="badge badge-error w-full justify-between px-3 py-4">{t("Overdue")} <span class="font-semibold">{statusCounts.overdue || 0}</span></div>
        <div class="badge badge-neutral w-full justify-between px-3 py-4">{t("Voided")} <span class="font-semibold">{statusCounts.voided || 0}</span></div>
      </div>
    </div>
  {/if}

  {#if data.recent && data.recent.length > 0}
    <div class="bg-base-100 border-base-300 rounded-box overflow-hidden border">
      <div class="border-base-300 bg-base-200/60 flex items-center justify-between border-b px-4 py-3 sm:px-5">
        <h2 class="text-lg font-semibold sm:text-xl">{t("Recent Invoices")}</h2>
        <a href="/invoices" class="btn btn-ghost btn-xs sm:btn-sm">{t("Invoices")}</a>
      </div>
      <div class="overflow-x-auto">
        <table class="table-sm sm:table-md table w-full">
          <thead>
            <tr class="bg-base-200/50">
              <th>{t("Invoice No")}</th>
              <th>{t("Customer")}</th>
              <th>{t("Total")}</th>
              <th class="hidden sm:table-cell">{t("Status")}</th>
              <th class="text-right">{t("Issue Date")}</th>
            </tr>
          </thead>
          <tbody>
            {#each data.recent as inv (inv.id)}
              <tr class="hover">
                <td class="font-medium hover:underline">
                  <a href={`/invoices/${inv.id}`}>{inv.invoiceNumber}</a>
                  <div class="text-xs opacity-70 sm:hidden">
                    {t(inv.status?.charAt(0).toUpperCase() + (inv.status || "").slice(1))}
                  </div>
                </td>
                <td>{inv.customer?.name || ""}</td>
                <td class="font-medium">{fmtMoney(inv.total || 0)}</td>
                <td class="hidden sm:table-cell">
                  {#if inv.status === "draft"}
                    <div class="badge badge-ghost badge-sm">{t("Draft")}</div>
                  {:else if inv.status === "sent"}
                    <div class="badge badge-info badge-sm">{t("Sent")}</div>
                  {:else if inv.status === "paid"}
                    <div class="badge badge-success badge-sm">{t("Paid")}</div>
                  {:else if (inv.status as string | undefined) === "complete"}
                    <div class="badge badge-secondary badge-sm">
                      {t("Complete")}
                    </div>
                  {:else if inv.status === "overdue"}
                    <div class="badge badge-error badge-sm">{t("Overdue")}</div>
                  {:else if inv.status === "voided"}
                    <div class="badge badge-neutral badge-sm">{t("Voided")}</div>
                  {/if}
                </td>
                <td class="text-right text-sm tabular-nums">
                  {#if inv.issueDate}
                    {new Date(inv.issueDate).toLocaleDateString(dateLocale, { year: "numeric", month: "short", day: "numeric" })}
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</section>
