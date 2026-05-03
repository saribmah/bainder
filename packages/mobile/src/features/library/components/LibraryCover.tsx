import { Text, View } from "react-native";
import { BookCover } from "@bainder/ui";
import type { Document } from "@bainder/sdk";
import { useSdk } from "../../../sdk/sdk.provider";
import { COVER_PALETTES } from "../constants";
import { libraryStyles as styles } from "../library.styles";
import { sourceLabel } from "../utils/document";

const hashString = (value: string): number =>
  [...value].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);

export function LibraryCover({
  doc,
  width,
  height,
}: {
  doc: Document;
  width: number;
  height: number;
}) {
  const { baseUrl, authHeaders } = useSdk();
  const coverSrc =
    doc.kind === "epub" && doc.status === "processed" && doc.coverImage
      ? `${baseUrl}/documents/${doc.id}/${doc.coverImage}`
      : null;

  if (coverSrc) {
    return (
      <BookCover
        width={width}
        height={height}
        src={coverSrc}
        headers={authHeaders()}
        alt={doc.title}
      />
    );
  }

  const palette = COVER_PALETTES[hashString(doc.id) % COVER_PALETTES.length] ?? COVER_PALETTES[0];

  return (
    <View style={[styles.coverFallback, { width, height, backgroundColor: palette.background }]}>
      <View>
        <View style={[styles.coverRule, { backgroundColor: palette.accent }]} />
        <Text style={[styles.coverBrand, { color: palette.ink }]}>Bainder</Text>
      </View>
      <Text style={[styles.coverTitle, { color: palette.ink }]} numberOfLines={4}>
        {doc.title}
      </Text>
      <View>
        <View style={[styles.coverRule, { backgroundColor: palette.accent }]} />
        <Text style={[styles.coverAuthor, { color: palette.ink }]} numberOfLines={1}>
          {sourceLabel(doc)}
        </Text>
      </View>
    </View>
  );
}
