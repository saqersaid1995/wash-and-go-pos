## WhatsApp Settings + Multi-Country Phone Support

A multi-part change touching backend, settings UI, POS, customer profile, and WhatsApp sending. Below is the full plan.

---

### 1. Database changes (one migration)

**New table `whatsapp_country_codes`**
- `id uuid pk`, `country_name text`, `country_code text` (e.g. `+968`), `is_default bool`, `is_active bool`, `sort_order int`, timestamps
- Partial unique index: only one row may have `is_default = true`
- Seed: Oman +968 (default), UAE +971, KSA +966, Qatar +974, Bahrain +973, Kuwait +965
- RLS: anyone read; admin insert/update/delete

**Extend `customers` table**
- Add `country_code text` (default `+968`)
- Add `local_phone text` 
- Add `full_phone_e164 text`
- Backfill: split existing `phone_number` — if starts with `+` keep, else assume default country
- Add unique index on `full_phone_e164` (where not null)

Keep `phone_number` column for backward compat (mirror of `full_phone_e164` without `+`).

**Drop single `default_country_code` field on `whatsapp_settings`** — superseded by country codes table. (Leave column but ignore it; safer than dropping.)

---

### 2. Edge function `whatsapp-admin` — extend

Add new admin actions:
- `update_secrets` — accepts `{ access_token?, phone_number_id?, verify_token?, app_secret? }`. Since Supabase secrets cannot be updated via runtime API without a Management token, this action will:
  - Validate the token by hitting Graph API (so admin gets immediate feedback the values are correct)
  - Return `{ requires_manual_update: true, instructions: [...] }` so the UI shows a guided manual workflow
- (No actual secret write — Lovable Cloud secrets must be set via the Backend UI.)

Verdict: implement the **guided manual workflow** path. UI lets admin paste values, the edge function validates them against Graph API, then instructs the admin to copy them into Lovable Cloud → Backend → Edge Function Secrets. Provides copy buttons for secret names and a "Test Connection" button after they've saved.

---

### 3. Frontend — WhatsApp Settings (Credentials tab)

In `src/pages/WhatsAppSettings.tsx`:
- Add **"Update Secrets"** card (admin-only)
- 4 password fields (token + confirm token, phone id, verify token, app secret)
- "Validate" button → calls `whatsapp-admin` `update_secrets` action which pings Graph API with the proposed token/phone id
- Confirmation modal before submit
- Shows guided manual update steps with copy-to-clipboard buttons for secret names
- "Test Connection" button after manual update completes

---

### 4. Frontend — Country Code Management

New tab/section "Country Codes" in WhatsApp Settings:
- Table of country codes from `whatsapp_country_codes`
- Add row, edit label/code, toggle active, set as default (radio), reorder (up/down arrows)
- New file: `src/components/whatsapp-settings/CountryCodesTab.tsx`
- Helpers in `src/lib/whatsapp-settings.ts`

---

### 5. New shared component `PhoneInput`

`src/components/ui/phone-input.tsx`
- Country code dropdown (Select) + phone number text input
- Loads codes from `whatsapp_country_codes` (active only), pre-selects default
- Exposes `{ countryCode, localPhone, fullE164 }` via change handler
- Strips leading zero with toast warning
- Validates length per country (basic min/max)

---

### 6. POS integration

- Update `src/components/pos/CustomerSection.tsx` to use `PhoneInput`
- Update `src/hooks/useCustomerState.ts` and order-save flow in `src/lib/supabase-queries.ts` to persist `country_code`, `local_phone`, `full_phone_e164`
- Duplicate check uses `full_phone_e164`

---

### 7. Search behavior

`fetchCustomerByPhone` in `src/lib/supabase-queries.ts`:
- Normalize input: strip spaces/dashes; if starts with `+` use as e164; if starts with `00` convert to `+`; if all digits and length >= 10 try `+` + digits; else treat as local and try matching against `local_phone` for the default country
- Query `customers` by `full_phone_e164`, fallback to `local_phone`, fallback to legacy `phone_number`

`SmartSearchBar` already passes raw value — no change needed beyond the query.

---

### 8. WhatsApp sending

- `src/lib/whatsapp.ts` and edge functions `send-whatsapp`, `send-whatsapp-loyalty`, `send-whatsapp-text`, `send-whatsapp-image`: ensure recipient phone is `full_phone_e164` (without `+` for Graph API). Helper: if missing, rebuild from `country_code + local_phone`.

---

### 9. Customer Profile

`src/pages/CustomerProfile.tsx`:
- Display country code, local phone, full WhatsApp number
- Allow editing via `PhoneInput` component

---

### Files to create
- `supabase/migrations/{ts}_whatsapp_country_codes_and_phones.sql`
- `src/components/whatsapp-settings/UpdateSecretsCard.tsx`
- `src/components/whatsapp-settings/CountryCodesTab.tsx`
- `src/components/ui/phone-input.tsx`
- `src/lib/phone.ts` (normalize/parse/format helpers + country code cache)

### Files to edit
- `supabase/functions/whatsapp-admin/index.ts` — add `update_secrets` action
- `src/lib/whatsapp-settings.ts` — country code CRUD helpers
- `src/lib/whatsapp.ts` — ensure e164 routing
- `src/lib/supabase-queries.ts` — phone normalization in search + customer create/update
- `src/pages/WhatsAppSettings.tsx` — wire new tab + update-secrets card
- `src/pages/CustomerProfile.tsx` — show & edit phone parts
- `src/components/pos/CustomerSection.tsx` — use PhoneInput
- `src/hooks/useCustomerState.ts` — track country_code/local_phone

### Out of scope
- Bulk re-format of existing customer rows beyond simple backfill
- Per-country length validation beyond basic 6–14 digit range

Ready to implement on approval.
