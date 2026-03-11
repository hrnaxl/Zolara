import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from "date-fns";
import {
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  User,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingCardProps {
  booking: any;
  staff: { id: string; name: string }[];
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (booking: any) => void;
  onDelete: (id: string) => void;
  onStatusUpdate: (id: string, status: string) => void;
  onQuickAssign: (bookingId: string, staffId: string) => void;
  paymentStatus?: "pending" | "completed" | "refunded";
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":      return "z-badge z-badge-blue";
    case "confirmed":    return "z-badge z-badge-amber";
    case "completed":    return "z-badge z-badge-green";
    case "cancelled":    return "z-badge z-badge-red";
    case "in_progress":  return "z-badge z-badge-purple";
    case "no_show":      return "z-badge z-badge-gray";
    default:             return "z-badge z-badge-gray";
  }
};

const getPaymentStatusBadge = (status?: string) => {
  switch (status) {
    case "paid":
      return (
        <Badge className="z-badge z-badge-green  text-xs">
          <DollarSign className="w-3 h-3 mr-0.5" />
          Paid
        </Badge>
      );
    case "partial":
      return (
        <Badge className="z-badge z-badge-amber  text-xs">
          <DollarSign className="w-3 h-3 mr-0.5" />
          Partial
        </Badge>
      );
    default:
      return (
        <Badge className="z-badge z-badge-red  text-xs">
          <DollarSign className="w-3 h-3 mr-0.5" />
          Unpaid
        </Badge>
      );
  }
};

export const BookingCard = ({
  booking,
  staff,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onStatusUpdate,
  onQuickAssign,
  paymentStatus = "pending",
}: BookingCardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notesOpen, setNotesOpen] = useState(false);
  const isUnassigned = !booking.staff_id;

  return (
    <Card
      className={cn(
        "rounded-2xl border shadow-sm hover:shadow-lg transition-all",
        isSelected && "ring-2 ring-primary border-primary",
        isUnassigned && "border-l-4 border-l-warning",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(booking.id)}
            className="mt-1"
          />

          <div className="flex-1">
            <div className="flex justify-between items-start gap-2">
              <div>
                <CardTitle className="text-lg font-semibold">
                  {booking.client_name || "Unknown Client"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {booking.service_name || "No service"}
                </p>
                {/* Variant + Add-ons detail */}
                {(booking as any).variant_name && (
                  <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-400 font-medium">
                    ↳ {(booking as any).variant_name}
                  </p>
                )}
                {Array.isArray((booking as any).addon_names) && (booking as any).addon_names.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(booking as any).addon_names.map((a: any, i: number) => (
                      <span key={i} className="inline-flex items-center gap-0.5 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded px-1.5 py-0.5">
                        + {typeof a === "string" ? a : a.name}
                        {typeof a === "object" && a.price ? ` (GHS ${a.price})` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 items-end">
                <Badge
                  className={cn(
                    getStatusColor(booking.status),
                    "text-xs px-3 py-1 rounded-full",
                  )}
                >
                  {booking.status.charAt(0).toUpperCase() +
                    booking.status.slice(1)}
                </Badge>
                {/* {getPaymentStatusBadge(paymentStatus)} */}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-4">
          {/* Staff Assignment */}
          <div>
            <p className="text-muted-foreground text-xs mb-1">Staff</p>
            {isUnassigned ? (
              <div className="space-y-1">
                <Badge
                  variant="outline"
                  className="bg-warning/10 text-warning border-warning/30 text-xs"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Unassigned
                </Badge>
                <Select
                  onValueChange={(value) => onQuickAssign(booking.id, value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Quick assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">{booking.staff_name}</span>
              </div>
            )}
          </div>

          <div>\n            <p className="text-muted-foreground text-xs">Date & Time</p>
            <p className="font-medium">
              {format(new Date(booking.preferred_date), "MMM dd, yyyy")} at{" "}
              {booking.preferred_time}
            </p>
            {booking.price != null && (
              <p className="text-sm font-semibold mt-1">
                GHS {Number(booking.price).toLocaleString()}
                {(booking as any).addon_total > 0 && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    (incl. GHS {(booking as any).addon_total} enhancements)
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Expandable Notes */}
        {booking.notes && (
          <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {notesOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              {notesOpen ? "Hide notes" : "Show notes"}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="text-sm italic border-l-4 border-muted pl-3 py-1 bg-muted/30 rounded-r">
                {booking.notes}
                {booking.note_source && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    — Added by{" "}
                    {booking.note_source === "client" ? "Client" : "Staff"}
                  </span>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Status update */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm font-medium">
            Update status
          </span>
          <Select
            value={booking.status}
            onValueChange={(value) => onStatusUpdate(booking.id, value)}
          >
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Scheduled</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-2 flex-wrap">
          {["pending", "confirmed"].includes(booking.status) && (
            <Button
              size="sm"
              className="rounded-xl flex items-center gap-1 gradient-green text-white"
              style={{ background: "linear-gradient(90deg,#10b981,#059669)" }}
              onClick={() => {
                const basePath = location.pathname.includes("/receptionist/")
                  ? "/app/receptionist/checkout"
                  : "/app/admin/checkout";
                navigate(`${basePath}?booking=${booking.id}`);
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Check Out
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={() => onEdit(booking)}
          >
            <Pencil className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => onDelete(booking.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
