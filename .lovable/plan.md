## WhatsApp Admin Settings — Implementation Plan

Build a comprehensive admin UI for the existing WhatsApp integration. Keep current single-tenant architecture intact. No SaaS, no tenant_id.

---

### 1. New Database Table: `whatsapp_settings`

Single-row config table (admin-managed) for non-secret settings:

- `graph_api_version` (default `v18.0`)
- `default_country_code` (default `968`)
- `business_name`, `business_logo_url`, `invoice_footer_text`, `default_invoice_language`
- `receipt_size` (default `A4`), `include_qr` (bool)
- Template config (JSON) — name/lang/enabled per event:
  - `tpl_order_ready` → `order_ready_pdf_ar`
  - `tpl_loyalty_progress` → `loyalty_progress_update_ar`
  - `tpl_loyalty_redeem` → `loyalty_ready_to_redeem_ar`
  - `tpl_payment_reminder` → (new, optional)
- Event mapping (JSON):
  - `event_order_ready` → tpl key
  - `event_payment_completed` → tpl key
  - `event_manual_resend` → tpl key
  - `event_payment_reminder` → tpl key
- Support inbox flags: `incoming_enabled`, `auto_reply_enabled`, `push_notifications_enabled`, `unread_badge_enabled`
- RLS: anyone read; admin update/insert.

Secrets (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `VERIFY_TOKEN`, optional `WHATSAPP_APP_SECRET`) **stay in Supabase secrets**. UI shows masked values via Edge Function; updates go through a secure Edge Function (admin role check).

---

### 2. New Edge Function: `whatsapp-admin`

Single function with action-based routing (admin JWT verified in code via `has_role`):

- `GET status` — returns:
  - `connected` (bool), masked phone_number_id, masked token, display phone number (from Graph API `/{phone_number_id}` call), graph version, last success/failure timestamps from `notification_logs`, token health (calls Graph `/me` or `/{phone_number_id}`).
- `POST test_connection` — pings Graph API with current token.
- `POST update_secrets` — admin-only; updates secrets via Supabase Management API is NOT possible from edge function. **Alternative: store these in `whatsapp_settings` (encrypted column) OR document that secrets must be updated via Lovable Cloud UI.** Plan: show masked values only and provide a "Update via Lovable Cloud" button that opens backend settings. Editing secrets directly from the app would require Management API token which we don't want.
- `POST test_template` — sends a test template message to a given phone.
- `GET webhook_info` — returns webhook URL (constructed from project URL), verify token (masked), last incoming msg timestamp from `whatsapp_messages`.

CORS + JWT validation + admin role check for all mutating endpoints.

---

### 3. UI: Rebuild `src/pages/WhatsAppSettings.tsx`

Use tabbed layout (one section per tab) with `Tabs` component:

```text
[Connection] [Credentials] [Templates] [Event Mapping]
[Invoice PDF] [Webhook] [Logs] [Inbox]
```

Each tab is a small component under `src/components/whatsapp-settings/`:

- `ConnectionTab.tsx` — status card, test button, key health metrics
- `CredentialsTab.tsx` — masked secret values, instructions, default country code & API version inputs (saved to `whatsapp_settings`)
- `TemplatesTab.tsx` — list of 4 templates with name/lang inputs, enable toggle, test send dialog
- `EventMappingTab.tsx` — dropdowns mapping events → template keys
- `InvoicePdfTab.tsx` — business name, logo URL, footer, language, QR toggle
- `WebhookTab.tsx` — URL display, copy button, last incoming/error
- `LogsTab.tsx` — merged view of `notification_logs` + `whatsapp_messages` with filters (status, type, direction)
- `InboxTab.tsx` — toggles for inbox flags

Admin-only access enforced by wrapping route in `ProtectedRoute` with `allowedRoles={["admin"]}`.

---

### 4. Routing & Nav

- Route already exists. Confirm/add admin role guard.
- Confirm "Communication → WhatsApp Settings" nav link is admin-only (check `AppHeader.tsx`).

---

### 5. Safety

- Keep all existing edge functions (`send-whatsapp`, `send-whatsapp-loyalty`, `whatsapp-webhook`, etc.) untouched.
- Existing send code can optionally read from `whatsapp_settings` for template names; for now, settings table is informational + drives the test send. Migrating live sends to read from settings can be a follow-up to avoid risk.
- All mutations admin-only via RLS + edge function role check.
- No tenant_id, no architectural changes.

---

### Files

**New:**
- `supabase/migrations/<ts>_whatsapp_settings.sql`
- `supabase/functions/whatsapp-admin/index.ts`
- `src/components/whatsapp-settings/ConnectionTab.tsx`
- `src/components/whatsapp-settings/CredentialsTab.tsx`
- `src/components/whatsapp-settings/TemplatesTab.tsx`
- `src/components/whatsapp-settings/EventMappingTab.tsx`
- `src/components/whatsapp-settings/InvoicePdfTab.tsx`
- `src/components/whatsapp-settings/WebhookTab.tsx`
- `src/components/whatsapp-settings/LogsTab.tsx`
- `src/components/whatsapp-settings/InboxTab.tsx`
- `src/lib/whatsapp-settings.ts` (client helpers)

**Edited:**
- `src/pages/WhatsAppSettings.tsx` (rewrite as tabbed shell)
- `src/App.tsx` (ensure admin role guard on route)

---

### Open question

For **Credentials Management**: tokens live in Supabase secrets and cannot be edited from the frontend without exposing a Management API token (security risk). My plan is:

- Show **masked** token values (last 4 chars) fetched via the admin edge function
- Show a clear instructions card: "To rotate tokens, update them in Lovable Cloud → Backend → Edge Function Secrets"
- Allow editing only the **non-secret** settings (country code, API version, etc.) directly from UI

This keeps the integration secure. If you want in-app secret editing later, we can add a Management API token as a separate secret and gate it behind admin auth.