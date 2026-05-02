import { cloneElement, isValidElement, type ReactNode } from "react";

type TintableIconProps = {
  color?: string;
};

export function tintIcon(icon: ReactNode, color: string): ReactNode {
  if (!isValidElement<TintableIconProps>(icon) || icon.props.color) {
    return icon;
  }

  return cloneElement(icon, { color });
}
