import { useEffect, useState } from "react";
import { BookCover } from "@bainder/ui";
import type { Document } from "@bainder/sdk";
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

  return (
    <BookCover
      width={width}
      height={height}
      src={coverSrc ?? undefined}
      backgroundColor={KIND_BG[doc.kind]}
      alt=""
    />
  );
}
