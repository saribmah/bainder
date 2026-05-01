import { and, asc, eq } from "drizzle-orm";
import { chunkForBindLimit } from "../../../db/chunk";
import { document, pdfDocument, pdfPage } from "../../../db/schema";
import { Instance } from "../../../instance";
import { Pdf } from "./pdf";

export namespace PdfStorage {
  export const entitySelect = {
    documentId: pdfDocument.documentId,
    pageCount: pdfDocument.pageCount,
    pdfTitle: pdfDocument.pdfTitle,
    pdfAuthor: pdfDocument.pdfAuthor,
    pdfProducer: pdfDocument.pdfProducer,
    pdfCreator: pdfDocument.pdfCreator,
  } as const;

  export type EntityRow = {
    documentId: string;
    pageCount: number;
    pdfTitle: string | null;
    pdfAuthor: string | null;
    pdfProducer: string | null;
    pdfCreator: string | null;
  };

  export const pageSelect = {
    id: pdfPage.id,
    documentId: pdfPage.documentId,
    pageNumber: pdfPage.pageNumber,
    text: pdfPage.text,
    wordCount: pdfPage.wordCount,
  } as const;

  export const pageSummarySelect = {
    id: pdfPage.id,
    documentId: pdfPage.documentId,
    pageNumber: pdfPage.pageNumber,
    wordCount: pdfPage.wordCount,
  } as const;

  export type PageRow = {
    id: string;
    documentId: string;
    pageNumber: number;
    text: string;
    wordCount: number;
  };

  export type PageSummaryRow = Omit<PageRow, "text">;

  export const toEntity = (row: EntityRow): Pdf.Entity => ({
    documentId: row.documentId,
    pageCount: row.pageCount,
    pdfTitle: row.pdfTitle,
    pdfAuthor: row.pdfAuthor,
    pdfProducer: row.pdfProducer,
    pdfCreator: row.pdfCreator,
  });

  export const toPage = (row: PageRow): Pdf.Page => ({
    id: row.id,
    documentId: row.documentId,
    pageNumber: row.pageNumber,
    text: row.text,
    wordCount: row.wordCount,
  });

  export const toPageSummary = (row: PageSummaryRow): Pdf.PageSummary => ({
    id: row.id,
    documentId: row.documentId,
    pageNumber: row.pageNumber,
    wordCount: row.wordCount,
  });

  export type CreateInput = {
    documentId: string;
    metadata: {
      pageCount: number;
      pdfTitle: string | null;
      pdfAuthor: string | null;
      pdfProducer: string | null;
      pdfCreator: string | null;
      pdfMetadata: Record<string, string> | null;
    };
    pages: Array<Omit<PageRow, "id" | "documentId">>;
  };

  export const create = async (input: CreateInput): Promise<Pdf.Entity> => {
    const docRow = {
      documentId: input.documentId,
      pageCount: input.metadata.pageCount,
      pdfTitle: input.metadata.pdfTitle,
      pdfAuthor: input.metadata.pdfAuthor,
      pdfProducer: input.metadata.pdfProducer,
      pdfCreator: input.metadata.pdfCreator,
      pdfMetadata: input.metadata.pdfMetadata,
    };
    const pageRows: PageRow[] = input.pages.map((p) => ({
      id: `${input.documentId}:${p.pageNumber}`,
      documentId: input.documentId,
      pageNumber: p.pageNumber,
      text: p.text,
      wordCount: p.wordCount,
    }));

    const db = Instance.db;
    // Idempotent so Workflow retries don't fail with a primary-key conflict
    // on the pdf_document row after a partial prior attempt.
    await db.delete(pdfPage).where(eq(pdfPage.documentId, input.documentId));
    await db.delete(pdfDocument).where(eq(pdfDocument.documentId, input.documentId));
    await db.insert(pdfDocument).values(docRow);
    // Chunked so a many-page PDF doesn't blow past D1's 100-bind-parameter
    // ceiling on a single multi-row insert.
    for (const chunk of chunkForBindLimit(pageRows, PDF_PAGE_PARAMS_PER_ROW)) {
      await db.insert(pdfPage).values(chunk);
    }
    return toEntity(docRow);
  };

  // Keep in sync with the column list on `pdf_page` (id, documentId,
  // pageNumber, text, wordCount).
  const PDF_PAGE_PARAMS_PER_ROW = 5;

  export const get = async (documentId: string, userId: string): Promise<Pdf.Entity | null> => {
    const rows = await Instance.db
      .select(entitySelect)
      .from(pdfDocument)
      .innerJoin(document, eq(document.id, pdfDocument.documentId))
      .where(and(eq(pdfDocument.documentId, documentId), eq(document.userId, userId)))
      .limit(1);
    const row = rows[0];
    return row ? toEntity(row) : null;
  };

  export const listPageSummaries = async (
    documentId: string,
    userId: string,
  ): Promise<Pdf.PageSummary[] | null> => {
    if (!(await isOwned(documentId, userId))) return null;
    const rows = await Instance.db
      .select(pageSummarySelect)
      .from(pdfPage)
      .where(eq(pdfPage.documentId, documentId))
      .orderBy(asc(pdfPage.pageNumber));
    return rows.map(toPageSummary);
  };

  export const getPage = async (
    documentId: string,
    pageNumber: number,
    userId: string,
  ): Promise<Pdf.Page | null> => {
    const rows = await Instance.db
      .select(pageSelect)
      .from(pdfPage)
      .innerJoin(document, eq(document.id, pdfPage.documentId))
      .where(
        and(
          eq(pdfPage.documentId, documentId),
          eq(pdfPage.pageNumber, pageNumber),
          eq(document.userId, userId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? toPage(row) : null;
  };

  const isOwned = async (documentId: string, userId: string): Promise<boolean> => {
    const rows = await Instance.db
      .select({ id: document.id })
      .from(document)
      .where(and(eq(document.id, documentId), eq(document.userId, userId)))
      .limit(1);
    return rows.length > 0;
  };
}
