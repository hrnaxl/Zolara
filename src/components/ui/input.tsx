import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, style, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-[8px] px-3 py-2 text-[12px] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#C4BDB5] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        style={{
          fontFamily: "'Montserrat', sans-serif",
          background: "#FAFAF8",
          border: "1px solid #EAE5DC",
          color: "#1C1917",
          transition: "border-color 0.18s, box-shadow 0.18s",
          ...style,
        }}
        onFocus={e => {
          e.target.style.borderColor = "#B8975A";
          e.target.style.boxShadow = "0 0 0 3px rgba(184,151,90,0.12)";
        }}
        onBlur={e => {
          e.target.style.borderColor = "#EAE5DC";
          e.target.style.boxShadow = "none";
        }}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
