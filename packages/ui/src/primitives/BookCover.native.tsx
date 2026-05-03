import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

export type BookCoverProps = {
  src?: string;
  headers?: Record<string, string>;
  backgroundColor?: string;
  width?: number;
  height?: number;
  alt?: string;
  style?: StyleProp<ViewStyle>;
};

export function BookCover({
  src,
  headers,
  backgroundColor,
  width,
  height,
  alt,
  style,
}: BookCoverProps) {
  return (
    <View
      accessibilityRole={alt ? "image" : undefined}
      accessibilityLabel={alt}
      style={[styles.cover, { width, height, backgroundColor }, style]}
    >
      {src && (
        <Image source={{ uri: src, headers }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    overflow: "hidden",
    borderRadius: 4,
    shadowColor: "rgba(20,15,10,1)",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});
