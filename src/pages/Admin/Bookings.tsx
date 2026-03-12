import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format, isToday, parseISO, isAfter, startOfToday } from "date-fns";
import { z } from "zod";
import { useSettings } from "@/context/SettingsContext"; // @ts-ignore
import useDebounce from "@/hooks/use-debounce";
import {
  normalizeTimeTo24,
  isTimeWithinRange,
  timeToMinutes,
  formatTo12Hour,
} from "@/lib/time";
import { getOffDays, getWorkingHours } from "@/lib/staff";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleSearchBar } from "@/components/SearchBar";
import {
  BookingFilters,
  BookingFilter,
  ViewMode,
} from "@/components/bookings/BookingFilters";
import { BulkActions } from "@/components/bookings/BulkActions";
import { BookingCard } from "@/components/bookings/BookingCard";
import { CalendarView } from "@/components/bookings/CalendarView";
import { TodaysBookings } from "@/components/bookings/TodaysBookings";
import { CancelBookingDialog } from "@/components/bookings/CancelBookingDialog";

const bookingSchema = z.object({
  client_id: z.string().optional(),
  service_id: z.string().uuid("Invalid service selection"),
  staff_id: z
    .string()
    .uuid("Invalid staff selection")
    .optional()
    .or(z.literal("")),
  preferred_date: z.string().min(1, "Date is required"),
  preferred_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
  status: z
    .enum(["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"])
    .optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
});

const Bookings = () => {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [isBookingModalOpen, setBookingModalOpen] = useState(false);
  const [deleteBookingId, setDeleteBookingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const itemsPerPage = 20;
  const totalBookingPages = Math.ceil(totalBookings / itemsPerPage);
  const totalRequestPages = Math.ceil(totalRequests / itemsPerPage);

  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  // client search query for the client selector (debounced)
  const [clientSearchQuery, setClientSearchQuery] = useState<string>("");
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  // New-client-inline state
  const [clientMode, setClientMode] = useState<"search" | "new">("search");
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");

  // Variant / addon state for booking form
  const [bookingVariants, setBookingVariants] = useState<any[]>([]);
  const [bookingAddons, setBookingAddons] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [allVariantsMap, setAllVariantsMap] = useState<Record<string, any[]>>({});

  // New state for enhanced features
  const [activeFilter, setActiveFilter] = useState<BookingFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(
    new Set(),
  );
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  const [formData, setFormData] = useState<any>({
    client_id: "",
    staff_id: "",
    service_id: "",
    preferred_date: "",
    preferred_time: "",
    status: "pending",
    notes: "",
  });
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [requestFilter, setRequestFilter] = useState("all");

  useEffect(() => {
    fetchData();
    fetchAllBookings();
  }, []);

  // Generate available time slots based on shop hours and selected staff availability
  useEffect(() => {
    const open = (settings as any)?.open_time || "08:30";
    const close = (settings as any)?.close_time || "21:00";
    const step = 15; // minutes

    const generateTimeOptions = (
      openT: string,
      closeT: string,
      stepMins = 15,
    ) => {
      const startMin = timeToMinutes(openT);
      const endMin = timeToMinutes(closeT);
      if (isNaN(startMin) || isNaN(endMin) || endMin < startMin) return [];
      const out: string[] = [];
      for (let m = startMin; m <= endMin; m += stepMins) {
        const hh = Math.floor(m / 60)
          .toString()
          .padStart(2, "0");
        const mm = (m % 60).toString().padStart(2, "0");
        out.push(`${hh}:${mm}`);
      }
      return out;
    };

    const baseOptions = generateTimeOptions(open, close, step);

    if (!formData.staff_id) {
      setAvailableTimes(baseOptions);
      return;
    }

    // If staff selected, filter by their working hours for the appointment day
    (async () => {
      try {
        const whRes = await getWorkingHours(formData.staff_id);
        const wh = whRes.data || [];
        if (!wh || wh.length === 0) {
          setAvailableTimes(baseOptions);
          return;
        }

        const apptDay = formData.preferred_date
          ? new Date(formData.preferred_date).getDay()
          : null;
        if (apptDay === null) {
          setAvailableTimes(baseOptions);
          return;
        }

        const daySlots = wh.filter(
          (s: any) => Number(s.day_of_week) === apptDay,
        );
        if (!daySlots || daySlots.length === 0) {
          // staff has no slots for that day — fall back to shop hours
          setAvailableTimes(baseOptions);
          return;
        }

        const filtered = baseOptions.filter((t) =>
          daySlots.some((s: any) =>
            isTimeWithinRange(t, s.start_time, s.end_time),
          ),
        );
        setAvailableTimes(filtered);
      } catch (err) {
        setAvailableTimes(baseOptions);
      }
    })();
  }, [settings, formData.staff_id, formData.preferred_date]);

  useEffect(() => {
    fetchBookings(page);
  }, [page]);

  useEffect(() => {
    setRequestPage(1);
    fetchBookingRequests(1);
  }, [requestFilter]);

  const fetchAllBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("preferred_date", { ascending: false });

      if (error) throw error;
      setAllBookings(data || []);
    } catch (error) {
      console.error("Error fetching all bookings:", error);
    }
  };

  const fetchBookings = async (pageNumber = page) => {
    try {
      const start = (pageNumber - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;

      const { data, count, error } = await supabase
        .from("bookings")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) throw error;

      setBookings(data || []);
      setTotalBookings(count || 0);

      if (data?.length === 0 && pageNumber > 1) {
        setPage(pageNumber - 1);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load data");
    }
  };

  // const fetchBookingRequests = async (pageNumber = requestPage) => {
  //   try {
  //     const start = (pageNumber - 1) * itemsPerPage;
  //     const end = start + itemsPerPage;

  //     let query = supabase
  //       .from("bookings")
  //       .select("*, clients(*), services(*)", { count: "exact" })
  //       .order("created_at", { ascending: false });

  //     // Apply filter
  //     if (requestFilter !== "all") {
  //       query = query.eq("status", requestFilter);
  //     }

  //     const { data, count, error } = await query.range(start, end - 1);

  //     if (error) throw error;

  //     setRequests(data || []);
  //     setTotalRequests(count || 0);

  //     if (data?.length === 0 && pageNumber > 1) {
  //       setRequestPage(pageNumber - 1);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching requests:", error);
  //     toast.error("Failed to load data");
  //   }
  // };
  const fetchBookingRequests = async (pageNumber = requestPage) => {
    try {
      const start = (pageNumber - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;

      let query = supabase
        .from("bookings")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (requestFilter !== "all") {
        query = query.eq("status", requestFilter);
      }

      const { data, count, error } = await query.range(start, end);

      if (error) throw error;

      setRequests(data || []);
      setTotalRequests(count ?? 0);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load data");
    }
  };

  const fetchData = async () => {
    // Safety timeout — always clear loading after 8s even if queries hang
    const timeout = setTimeout(() => setLoading(false), 8000);
    try {
      const [clientsRes, staffRes, servicesRes, variantsRes] = await Promise.all([
        supabase.from("clients").select("id, name, email, phone").order("name"),
        supabase.from("staff").select("*"),
        supabase.from("services").select("*").eq("is_active", true).order("category").order("name"),
        (supabase as any).from("service_variants").select("service_id, id, name, price_adjustment, duration_adjustment").eq("is_active", true).order("sort_order"),
      ]);

      if (clientsRes.data) setClients(clientsRes.data);
      if (staffRes.data) setStaff(staffRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
      if (variantsRes.data) {
        const vm: Record<string, any[]> = {};
        for (const v of variantsRes.data) {
          if (!vm[v.service_id]) vm[v.service_id] = [];
          vm[v.service_id].push(v);
        }
        setAllVariantsMap(vm);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  // Load variants + addons when service selected in booking form
  useEffect(() => {
    setBookingVariants([]); setBookingAddons([]); setSelectedVariantId(""); setSelectedAddonIds([]);
    const svcId = formData.service_id;
    if (!svcId) return;
    (supabase as any).from("service_variants").select("*").eq("service_id", svcId).eq("is_active", true).order("sort_order")
      .then(({ data }: any) => setBookingVariants(data || []));
    (supabase as any).from("service_addons").select("*").eq("service_id", svcId).eq("is_active", true).order("sort_order")
      .then(({ data }: any) => setBookingAddons(data || []));
  }, [formData.service_id]);

  // Filter bookings based on active filter
  // Debounced client search: update filteredClients when the debounced query changes
  const debouncedClientQuery = useDebounce(clientSearchQuery, 200);

  useEffect(() => {
    if (!debouncedClientQuery) {
      // empty query -> clear filtered list so the UI falls back to full clients array
      setFilteredClients([]);
      return;
    }

    const q = debouncedClientQuery.toLowerCase();
    const results = clients
      .filter((c) => {
        if (!c) return false;
        const name = (c.name || "").toLowerCase();
        const email = (c.email || "").toLowerCase();
        const phone = (c.phone || "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      })
      .slice(0, 100); // limit results for performance

    setFilteredClients(results);
  }, [debouncedClientQuery, clients]);

  const filteredBookings = useMemo(() => {
    const base = searchResults !== null ? searchResults : bookings;

    return base.filter((b) => {
      if (!b) return false;

      const status = (b.status || "").toString().trim().toLowerCase();

      switch (activeFilter) {
        case "today":
          return b.preferred_date
            ? b.preferred_date ? isToday(parseISO(b.preferred_date)) : false
            : false;

        case "completed":
          return status === "completed";

        case "cancelled":
          return status === "cancelled";

        case "confirmed":
          return status === "confirmed";

        case "pending":
          return status === "pending";

        default:
          return true;
      }
    });
  }, [bookings, searchResults, activeFilter]);

  useEffect(() => {
    setPage(1);
  }, [activeFilter, searchResults]);

  const todayBookingsCount = useMemo(() => {
    return allBookings.filter((b) => b.preferred_date ? isToday(parseISO(b.preferred_date)) : false)
      .length;
  }, [allBookings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Normalize preferred_time to 24h before validation
      const normalized = { ...formData };
      if (normalized.preferred_time) {
        normalized.preferred_time = normalizeTimeTo24(
          normalized.preferred_time,
        );
      }

      const validated = bookingSchema.parse(normalized);

      setCreating(true);
      // Operating hours and staff validation handled below

      // Enforce operating hours from SettingsContext (if present)
      const openTime = (settings as any)?.open_time || "08:30";
      const closeTime = (settings as any)?.close_time || "21:00";
      if (!isTimeWithinRange(validated.preferred_time, openTime, closeTime)) {
        throw new Error(
          `Appointment time must be within operating hours (${openTime} — ${closeTime})`,
        );
      }

      // If staff is assigned, enforce staff working hours for that day
      if (validated.staff_id) {
        try {
          const whRes = await getWorkingHours(validated.staff_id);
          const wh = whRes.data || [];
          const apptDay = new Date(validated.preferred_date).getDay(); // 0-6
          // If staff has no configured working hours, allow bookings during shop operating hours (openTime/closeTime already set above)
          if (wh.length === 0) {
            // already enforced shop hours above, so nothing more to do
          } else {
            const daySlots = wh.filter(
              (s: any) => Number(s.day_of_week) === apptDay,
            );
            if (daySlots.length === 0) {
              // No slots for that day; disallow unless shop hours allow it (we already enforced shop hours globally)
              // We'll allow the booking if it fits shop hours (already checked above), otherwise reject earlier.
            } else {
              const withinAny = daySlots.some((s: any) => {
                const start = s.start_time;
                const end = s.end_time;
                return isTimeWithinRange(
                  validated.preferred_time,
                  start,
                  end,
                );
              });
              if (!withinAny) {
                throw new Error(
                  "Selected staff is not available at the chosen time",
                );
              }
            }
          }

          // Additionally, check off-days for the staff
          try {
            const odRes = await getOffDays(validated.staff_id);
            const ods = odRes.data || [];
            const hasOff = ods.some(
              (d: any) => d.off_date === validated.preferred_date,
            );
            if (hasOff)
              throw new Error("Selected staff is off on the chosen date");
          } catch (err) {
            // ignore off-day errors (non-fatal) — if getOffDays failed we don't block here
          }
          // Also ensure staff is active
          const staffMember = staff.find(
            (s: any) => s.id === validated.staff_id,
          );
          if (
            staffMember &&
            staffMember.status &&
            staffMember.status !== "active"
          ) {
            throw new Error("Selected staff is not active");
          }
        } catch (err: any) {
          throw err;
        }
      }

      // Resolve client — either existing or create new inline
      let resolvedClientId = validated.client_id || null;
      let resolvedClientName = "";
      let resolvedClientPhone = "";
      let resolvedClientEmail = "";

      if (clientMode === "new") {
        if (!newClientName.trim() || !newClientPhone.trim()) {
          toast.error("New client requires name and phone"); setCreating(false); return;
        }
        const { data: existingByPhone } = await supabase.from("clients").select("id, name, phone, email").eq("phone", newClientPhone.trim()).maybeSingle();
        if (existingByPhone) {
          resolvedClientId = existingByPhone.id;
          resolvedClientName = existingByPhone.name;
          resolvedClientPhone = existingByPhone.phone;
          resolvedClientEmail = existingByPhone.email || "";
          toast.info("Existing client matched by phone.");
        } else {
          const { data: nc, error: ncErr } = await supabase.from("clients").insert({ name: newClientName.trim(), phone: newClientPhone.trim(), email: newClientEmail.trim() || null, loyalty_points: 0, total_visits: 0, total_spent: 0 }).select("id").single();
          if (ncErr) throw new Error("Failed to create client: " + ncErr.message);
          resolvedClientId = nc.id;
          resolvedClientName = newClientName.trim();
          resolvedClientPhone = newClientPhone.trim();
          resolvedClientEmail = newClientEmail.trim();
        }
        // Refresh clients list
        supabase.from("clients").select("id, name, email, phone").order("name").then(({ data }) => { if (data) setClients(data); });
      } else {
        const c = clients.find((c: any) => c.id === validated.client_id);
        resolvedClientName = c?.name || "";
        resolvedClientPhone = c?.phone || "";
        resolvedClientEmail = c?.email || "";
      }

      // Denormalize client and service info for easy display
      const selectedService = services.find((s: any) => s.id === validated.service_id);
      const selectedStaffMember = staff.find((s: any) => s.id === validated.staff_id);
      const selectedVariant = bookingVariants.find(v => v.id === selectedVariantId);
      const chosenAddons = bookingAddons.filter(a => selectedAddonIds.includes(a.id));

      // Price: base from variant price_adjustment (the actual price) or service price, + addons
      const basePrice = selectedVariant
        ? Number(selectedVariant.price_adjustment)
        : Number(selectedService?.price || 0);
      const addonTotal = chosenAddons.reduce((sum: number, a: any) => sum + Number(a.price), 0);
      const totalPrice = basePrice + addonTotal;

      const serviceName = selectedVariant
        ? `${selectedService?.name} (${selectedVariant.name})`
        : selectedService?.name || null;

      const bookingData = {
        client_id: resolvedClientId,
        service_id: validated.service_id,
        staff_id: validated.staff_id || null,
        client_name: resolvedClientName || null,
        client_phone: resolvedClientPhone || null,
        client_email: resolvedClientEmail || null,
        service_name: serviceName,
        staff_name: selectedStaffMember?.name || null,
        price: totalPrice || null,
        duration_minutes: selectedService?.duration_minutes || null,
        preferred_date: validated.preferred_date,
        preferred_time: validated.preferred_time,
        status: validated.status || "pending",
        notes: validated.notes || null,
        variant_id: selectedVariant?.id || null,
        variant_name: selectedVariant?.name || null,
        selected_addons: chosenAddons.length > 0 ? chosenAddons.map((a: any) => ({ id: a.id, name: a.name, price: a.price })) : [],
      };

      if (editingBookingId) {
        const { data, error } = await supabase
          .from("bookings")
          .update(bookingData)
          .eq("id", editingBookingId)
          .select();

        if (error) throw error;

        toast.success("Booking updated successfully");
      } else {
        // Prevent scheduling on Sundays
        try {
          const d = new Date(bookingData.preferred_date);
          if (d.getUTCDay && d.getUTCDay() === 0) {
            throw new Error("Bookings cannot be scheduled on Sundays.");
          }
        } catch (err) {
          throw err;
        }

        const { error } = await supabase.from("bookings").insert([bookingData]);
        if (error) throw error;
        toast.success("Booking created successfully");
      }

      setDialogOpen(false);
      setEditingBookingId(null);
      resetFormData();
      fetchBookings();
      fetchAllBookings();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to save booking");
      }
    } finally {
      setCreating(false);
    }
  };

  const resetFormData = () => {
    setFormData({ client_id: "", staff_id: "", service_id: "", preferred_date: "", preferred_time: "", status: "pending", notes: "" });
    setClientMode("search");
    setNewClientName(""); setNewClientPhone(""); setNewClientEmail("");
    setBookingVariants([]); setBookingAddons([]);
    setSelectedVariantId(""); setSelectedAddonIds([]);
  };

  const handleDelete = async () => {
    if (!deleteBookingId) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", deleteBookingId);
      if (error) throw error;

      toast.success("Booking deleted successfully");
      fetchBookings();
      fetchAllBookings();
    } catch (error: any) {
      console.error("Delete error:", error);

      toast.error("Failed to delete booking");
    } finally {
      setDeleteDialogOpen(false);
      setDeleteBookingId(null);
    }
  };

  const handleRequestStatus = async (
    requestId: string,
    status: "confirmed" | "cancelled",
  ) => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    try {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", requestId);

      if (updateError) throw updateError;

      if (status === "confirmed") {
        // Prevent creating bookings on Sundays when approving requests
        const dateToCheck = request.preferred_date;
        if (dateToCheck) {
          const dd = new Date(dateToCheck);
          if (dd.getUTCDay && dd.getUTCDay() === 0) {
            throw new Error(
              "Cannot approve request: appointment falls on a Sunday.",
            );
          }
        }

        const { error: insertError } = await supabase.from("bookings").insert([
          {
            client_id: request.client_id,
            staff_id: request.staff_id || null,
            service_id: request.service_id,
            preferred_date: request.preferred_date,
            preferred_time: request.preferred_time,
            status: "pending",
            notes: request.notes,
          },
        ]);

        if (insertError) throw insertError;
        toast.success("Booking created and request approved!");
        fetchBookingRequests();
        fetchBookings();
        fetchAllBookings();
      } else {
        toast.info("Request declined");
        fetchBookingRequests();
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update request or create booking");
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    // If cancelling, show cancel dialog with reason
    if (newStatus === "cancelled") {
      const booking = bookings.find((b) => b.id === bookingId);
      setBookingToCancel(booking);
      setCancelDialogOpen(true);
      return;
    }

    try {
      const { error } = await supabase
        .from("bookings")
        // @ts-ignore
        .update({ status: newStatus })
        .eq("id", bookingId);

      if (error) throw error;

      toast.success("Booking status updated");
      fetchBookings();
      fetchAllBookings();
    } catch (err: any) {
      toast.error(err.message || "Status update failed");
    }
  };

  const handleCancelWithReason = async (reason: string) => {
    if (!bookingToCancel) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          notes: bookingToCancel.notes
            ? `${bookingToCancel.notes}\n\nCancellation reason: ${reason}`
            : `Cancellation reason: ${reason}`,
        })
        .eq("id", bookingToCancel.id);

      if (error) throw error;

      toast.success("Booking cancelled");
      setCancelDialogOpen(false);
      setBookingToCancel(null);
      fetchBookings();
      fetchAllBookings();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel booking");
    }
  };

  const handleQuickAssign = async (bookingId: string, staffId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ staff_id: staffId })
        .eq("id", bookingId);

      if (error) throw error;

      toast.success("Staff assigned");
      fetchBookings();
      fetchAllBookings();
    } catch (err: any) {
      toast.error("Failed to assign staff");
    }
  };

  // Bulk actions
  const handleSelectBooking = (id: string) => {
    setSelectedBookings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedBookings(new Set());
  };

  const handleBulkComplete = async () => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "completed" })
        .in("id", Array.from(selectedBookings));

      if (error) throw error;

      toast.success(`${selectedBookings.size} bookings marked as completed`);
      handleClearSelection();
      fetchBookings();
      fetchAllBookings();
    } catch (err: any) {
      toast.error("Failed to update bookings");
    }
  };

  const handleBulkCancel = async (reason: string) => {
    try {
      // We need to update each booking with the reason appended to notes
      const updates = Array.from(selectedBookings).map(async (id) => {
        const booking = bookings.find((b) => b.id === id);
        return supabase
          .from("bookings")
          .update({
            status: "cancelled",
            notes: booking?.notes
              ? `${booking.notes}\n\nCancellation reason: ${reason}`
              : `Cancellation reason: ${reason}`,
          })
          .eq("id", id);
      });

      await Promise.all(updates);

      toast.success(`${selectedBookings.size} bookings cancelled`);
      handleClearSelection();
      fetchBookings();
      fetchAllBookings();
    } catch (err: any) {
      toast.error("Failed to cancel bookings");
    }
  };

  const handleBulkAssignStaff = async (staffId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ staff_id: staffId })
        .in("id", Array.from(selectedBookings));

      if (error) throw error;

      const staffMember = staff.find((s) => s.id === staffId);
      toast.success(
        `${selectedBookings.size} bookings assigned to ${staffMember?.name}`,
      );
      handleClearSelection();
      fetchBookings();
      fetchAllBookings();
    } catch (err: any) {
      toast.error("Failed to assign staff");
    }
  };

  const handleEditBooking = (booking: any) => {
    setEditingBookingId(booking.id);
    const timeFormatted = booking.preferred_time?.substring(0, 5) || "00:00";
    setFormData({
      ...booking,
      client_id: booking.client_id,
      staff_id: booking.staff_id || "",
      service_id: booking.service_id,
      preferred_time: timeFormatted,
    });
    setDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "z-badge z-badge-blue";
      case "confirmed":
        return "z-badge z-badge-amber";
      case "completed":
        return "z-badge z-badge-green";
      case "cancelled":
        return "z-badge z-badge-red";
      case "no_show":
        return "z-badge z-badge-gray";
      default:
        return "z-badge z-badge-gray";
    }
  };

  if (loading) {
    return (
      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", padding:"60px", minHeight:"200px" }}>
        <div style={{ width:"36px", height:"36px", border:"4px solid #e8d27a", borderTopColor:"#C9A84C", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}></div>
      </div>
    );
  }

  return (
    <div className="z-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="z-title" style={{ fontFamily:"'Cormorant Garamond', serif" }}>Bookings</h1>
          <p className="z-subtitle">
            Manage and track all appointments
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingBookingId(null);
                resetFormData();
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingBookingId ? "Update Booking" : "Create New Booking"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={(e) => handleSubmit(e)} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

              {/* ── CLIENT ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Client</Label>
                  <button type="button" onClick={() => { setClientMode(clientMode === "search" ? "new" : "search"); }}
                    className="text-xs text-amber-700 font-semibold underline underline-offset-2">
                    {clientMode === "search" ? "+ New client" : "← Existing client"}
                  </button>
                </div>

                {clientMode === "search" ? (
                  <Select value={formData.client_id || ""} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Search client…" /></SelectTrigger>
                    <SelectContent className="p-0">
                      <div className="px-2 py-2 border-b">
                        <input type="text" placeholder="Type name or phone…" value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          className="w-full rounded-md border px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-amber-300" />
                      </div>
                      {(filteredClients.length ? filteredClients : clients).slice(0, 80).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="font-medium">{c.name}</span>
                          {c.phone && <span className="text-muted-foreground text-xs ml-2">{c.phone}</span>}
                        </SelectItem>
                      ))}
                      {!clientSearchQuery && clients.length > 80 && (
                        <p className="text-xs text-center text-muted-foreground py-2">Type to search all {clients.length} clients</p>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs text-amber-700 font-semibold mb-1">NEW CLIENT</p>
                    <Input placeholder="Full name *" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
                    <Input placeholder="Phone * (e.g. 0594365314)" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} />
                    <Input placeholder="Email (optional)" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} />
                    <p className="text-xs text-muted-foreground">If this phone already exists in the system, we'll match the existing client automatically.</p>
                  </div>
                )}
              </div>

              {/* ── SERVICE ── */}
              <div className="space-y-2">
                <Label>Service</Label>
                <div className="space-y-1">
                  <input type="text" placeholder="Search services…" value={clientSearchQuery.startsWith("svc:") ? clientSearchQuery.slice(4) : ""}
                    onChange={e => setClientSearchQuery("svc:" + e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-300" />
                </div>
                <div className="max-h-44 overflow-y-auto rounded-lg border divide-y">
                  {services
                    .filter(s => !clientSearchQuery.startsWith("svc:") || s.name.toLowerCase().includes(clientSearchQuery.slice(4).toLowerCase()))
                    .map((s) => {
                      const vars = allVariantsMap[s.id] || [];
                      const prices = vars.map(v => Number(v.price_adjustment));
                      const priceLabel = vars.length === 0
                        ? (Number(s.price) > 0 ? `GHS ${Number(s.price).toLocaleString()}` : "")
                        : prices.length === 1 ? `GHS ${prices[0].toLocaleString()}`
                        : `GHS ${Math.min(...prices).toLocaleString()} – ${Math.max(...prices).toLocaleString()}`;
                      const active = formData.service_id === s.id;
                      return (
                        <button key={s.id} type="button"
                          onClick={() => { setFormData({ ...formData, service_id: s.id }); if (clientSearchQuery.startsWith("svc:")) setClientSearchQuery(""); }}
                          className={`w-full text-left px-3 py-2.5 flex justify-between items-center transition-colors ${active ? "bg-amber-50 border-l-2 border-amber-500" : "hover:bg-gray-50"}`}>
                          <div>
                            <p className="text-sm font-semibold">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.category} · {s.duration_minutes} min</p>
                          </div>
                          <span className="text-xs font-bold text-amber-700 shrink-0 ml-2">{priceLabel}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* ── VARIANTS ── */}
              {bookingVariants.length > 0 && (
                <div className="space-y-2">
                  <Label>Size / Length <span className="text-red-500">*</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {bookingVariants.map(v => (
                      <button key={v.id} type="button" onClick={() => setSelectedVariantId(v.id)}
                        className={`rounded-lg px-3 py-2 text-xs font-bold border transition-all ${selectedVariantId === v.id ? "bg-amber-700 text-white border-amber-700" : "bg-white border-gray-200 text-gray-700 hover:border-amber-400"}`}>
                        {v.name}
                        <span className={`block text-xs mt-0.5 ${selectedVariantId === v.id ? "text-amber-200" : "text-amber-700"}`}>GHS {Number(v.price_adjustment).toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ADD-ONS ── */}
              {bookingAddons.length > 0 && (
                <div className="space-y-2">
                  <Label>Add-ons <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                  <div className="space-y-1.5">
                    {bookingAddons.map(a => {
                      const checked = selectedAddonIds.includes(a.id);
                      return (
                        <button key={a.id} type="button" onClick={() => setSelectedAddonIds(prev => checked ? prev.filter(id => id !== a.id) : [...prev, a.id])}
                          className={`w-full flex justify-between items-center rounded-lg border px-3 py-2 text-sm transition-all ${checked ? "bg-purple-50 border-purple-400" : "bg-white border-gray-200 hover:border-purple-300"}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${checked ? "bg-purple-600 border-purple-600" : "border-gray-300"}`}>
                              {checked && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span className={`font-medium ${checked ? "text-purple-900" : ""}`}>{a.name}</span>
                            {a.description && <span className="text-xs text-muted-foreground">— {a.description}</span>}
                          </div>
                          <span className={`font-bold text-xs shrink-0 ml-2 ${checked ? "text-purple-700" : "text-muted-foreground"}`}>+GHS {Number(a.price).toLocaleString()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── PRICE PREVIEW ── */}
              {formData.service_id && (bookingVariants.length === 0 || selectedVariantId) && (
                <div className="rounded-lg bg-gray-50 border px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">TOTAL</p>
                    {selectedAddonIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {bookingVariants.length > 0 ? `GHS ${Number(bookingVariants.find(v=>v.id===selectedVariantId)?.price_adjustment||0).toLocaleString()}` : `GHS ${Number(services.find(s=>s.id===formData.service_id)?.price||0).toLocaleString()}`}
                        {bookingAddons.filter(a=>selectedAddonIds.includes(a.id)).map(a=>(
                          <span key={a.id}> + {a.name} GHS {Number(a.price).toLocaleString()}</span>
                        ))}
                      </p>
                    )}
                  </div>
                  <span className="text-xl font-bold text-amber-700">
                    GHS {(
                      (selectedVariantId ? Number(bookingVariants.find(v=>v.id===selectedVariantId)?.price_adjustment||0) : Number(services.find(s=>s.id===formData.service_id)?.price||0))
                      + bookingAddons.filter(a=>selectedAddonIds.includes(a.id)).reduce((s:number,a:any)=>s+Number(a.price),0)
                    ).toLocaleString()}
                  </span>
                </div>
              )}

              {/* ── STAFF ── */}
              <div>
                <Label>Staff</Label>
                <Select value={formData.staff_id || ""} onValueChange={(value) => setFormData({ ...formData, staff_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Assign staff (optional)" /></SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ── DATE & TIME ── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={formData.preferred_date || ""}
                    onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })} />
                </div>
                <div>
                  <Label>Time</Label>
                  <Select value={formData.preferred_time || ""} onValueChange={(value) => setFormData({ ...formData, preferred_time: value })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select time" /></SelectTrigger>
                    <SelectContent>
                      {availableTimes.length === 0 ? (
                        <SelectItem value="">No available times</SelectItem>
                      ) : (
                        availableTimes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {(settings as any)?.use24HourFormat ? t : formatTo12Hour(t)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── NOTES ── */}
              <div>
                <Label>Notes</Label>
                <Textarea placeholder="Optional notes" value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
              </div>

              <Button type="submit" className="w-full" disabled={creating}>
                {editingBookingId ? "Update Booking" : "Create Booking"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Booking</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete this booking? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Today's Bookings Summary */}
      <TodaysBookings
        bookings={allBookings}
        onBookingClick={handleEditBooking}
      />

      {/* Filters and View Toggle */}
      <BookingFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        todayCount={todayBookingsCount}
      />

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedBookings.size}
        onClearSelection={handleClearSelection}
        onBulkComplete={handleBulkComplete}
        onBulkCancel={handleBulkCancel}
        onBulkAssignStaff={handleBulkAssignStaff}
        staff={staff}
      />

      {/* Bookings List */}
      <div className="w-full space-y-4">
        <div className="flex justify-end">
          <CollapsibleSearchBar
            data={bookings}
            placeholder="Search bookings..."
            onSearchResults={(results) =>
              setSearchResults(results.length > 0 ? results : null)
            }
          />
        </div>

        {viewMode === "card" ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBookings.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                staff={staff}
                isSelected={selectedBookings.has(b.id)}
                onSelect={handleSelectBooking}
                onEdit={handleEditBooking}
                onDelete={(id) => {
                  setDeleteBookingId(id);
                  setDeleteDialogOpen(true);
                }}
                onStatusUpdate={handleStatusUpdate}
                onQuickAssign={handleQuickAssign}
                paymentStatus={b.status || "pending"}
              />
            ))}
          </div>
        ) : (
          <CalendarView
            bookings={filteredBookings}
            onBookingClick={handleEditBooking}
          />
        )}

        {filteredBookings.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No bookings found for the selected filter.
          </p>
        )}

        {/* Pagination (only when no search & no filter) */}
        {viewMode === "card" &&
          activeFilter === "all" &&
          searchResults === null && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 rounded-lg bg-muted disabled:opacity-50"
              >
                Prev
              </button>

              <span className="px-3 py-2 text-sm text-muted-foreground">
                Page {page} of {totalBookingPages}
              </span>

              <button
                disabled={page >= totalBookingPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-lg bg-muted disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
      </div>

      {/* Booking Requests Section */}
      <div className="flex justify-start mb-4">
        <Select
          value={requestFilter}
          onValueChange={(value) => {
            setRequestFilter(value);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter requests" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full space-y-4">
        <h2 className="text-2xl font-bold">Booking Requests</h2>
        {/* <select
              value={requestFilter}
              onChange={(e) => {
                setRequestFilter(e.target.value);
                setRequestPage(1); // reset pagination
              }}
            >
              <option value="all">All</option>
              <option value="pending">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
            </select> */}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {requests.map((r) => (
            <Card
              key={r.id}
              className="rounded-2xl border shadow-sm hover:shadow-lg transition-all"
            >
              <CardHeader className="flex justify-between items-start pb-2">
                <div>
                  <CardTitle className="text-xl font-semibold">
                    {r.service_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium">Client:</span>{" "}
                    {r.client_name || "Unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {r.preferred_date ? format(new Date(r.preferred_date), "MMM dd, yyyy") : "Date TBD"} at{" "}
                    {r.preferred_time || ""}
                  </p>
                </div>
                <Badge
                  className={`${getStatusColor(
                    r.status,
                  )} text-xs px-3 py-1 rounded-full`}
                >
                  {r.status}
                </Badge>
              </CardHeader>

              {r.status === "pending" && (
                <CardContent className="flex gap-3 pt-2">
                  <Button
                    className="flex-1 rounded-xl"
                    onClick={() => handleRequestStatus(r.id, "confirmed")}
                  >
                    Approve
                  </Button>
                  <Button
                    className="flex-1 rounded-xl"
                    variant="destructive"
                    onClick={() => handleRequestStatus(r.id, "cancelled")}
                  >
                    Decline
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}

          {requests.length === 0 && (
            <p className="text-muted-foreground text-center py-4 col-span-full">
              No booking requests at the moment.
            </p>
          )}
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            disabled={requestPage === 1}
            onClick={() => setRequestPage((p) => p - 1)}
            className="px-4 py-2 rounded-lg bg-muted text-foreground disabled:opacity-50 hover:bg-muted/80 transition"
          >
            Prev
          </button>
          <span className="px-3 py-2 text-sm text-muted-foreground">
            Page {requestPage} of {totalRequestPages}
          </span>
          <button
            disabled={requestPage >= totalRequestPages}
            onClick={() => setRequestPage((p) => p + 1)}
            className="px-4 py-2 rounded-lg bg-muted text-foreground disabled:opacity-50 hover:bg-muted/80 transition"
          >
            Next
          </button>
        </div>
      </div>

      {/* Cancel Booking Dialog */}
      <CancelBookingDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleCancelWithReason}
        bookingInfo={
          bookingToCancel
            ? {
                clientName: bookingToCancel.clients?.name,
                serviceName: bookingToCancel.services?.name,
              }
            : undefined
        }
      />
    </div>
  );
};

export default Bookings;
