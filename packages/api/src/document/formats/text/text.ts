import { z } from "zod";

// Plain-text / markdown documents. The decoded text is stored alongside the
// charset we used to decode it so the reader can render it without re-fetching
// the original blob from R2.
export namespace Text {
  export const Entity = z
    .object({
      documentId: z.string(),
      charset: z.string(),
      text: z.string(),
    })
    .meta({ ref: "TextDocument" });
  export type Entity = z.infer<typeof Entity>;
}
