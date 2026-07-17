<script lang="ts">
  import { getContext } from "svelte";
  import { Plus, Pencil, Trash2, Send, Eye, EyeOff } from "lucide-svelte";
  import { invalidateAll } from "$app/navigation";

  let { emailConfigs = [] } = $props();
  let t = getContext("i18n") as (key: string, params?: any) => string;

  type EmailConfig = {
    id: string;
    name: string;
    host: string;
    port: number;
    username: string | null;
    hasPassword: boolean;
    fromAddress: string;
    fromName: string | null;
    secure: boolean;
    defaultSubject: string | null;
    defaultBody: string | null;
    reminderSubject: string | null;
    reminderBody: string | null;
  };

  let showForm = $state(false);
  let editingId = $state<string | null>(null);
  let isSubmitting = $state(false);
  let deleteConfirmId = $state<string | null>(null);
  let testingId = $state<string | null>(null);
  let testResult = $state<{ id: string; ok: boolean; msg: string } | null>(null);
  let showPassword = $state(false);

  const emptyForm = () => ({
    name: "",
    host: "",
    port: "587",
    username: "",
    password: "",
    fromAddress: "",
    fromName: "",
    secure: false,
    defaultSubject: "",
    defaultBody: "",
    reminderSubject: "",
    reminderBody: "",
  });

  let formData = $state(emptyForm());
  let formError = $state("");

  function handleAdd() {
    editingId = null;
    formData = emptyForm();
    formError = "";
    showPassword = false;
    showForm = true;
  }

  function handleEdit(config: EmailConfig) {
    editingId = config.id;
    formData = {
      name: config.name,
      host: config.host,
      port: String(config.port),
      username: config.username ?? "",
      password: "", // never pre-fill password; leave empty to keep existing
      fromAddress: config.fromAddress,
      fromName: config.fromName ?? "",
      secure: config.secure,
      defaultSubject: config.defaultSubject ?? "",
      defaultBody: config.defaultBody ?? "",
      reminderSubject: config.reminderSubject ?? "",
      reminderBody: config.reminderBody ?? "",
    };
    formError = "";
    showPassword = false;
    showForm = true;
  }

  function handleCancel() {
    showForm = false;
    editingId = null;
    formData = emptyForm();
    formError = "";
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    formError = "";
    isSubmitting = true;
    try {
      const url = editingId
        ? `/api/v1/email-configs/${editingId}`
        : "/api/v1/email-configs";
      const method = editingId ? "PUT" : "POST";
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        host: formData.host.trim(),
        port: Number(formData.port) || 587,
        username: formData.username.trim() || null,
        fromAddress: formData.fromAddress.trim(),
        fromName: formData.fromName.trim() || null,
        secure: formData.secure,
        defaultSubject: formData.defaultSubject.trim() || null,
        defaultBody: formData.defaultBody.trim() || null,
        reminderSubject: formData.reminderSubject.trim() || null,
        reminderBody: formData.reminderBody.trim() || null,
      };
      // Only include password if non-empty (empty = keep existing on edit)
      if (formData.password) {
        payload.password = formData.password;
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || t("Failed to save email configuration"));
      handleCancel();
      await invalidateAll();
    } catch (err: any) {
      formError = err?.message || t("Failed to save email configuration");
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDelete(config: EmailConfig) {
    deleteConfirmId = config.id;
  }

  async function confirmDelete(id: string) {
    try {
      const res = await fetch(`/api/v1/email-configs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("Failed to delete email configuration"));
      deleteConfirmId = null;
      await invalidateAll();
    } catch (err: any) {
      alert(err?.message || t("Failed to delete email configuration"));
    }
  }

  async function handleTest(config: EmailConfig) {
    testingId = config.id;
    testResult = null;
    try {
      const res = await fetch(`/api/v1/email-configs/${config.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: config.fromAddress }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.details || body?.error || t("Test email failed"));
      testResult = { id: config.id, ok: true, msg: t("Test email sent successfully") };
    } catch (err: any) {
      testResult = { id: config.id, ok: false, msg: err?.message || t("Test email failed") };
    } finally {
      testingId = null;
    }
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-xl font-semibold">{t("Email Configurations")}</h2>
      <p class="text-base-content/60 mt-1 text-sm">
        {t("Configure SMTP mail accounts for sending invoices.")}
      </p>
    </div>
    {#if !showForm}
      <button type="button" class="btn btn-primary btn-sm" onclick={handleAdd}>
        <Plus size={16} />
        {t("Add Configuration")}
      </button>
    {/if}
  </div>

  {#if showForm}
    <div class="bg-base-200 rounded-box p-5">
      <h3 class="mb-4 font-semibold">
        {editingId ? t("Edit Email Configuration") : t("New Email Configuration")}
      </h3>
      {#if formError}
        <div class="alert alert-error mb-4 text-sm"><span>{formError}</span></div>
      {/if}
      <form onsubmit={handleSubmit} class="space-y-4">
        <label class="form-control">
          <div class="label"><span class="label-text">{t("Name")} *</span></div>
          <input
            type="text"
            class="input input-bordered w-full"
            bind:value={formData.name}
            placeholder={t("e.g. Company Mail")}
            required
            disabled={isSubmitting}
          />
        </label>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="form-control">
            <div class="label"><span class="label-text">{t("SMTP Host")} *</span></div>
            <input
              type="text"
              class="input input-bordered w-full"
              bind:value={formData.host}
              placeholder="smtp.example.com"
              required
              disabled={isSubmitting}
            />
          </label>
          <label class="form-control">
            <div class="label"><span class="label-text">{t("Port")} *</span></div>
            <input
              type="number"
              class="input input-bordered w-full"
              bind:value={formData.port}
              min="1"
              max="65535"
              required
              disabled={isSubmitting}
            />
          </label>
        </div>

        <label class="label cursor-pointer justify-start gap-4">
          <input type="checkbox" class="checkbox" bind:checked={formData.secure} disabled={isSubmitting} />
          <div>
            <span class="label-text font-medium">{t("Use SSL/TLS")}</span>
            <p class="text-base-content/60 text-xs">
              {t("Enable for port 465 (SSL). Disable for port 587 (STARTTLS) or 25.")}
            </p>
          </div>
        </label>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="form-control">
            <div class="label"><span class="label-text">{t("Username")}</span></div>
            <input
              type="text"
              class="input input-bordered w-full"
              bind:value={formData.username}
              placeholder={t("SMTP username (optional)")}
              autocomplete="off"
              disabled={isSubmitting}
            />
          </label>
          <label class="form-control">
            <div class="label">
              <span class="label-text">{t("Password")}</span>
              {#if editingId}
                <span class="label-text-alt opacity-60">{t("Leave blank to keep existing")}</span>
              {/if}
            </div>
            <div class="join w-full">
              {#if showPassword}
                <input
                  type="text"
                  class="input input-bordered join-item w-full"
                  bind:value={formData.password}
                  placeholder={editingId ? t("Leave blank to keep existing") : t("SMTP password")}
                  autocomplete="new-password"
                  disabled={isSubmitting}
                />
              {:else}
                <input
                  type="password"
                  class="input input-bordered join-item w-full"
                  bind:value={formData.password}
                  placeholder={editingId ? t("Leave blank to keep existing") : t("SMTP password")}
                  autocomplete="new-password"
                  disabled={isSubmitting}
                />
              {/if}
              <button
                type="button"
                class="btn btn-ghost join-item border border-l-0 border-base-300"
                onclick={() => (showPassword = !showPassword)}
                tabindex="-1"
              >
                {#if showPassword}<EyeOff size={16} />{:else}<Eye size={16} />{/if}
              </button>
            </div>
          </label>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="form-control">
            <div class="label"><span class="label-text">{t("From Address")} *</span></div>
            <input
              type="email"
              class="input input-bordered w-full"
              bind:value={formData.fromAddress}
              placeholder="invoices@example.com"
              required
              disabled={isSubmitting}
            />
          </label>
          <label class="form-control">
            <div class="label"><span class="label-text">{t("From Name")}</span></div>
            <input
              type="text"
              class="input input-bordered w-full"
              bind:value={formData.fromName}
              placeholder={t("e.g. Acme Invoicing")}
              disabled={isSubmitting}
            />
          </label>
        </div>

        <div class="divider">{t("Email Template (optional)")}</div>

        <label class="form-control">
          <div class="label">
            <span class="label-text">{t("Default Subject")}</span>
            <span class="label-text-alt opacity-60">{t("Pre-filled when sending an invoice")}</span>
          </div>
          <input
            type="text"
            class="input input-bordered w-full"
            bind:value={formData.defaultSubject}
            placeholder={t("e.g. Invoice #{{invoiceNumber}} from {{companyName}}")}
            disabled={isSubmitting}
          />
        </label>

        <label class="form-control">
          <div class="label">
            <span class="label-text">{t("Default Message Body")}</span>
          </div>
          <textarea
            class="textarea textarea-bordered w-full"
            rows="5"
            bind:value={formData.defaultBody}
            placeholder={t("e.g. Please find your invoice attached.")}
            disabled={isSubmitting}
          ></textarea>
        </label>

        <div class="divider mt-6">{t("Reminder Template (optional)")}</div>

        <label class="form-control">
          <div class="label">
            <span class="label-text">{t("Default Reminder Subject")}</span>
            <span class="label-text-alt opacity-60">{t("Pre-filled when sending a reminder")}</span>
          </div>
          <input
            type="text"
            class="input input-bordered w-full"
            bind:value={formData.reminderSubject}
            placeholder={t("e.g. Reminder: Invoice #{{invoiceNumber}} from {{companyName}}")}
            disabled={isSubmitting}
          />
        </label>

        <label class="form-control">
          <div class="label">
            <span class="label-text">{t("Default Reminder Message Body")}</span>
          </div>
          <textarea
            class="textarea textarea-bordered w-full"
            rows="5"
            bind:value={formData.reminderBody}
            placeholder={t("e.g. This is a reminder for invoice #{{invoiceNumber}}.")}
            disabled={isSubmitting}
          ></textarea>
        </label>

        <p class="text-base-content/60 text-xs">
          {t("Available variables")}: {"{{invoiceNumber}}"}, {"{{companyName}}"}, {"{{issueDate}}"}, {"{{dueDate}}"}, {"{{customerName}}"}
        </p>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn btn-ghost" onclick={handleCancel} disabled={isSubmitting}>
            {t("Cancel")}
          </button>
          <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
            {#if isSubmitting}
              <span class="loading loading-spinner loading-sm"></span>
            {/if}
            {t("Save")}
          </button>
        </div>
      </form>
    </div>
  {/if}

  {#if emailConfigs.length === 0 && !showForm}
    <div class="bg-base-200 rounded-box p-6 text-center">
      <p class="text-base-content/60">{t("No email configurations yet. Add one to enable sending invoices by email.")}</p>
    </div>
  {/if}

  {#each emailConfigs as config (config.id)}
    <div class="bg-base-100 rounded-box border-base-200 border p-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="font-semibold">{config.name}</span>
            {#if config.secure}
              <span class="badge badge-success badge-xs">SSL/TLS</span>
            {:else}
              <span class="badge badge-ghost badge-xs">STARTTLS</span>
            {/if}
          </div>
          <div class="text-base-content/70 mt-1 space-y-0.5 text-sm">
            <div>{config.host}:{config.port}</div>
            <div>
              {t("From")}: {config.fromName ? `${config.fromName} <${config.fromAddress}>` : config.fromAddress}
            </div>
            {#if config.username}
              <div>{t("User")}: {config.username}</div>
            {/if}
            {#if config.defaultSubject}
              <div class="truncate">{t("Subject")}: {config.defaultSubject}</div>
            {/if}
            {#if config.reminderSubject}
              <div class="truncate">{t("Reminder Subject")}: {config.reminderSubject}</div>
            {/if}
          </div>
          {#if testResult?.id === config.id}
            <div class="mt-2">
              <div class="alert {testResult.ok ? 'alert-success' : 'alert-error'} py-2 text-sm">
                <span>{testResult.msg}</span>
              </div>
            </div>
          {/if}
        </div>
        <div class="flex shrink-0 gap-2">
          {#if deleteConfirmId === config.id}
            <div class="flex items-center gap-2">
              <span class="text-error text-sm">{t("Delete?")}</span>
              <button type="button" class="btn btn-error btn-xs" onclick={() => confirmDelete(config.id)}>
                {t("Yes")}
              </button>
              <button type="button" class="btn btn-ghost btn-xs" onclick={() => (deleteConfirmId = null)}>
                {t("No")}
              </button>
            </div>
          {:else}
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              title={t("Send test email")}
              onclick={() => handleTest(config)}
              disabled={testingId === config.id}
            >
              {#if testingId === config.id}
                <span class="loading loading-spinner loading-xs"></span>
              {:else}
                <Send size={15} />
              {/if}
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              title={t("Edit")}
              onclick={() => handleEdit(config)}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm text-error"
              title={t("Delete")}
              onclick={() => handleDelete(config)}
            >
              <Trash2 size={15} />
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/each}
</div>
