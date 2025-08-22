
"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const loaderVariants = cva(
  "inline-block animate-spin rounded-full border-solid border-current border-r-transparent",
  {
    variants: {
      size: {
        sm: "h-4 w-4 border-2",
        md: "h-6 w-6 border-[3px]",
        lg: "h-8 w-8 border-4",
      },
      loaderColor: {
        primary: "text-primary",
        secondary: "text-secondary",
        destructive: "text-destructive",
        white: "text-white",
        black: "text-black",
      },
    },
    defaultVariants: {
      size: "md",
      loaderColor: "primary",
    },
  }
);

interface SheiLoaderProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof loaderVariants> {
  loadingText?: string;
}

const SheiLoader = React.forwardRef<HTMLSpanElement, SheiLoaderProps>(
  ({ className, size, loaderColor, loadingText, ...props }, ref) => {
    return (
      <div className="inline-flex items-center gap-2">
        <span
          ref={ref}
          className={cn(loaderVariants({ size, loaderColor, className }))}
          {...props}
          style={{ animationDuration: "0.75s" }}
          aria-label="Loading"
        />
        {loadingText && (
          <span className="text-white text-sm font-medium">{loadingText}</span>
        )}
      </div>
    );
  }
);

SheiLoader.displayName = "SheiLoader";

export { SheiLoader };