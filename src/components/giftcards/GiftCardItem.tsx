import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Pencil,
  Ban,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type { GiftCard } from "@/lib/useGiftCards";

type Props = {
  userRole: string | null;
  card: GiftCard;
  onEdit?: (card: GiftCard) => void;
  onAction?: (action: "void" | "expire" | "delete", id: string, code: string) => void;
  readOnly?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
};

export function GiftCardItem({ card, onEdit, onAction, readOnly = false, expanded = false, onToggle }: Props) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    const code = card.final_code || (card as any).code || "";
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    toast.success("Code copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor: Record<string, string> = {
    unused: "z-badge z-badge-green",
    active: "z-badge z-badge-green",
    redeemed: "z-badge z-badge-blue",
    expired: "z-badge z-badge-amber",
    void: "z-badge z-badge-red",
    pending_send: "z-badge z-badge-amber",
  };

  const tierColor: Record<string, string> = {
    SLV: "bg-gray-200 text-gray-800",
    Silver: "bg-gray-200 text-gray-800",
    GLD: "bg-yellow-200 text-yellow-900",
    Gold: "bg-yellow-200 text-yellow-900",
    PLT: "bg-purple-200 text-purple-900",
    Platinum: "bg-purple-200 text-purple-900",
    DMD: "bg-cyan-200 text-cyan-900",
    Diamond: "bg-cyan-200 text-cyan-900",
  };

  const code = card.final_code || (card as any).code || "";
  const value = Number(card.card_value || (card as any).amount || (card as any).balance || 0);
  const tier = card.tier || "";
  const status = card.status || "unknown";
  const expiresAt = card.expire_at || (card as any).expires_at;

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Code + copy button inline */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold text-lg tracking-wider">{code}</span>
            <button
              onClick={copyCode}
              title="Copy code"
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 8px", borderRadius: 6, border: "1px solid #E5E7EB",
                background: copied ? "#F0FDF4" : "#F9FAFB", cursor: "pointer",
                fontSize: 11, fontWeight: 600, color: copied ? "#16A34A" : "#6B7280",
                transition: "all 0.15s",
              }}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? "Copied" : "Copy"}
            </button>
            {tier && <Badge className={tierColor[tier] || "bg-muted"}>{tier}</Badge>}
            <Badge className={statusColor[status] || "bg-muted"}>{status}</Badge>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Value: <span className="font-medium text-foreground">GH₵{value.toFixed(2)}</span>
            {expiresAt && (
              <span className="ml-3">Expires: {new Date(expiresAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!readOnly && onEdit && status !== "redeemed" && (
            <Button size="icon" variant="ghost" onClick={() => onEdit(card)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {/* Expand toggle — always visible for admins */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onToggle?.()}
            title={expanded ? "Collapse" : "View details"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Year</p>
              <p className="font-medium">{card.year || (card as any).created_at?.slice(0,4) || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Batch</p>
              <p className="font-medium">{card.batch || (card as any).batch_id || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">
                {card.date_generated
                  ? new Date(card.date_generated).toLocaleDateString()
                  : (card as any).created_at
                  ? new Date((card as any).created_at).toLocaleDateString()
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Redeemed</p>
              <p className="font-medium">
                {(card as any).redeemed_at
                  ? new Date((card as any).redeemed_at).toLocaleDateString()
                  : "-"}
              </p>
            </div>
          </div>

          {!readOnly && onAction && status !== "redeemed" && (
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={() => onAction("expire", card.id, code)}>
                <Clock className="h-3 w-3 mr-1" /> Expire
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onAction("void", card.id, code)}>
                <Ban className="h-3 w-3 mr-1" /> Void
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onAction("delete", card.id, code)}>
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
