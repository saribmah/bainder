export const shadow = {
  sm: "0 1px 2px rgba(20,15,10,0.04), 0 1px 1px rgba(20,15,10,0.03)",
  md: "0 4px 12px rgba(20,15,10,0.06), 0 2px 4px rgba(20,15,10,0.04)",
  lg: "0 12px 32px rgba(20,15,10,0.08), 0 4px 12px rgba(20,15,10,0.05)",
  xl: "0 24px 60px rgba(20,15,10,0.12), 0 8px 20px rgba(20,15,10,0.06)",
  sheet: "0 -8px 32px rgba(20,15,10,0.10)",
} as const;

export type Shadow = typeof shadow;
export type ShadowKey = keyof Shadow;
