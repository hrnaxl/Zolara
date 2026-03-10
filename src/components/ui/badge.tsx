import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-[#F5ECD6] text-[#8B6A2E] text-[9px] tracking-[0.08em] uppercase",
        secondary:   "border-transparent bg-[#F5F0E8] text-[#57534E] text-[9px] tracking-[0.08em] uppercase",
        destructive: "border-transparent bg-[#FEF2F2] text-[#DC2626] text-[9px] tracking-[0.08em] uppercase",
        outline:     "border-[#EAE5DC] text-[#57534E] text-[9px] tracking-[0.08em] uppercase",
        success:     "border-transparent bg-[#F0FDF4] text-[#16A34A] text-[9px] tracking-[0.08em] uppercase",
        warning:     "border-transparent bg-[#FFFBEB] text-[#B45309] text-[9px] tracking-[0.08em] uppercase",
        info:        "border-transparent bg-[#EFF6FF] text-[#1D4ED8] text-[9px] tracking-[0.08em] uppercase",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
