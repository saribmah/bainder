// Electrobun config. Vite is the view bundler — `bun run build:view` writes to
// dist-view/, then `electrobun build` copies that directory into the bundle as
// views://mainview/. The Bun main process is bundled by Electrobun itself
// (entrypoint below).
export default {
  app: {
    name: "Baindar",
    identifier: "app.baindar.desktop",
    // macOS-only deep-link scheme. Used by the Better Auth OAuth callback.
    // Add `baindar-desktop://` to the API's TRUSTED_ORIGINS so the redirect
    // is accepted.
    urlSchemes: ["baindar-desktop"],
  },
  build: {
    bun: {
      entrypoint: "src/main/index.ts",
    },
  },
  // Files/dirs copied into the bundle. The destination becomes a views:// path.
  // Vite's output goes here verbatim; electrobun-config schemas accept dir→dir
  // mappings. Verify the first build lands index.html + hashed assets under
  // views://mainview/ — if Electrobun rejects directory copies, switch to
  // explicit per-file mappings or a post-build step.
  copy: {
    "dist-view": "views/mainview",
  },
  mac: {
    codesign: false,
    notarize: false,
  },
};
