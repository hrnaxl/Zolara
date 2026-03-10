/**
 * PageShell — universal Zolara admin page wrapper.
 * Gives every page the same cream background, consistent header,
 * and entry animation. Drop-in replacement for <div className="space-y-6">.
 */
import { ReactNode, CSSProperties } from "react";

interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;      // buttons / controls in top-right
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export const PageShell = ({
  title,
  subtitle,
  actions,
  children,
  className = "",
  style,
}: PageShellProps) => (
  <div
    className={`z-page anim-fade-up ${className}`}
    style={style}
  >
    {/* Header */}
    <div className="z-header">
      <div>
        <h1 className="z-title">{title}</h1>
        {subtitle && <p className="z-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {actions}
        </div>
      )}
    </div>

    {/* Content */}
    {children}
  </div>
);

export default PageShell;
