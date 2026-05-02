export const font = {
  family: {
    display: '"Fraunces", "Times New Roman", serif',
    reading: '"Newsreader", "Iowan Old Style", "Charter", Georgia, serif',
    ui: '"Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    mono: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
  },
  nativeFamily: {
    display: "Fraunces",
    reading: "Newsreader",
    ui: "Inter Tight",
    mono: "JetBrains Mono",
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export type Font = typeof font;
