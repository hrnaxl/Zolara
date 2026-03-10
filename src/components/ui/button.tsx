import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[9px] font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-[#C9A84C] to-[#B8975A] text-white shadow-[0_2px_8px_rgba(184,151,90,0.3)] hover:opacity-90 hover:-translate-y-px text-[11px] tracking-[0.06em] uppercase",
        destructive: "bg-destructive text-white hover:bg-destructive/90 text-[11px] tracking-[0.06em] uppercase",
        outline: "border border-[#EAE5DC] bg-white text-[#57534E] hover:bg-[#F5ECD6] hover:text-[#8B6A2E] hover:border-[#B8975A] text-[11px] tracking-[0.06em] uppercase",
        secondary: "bg-[#F5F0E8] text-[#57534E] hover:bg-[#EAE5DC] text-[11px] tracking-[0.06em] uppercase",
        ghost: "text-[#78716C] hover:bg-[#F5ECD6] hover:text-[#8B6A2E] text-[11px] tracking-[0.06em] uppercase",
        link: "text-[#B8975A] underline-offset-4 hover:underline text-sm",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-[7px] px-3 text-[10px]",
        lg: "h-11 rounded-[10px] px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
