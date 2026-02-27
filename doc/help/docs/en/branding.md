# Branding

Use the Branding page to apply your company identity across KANAP.

Route: `/admin/branding`

## Access & scope

- Required permission: `users:admin`
- Available only on tenant hosts (not on the platform-admin host)
- Changes apply to your current tenant only

## What you can customize

- **Logo**
  - Appears in the top app bar (when logged in)
  - Appears on the login page header
- **Primary colors**
  - One primary color for **light mode**
  - One primary color for **dark mode**
  - Used by app bars, primary buttons, and links

## Logo setup

### Supported files

- Formats: `PNG`, `JPG/JPEG`, `GIF`, `WEBP`
- Max size: `20 MB`

### Recommended logo format

- Use a wide, horizontal logo (transparent background preferred)
- Keep important content centered (the header area is compact)
- For sharp rendering, use at least ~2x display size (for example `280x72` or higher)

### Actions

1. Click **Upload Logo** and choose your file.
2. Use the built-in light and dark header previews to validate appearance.
3. Toggle **Show logo in dark mode** if needed.
4. Click **Save Changes** to publish.

To remove the logo, click **Remove Logo**.

When no logo is set (or dark-mode logo display is disabled), KANAP falls back to the default text/icon branding.

## Primary color setup

### How to pick colors

You can set colors using:
- Hex input (`#RRGGBB`)
- Color picker button
- Preset palette chips
- **Clear** button (remove custom value)

### Light/dark behavior

- **Light mode primary** is used in light mode.
- **Dark mode primary** is used in dark mode.
- If only one color is set, KANAP reuses it in both modes.
- If both are empty, KANAP uses default colors.

### Contrast warning

The page shows a warning if contrast is low.  
This warning is advisory (you can still save), but low contrast may reduce readability.

## Save, discard, and reset

- **Save Changes**: applies uploaded logo + color settings
- **Discard**: reverts unsaved edits on the page
- **Reset to Default**: removes logo and clears all custom colors

Reset requires confirmation.

## Tips for professional results

- Test in both light and dark theme modes before saving.
- Keep brand colors readable against white and dark backgrounds.
- Prefer simple logos with transparent background for the cleanest header rendering.
- Use Reset to quickly recover defaults if a trial style is not satisfactory.
