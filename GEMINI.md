# GEMINI.md — AI Agent Context for `figma-export-ultra`

## Project Overview

A Chrome/Firefox browser extension that enhances Figma's export workflow. It runs on `https://www.figma.com/*`, adds a floating UI layer inside Figma pages, and provides a popup for settings management. Built with **WXT** (WebExtension framework), **Vue 3**, **Arco Design Vue**, and **UnoCSS**.

## Key Architecture Decisions

### Multi-context Communication

The extension operates across four script contexts connected via `webext-bridge`:

1. **figma.content** (MAIN world) — Polls `window.figma` until available, assigns it to `window.figma_for_ui_content`.
2. **injected** (unlisted, page world) — Accesses `window.figma_for_ui_content` to call Figma plugin APIs (`getCSSAsync`, `exportAsync`). Handles export logic and selection change events.
3. **ui.content** (content script, Shadow DOM) — Renders the floating toolbar, selection panel, and export modal. Communicates with `injected` via `webext-bridge/window` and with `background` via `webext-bridge/content-script`.
4. **background** (service worker) — Handles upload requests (FormData / S3 PutObject) to bypass CORS. Uses `aws4fetch` for S3-compatible signing.

> The namespace is set to `'Figma Export'` (the `SERVICE` constant) for all `webext-bridge` calls.

### Settings Storage (Single Source of Truth)

All settings are stored under a single `uploadConfig` key in `chrome.storage.sync` as a discriminated union (`UploadConfig`). The two modes are:

- `FormDataUploadConfig` (mode: `'formdata'`)
- `OssUploadConfig` (mode: `'oss'`)

Both extend `BaseUploadConfig` which includes `exportScale`, `autoIconApiUrl`, `svgAutoCurrentColor`, and `cssExportSettings`.

Convenience getters like `getExportScale()`, `getCssExportSettings()`, etc. all read from this single config key.

`selectionPanelPosition` is stored independently under its own key.

### CSS Export Pipeline

1. Figma's `node.getCSSAsync()` returns a `Record<string, string>` of CSS properties.
2. `serializeCSS()` in `utils/css.ts` processes the raw values:
   - Strips comments
   - Applies scale factor
   - Converts CSS variables (optional transform)
   - Converts `px` to `rem` if enabled (except border/shadow/filter properties)
3. For UnoCSS, `css2uno()` wraps `toUnocssClass()` from `transform-to-unocss-core`.

### Image Export Pipeline

1. Export PNG via `node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: scale } })`
2. Decode PNG with `@jsquash/png` (WASM, loaded from remote `help.littleeleven.com`)
3. Encode to WebP with `@jsquash/webp` (WASM, loaded from remote `help.littleeleven.com`)
4. Create blob URL for preview and upload

### SVG Auto CurrentColor

When `svgAutoCurrentColor` is enabled and an SVG has exactly **one unique fill/stroke color** (ignoring `none`, `currentColor`, `transparent`, `inherit`), the extension:

1. Detects the mono-color in `export-modal.vue` via `extractSvgColors()`
2. Replaces all matching `fill="..."` / `stroke="..."` with `currentColor`
3. Shows a color picker overlay for live preview recoloring

### Upload Modes

**FormData mode:**

- Sends a `POST` request with `FormData` to the configured URL
- Supports custom field name, extra fields with template variables (`{{filename}}`, `{{filesize}}`, `{{uuid}}`)
- Extracts the result URL from JSON response via `lodash.get` (dot notation path like `data.url`)

**OSS (S3) mode:**

- Uses `aws4fetch` to sign and send a `PUT` request directly to the S3-compatible endpoint
- Path-style URL: `{endpoint}/{bucket}/{key}`
- Supports custom domain for the final URL

Both run in the **background** service worker to bypass CORS restrictions.

### Host Permissions

The popup's `saveSettings()` function requests `optional_host_permissions` for upload endpoints at save time via `browser.permissions.request()`. The manifest statically declares `host_permissions` for `https://www.figma.com/*` and `optional_host_permissions` for `<all_urls>`.

## Directory Structure

```
entrypoints/
  background/index.ts       — Upload handlers (FormData + OSS)
  figma.content/index.ts     — MAIN world, captures window.figma
  injected/index.ts          — Page-world script, Figma API, export logic
  popup/App.vue              — Settings UI (400px wide card)
  ui.content/index.ts        — Content script entry, Shadow DOM + injected script
  ui.content/App.vue         — Toolbar buttons + export/upload/auto-icon actions

components/
  export-modal.vue           — Multi-tab modal (SVG/WebP/CSS/UnoCSS)
  selection-panel.vue        — Draggable floating panel (CSS+UnoCSS preview)
  application-config.vue     — Arco Design global config provider

utils/
  css.ts                     — serializeCSS, px→rem, scale, variable transforms
  svg.ts                     — handleSvg (strip w/h), getCustomIcon template
  unocss.ts                  — css2uno wrapper
  upload.ts                  — uploadFile (delegates to background)
  storage.ts                 — get/set UploadConfig & SelectionPanelPosition
  constants.ts               — SERVICE name, debugLog, errorLog, warnLog
  container.ts               — Shadow DOM body resolver

types/
  settings.ts                — UploadConfig (discriminated union), CssExportSettings
  item.ts                    — ExportedItem
  selection.ts               — SelectionInfo
```

## Configuration Files

- **wxt.config.ts** — WXT config: Vue + UnoCSS modules, Arco auto-import, manifest settings
- **uno.config.ts** — UnoCSS presets: `presetWind4` + `presetIcons` (auto-install)
- **tsconfig.json** — Extends `.wxt/tsconfig.json` (auto-generated by WXT)
- **pnpm-workspace.yaml** — Shell emulator, `@arco-design/web-vue` patch

## Common Patterns

### Adding a new setting

1. Add the field to `BaseUploadConfig`, `FormDataUploadConfig`, or `OssUploadConfig` in `types/settings.ts`
2. Update `DEFAULT_UPLOAD_CONFIG` in `utils/storage.ts`
3. Add a reactive `ref` + form control in `entrypoints/popup/App.vue`
4. Update `loadUploadConfigToState()` and `buildUploadConfig()` in the popup
5. If the setting needs to be read in the content script, add a convenience getter in `utils/storage.ts`

### Adding a new export format

1. Add the format option to `ExportFormat` type in `components/export-modal.vue`
2. Add filter logic in `currentFormatItems` computed property
3. Add preview template block within the `item-content` section
4. Add copy/download action buttons
5. Update `exportStats` for the badge count

### Adding a new message channel

1. Define the message in the sender context using `sendMessage('channel-name', data, target)`
2. Handle it in the receiver context using `onMessage('channel-name', handler)`
3. Register type declarations in `webext-bridge` typings if needed

## Development Notes

- The WASM files for `@jsquash/png` and `@jsquash/webp` are loaded from a **remote CDN** (`https://help.littleeleven.com/`), not bundled in the extension
- `@arco-design/web-vue` has a **patch** applied via `pnpm-workspace.yaml`
- The selection panel's z-index is `2147483647` (max int32), and the toolbar is `2147483646`
- The `fimga/` directory name is intentionally **misspelled** (it's `fimga` not `figma`)
- Auto-imports are configured for both Vue APIs and Arco Design components via `unplugin-auto-import` and `unplugin-vue-components`
- The `SERVICE` constant (`'Figma Export'`) is used as the `webext-bridge` namespace — changing it will break cross-context messaging
