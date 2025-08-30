// lib/ui/LucideIcon.tsx
import React from "react";
import type { SVGProps } from "react";

interface LucideIconProps extends SVGProps<SVGSVGElement> {
  icon: React.ComponentType<SVGProps<SVGSVGElement>>;
  size?: number;
}

export function LucideIcon({ icon: Icon, size = 18, ...props }: LucideIconProps) {
  return <Icon width={size} height={size} {...props} />;
}
