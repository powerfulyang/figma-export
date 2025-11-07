# Figma Export Ultra

> 🎨 A powerful browser extension that supercharges your Figma export workflow — export SVG / WebP / CSS / UnoCSS with one click, and optionally upload to any S3-compatible or FormData endpoint.

## ✨ Features

- **Multi-format export** — Export selected Figma layers as **SVG**, **WebP**, **CSS**, or **UnoCSS** in a single operation
- **Real-time selection panel** — Floating panel that follows your Figma selection and displays CSS / UnoCSS code instantly (draggable, position synced across tabs)
- **Flexible upload** — Upload exported assets via:
  - **FormData** — POST to any HTTP endpoint with custom fields & template variables (`{{filename}}`, `{{filesize}}`, `{{uuid}}`)
  - **OSS (S3-compatible)** — Direct PutObject upload to AWS S3, Alibaba OSS, Cloudflare R2, MinIO, etc.
- **Auto Icon** — One-click SVG icon registration through a configurable API
- **SVG auto `currentColor`** — Automatically replace the fill/stroke color in mono-color SVGs with `currentColor`
- **CSS unit conversion** — Convert `px` to `rem` with a configurable root font size
- **High-DPI export** — Configurable export scale (up to 4×) with PNG → WebP compression via `@jsquash`
- **Clipboard integration** — All exported code / URLs are copied to clipboard for instant use

## 🏗️ Architecture

The extension is built with **[WXT](https://wxt.dev)** + **Vue 3** + **Arco Design** + **UnoCSS** and follows the standard WebExtension architecture:

```
entrypoints/
├── background/         # Service worker — handles upload requests (FormData / OSS)
├── figma.content/      # MAIN-world content script — captures `window.figma` reference
├── injected/           # Unlisted page-world script — Figma API access, export logic
├── popup/              # Extension popup — settings management UI
└── ui.content/         # Content script UI — floating toolbar & export modal (Shadow DOM)

components/
├── export-modal.vue    # Multi-format export result viewer with preview & actions
├── selection-panel.vue # Draggable floating panel showing CSS / UnoCSS of selected node
└── application-config.vue  # Arco Design global config provider

utils/
├── css.ts              # CSS serialization (px → rem, scale, variable transforms)
├── svg.ts              # SVG parsing & custom icon template generation
├── unocss.ts           # CSS → UnoCSS class conversion
├── upload.ts           # Upload delegation to background script via webext-bridge
├── storage.ts          # Chrome storage abstraction (upload config, panel position)
├── constants.ts        # Shared service name & logging utilities
└── container.ts        # Shadow DOM container resolver

types/
├── settings.ts         # UploadConfig, CssExportSettings, SelectionPanelPosition
├── item.ts             # ExportedItem interface
└── selection.ts        # SelectionInfo interface
```

### Communication flow

```
┌──────────────┐  window.figma  ┌─────────────────┐
│ figma.content│ ─────────────► │    injected      │
│ (MAIN world) │                │ (page-world)     │
└──────────────┘                └────────┬─────────┘
                                         │ webext-bridge
                                         ▼
                                ┌─────────────────┐
                                │  ui.content      │
                                │ (content script) │
                                └────────┬─────────┘
                                         │ webext-bridge
                                         ▼
                                ┌─────────────────┐
                                │   background     │
                                │ (service worker) │
                                └─────────────────┘
```

## 📦 Installation

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 9

### Setup

```bash
# Install dependencies
pnpm install

# Start development mode (Chrome)
pnpm dev

# Start development mode (Firefox)
pnpm dev:firefox
```

### Load in Chrome

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `.output/chrome-mv3` directory

## 🚀 Usage

1. Open any Figma design file at `https://www.figma.com/`
2. Select one or more layers on the canvas
3. Use the **floating toolbar** (bottom-right corner):
   - ⚡ **Flash button** — Open the export modal with SVG / WebP / CSS / UnoCSS previews
   - 🖼️ **SVG button** — Auto-register the selected layer as a custom icon
   - ☁️ **Upload button** — Export as WebP and upload, URL is copied to clipboard
4. The **selection panel** (draggable overlay) auto-updates with CSS / UnoCSS code for the currently selected node

### Popup Settings

Click the extension icon to configure:

| Setting                      | Description                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| **Export Scale**             | 1× – 4× scaling factor for PNG/WebP export                  |
| **CSS Units**                | Toggle `rem` / `px` output with configurable root font size |
| **SVG Auto CurrentColor**    | Auto-replace single-color SVG fills with `currentColor`     |
| **Auto Icon API**            | Endpoint for registering SVG icons                          |
| **Selection Panel Position** | View / reset the floating panel coordinates                 |
| **Upload Config**            | FormData or OSS (S3) upload configuration                   |

## 🛠️ Development

### Scripts

| Command              | Description                           |
| -------------------- | ------------------------------------- |
| `pnpm dev`           | Start WXT dev server (Chrome)         |
| `pnpm dev:firefox`   | Start WXT dev server (Firefox)        |
| `pnpm build`         | Production build (Chrome)             |
| `pnpm build:firefox` | Production build (Firefox)            |
| `pnpm zip`           | Build and package as `.zip` (Chrome)  |
| `pnpm zip:firefox`   | Build and package as `.zip` (Firefox) |
| `pnpm compile`       | TypeScript type-check                 |
| `pnpm lint`          | Lint and auto-fix with ESLint         |

### Tech Stack

| Technology                                                                                                                         | Purpose                       |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| [WXT](https://wxt.dev)                                                                                                             | WebExtension framework        |
| [Vue 3](https://vuejs.org)                                                                                                         | UI framework                  |
| [Arco Design Vue](https://arco.design/vue)                                                                                         | UI component library          |
| [UnoCSS](https://unocss.dev)                                                                                                       | Atomic CSS engine             |
| [webext-bridge](https://github.com/nicolo-ribaudo/webext-bridge)                                                                   | Cross-context messaging       |
| [@jsquash/png](https://github.com/nicolo-ribaudo/webext-bridge) + [@jsquash/webp](https://github.com/nicolo-ribaudo/webext-bridge) | WASM-based image encoding     |
| [aws4fetch](https://github.com/mhart/aws4fetch)                                                                                    | S3-compatible request signing |
| [transform-to-unocss-core](https://github.com/nicolo-ribaudo/webext-bridge)                                                        | CSS → UnoCSS conversion       |

## 📄 License

Private — internal use only.
