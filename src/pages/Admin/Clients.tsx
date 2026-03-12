import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhone } from "@/lib/clientDedup";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Mail,
  Phone,
  Trash,
  Pencil,
  Trash2,
  CalendarClock,
  TrendingUp,
} from "lucide-react";
import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";
import PhoneInput from "@/lib/phoneInput";
import { AvatarUpload } from "@/components/AvatarUpload";
import { CollapsibleSearchBar } from "@/components/SearchBar";

const clientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name too long"),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number format"),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email too long")
    .optional()
    .or(z.literal("")),
  address: z.string().max(500, "Address too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
  image: z.union([z.instanceof(File), z.null()]).optional(),
});

// Small stat tile used in profile dialog
const Stat = ({ label, value }: { label: string; value: () => string }) => {
  return (
    <div className="p-3 bg-cream dark:bg-gray-800 rounded-lg">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-semibold mt-1">{value()}</p>
    </div>
  );
};

const Clients = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  const [showServiceList, setShowServiceList] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    | "none"
    | "date"
    | "most_active"
    | "service_history"
    | "search"
    | "last_visit"
    | "most_frequent"
    | "highest_spenders"
    | "inactive_60"
    | "inactive_90"
  >("none");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [page, setPage] = useState(1); // current page
  const [pageSize, setPageSize] = useState(20); // items per page
  const [totalClients, setTotalClients] = useState(0);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const totalPages = Math.ceil(totalClients / pageSize);

  const [formData, setFormData] = useState<any>({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    image: null, // NEW
  });

  useEffect(() => {
    fetchClients();
    fetchUserRole();
    fetchServices();
  }, []);

  /** Fetch Logged-in User Role */
  const fetchUserRole = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const metaDataRole = user.user_metadata.role;

      setUserRole(roleData?.role || metaDataRole);
    } catch (err: any) {
      console.error(err);
      toast.error("Unable to fetch user role");
    }
  };

  const fetchClients = async (pageNumber = page) => {
    try {
      setLoading(true);

      const from = (pageNumber - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await supabase
        .from("clients")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      setClients(data || []);
      setFilteredClients(data || []);
      setTotalClients(count || 0);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      setServicesLoading(true);
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("category")
        .order("order", { ascending: true });
      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to fetch services");
    } finally {
      setServicesLoading(false);
      setLoading(false);
    }
  };

  const fetchClientActivity = async () => {
    const { data, error } = await supabase.from("bookings").select("client_id");

    if (error) {
      console.error("Activity fetch error:", error);
      return {};
    }

    const counts: Record<string, number> = {};

    data.forEach((b: any) => {
      counts[b.client_id] = (counts[b.client_id] || 0) + 1;
    });

    return counts;
  };

  const handleFilterByDate = () => {
    const filtered = clients.filter(c => {
      const d = c.created_at?.slice(0,10);
      return d >= startDate && d <= endDate;
    });
    setFilteredClients(filtered);
    setActiveFilter("date");
  };

  const handleMostActiveClient = () => {
    const sorted = [...clients].sort((a,b) => (b.total_visits||0) - (a.total_visits||0));
    setFilteredClients(sorted);
    setActiveFilter("most_active");
  };

  const handleServiceHistory = (serviceName: string) => {
    setActiveFilter("service_history");
    setShowServiceList(false);
  };

  const clearFilters = () => {
    setFilteredClients(clients);
    setActiveFilter("none");
    setSearchTerm("");
    setSearchResults(null);
  };

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = clientSchema.parse(formData);
      const clientData: any = {
        name: validated.name,
        phone: normalizePhone(validated.phone),
        ...(validated.email && { email: validated.email.toLowerCase().trim() }),
        ...(validated.notes && { notes: validated.notes }),
      };

      if (validated.image) {
        setUploading(true);
        const fileExtension = validated.image.name.split(".").pop();
        const uniqueId = editingClientId || Date.now();
        const fileName = `client-${uniqueId}.${fileExtension}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars").upload(fileName, validated.image, { cacheControl: "3600", upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
        clientData.avatar_url = urlData.publicUrl;
        setUploading(false);
      }

      if (editingClientId) {
        const { error } = await supabase.from("clients").update(clientData).eq("id", editingClientId);
        if (error) throw error;
        toast.success("Client updated successfully");
      } else {
        // Dedup check before insert
        const dupeChecks = [];
        if (clientData.phone) {
          const local = clientData.phone.startsWith("+233") ? "0" + clientData.phone.slice(4) : clientData.phone;
          dupeChecks.push(supabase.from("clients").select("id,name").in("phone", [clientData.phone, local]).limit(1).maybeSingle());
        }
        if (clientData.email) {
          dupeChecks.push(supabase.from("clients").select("id,name").ilike("email", clientData.email).limit(1).maybeSingle());
        }
        if (dupeChecks.length > 0) {
          const results = await Promise.all(dupeChecks);
          const dupe = results.find(r => r.data)?.data;
          if (dupe) {
            toast.error(`A client with this phone or email already exists: ${dupe.name}`);
            setUploading(false);
            return;
          }
        }
        const { error } = await supabase.from("clients").insert([clientData]);
        if (error) throw error;
        toast.success("Client added successfully");
      }

      setDialogOpen(false);
      setEditingClientId(null);
      setFormData({ name: "", phone: "", email: "", address: "", notes: "", image: null });
      fetchClients();
    } catch (error: any) {
      if (error?.errors?.[0]?.message) toast.error(error.errors[0].message);
      else toast.error(error.message || "Failed to save client");
      setUploading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!deleteClientId) return;

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", deleteClientId);

      if (error) throw error;

      toast.success("Client deleted successfully");
      setClients(prev => prev.filter(c => c.id !== deleteClientId));
      setFilteredClients(prev => prev.filter(c => c.id !== deleteClientId));
    } catch (error: any) {
      toast.error(error.message || "Failed to delete client");
    } finally {
      setDeleteDialogOpen(false);
      setDeleteClientId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="z-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="z-title" style={{ fontFamily:"'Cormorant Garamond', serif" }}>Clients</h1>
          <p className="z-subtitle">Manage your clients</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md grid gap-4 p-6">
            <DialogHeader>
              <DialogTitle>
                {!editingClientId ? "Add New Client" : "Update Client Details"}
              </DialogTitle>
            </DialogHeader>
            <AvatarUpload
              image={formData.image}
              onChange={(file) => setFormData({ ...formData, image: file })}
            />

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <PhoneInput
                value={formData.phone}
                onChange={(v) => setFormData({ ...formData, phone: v })}
              />
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="Client address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes about client"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="w-full">
                {uploading
                  ? "Loading..."
                  : !editingClientId
                  ? "Add Client"
                  : "Update Client"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-sm grid gap-4 p-6">
            <DialogHeader>
              <DialogTitle>Delete client</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will permanently delete the client and all their data. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteClient}>
                Delete permanently
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        {/* Left: Search */}
        <div className="w-full sm:w-1/2">
          <CollapsibleSearchBar
            data={clients}
            placeholder="Search clients..."
            onSearchResults={(results) => {
              setSearchResults(results);
              setActiveFilter("search");
            }}
          />
        </div>

        {/* Right: Filters */}
        <div className="w-full sm:w-auto flex items-center justify-end">
          {/* Mobile: toggleable filters panel */}
          <Button
            className="sm:hidden"
            variant={showFiltersMobile ? "default" : "outline"}
            onClick={() => setShowFiltersMobile((s) => !s)}
          >
            Filters
          </Button>

          {/* Desktop filters (hidden on small screens) */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 text-sm"
                aria-label="Start date"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 text-sm"
                aria-label="End date"
              />
              <Button
                onClick={handleFilterByDate}
                variant={activeFilter === "date" ? "default" : "outline"}
                className="whitespace-nowrap"
              >
                <CalendarClock className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button onClick={clearFilters} variant={"ghost"} className="ml-2">
                Clear
              </Button>
            </div>

            <Button
              onClick={handleMostActiveClient}
              variant={activeFilter === "most_active" ? "default" : "ghost"}
            >
              <TrendingUp className="w-4 h-4 mr-2" /> Most Active
            </Button>

            {/* Smart Filters */}
            <div>
              <Select
                value={activeFilter}
                onValueChange={(v) => setActiveFilter(v as any)}
              >
                <SelectTrigger className="w-44 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All</SelectItem>
                  <SelectItem value="last_visit">Last Visit</SelectItem>
                  <SelectItem value="most_frequent">Most Frequent</SelectItem>
                  <SelectItem value="highest_spenders">
                    Highest Spenders
                  </SelectItem>
                  <SelectItem value="inactive_60">
                    Inactive (60 days)
                  </SelectItem>
                  <SelectItem value="inactive_90">
                    Inactive (90 days)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* small spinner while filtering */}
            {filtering && (
              <div className="flex items-center">
                <div className="ml-2 w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Service History Dropdown (desktop) */}
            <div className="relative w-auto">
              <Button
                onClick={() => setShowServiceList(!showServiceList)}
                variant={
                  activeFilter === "service_history" ? "default" : "outline"
                }
                className="w-auto flex items-center gap-2"
              >
                {servicesLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                ) : null}
                <span>{selectedService || "Service History"}</span>
              </Button>

              {showServiceList && (
                <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl z-50">
                  <div
                    className="
                    p-2
                    max-h-64
                    overflow-y-auto
                    overscroll-contain
                    scrollbar-thin
                    scrollbar-thumb-gray-400
                    scrollbar-track-gray-200
                    dark:scrollbar-thumb-gray-600
                    dark:scrollbar-track-gray-800
                  "
                  >
                    {servicesLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      services.map((service: any) => (
                        <button
                          key={service.id}
                          onClick={() => handleServiceHistory(service.name)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm rounded-md transition"
                        >
                          {service.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile filters panel (shown when toggled) */}
          {showFiltersMobile && (
            <div className="sm:hidden mt-3 w-full p-3 space-y-3 border rounded-lg bg-white/70 dark:bg-gray-900/60">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 text-sm"
                    aria-label="Start date"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 text-sm"
                    aria-label="End date"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleFilterByDate}
                    variant={activeFilter === "date" ? "default" : "outline"}
                    className="flex-1"
                  >
                    <CalendarClock className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                  <Button
                    onClick={clearFilters}
                    variant={"ghost"}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                </div>

                <Button
                  onClick={handleMostActiveClient}
                  variant={
                    activeFilter === "most_active" ? "default" : "outline"
                  }
                  className="w-full"
                >
                  <TrendingUp className="w-4 h-4 mr-2" /> Most Active
                </Button>

                <div>
                  <label className="block text-sm mb-1">Quick Filters</label>
                  <div className="mb-2">
                    <Select
                      value={activeFilter}
                      onValueChange={(v) => setActiveFilter(v as any)}
                    >
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">All</SelectItem>
                        <SelectItem value="last_visit">Last Visit</SelectItem>
                        <SelectItem value="most_frequent">
                          Most Frequent
                        </SelectItem>
                        <SelectItem value="highest_spenders">
                          Highest Spenders
                        </SelectItem>
                        <SelectItem value="inactive_60">
                          Inactive (60 days)
                        </SelectItem>
                        <SelectItem value="inactive_90">
                          Inactive (90 days)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="block text-sm mb-1">Service History</label>
                  <div className="flex flex-col gap-2">
                    {services.map((service: any) => (
                      <button
                        key={service.id}
                        onClick={() => handleServiceHistory(service.name)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm rounded-md transition"
                      >
                        {service.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="z-page">
        {/* Client Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px", alignItems: "stretch" }}>
          {filteredClients.map((client) => {
            const s = new Date(`${startDate}T00:00:00`);
            const e = new Date(`${endDate}T23:59:59`);
            const bookingsInRange = (client.bookings || []).filter((b: any) => {
              return bookingInRange(b?.preferred_date, s, e);
            });
            const bookingsCount =
              bookingsInRange.length || (client.bookings || []).length;
            const lastBooking = (client.bookings || []).reduce(
              (latest: any, b: any) => {
                if (!b?.preferred_date) return latest;
                if (!latest) return b.preferred_date;
                return new Date(b.preferred_date) > new Date(latest)
                  ? b.preferred_date
                  : latest;
              },
              null as any
            );

            const isVip = client.totalSpent > 5000 || client.visitsCount > 10;
            const isNew = client.visitsCount === 0;
            const isRisk = client.noShowCount >= 3;

            return (
              <div
                key={client.id}
                onClick={() => { setSelectedClient(client); setProfileOpen(true); }}
                style={{
                  background: "#fff", borderRadius: "16px", border: "1px solid #EDE8E0",
                  boxShadow: "0 2px 16px rgba(28,22,14,0.06)", cursor: "pointer",
                  transition: "all 0.2s ease", overflow: "hidden",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(28,22,14,0.12)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 16px rgba(28,22,14,0.06)"; }}
              >
                {/* Gold accent bar */}
                <div style={{ height: "3px", background: isVip ? "linear-gradient(90deg, #8B6914, #C8A97E, #FFD700)" : "linear-gradient(90deg, #8B6914, #C8A97E)" }} />
                <div style={{ padding: "20px 20px 16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "14px" }}>
                    <div style={{ width: "50px", height: "50px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "2px solid #C8A97E", boxShadow: "0 0 0 3px rgba(200,169,126,0.12)" }}>
                      {client.image ? (
                        <img src={client.image} alt={client.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #8B6914, #C8A97E)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond',serif", fontSize: "18px", fontWeight: 700, color: "#fff" }}>
                          {client.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                        <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "17px", fontWeight: 700, color: "#1C160E" }}>{client.name}</span>
                        {isVip && <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", padding: "2px 7px", borderRadius: "10px", background: "rgba(200,169,126,0.15)", color: "#8B6914", border: "1px solid rgba(200,169,126,0.3)" }}>VIP</span>}
                        {isNew && <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", padding: "2px 7px", borderRadius: "10px", background: "rgba(59,130,246,0.1)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)" }}>NEW</span>}
                        {isRisk && <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", padding: "2px 7px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>AT RISK</span>}
                      </div>
                      {client.phone && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Phone style={{ width: "11px", height: "11px", color: "#C8A97E", flexShrink: 0 }} />
                          <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "#78716C" }}>{client.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                    {[
                      { label: "VISITS", value: bookingsCount || client.total_visits || 0 },
                      { label: "SPENT", value: `GHS ${(client.total_spent || 0).toLocaleString()}` },
                      { label: "POINTS", value: client.loyalty_points || 0 },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: "#F8F3EC", borderRadius: "8px", padding: "8px 10px", textAlign: "center" }}>
                        <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.14em", color: "#A8A29E", marginBottom: "3px" }}>{label}</div>
                        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "15px", fontWeight: 700, color: "#1C160E" }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {lastBooking && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingTop: "10px", borderTop: "1px solid #F0EBE2" }}>
                      <CalendarClock style={{ width: "11px", height: "11px", color: "#C8A97E" }} />
                      <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", color: "#78716C" }}>Last visit: {format(new Date(lastBooking), "MMM d, yyyy")}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Profile Dialog */}
          <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
            <DialogContent className="max-w-3xl grid gap-4 p-6">
              <DialogHeader>
                <DialogTitle>
                  {selectedClient ? selectedClient.name : "Client Profile"}
                </DialogTitle>
              </DialogHeader>

              {selectedClient && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-2xl font-semibold text-white bg-gradient-to-br from-green-500 to-teal-500">
                        {selectedClient.image ? (
                          <img
                            src={selectedClient.image}
                            alt={selectedClient.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (selectedClient.name || "")
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                        )}
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold">
                          {selectedClient.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedClient.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedClient.phone}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm text-gray-600">
                        Notes
                      </h4>
                      <p className="mt-2 text-sm text-gray-800">
                        {selectedClient.notes || "No notes"}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm text-gray-600">
                        Contact & Address
                      </h4>
                      <p className="mt-1 text-sm">
                        {selectedClient.address || "No address"}
                      </p>
                    </div>
                  </div>

                  {/* Middle: service history */}
                  <div className="md:col-span-2">
                    <h4 className="text-lg font-semibold mb-3">
                      Service History
                    </h4>

                    <div className="space-y-3 max-h-72 overflow-auto">
                      {(selectedClient.bookings || [])
                        .slice()
                        .sort(
                          (a: any, b: any) =>
                            new Date(b.preferred_date).getTime() -
                            new Date(a.preferred_date).getTime()
                        )
                        .map((b: any) => (
                          <div
                            key={b.id}
                            className="flex justify-between items-center p-3 rounded-lg border bg-white/50 dark:bg-gray-900/40"
                          >
                            <div>
                              <div className="text-sm font-medium">
                                {b.services?.name || "Service"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {b.staff?.name ||
                                  b.staff?.name ||
                                  "Unassigned"}{" "}
                                •{" "}
                                {b.preferred_date
                                  ? format(new Date(b.preferred_date), "PPP")
                                  : "Date N/A"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                GH₵{Number(b.services?.price || 0).toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {b.status || "-"}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Summary stats */}
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <Stat
                        label="Total Spent"
                        value={() => {
                          const total = (selectedClient.bookings || []).reduce(
                            (sum: number, bk: any) => {
                              // count only completed bookings as spent
                              if (bk.status && bk.status !== "completed")
                                return sum;
                              return sum + Number(bk.services?.price || 0);
                            },
                            0
                          );
                          return `GH₵${total.toFixed(2)}`;
                        }}
                      />

                      <Stat
                        label="Preferred Staff"
                        value={() => {
                          const counts: Record<
                            string,
                            { name: string; count: number }
                          > = {};
                          (selectedClient.bookings || []).forEach((bk: any) => {
                            const name =
                              bk.staff?.name ||
                              bk.staff?.name ||
                              "Unassigned";
                            if (!name) return;
                            counts[name] = counts[name] || { name, count: 0 };
                            counts[name].count += 1;
                          });
                          const top = Object.values(counts).sort(
                            (a, b) => b.count - a.count
                          )[0];
                          return top ? `${top.name} (${top.count})` : "N/A";
                        }}
                      />

                      <Stat
                        label="Visits"
                        value={() =>
                          `${(selectedClient.bookings || []).length}`
                        }
                      />

                      <Stat
                        label="Avg Frequency"
                        value={() => {
                          const dates = (selectedClient.bookings || [])
                            .map((bk: any) => bk.preferred_date)
                            .filter(Boolean)
                            .map((d: string) => new Date(d))
                            .sort(
                              (a: Date, b: Date) => a.getTime() - b.getTime()
                            );
                          if (dates.length < 2) return "N/A";
                          const diffs: number[] = [];
                          for (let i = 1; i < dates.length; i++) {
                            const days =
                              (dates[i].getTime() - dates[i - 1].getTime()) /
                              (1000 * 60 * 60 * 24);
                            diffs.push(days);
                          }
                          const avg =
                            diffs.reduce((s, v) => s + v, 0) / diffs.length;
                          return `${Math.round(avg)} days`;
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* No-match placeholder when filters applied but nothing matches */}
          {filteredClients.length === 0 && clients.length > 0 && (
            <Card className="col-span-full border-gray-200 dark:border-gray-700 rounded-2xl shadow-md bg-gradient-to-b from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-900/60 backdrop-blur-md">
              <CardContent className="text-center py-16">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  No clients match the current filters. Try clearing filters or
                  expanding the date range.
                </p>
              </CardContent>
            </Card>
          )}

          {/* No clients placeholder */}
          {clients.length === 0 && (
            <Card className="col-span-full border-gray-200 dark:border-gray-700 rounded-2xl shadow-md bg-gradient-to-b from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-900/60 backdrop-blur-md">
              <CardContent className="text-center py-16">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  No clients yet. Add your first client!
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            disabled={page === 1}
            onClick={() => {
              fetchClients(page - 1);
              setPage(page - 1);
            }}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Prev
          </button>
          <span className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => {
              fetchClients(page + 1);
              setPage(page + 1);
            }}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Clients;
