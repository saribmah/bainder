import { useEffect, useState } from "react";
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
  const { client, baseUrl } = useSdk();
  const [coverSrc, setCoverSrc] = useState<string | null>(null);

  useEffect(() => {
    if (doc.kind !== "epub" || doc.status !== "processed") return;
    let cancelled = false;
    client.document
      .getEpubDetail({ id: doc.id })
      .then((res) => {
        if (cancelled) return;
        const path = res.data?.book.coverImage;
        if (path) setCoverSrc(`${baseUrl}/documents/${doc.id}/${path}`);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [client, baseUrl, doc.id, doc.kind, doc.status]);

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
