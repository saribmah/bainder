import { BookCover } from "@baindar/ui";
import type { Document } from "@baindar/sdk";
import { useSdk } from "../../../sdk/sdk.provider";
import { KIND_BG } from "../constants";

export function DocumentCover({
  doc,
  width,
  height,
}: {
  doc: Document;
  width: number;
  height: number;
}) {
  const { baseUrl, authHeaders } = useSdk();
  // `coverImage` is set on the document row by the processing pipeline once
  // the manifest is written, so the dashboard renders the cover without
  // fetching the manifest per item.
  const coverSrc =
    doc.kind === "epub" && doc.status === "processed" && doc.coverImage
      ? `${baseUrl}/documents/${doc.id}/${doc.coverImage}`
      : null;

  return (
    <BookCover
      width={width}
      height={height}
      src={coverSrc ?? undefined}
      headers={coverSrc ? authHeaders() : undefined}
      backgroundColor={KIND_BG[doc.kind]}
      alt=""
    />
  );
}
