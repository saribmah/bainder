// Electrobun's bun-side index transitively re-exports `three` and
// `@babylonjs/core` (used internally for WGPU helpers). Neither ships
// declarations and the desktop app does not consume them — shim them as `any`
// so tsgo can resolve the dependency chain.
declare module "three";
declare module "@babylonjs/core";
