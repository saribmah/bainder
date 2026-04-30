import { z } from "zod";
import { NamedError } from "../../../utils/error";

// PDF-specific schema and errors. Pages live in `pdf_page`; the embedded
// metadata (pdf author/producer/etc.) on `pdf_document` is preserved for
// display but not heavily indexed.
export namespace Pdf {
  // ---- Errors -----------------------------------------------------------
  export const InvalidFormatError = NamedError.create(
    "PdfInvalidFormatError",
    z.object({ reason: z.string() }),
  );
  export type InvalidFormatError = InstanceType<typeof InvalidFormatError>;

  export const EmptyError = NamedError.create(
    "PdfEmptyError",
    z.object({ message: z.string().optional() }),
  );
  export type EmptyError = InstanceType<typeof EmptyError>;

  export const PageNotFoundError = NamedError.create(
    "PdfPageNotFoundError",
    z.object({
      documentId: z.string(),
      pageNumber: z.number().int(),
      message: z.string().optional(),
    }),
  );
  export type PageNotFoundError = InstanceType<typeof PageNotFoundError>;

  // ---- Schemas ----------------------------------------------------------
  export const Entity = z
    .object({
      documentId: z.string(),
      pageCount: z.number().int().nonnegative(),
      pdfTitle: z.string().nullable(),
      pdfAuthor: z.string().nullable(),
      pdfProducer: z.string().nullable(),
      pdfCreator: z.string().nullable(),
    })
    .meta({ ref: "PdfDocument" });
  export type Entity = z.infer<typeof Entity>;

  export const PageSummary = z
    .object({
      id: z.string(),
      documentId: z.string(),
      pageNumber: z.number().int().nonnegative(),
      wordCount: z.number().int().nonnegative(),
    })
    .meta({ ref: "PdfPageSummary" });
  export type PageSummary = z.infer<typeof PageSummary>;

  export const Page = z
    .object({
      id: z.string(),
      documentId: z.string(),
      pageNumber: z.number().int().nonnegative(),
      text: z.string(),
      wordCount: z.number().int().nonnegative(),
    })
    .meta({ ref: "PdfPage" });
  export type Page = z.infer<typeof Page>;

  export const Detail = z
    .object({
      pdf: Entity,
      pages: z.array(PageSummary),
    })
    .meta({ ref: "PdfDetail" });
  export type Detail = z.infer<typeof Detail>;
}
