import { View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { Monogram, type MonogramSize } from "./Monogram.native.tsx";
import { Wordmark, type WordmarkSize } from "./Wordmark.native.tsx";

export type BrandLockupSize = "sm" | "md" | "lg";
export type BrandLockupOrientation = "horizontal" | "stacked";

export type BrandLockupProps = Omit<ViewProps, "children" | "style"> & {
  size?: BrandLockupSize;
  orientation?: BrandLockupOrientation;
  wordmarkColor?: string;
  monogramBackgroundColor?: string;
  monogramColor?: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

const gapBySize: Record<BrandLockupSize, number> = {
  sm: 8,
  md: 10,
  lg: 20,
};

export function BrandLockup({
  size = "md",
  orientation = "horizontal",
  wordmarkColor,
  monogramBackgroundColor,
  monogramColor,
  label = "Baindar",
  style,
  ...rest
}: BrandLockupProps) {
  const stacked = orientation === "stacked";

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[
        {
          flexDirection: stacked ? "column" : "row",
          alignItems: "center",
          gap: gapBySize[size],
        },
        style,
      ]}
      {...rest}
    >
      <Monogram
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        size={size as MonogramSize}
        backgroundColor={monogramBackgroundColor}
        color={monogramColor}
      />
      <Wordmark
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        size={size as WordmarkSize}
        color={wordmarkColor}
      />
    </View>
  );
}
