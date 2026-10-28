# Clearcut

A free, browser-only photo background remover. No accounts, API keys, uploads, watermarks, or usage credits.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run assets
npm run dev
```

`npm run assets` downloads the pinned IMG.LY 1.7.0 quantized IS-Net model and CPU runtime, verifies every chunk against its SHA-256 manifest, and prepares same-origin files. Build with `npm run build`; preview with `npm run preview`.

## GitHub Pages

Set repository Settings → Pages → Source to **GitHub Actions**. Push to `main` to test, download verified AI assets, build, and deploy. Relative paths support both project Pages and custom domains. No secrets are required. AI assets are served from the same GitHub Pages deployment, not fetched from an external inference service. Normal GitHub Pages hosting limits apply.

## Features

- JPG, PNG, and WebP input, drag/drop, and clipboard paste
- AI background removal in a dedicated worker; CPU WebAssembly with no cross-origin isolation requirement
- Cancellation, retry guidance, honest download progress, and five-minute timeout
- Original/result preview and transparent or colored PNG downloads
- Optional erase brush after processing, with adjustable size, per-stroke undo, and reset to the AI result
- Responsive layout, keyboard controls, and reduced-motion support
- 20 MB input limit; images above 4096 pixels per side or 12 megapixels are resized

The first run downloads the model/runtime; browsers may cache these. Complex edges and translucent objects can produce imperfect results. Low-memory devices may not support the model. No analytics or image uploads. The UI font is loaded from Google Fonts; browser requests for fonts and hosting assets disclose normal network metadata, never selected photo content.

## Validation

`npm test` covers input validation, dimension bounds, and output filenames. Before release, verify real sample inference, transparent/color downloads, preview toggles, cancellation, invalid files, and mobile layout in a browser.

Brush checks: start with the brush disabled; erase with mouse or touch; check the downloaded PNG has transparency at the erased position; undo restores the pixels; reset restores the full AI cutout; switching to Original leaves that photo intact and disables brushing. Check a colored export fills erased areas with the selected color. Coordinates are relative to the fitted canvas, excluding letterboxing; stroke paths are replayed for undo without retaining full-size image snapshots.

Dependency audit: Vite is pinned to patched 6.4.5. IMG.LY 1.7.0 transitively uses Zod 3; npm reports GHSA-mrhx-c7xc-m3w5 for constrained collection validation. This application only passes its own fixed configuration object to Zod; selected image contents never enter that schema. Track upstream updates instead of force-downgrading the removal library or forcing an incompatible Zod major version.

## License and credits

Copyright 2026 Clearcut contributors. AGPL-3.0-only; see LICENSE and public/THIRD_PARTY_NOTICES.txt. Includes IMG.LY background removal, ONNX Runtime, and Lucide icons. The plant demo was generated with OpenAI's built-in image-generation tool. Its prompt is recorded in ASSETS.md.
