# Email Template Redesign — Full Spec

## Goal
Redesign all KANAP emails to be sleek, professional, and brand-consistent. Support per-tenant branding (colors + logo). Elevate the weekly review into a polished newsletter format.

## Design Principles
- **Light theme only** — use `primary_color_light` from tenant branding
- **Logo via CID inline attachment** — never reference external URLs for logos
- **Fallback** — no tenant branding → KANAP blue (`#2D69E0`) + bundled KANAP logo PNG
- **Every email goes through `emailWrapper()`** — no exceptions
- **Email client compatibility** — table-based layout, inline styles, no CSS classes, no SVG

## Current Architecture

### Key files:
- `backend/src/notifications/notification-templates.ts` — shared `emailWrapper()` + all notification email builders
- `backend/src/email/email.service.ts` — `EmailService` with `send()`, `sendPasswordResetEmail()`, `sendUserInviteEmail()`
- `backend/src/notifications/notifications.service.ts` — orchestrates notifications, already has CID inline image pattern for comment images
- `backend/src/notifications/comment-email-renderer.ts` — sanitizes comment HTML for emails
- `backend/src/public/public.controller.ts` — has `renderActivationHtml()` (trial activation email, NOT using wrapper) and contact form email (NOT using wrapper)
- `backend/src/tenants/tenant.entity.ts` — `TenantBranding` type with `logo_storage_path`, `logo_version`, `use_logo_in_dark`, `primary_color_light`, `primary_color_dark`
- `backend/src/common/storage/storage.service.ts` — S3 storage, used to fetch logo files

### Existing CID pattern (in notifications.service.ts):
The service already converts inline image URLs to `cid:` references and attaches files. Follow this exact pattern for the logo.

### Bundled KANAP logo:
- Source: `marketing/site/assets/logo.png` (1024x1024 RGBA PNG)
- Create an optimized email-sized version at `backend/src/email/assets/kanap-logo.png` (resize to ~200px wide, keep aspect ratio)
- This is the fallback when no tenant logo is configured

## Phase 1: Redesign `emailWrapper()`

### New signature:
```typescript
export interface EmailBranding {
  primaryColor: string;      // hex color, default '#2D69E0'
  logoBuffer: Buffer;         // PNG buffer (tenant logo or KANAP default)
  logoContentType: string;    // e.g. 'image/png'
  logoCid: string;            // e.g. 'kanap-branding-logo'
}

export interface EmailWrapperResult {
  html: string;
  attachments: EmailAttachment[];  // contains the logo inline attachment
}

export function emailWrapper(
  body: string,
  options?: {
    subtitle?: string;
    preferencesUrl?: string;
    branding?: EmailBranding;
  },
): EmailWrapperResult;
```

**IMPORTANT:** The return type changes from `string` to `{ html, attachments }`. All callers must be updated.

### Layout redesign:
- **Header:** Tenant primary color background. Logo centered or left-aligned (`<img src="cid:kanap-branding-logo">`), max height ~40-48px. If subtitle present, show it right-aligned.
- **Body:** White card, clean typography. Keep the 600px max-width table layout. Better line-height, slightly refined heading styles.
- **Footer:** Light gray background. "Powered by KANAP" if tenant has custom branding (so their users see KANAP attribution). Links: manage notifications preference link. Subtle, professional.
- **Buttons:** Use tenant primary color for CTA buttons. Ensure good contrast (white text on colored background).
- **Accent elements:** Quote blocks, left borders on comment cards — use tenant primary color instead of hardcoded blue.

### Color derivation:
When the tenant provides `primary_color_light`, use it for:
- Header background
- CTA button background
- Left-border accents on quoted content
- Link colors in the body

For badges (priority, status) in the weekly review: keep the existing semantic colors (red for blocker, green for done, etc.) — don't override those with the tenant color.

## Phase 2: Bring rogue emails into the wrapper

### Trial activation email (`public.controller.ts` → `renderActivationHtml`)
- Replace the raw `<div>` with `emailWrapper()` call
- Will need access to tenant branding — the controller already loads the tenant
- Move the template logic to a builder function in `notification-templates.ts` for consistency (e.g., `buildActivationEmail()`)

### Contact form email (`public.controller.ts` → `sendContact`)
- This goes to `support@kanap.net` (internal), so use KANAP default branding
- Still wrap it in `emailWrapper()` for consistency

### Enterprise support admin notification (`public.controller.ts` → `requestSupportInvoice`)
- Same as contact form — internal email, KANAP default branding, use wrapper

### Password reset & User invite (`email.service.ts`)
- Already use `emailWrapper()` ✓ but currently pass a string return. Must be updated for the new `{ html, attachments }` return type.
- These need tenant branding threaded through. The `EmailService` methods will need a `branding?: EmailBranding` parameter.

## Phase 3: Weekly review polish

The weekly review (`buildWeeklyReviewEmail`) already has good structure. Enhance:
- **Header area:** Add a week date range prominently. Maybe a subtle decorative element.
- **Stats bar:** Refine — slightly rounded cards within the bar, better spacing, use primary color for the numbers.
- **Sections:** Cleaner separators between sections. Subtle section header styling.
- **Item rows:** Slightly more refined cards. Better padding.
- **CTA button:** Consistent with the new button style.
- **Overall:** Should feel like a polished weekly newsletter you'd actually enjoy reading.

## Threading branding through

### Helper function:
Create a helper in `email.service.ts` or a new `email-branding.ts`:
```typescript
async function resolveEmailBranding(tenantId: string | null, storage: StorageService): Promise<EmailBranding>
```
- If tenantId provided → load tenant → check branding → load logo from S3 if exists → return with primary_color_light
- If no tenant or no custom branding → return KANAP defaults (bundled logo, #2D69E0)

### Where to call it:
- `NotificationsService` — before building any notification email, resolve branding and pass it to template builders
- `EmailService.sendPasswordResetEmail()` / `sendUserInviteEmail()` — accept optional tenantId, resolve branding
- `PublicController` — for activation emails, resolve branding from the tenant being provisioned

## Implementation notes

- **Resend attachments:** The Resend SDK supports inline attachments via `{ content: Buffer, filename, contentType, headers: { 'Content-ID': '<cid>' } }`. This is already used in the codebase for comment images.
- **Image sizing:** Email logo should be max ~200px wide. Use the bundled optimized PNG. For tenant logos, consider if resizing is needed or just constrain via HTML `width` attribute.
- **Testing:** After implementation, use Resend's test mode or `EMAIL_OVERRIDE` to send test emails and verify rendering in Gmail, Outlook, Apple Mail.
- **No SVG in emails** — most email clients block SVG. Always use PNG/JPEG.

## Files to modify:
1. `backend/src/notifications/notification-templates.ts` — redesign wrapper + update all template functions
2. `backend/src/email/email.service.ts` — update send methods, add branding resolution
3. `backend/src/public/public.controller.ts` — migrate activation/contact/support emails to wrapper
4. `backend/src/notifications/notifications.service.ts` — thread branding through notification sending
5. New: `backend/src/email/email-branding.ts` (or similar) — branding resolution helper
6. New: `backend/src/email/assets/kanap-logo.png` — bundled default logo

## Out of scope:
- Protecting the `/public/branding/logo` endpoint (Fried handles separately)
- Dark mode email rendering (light only)
- Adding new email types
