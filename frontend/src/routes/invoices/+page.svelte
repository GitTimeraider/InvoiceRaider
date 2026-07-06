<script lang="ts">
  import { ShieldOff, SquarePen } from "lucide-svelte";
  import { getContext } from "svelte";

  let { data } = $props();

  let t = getContext("i18n") as (key: string) => string;
  let numberFormat = $derived(data.localization?.numberFormat || "comma");
  let dateLocale = $derived(data.localization?.locale || "en");
  let user = $derived(data.user);
  let canCreate = $derived(user?.isAdmin || user?.permissions?.some((p) => p.resource === "invoices" && p.action === "create"));
  let canViewCustomers = $derived(user?.isAdmin || user?.permissions?.some((p) => p.resource === "customers" && p.action === "read"));

  function fmtMoney(cur: string | undefined, n: number) {
    if (!cur) cur = "USD";
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

  let invoices = $derived(data.invoices || []);
  let filterStatuses = $state(new Set<string>(
    (data.initialStatusFilter || "").split(",").filter((s: string) => s.length > 0)
  ));
  let filterInvoiceNo = $state("");
  let filterCustomer = $state("");
  let filterDateFrom = $state("");
  let filterDateTo = $state("");

  function toggleStatus(status: string) {
    const next = new Set(filterStatuses);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    filterStatuses = next;
  }
  let sortKey = $state<"invoiceNumber" | "customer" | "total" | "status" | "issueDate" | "updatedAt">("invoiceNumber");
  let sortDirection = $state<"asc" | "desc">("desc");

  function toDateMs(v: unknown) {
    return new Date((v as string) || 0).getTime();
  }

  function compareText(a: unknown, b: unknown) {
    return String(a || "").localeCompare(String(b || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  function handleSort(key: "invoiceNumber" | "customer" | "total" | "status" | "issueDate" | "updatedAt") {
    if (sortKey === key) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
      return;
    }
    sortKey = key;
    sortDirection = key === "invoiceNumber" ? "desc" : "asc";
  }

  function sortMarker(key: "invoiceNumber" | "customer" | "total" | "status" | "issueDate" | "updatedAt") {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
  }

  let filtered = $derived(
    invoices.filter((i) => {
      if (filterStatuses.size > 0 && !filterStatuses.has(i.status)) return false;
      if (filterInvoiceNo && !String(i.invoiceNumber || "").toLowerCase().includes(filterInvoiceNo.toLowerCase())) return false;
      if (filterCustomer && !String(i.customer?.name || "").toLowerCase().includes(filterCustomer.toLowerCase())) return false;
      if (filterDateFrom || filterDateTo) {
        const d = i.issueDate ? new Date(i.issueDate).toISOString().slice(0, 10) : "";
        if (filterDateFrom && d < filterDateFrom) return false;
        if (filterDateTo && d > filterDateTo) return false;
      }
      return true;
    }),
  );

  let sortedFiltered = $derived(
    [...filtered].sort((a, b) => {
      let result = 0;
      if (sortKey === "invoiceNumber") {
        result = compareText(a.invoiceNumber, b.invoiceNumber);
      } else if (sortKey === "customer") {
        result = compareText(a.customer?.name, b.customer?.name);
      } else if (sortKey === "total") {
        result = Number(a.total || 0) - Number(b.total || 0);
      } else if (sortKey === "status") {
        result = compareText(a.status, b.status);
      } else if (sortKey === "issueDate") {
        result = toDateMs(a.issueDate) - toDateMs(b.issueDate);
      } else if (sortKey === "updatedAt") {
        result = toDateMs(a.updatedAt) - toDateMs(b.updatedAt);
      }

      if (result === 0) {
        result = compareText(a.invoiceNumber, b.invoiceNumber);
      }

      return sortDirection === "asc" ? result : -result;
    }),
  );

  // Show "Paid with" only when at least one visible (filtered) invoice has a payment method.
  // This hides the column automatically when filtering to statuses that can never carry one
  // (e.g. Draft, Sent, Voided) — the column would otherwise appear with all cells empty.
  let showPaidWith = $derived(sortedFiltered.some((i: any) => i.paidWith));
</script>

<div class="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
  <h1 class="text-2xl font-semibold">{t("Invoices")}</h1>
  {#if canCreate}
    <a href="/invoices/new" class="btn btn-primary btn-sm w-full sm:w-auto">
      <SquarePen size={16} />
      {t("Create Invoice")}
    </a>
  {/if}
</div>

{#if data.error}
  <div class="alert alert-error mb-4">
    <span>{data.error}</span>
  </div>
{/if}

<div class="bg-base-100 border-base-300 rounded-box mb-4 border p-4 space-y-3">
  <div class="flex flex-wrap gap-2">
    <button class={`btn btn-sm ${filterStatuses.size === 0 ? "btn-neutral" : "btn-ghost"}`} onclick={() => (filterStatuses = new Set())}>{t("All")}</button>
    <button class={`btn btn-sm ${filterStatuses.has("sent") ? "btn-neutral" : "btn-ghost"}`} onclick={() => toggleStatus("sent")}>{t("Sent")}</button>
    <button class={`btn btn-sm ${filterStatuses.has("draft") ? "btn-neutral" : "btn-ghost"}`} onclick={() => toggleStatus("draft")}>{t("Draft")}</button>
    <button class={`btn btn-sm ${filterStatuses.has("complete") ? "btn-neutral" : "btn-ghost"}`} onclick={() => toggleStatus("complete")}>{t("Complete")}</button>
    <button class={`btn btn-sm ${filterStatuses.has("paid") ? "btn-neutral" : "btn-ghost"}`} onclick={() => toggleStatus("paid")}>{t("Paid")}</button>
    <button class={`btn btn-sm ${filterStatuses.has("voided") ? "btn-neutral" : "btn-ghost"}`} onclick={() => toggleStatus("voided")}>{t("Voided")}</button>
    <button class={`btn btn-sm ${filterStatuses.has("overdue") ? "btn-neutral" : "btn-ghost"}`} onclick={() => toggleStatus("overdue")}>{t("Overdue")}</button>
  </div>
  <div class="flex flex-wrap gap-2">
    <input
      type="text"
      class="input input-sm input-bordered w-36"
      placeholder={t("Invoice No")}
      bind:value={filterInvoiceNo}
    />
    {#if canViewCustomers}
      <input
        type="text"
        class="input input-sm input-bordered w-44"
        placeholder={t("Customer")}
        bind:value={filterCustomer}
      />
    {/if}
    <div class="flex items-center gap-1">
      <input
        type="date"
        class="input input-sm input-bordered w-36"
        title={t("Issue Date from")}
        bind:value={filterDateFrom}
      />
      <span class="text-xs opacity-50">–</span>
      <input
        type="date"
        class="input input-sm input-bordered w-36"
        title={t("Issue Date to")}
        bind:value={filterDateTo}
      />
    </div>
    {#if filterInvoiceNo || filterCustomer || filterDateFrom || filterDateTo || filterStatuses.size > 0}
      <button class="btn btn-sm btn-ghost" onclick={() => { filterInvoiceNo = ""; filterCustomer = ""; filterDateFrom = ""; filterDateTo = ""; filterStatuses = new Set(); }}>{t("Clear")}</button>
    {/if}
  </div>
</div>

{#if invoices.length === 0}
  <div class="bg-base-100 border-base-300 rounded-box border py-12 text-center">
    <div class="mb-4 text-lg opacity-50">{t("No invoices found")}</div>
    {#if canCreate}
      <a href="/invoices/new" class="btn btn-primary">{t("Create your first invoice")}</a>
    {/if}
  </div>
{:else}
  <div class="bg-base-100 border-base-300 rounded-box overflow-x-auto border">
    <table class="table-sm sm:table-md table w-full whitespace-nowrap">
      <thead class="bg-base-200">
        <tr>
          <th>
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("invoiceNumber")}>
              {t("Invoice No")}{sortMarker("invoiceNumber")}
            </button>
          </th>
          {#if canViewCustomers}
            <th>
              <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("customer")}>
                {t("Customer")}{sortMarker("customer")}
              </button>
            </th>
          {/if}
          <th>
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("total")}>
              {t("Total")}{sortMarker("total")}
            </button>
          </th>
          <th>
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("status")}>
              {t("Status")}{sortMarker("status")}
            </button>
          </th>
          <th class="hidden sm:table-cell">
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("issueDate")}>
              {t("Issue Date")}{sortMarker("issueDate")}
            </button>
          </th>
          {#if showPaidWith}
            <th class="hidden sm:table-cell">
              {t("Paid with")}
            </th>
          {/if}
          <th class="hidden text-right md:table-cell">
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("updatedAt")}>
              {t("Updated")}{sortMarker("updatedAt")}
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {#each sortedFiltered as inv (inv.id)}
          <tr class="hover">
            <td class="font-medium hover:underline">
              <a href={`/invoices/${inv.id}`}>{inv.invoiceNumber}</a>
              <div class="text-xs opacity-70 sm:hidden">
                {#if inv.issueDate}
                  {new Date(inv.issueDate).toLocaleDateString(dateLocale, { year: "numeric", month: "short", day: "numeric" })}
                {/if}
              </div>
            </td>
            {#if canViewCustomers}
              <td class="max-w-[12rem] truncate sm:max-w-xs" title={inv.customer?.name}>
                {inv.customer?.name || "-"}
              </td>
            {/if}
            <td class="font-medium">{fmtMoney(inv.currency, inv.total)}</td>
            <td>
              {#if inv.status === "draft"}
                <div class="badge badge-ghost badge-sm">{t("Draft")}</div>
              {:else if inv.status === "sent"}
                <div class="badge badge-info badge-sm">{t("Sent")}</div>
              {:else if inv.status === "paid"}
                <div class="badge badge-success badge-sm">{t("Paid")}</div>
              {:else if inv.status === "complete"}
                <div class="badge badge-secondary badge-sm">
                  {t("Complete")}
                </div>
              {:else if inv.status === "overdue"}
                <div class="badge badge-error badge-sm">{t("Overdue")}</div>
              {:else if inv.status === "voided"}
                <div class="badge badge-neutral badge-sm">{t("Voided")}</div>
              {/if}
            </td>
            <td class="hidden text-sm tabular-nums sm:table-cell">
              {#if inv.issueDate}
                {new Date(inv.issueDate).toLocaleDateString(dateLocale, { year: "numeric", month: "short", day: "numeric" })}
              {/if}
            </td>
            {#if showPaidWith}
              <td class="hidden text-sm sm:table-cell">
                {(inv as any).paidWith || ""}
              </td>
            {/if}
            <td class="hidden text-right text-sm tabular-nums opacity-70 md:table-cell">
              {#if inv.updatedAt}
                {new Date(inv.updatedAt).toLocaleDateString(dateLocale, { year: "numeric", month: "short", day: "numeric" })}
              {/if}
            </td>
          </tr>
        {/each}
        {#if sortedFiltered.length === 0}
          <tr>
            <td colspan="99" class="py-8 text-center opacity-50">{t("No invoices match this filter")}</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
{/if}
