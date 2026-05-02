import { BookCover } from "@bainder/ui";
import type { Document } from "@bainder/sdk";
import { useSdk } from "../../../sdk";
import { KIND_GRADIENT } from "../constants";

export function DocumentCover({
  doc,
  width,
  height,
  fill,
}: {
  doc: Document;
  width?: number;
  height?: number;
  fill?: boolean;
}) {
  const { baseUrl } = useSdk();
  // `coverImage` is set on the document row by the processing pipeline once
  // the manifest has been written, so the dashboard never needs to fetch
  // the manifest just to render a cover.
  const coverSrc =
    doc.kind === "epub" && doc.status === "processed" && doc.coverImage
      ? `${baseUrl}/documents/${doc.id}/${doc.coverImage}`
      : null;

  if (fill) {
    return (
      <BookCover
        width="100%"
        height="auto"
        src={coverSrc ?? undefined}
        background={KIND_GRADIENT[doc.kind]}
        alt=""
        className="aspect-[0.66/1] w-full shadow-sm"
      />
    );
  }

  return (
    <BookCover
      width={width ?? 44}
      height={height ?? 60}
      src={coverSrc ?? undefined}
      background={KIND_GRADIENT[doc.kind]}
      alt=""
      className="shrink-0 shadow-sm"
    />
  );
}
