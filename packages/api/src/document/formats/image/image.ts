import { z } from "zod";
import { NamedError } from "../../../utils/error";

// Image-specific schema and errors. Original bytes are streamed from R2 via
// the document `raw` route — we only keep small queryable metadata in D1.
export namespace Image {
  // ---- Errors -----------------------------------------------------------
  export const InvalidFormatError = NamedError.create(
    "ImageInvalidFormatError",
    z.object({ reason: z.string() }),
  );
  export type InvalidFormatError = InstanceType<typeof InvalidFormatError>;

  // ---- Schemas ----------------------------------------------------------
  export const Format = z.enum(["jpeg", "png", "webp", "gif", "heic", "tiff", "bmp", "unknown"]);
  export type Format = z.infer<typeof Format>;

  export const Entity = z
    .object({
      documentId: z.string(),
      width: z.number().int().nonnegative(),
      height: z.number().int().nonnegative(),
      format: Format,
    })
    .meta({ ref: "ImageDocument" });
  export type Entity = z.infer<typeof Entity>;
}
