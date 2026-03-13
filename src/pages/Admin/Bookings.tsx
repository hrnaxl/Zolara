import { normalizePhone, findOrCreateClient } from "@/lib/clientDedup";
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
import { sendSMS, SMS } from "@/lib/sms";
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
  service_id: z.string().optional(),
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
  const [absentStaffIds, setAbsentStaffIds] = useState<Set<string>>(new Set());
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

  // Multi-service cart: [{serviceId, variantId, addonIds, variantsMap, addonsMap}]
  const [serviceCart, setServiceCart] = useState<Array<{serviceId:string,variantId:string,addonIds:string[],variants:any[],addons:any[]}>>([]);
  const [svcSearch, setSvcSearch] = useState("");
  const [svcCat, setSvcCat] = useState("all");
  const [allVariantsMap, setAllVariantsMap] = useState<Record<string, any[]>>({});
  const [allAddonsMap, setAllAddonsMap] = useState<Record<string, any[]>>({});

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
        (supabase as any).from("service_variants").select("service_id, id, name, price_adjustment").eq("is_active", true).order("sort_order"),
      ]);

      if (clientsRes.data) setClients(clientsRes.data);
      if (staffRes.data) {
        const assignableRoles = ["staff", "admin", "owner"];
        setStaff(staffRes.data.filter((s: any) => !s.role || assignableRoles.includes(s.role)));
      }
      // Load today's absent staff
      const today = new Date().toISOString().slice(0, 10);
      const { data: attData } = await supabase.from("attendance").select("staff_id, status").eq("date", today);
      setAbsentStaffIds(new Set((attData || []).filter((a: any) => a.status === "absent").map((a: any) => a.staff_id)));
      if (servicesRes.data) setServices(servicesRes.data);
      if (variantsRes.data) {
        const vm: Record<string, any[]> = {};
        for (const v of variantsRes.data) {
          if (!vm[v.service_id]) vm[v.service_id] = [];
          vm[v.service_id].push(v);
        }
        setAllVariantsMap(vm);
      }
      // Also preload addons map for price display
      const addonsRes = await (supabase as any).from("service_addons").select("service_id, id, name, price").eq("is_active", true);
      if (addonsRes.data) {
        const am: Record<string, any[]> = {};
        for (const a of addonsRes.data) {
          if (!am[a.service_id]) am[a.service_id] = [];
          am[a.service_id].push(a);
        }
        setAllAddonsMap(am);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  // Load variants+addons for a service and add it to the cart
  const addServiceToCart = async (svcId: string) => {
    if (serviceCart.some(c => c.serviceId === svcId)) return; // already added
    const [{ data: vars }, { data: adds }] = await Promise.all([
      (supabase as any).from("service_variants").select("*").eq("service_id", svcId).eq("is_active", true).order("sort_order"),
      (supabase as any).from("service_addons").select("*").eq("service_id", svcId).eq("is_active", true).order("sort_order"),
    ]);
    setServiceCart(prev => [...prev, { serviceId: svcId, variantId: "", addonIds: [], variants: vars||[], addons: adds||[] }]);
    setSvcSearch(""); // clear search after adding
  };

  const removeServiceFromCart = (svcId: string) => {
    setServiceCart(prev => prev.filter(c => c.serviceId !== svcId));
  };

  const setCartVariant = (svcId: string, variantId: string) => {
    setServiceCart(prev => prev.map(c => c.serviceId === svcId ? { ...c, variantId } : c));
  };

  const toggleCartAddon = (svcId: string, addonId: string) => {
    setServiceCart(prev => prev.map(c => {
      if (c.serviceId !== svcId) return c;
      const has = c.addonIds.includes(addonId);
      return { ...c, addonIds: has ? c.addonIds.filter(id => id !== addonId) : [...c.addonIds, addonId] };
    }));
  };

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

      // Track if this is a truly new client (not found in DB) — deferred until booking succeeds
      let deferredNewClient: { name: string; phone: string; email: string | null } | null = null;

      if (clientMode === "new") {
        if (!newClientName.trim() || !newClientPhone.trim()) {
          toast.error("New client requires name and phone"); setCreating(false); return;
        }
        // Check if client already exists (find only, don't create yet)
        const { normalizePhone } = await import("@/lib/clientDedup");
        const canonical = normalizePhone(newClientPhone.trim());
        const { data: existing } = await supabase
          .from("clients").select("id, name, phone, email")
          .in("phone", [canonical, newClientPhone.trim(), "0" + (canonical || "").slice(4)].filter(Boolean))
          .limit(1).maybeSingle();

        if (existing) {
          // Found — use existing client
          resolvedClientId = existing.id;
          resolvedClientName = existing.name;
          resolvedClientPhone = existing.phone || newClientPhone.trim();
          resolvedClientEmail = existing.email || newClientEmail.trim();
        } else {
          // Truly new — defer creation until booking insert succeeds
          deferredNewClient = { name: newClientName.trim(), phone: newClientPhone.trim(), email: newClientEmail.trim() || null };
          resolvedClientName = newClientName.trim();
          resolvedClientPhone = newClientPhone.trim();
          resolvedClientEmail = newClientEmail.trim() || null;
        }
      } else {
        const c = clients.find((c: any) => c.id === validated.client_id);
        resolvedClientName = c?.name || "";
        resolvedClientPhone = c?.phone || "";
        resolvedClientEmail = c?.email || "";
      }

      if (serviceCart.length === 0) { toast.error("Add at least one service"); setCreating(false); return; }
      for (const item of serviceCart) {
        if (item.variants.length > 0 && !item.variantId) {
          const svc = services.find(s => s.id === item.serviceId);
          toast.error(`Select a size/length for: ${svc?.name}`); setCreating(false); return;
        }
      }

      const selectedStaffMember = staff.find((s: any) => s.id === validated.staff_id);
      const dayOfWeek = new Date(validated.preferred_date).getUTCDay();
      if (dayOfWeek === 0) throw new Error("Bookings cannot be scheduled on Sundays.");

      // Build services_cart — full detail for every service
      const cartData = serviceCart.map(item => {
        const svc = services.find((s: any) => s.id === item.serviceId);
        const variant = item.variants.find(v => v.id === item.variantId);
        const chosenAddons = item.addons.filter(a => item.addonIds.includes(a.id));
        const basePrice = variant ? Number(variant.price_adjustment) : Number(svc?.price || 0);
        const addonTotal = chosenAddons.reduce((s: number, a: any) => s + Number(a.price), 0);
        return {
          service_id: item.serviceId,
          service_name: svc?.name || "",
          variant_id: variant?.id || null,
          variant_name: variant?.name || null,
          addons: chosenAddons.map((a: any) => ({ id: a.id, name: a.name, price: Number(a.price) })),
          price: basePrice + addonTotal,
        };
      });

      const totalPrice = cartData.reduce((s, i) => s + i.price, 0);
      const serviceNameSummary = cartData.map(i => i.variant_name ? `${i.service_name} (${i.variant_name})` : i.service_name).join(", ");
      // Use first service for legacy single-service columns (for display compat)
      const first = cartData[0];

      const bookingPayload = {
        client_id: resolvedClientId,
        service_id: first.service_id,
        staff_id: validated.staff_id || null,
        client_name: resolvedClientName || null,
        client_phone: resolvedClientPhone || null,
        client_email: resolvedClientEmail || null,
        service_name: serviceNameSummary,
        staff_name: selectedStaffMember?.name || null,
        price: totalPrice || null,
        preferred_date: validated.preferred_date,
        preferred_time: validated.preferred_time,
        status: validated.status || "pending",
        notes: validated.notes || null,
        variant_id: first.variant_id,
        variant_name: first.variant_name,
        selected_addons: first.addons,
        services_cart: cartData,
        duration_minutes: 0,
      };

      if (editingBookingId) {
        const { error } = await supabase.from("bookings").update(bookingPayload as any).eq("id", editingBookingId);
        if (error) throw error;
        toast.success("Booking updated");
      } else {
        const ref = `ZB${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2,5).toUpperCase()}`;
        const { data: newBookingData, error } = await supabase.from("bookings").insert([{ ...bookingPayload, booking_ref: ref, deposit_amount: (settings as any)?.deposit_amount ?? 50, deposit_paid: false }] as any).select("id").single();
        if (error) throw error;
        // Booking succeeded — now create/find client and update booking
        if (clientMode === "new") {
          try {
            const clientId = await findOrCreateClient({
              name: resolvedClientName, phone: resolvedClientPhone,
              email: resolvedClientEmail || null,
            });
            if (clientId && newBookingData?.id) {
              await supabase.from("bookings").update({ client_id: clientId } as any).eq("id", newBookingData.id);
            }
            supabase.from("clients").select("id, name, email, phone").order("name").then(({ data }) => { if (data) setClients(data); });
          } catch (clientErr) { console.warn("Client post-create failed (booking saved):", clientErr); }
        }
        toast.success(cartData.length > 1 ? `Booking created — ${cartData.length} services` : "Booking created");

        // Now that booking succeeded, create the new client if deferred
        if (deferredNewClient) {
          const { findOrCreateClient } = await import("@/lib/clientDedup");
          const newClientId = await findOrCreateClient(deferredNewClient);
          if (newClientId) {
            // Link client to booking
            await supabase.from("bookings").update({ client_id: newClientId } as any).eq("booking_ref", ref);
            resolvedClientId = newClientId;
          }
          supabase.from("clients").select("id, name, email, phone").order("name").then(({ data }) => { if (data) setClients(data); });
        }

        // SMS notification to client
        if (bookingPayload.client_phone) {
          const dateLabel = bookingPayload.preferred_date ? new Date(bookingPayload.preferred_date + "T12:00:00").toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "long" }) : bookingPayload.preferred_date;
          sendSMS(bookingPayload.client_phone, SMS.bookingReceived(
            bookingPayload.client_name || "Valued Client",
            bookingPayload.service_name || cartData.map((s: any) => s.service_name).join(", ") || "service",
            dateLabel || "",
            bookingPayload.preferred_time || "",
            ref,
            false, // admin-created bookings don't have deposit by default
          )).catch(console.error);
        }
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
    setServiceCart([]); setSvcSearch(""); setSvcCat("all");
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
            duration_minutes: 0,
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

      if (newStatus === "confirmed") {
        const bk = bookings.find(b => b.id === bookingId);
        if (bk?.client_phone) {
          const dateLabel = bk.preferred_date ? new Date(bk.preferred_date + "T12:00:00").toLocaleDateString("en-GH", { weekday: "short", day: "numeric", month: "long" }) : bk.preferred_date;
          // Format time as HH:MM only (strip seconds)
          const confirmTime = (bk.preferred_time || "").slice(0, 5);
          sendSMS(bk.client_phone, SMS.bookingConfirmed(
            bk.client_name || "Valued Client",
            bk.service_name || "service",
            bk.preferred_date || "",
            confirmTime,
            bk.staff_name || "our team",
            bk.booking_ref || bookingId.slice(0,8).toUpperCase(),
          )).catch(console.error);
        }
      }
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
      const ids = Array.from(selectedBookings);
      const { error } = await supabase
        .from("bookings")
        .update({ status: "completed" })
        .in("id", ids);
      if (error) throw error;

      // Award loyalty points for each completed booking
      const { data: completedBks } = await supabase
        .from("bookings")
        .select("client_id, price, clients(loyalty_points, total_spent, total_visits)")
        .in("id", ids);
      for (const bk of (completedBks || [])) {
        const clientId = (bk as any).client_id;
        if (!clientId) continue;
        const cl = (bk as any).clients;
        const fullPrice = Number((bk as any).price || 0);
        const stampsEarned = Math.floor(fullPrice / 100);
        await supabase.from("clients" as any).update({
          loyalty_points: (cl?.loyalty_points || 0) + stampsEarned,
          total_spent: (cl?.total_spent || 0) + fullPrice,
          total_visits: (cl?.total_visits || 0) + 1,
        }).eq("id", clientId);
      }

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
      <style>{`
        .booking-dialog {
          max-height: 90vh;
          overflow-y: auto;
          overflow-x: hidden;
        }
        @media (max-width: 640px) {
          [data-radix-dialog-content].booking-dialog {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            transform: none !important;
            translate: none !important;
          }
        }
      `}</style>
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
          <DialogContent className="booking-dialog" style={{padding:"0"}}>
            <div style={{position:"sticky",top:0,background:"#fff",zIndex:10,padding:"20px 24px 14px",borderBottom:"1px solid #F0EAE2"}}>
              <h2 style={{fontSize:"18px",fontWeight:700,margin:0}}>{editingBookingId ? "Update Booking" : "Create New Booking"}</h2>
            </div>
            <div style={{padding:"16px 24px 32px"}}>
              <form onSubmit={(e) => handleSubmit(e)} style={{display:"flex",flexDirection:"column",gap:"16px"}}>

              {/* ── CLIENT ── */}
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <Label>Client</Label>
                  <button type="button" onClick={() => setClientMode(clientMode === "search" ? "new" : "search")}
                    style={{fontSize:"12px",color:"#8B6914",fontWeight:700,textDecoration:"underline",background:"none",border:"none",cursor:"pointer"}}>
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
                  <div style={{borderRadius:"8px",border:"1px solid #FCD34D",background:"#FFFBEB",padding:"12px",display:"flex",flexDirection:"column",gap:"8px"}}>
                    <p style={{fontSize:"10px",fontWeight:700,color:"#92400E",margin:0,letterSpacing:"0.1em"}}>NEW CLIENT</p>
                    <Input placeholder="Full name *" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
                    <Input placeholder="Phone * (e.g. 0594365314)" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} />
                    <Input placeholder="Email (optional)" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} />
                    <p style={{fontSize:"11px",color:"#6B7280",margin:0}}>Existing phone will match automatically.</p>
                  </div>
                )}
              </div>

              {/* ── SERVICES (multi-select with cart) ── */}
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                <Label>Services <span style={{fontSize:"11px",fontWeight:400,color:"#A8A29E"}}>(select one or more)</span></Label>

                {/* Category tabs */}
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                  {["all", ...Array.from(new Set(services.map(s=>s.category).filter(Boolean)))].map(cat => (
                    <button key={cat} type="button" onClick={()=>setSvcCat(cat)}
                      style={{padding:"3px 12px",borderRadius:"20px",fontSize:"11px",fontWeight:600,cursor:"pointer",border:"1.5px solid",
                        borderColor: svcCat===cat ? "#8B6914" : "#E5DDD3",
                        background: svcCat===cat ? "#8B6914" : "white",
                        color: svcCat===cat ? "white" : "#78716C"}}>
                      {cat==="all"?"All":cat}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <input value={svcSearch} onChange={e=>setSvcSearch(e.target.value)}
                  placeholder="Search services…"
                  style={{border:"1.5px solid #E5DDD3",borderRadius:"8px",padding:"8px 12px",fontSize:"13px",outline:"none",width:"100%"}} />

                {/* Service list */}
                <div style={{maxHeight:"180px",overflowY:"auto",border:"1px solid #E5DDD3",borderRadius:"8px",display:"flex",flexDirection:"column"}}>
                  {services
                    .filter(s => (svcCat==="all" || s.category===svcCat) && (!svcSearch || s.name.toLowerCase().includes(svcSearch.toLowerCase())))
                    .map(s => {
                      const vars = allVariantsMap[s.id]||[];
                      const prices = vars.map(v=> Number(v.price_adjustment));
                      const priceLabel = vars.length===0
                        ? (base>0?`GHS ${base.toLocaleString()}`:"")
                        : prices.length===1?`GHS ${prices[0].toLocaleString()}`
                        : `GHS ${Math.min(...prices).toLocaleString()} – ${Math.max(...prices).toLocaleString()}`;
                      const inCart = serviceCart.some(c=>c.serviceId===s.id);
                      return (
                        <button key={s.id} type="button"
                          onClick={() => inCart ? removeServiceFromCart(s.id) : addServiceToCart(s.id)}
                          style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",textAlign:"left",
                            borderBottom:"1px solid #F0EAE2",background:inCart?"#FBF6EE":"white",
                            borderLeft: inCart?"3px solid #C8A97E":"3px solid transparent",
                            cursor:"pointer",transition:"all 0.1s"}}>
                          <div>
                            <p style={{fontSize:"13px",fontWeight:600,color:"#1C160E",margin:0}}>{s.name}</p>
                            <p style={{fontSize:"11px",color:"#A8A29E",margin:"2px 0 0"}}>{s.category}</p>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}>
                            <span style={{fontSize:"12px",fontWeight:700,color:"#8B6914"}}>{priceLabel}</span>
                            <span style={{width:"18px",height:"18px",borderRadius:"50%",border:`2px solid ${inCart?"#C8A97E":"#D1C5B8"}`,
                              background:inCart?"#C8A97E":"white",display:"flex",alignItems:"center",justifyContent:"center",
                              fontSize:"10px",color:"white",fontWeight:700,flexShrink:0}}>
                              {inCart?"✓":""}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* ── CART: variants + addons per selected service ── */}
              {serviceCart.map(item => {
                const svc = services.find(s=>s.id===item.serviceId);
                if (!svc) return null;
                return (
                  <div key={item.serviceId} style={{border:"1.5px solid #E5DDD3",borderRadius:"10px",overflow:"hidden"}}>
                    {/* Cart item header */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#FBF6EE",borderBottom:"1px solid #F0EAE2"}}>
                      <p style={{margin:0,fontSize:"13px",fontWeight:700,color:"#1C160E"}}>{svc.name}</p>
                      <button type="button" onClick={()=>removeServiceFromCart(item.serviceId)}
                        style={{background:"none",border:"none",cursor:"pointer",color:"#A8A29E",fontSize:"16px",lineHeight:1}}>✕</button>
                    </div>

                    {/* Variants */}
                    {item.variants.length > 0 && (
                      <div style={{padding:"10px 14px",borderBottom: item.addons.length>0?"1px solid #F0EAE2":"none"}}>
                        <p style={{fontSize:"10px",fontWeight:700,letterSpacing:"0.12em",color:"#8B6914",margin:"0 0 8px",textTransform:"uppercase"}}>
                          Size / Length <span style={{color:"#EF4444"}}>*</span>
                        </p>
                        <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                          {item.variants.map(v=>(
                            <button key={v.id} type="button" onClick={()=>setCartVariant(item.serviceId, v.id)}
                              style={{padding:"6px 12px",borderRadius:"8px",border:"1.5px solid",cursor:"pointer",transition:"all 0.1s",
                                borderColor:item.variantId===v.id?"#8B6914":"#E5DDD3",
                                background:item.variantId===v.id?"#8B6914":"white",
                                color:item.variantId===v.id?"white":"#1C160E"}}>
                              <span style={{fontSize:"12px",fontWeight:600,display:"block"}}>{v.name}</span>
                              <span style={{fontSize:"11px",fontWeight:700,display:"block",color:item.variantId===v.id?"rgba(255,255,255,0.8)":"#8B6914"}}>{`GHS ${Number(v.price_adjustment).toLocaleString()}`}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add-ons */}
                    {item.addons.length > 0 && (
                      <div style={{padding:"10px 14px"}}>
                        <p style={{fontSize:"10px",fontWeight:700,letterSpacing:"0.12em",color:"#7C3AED",margin:"0 0 8px",textTransform:"uppercase"}}>Add-ons (optional)</p>
                        <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                          {item.addons.map(a=>{
                            const checked=item.addonIds.includes(a.id);
                            return (
                              <button key={a.id} type="button" onClick={()=>toggleCartAddon(item.serviceId, a.id)}
                                style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",
                                  borderRadius:"8px",border:"1.5px solid",cursor:"pointer",transition:"all 0.1s",textAlign:"left",
                                  borderColor:checked?"#A78BFA":"#E5DDD3",background:checked?"#F5F3FF":"white"}}>
                                <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                                  <div style={{width:"15px",height:"15px",borderRadius:"4px",border:`2px solid ${checked?"#7C3AED":"#D1C5B8"}`,
                                    background:checked?"#7C3AED":"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                                    {checked&&<span style={{color:"white",fontSize:"9px",fontWeight:700}}>✓</span>}
                                  </div>
                                  <span style={{fontSize:"12px",fontWeight:600,color:"#1C160E"}}>{a.name}</span>
                                </div>
                                <span style={{fontSize:"12px",fontWeight:700,color:checked?"#7C3AED":"#A8A29E",marginLeft:"8px",flexShrink:0}}>+GHS {Number(a.price).toLocaleString()}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── PRICE TOTAL ── */}
              {serviceCart.length > 0 && (
                <div style={{background:"#F9FAFB",border:"1px solid #E5DDD3",borderRadius:"10px",padding:"12px 16px"}}>
                  {serviceCart.map(item=>{
                    const svc=services.find(s=>s.id===item.serviceId);
                    const variant=item.variants.find(v=>v.id===item.variantId);
                    const base=variant?Number(variant.price_adjustment):Number(svc?.price||0);
                    const adds=item.addons.filter(a=>item.addonIds.includes(a.id)).reduce((s:number,a:any)=>s+Number(a.price),0);
                    if (!svc) return null;
                    return (
                      <div key={item.serviceId} style={{display:"flex",justifyContent:"space-between",fontSize:"12px",marginBottom:"4px"}}>
                        <span style={{color:"#78716C"}}>{svc.name}{variant?` · ${variant.name}`:""}</span>
                        <span style={{fontWeight:600,color:"#1C160E"}}>GHS {(base+adds).toLocaleString()}</span>
                      </div>
                    );
                  })}
                  <div style={{borderTop:"1px solid #E5DDD3",marginTop:"8px",paddingTop:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:"12px",fontWeight:700,color:"#78716C",letterSpacing:"0.1em"}}>TOTAL</span>
                    <span style={{fontSize:"20px",fontWeight:700,color:"#8B6914"}}>GHS {serviceCart.reduce((total,item)=>{
                      const svc=services.find(s=>s.id===item.serviceId);
                      const variant=item.variants.find(v=>v.id===item.variantId);
                      const base=variant?Number(variant.price_adjustment):Number(svc?.price||0);
                      const adds=item.addons.filter(a=>item.addonIds.includes(a.id)).reduce((s:number,a:any)=>s+Number(a.price),0);
                      return total+base+adds;
                    },0).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* ── STAFF ── */}
              <div>
                <Label>Staff</Label>
                <Select value={formData.staff_id || ""} onValueChange={(value) => setFormData({ ...formData, staff_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Assign staff (optional)" /></SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}{absentStaffIds.has(s.id) ? " ⚠️ Absent" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ── DATE & TIME ── */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
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
                        <SelectItem value="">No times available</SelectItem>
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
                {creating ? "Creating…" : editingBookingId ? "Update Booking" : `Create Booking${serviceCart.length > 1 ? ` (${serviceCart.length} services)` : ""}`}
              </Button>
            </form>
            </div>
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

      {/* ── KPI STRIP ─────────────────────────────────── */}
      {(() => {
        const today = new Date().toISOString().slice(0,10);
        const todayBks = allBookings.filter((b: any) => b.preferred_date === today);
        const confirmed = todayBks.filter((b: any) => b.status === "confirmed").length;
        const pending = todayBks.filter((b: any) => b.status === "pending").length;
        const completed = todayBks.filter((b: any) => b.status === "completed").length;
        const cancelled = todayBks.filter((b: any) => b.status === "cancelled").length;
        const kpis = [
          { label: "TODAY",        value: todayBks.length, color: "#C8A97E", bg: "#FBF6EE", border: "#F0E4CC" },
          { label: "CONFIRMED",    value: confirmed,       color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
          { label: "PENDING",      value: pending,         color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
          { label: "COMPLETED",    value: completed,       color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
          { label: "CANCELLED",    value: cancelled,       color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
        ];
        return (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"12px", marginBottom:"8px" }}>
            {kpis.map(k => (
              <div key={k.label} style={{ background:k.bg, border:`1px solid ${k.border}`, borderRadius:"14px", padding:"16px 18px" }}>
                <p style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.1em", color:k.color, marginBottom:"6px" }}>{k.label}</p>
                <p style={{ fontSize:"28px", fontWeight:700, color:"#1C160E", margin:0, fontFamily:"'Cormorant Garamond',serif" }}>{k.value}</p>
              </div>
            ))}
          </div>
        );
      })()}

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

    </div>
  );
};

export default Bookings;