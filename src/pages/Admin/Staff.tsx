import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Mail, Phone, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSettings } from "@/context/SettingsContext";
import { useCatalog } from "@/context/CatalogContext";
import { z } from "zod";
import PhoneInput from "@/lib/phoneInput";
import { AvatarUpload } from "@/components/AvatarUpload";
import {
  fetchSpecializations,
  fetchStaffWithDetails,
  assignServicesToStaff,
  getServicesForStaff,
  addWorkingHours,
  getWorkingHours,
  addOffDay,
  getOffDays,
  setStaffStatus,
  deleteOffDay,
} from "@/lib/staff";
import { formatTo12Hour, timeToMinutes } from "@/lib/time";

// Schema for validation
const staffSchema = z.object({
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
  emergency_contact: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, "Invalid emergency contact format")
    .optional()
    .or(z.literal("")),
  // allow arbitrary role strings (managed via Settings) rather than a strict enum
  role: z.string().min(1, "Role is required"),
  image: z.union([z.instanceof(File), z.null()]).optional(),
});

const Staff = () => {
  const { settings } = useSettings();
  const catalog = useCatalog();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStaffId, setDeleteStaffId] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginStaff, setLoginStaff] = useState<any>(null);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    specialization: "",
    role: "staff",
    is_active: true,
    image: null as File | string | null,
    emergency_contact: "",
  });
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [assignedServices, setAssignedServices] = useState<string[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [workingHours, setWorkingHours] = useState<any[]>([]);
  const [offDays, setOffDays] = useState<any[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [staffBookings, setStaffBookings] = useState<any[]>([]);
  const [staffAttendance, setStaffAttendance] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [staffRatings, setStaffRatings] = useState<
    Record<string, number | null>
  >({});

  // Specializations list (if you have a settings-managed list use it, otherwise fallback to empty)
  const SPECIALIZATIONS: string[] = (settings as any)?.staff_roles || [];

  useEffect(() => {
    fetchStaff();
    fetchUserRole();
    // refresh catalog in case staff list changed elsewhere
    try {
      catalog?.refreshCatalog?.();
    } catch (e) {
      /* noop */
    }
    // load specializations and services for assignment UI
    (async () => {
      try {
        const sp = await fetchSpecializations();
        if (!sp.error) setSpecializations((sp.data || []) || []);
      } catch (e) {}

      try {
        const { data, error } = await supabase.from("services").select("*").order("name");
        if (!error) setServicesList(data || []);
      } catch (e) {}
    })();
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

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .order("name");
      if (error) throw error;
      setStaff(data || []);

      // Staff ratings feature disabled - rating column doesn't exist on bookings table
      setStaffRatings({});
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const handleEditMember = (member: any) => {
    setEditingMemberId(member.id);
    setFormData({
      name: member.name,
      phone: member.phone,
      email: member.email || "",
      role: member.role || "staff",
      is_active: member.status ? member.status === "active" : member.is_active ?? true,
      image: member.image || null,
      emergency_contact: member.emergency_contact || "",
    });
    setDialogOpen(true);
  };

  const handleDeleteMember = async () => {
    if (!deleteStaffId) return;

    try {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", deleteStaffId);

      if (error) throw error;

      toast.success("Staff deleted successfully");
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete staff");
    } finally {
      setDeleteDialogOpen(false);
      setDeleteStaffId(null);
    }
  };

  // Fetch staff-related profile data (bookings and attendance)
  const fetchStaffProfile = async (staffId: string) => {
    setProfileLoading(true);
    try {
      const [bookingsRes, attendanceRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("*")
          .eq("staff_id", staffId)
          .order("preferred_date", { ascending: false }),
        supabase
          .from("attendance")
          .select("*")
          .eq("staff_id", staffId)
          .order("check_in", { ascending: false }),
      ]);

      if ((bookingsRes as any).error) throw (bookingsRes as any).error;
      if ((attendanceRes as any).error) throw (attendanceRes as any).error;

      setStaffBookings((bookingsRes as any).data || []);
      setStaffAttendance((attendanceRes as any).data || []);

      // fetch assigned services for this staff
      try {
        const svc = await getServicesForStaff(staffId);
        if (!svc.error) setAssignedServices(svc.data || []);
      } catch (e) {}

      // fetch working hours and off days
      try {
        const wh = await getWorkingHours(staffId);
        if (!wh.error) setWorkingHours(wh.data || []);
      } catch (e) {}

      try {
        const od = await getOffDays(staffId);
        if (!od.error) setOffDays(od.data || []);
      } catch (e) {}
    } catch (err: any) {
      console.error("Error fetching staff profile:", err);
      toast.error("Failed to load staff profile data");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = staffSchema.parse(formData);

      const staffData: any = {
        name: validated.name,
        phone: validated.phone,
        ...(validated.email && { email: validated.email }),
        role: validated.role,
        is_active: formData.is_active,
      };

      // Upload image if selected
      if (validated.image) {
        setUploading(true);
        const fileExtension = validated.image.name.split(".").pop();
        const uniqueId = editingMemberId || Date.now();
        const fileName = `staff-${uniqueId}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, validated.image, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        staffData.image = urlData.publicUrl;
        setUploading(false);
      }

      if (editingMemberId) {
        const { error } = await supabase
          .from("staff")
          .update(staffData)
          .eq("id", editingMemberId);

        if (error) throw error;

        // Role-sync on status change — Owner controls access, not the user
        const { data: staffRecord } = await supabase
          .from("staff").select("user_id, role").eq("id", editingMemberId).maybeSingle();

        if (staffRecord?.user_id) {
          if (!formData.is_active) {
            // Deactivated/removed: immediately revoke to client role
            await supabase.from("user_roles").upsert({ user_id: staffRecord.user_id, role: "client" });
          } else {
            // Reactivated: restore their pre-authorized staff role
            await supabase.from("user_roles").upsert({
              user_id: staffRecord.user_id,
              role: validated.role || staffRecord.role || "staff",
            });
          }
        }

        toast.success("Staff updated successfully");
      } else {
        const { error } = await supabase.from("staff").insert([staffData]);
        if (error) throw error;
        toast.success("Staff added. They can now sign up at zolarasalon.com/app/auth using this email.");
      }

      setDialogOpen(false);
      setEditingMemberId(null);
      setFormData({
        name: "",
        phone: "",
        email: "",
        specialization: "",
        role: "staff",
        is_active: true,
        image: null,
        emergency_contact: "",
      });

      fetchStaff();
      try {
        catalog.refreshCatalog();
      } catch (e) {
        /* noop */
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to save staff");
      }
      setUploading(false);
    }
  };

  const handleCreateLogin = async () => {
    if (!loginStaff?.email) { toast.error("Staff member needs an email address first."); return; }
    if (!loginPassword || loginPassword.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setLoginLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: loginStaff.email,
        password: loginPassword,
        options: { data: { role: loginStaff.role || "staff", name: loginStaff.name } }
      });
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error("No user ID returned");
      await supabase.from("user_roles").upsert({ user_id: userId, role: loginStaff.role || "staff" });
      await supabase.from("staff").update({ user_id: userId }).eq("id", loginStaff.id);
      toast.success(`Login created for ${loginStaff.name}. They'll receive a confirmation email.`);
      setLoginModalOpen(false);
      setLoginPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create login");
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="z-page">
      {/* Header and Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="z-title" style={{ fontFamily:"'Cormorant Garamond', serif" }}>Staff</h1>
          <p className="z-subtitle">Manage your salon staff</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff / Receptionist
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md grid gap-4 p-6">
            <DialogHeader>
              <DialogTitle>
                {editingMemberId ? "Edit Member" : "Add New Member"}
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
                  placeholder="Jane Smith"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
                {selectedStaff &&
                  staffRatings[selectedStaff.id] !== undefined && (
                    <p className="text-sm mt-1">
                      Avg rating:{" "}
                      {staffRatings[selectedStaff.id] !== null
                        ? Number(staffRatings[selectedStaff.id]).toFixed(2)
                        : "N/A"}
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                <PhoneInput
                  value={formData.phone}
                  onChange={(v) => setFormData({ ...formData, phone: v })}
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="staff@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>



              <div className="space-y-2">
                <Label>Emergency Contact</Label>
                <Input
                  placeholder="+233XXXXXXXXX"
                  value={formData.emergency_contact}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergency_contact: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label> 
                {/* @ts-ignore */}
                <Select //@ts-ignore
                  onValueChange={(value: string) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="onleave">On leave</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full">
                {uploading
                  ? "Loading"
                  : !editingMemberId
                  ? "Add Member"
                  : "Update Member"}{" "}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md grid gap-4 p-6">
            <DialogHeader>
              <DialogTitle>Delete staff</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete this staff? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteMember}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Staff List */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px", alignItems: "stretch" }}>
        {staff.map((member) => (
          <div
            key={member.id}
            onClick={() => {
              setSelectedStaff(member);
              setProfileOpen(true);
              fetchStaffProfile(member.id);
            }}
            style={{
              background: "#fff", borderRadius: "16px", border: "1px solid #EDE8E0",
              boxShadow: "0 2px 16px rgba(28,22,14,0.06)", cursor: "pointer",
              transition: "all 0.2s ease", overflow: "hidden",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(28,22,14,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 16px rgba(28,22,14,0.06)"; }}
          >
            {/* Gold accent bar */}
            <div style={{ height: "3px", background: "linear-gradient(90deg, #8B6914, #C8A97E)" }} />
            <div style={{ padding: "22px 22px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "52px", height: "52px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "2px solid #C8A97E", boxShadow: "0 0 0 3px rgba(200,169,126,0.12)" }}>
                    {member.image ? (
                      <img src={member.image} alt={member.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #8B6914, #C8A97E)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond',serif", fontSize: "20px", fontWeight: 700, color: "#fff" }}>
                        {member.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "18px", fontWeight: 700, color: "#1C160E", lineHeight: 1.2 }}>{member.name}</div>
                    {member.role && (
                      <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", color: "#C8A97E", marginTop: "3px", textTransform: "uppercase" }}>{member.role}</div>
                    )}
                  </div>
                </div>
                <span style={{
                  fontFamily: "'Montserrat',sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
                  padding: "4px 10px", borderRadius: "20px",
                  background: (member.status ? member.status === "active" : member.is_active) ? "rgba(16,185,129,0.1)" : "rgba(107,114,128,0.1)",
                  color: (member.status ? member.status === "active" : member.is_active) ? "#10B981" : "#6B7280",
                  border: `1px solid ${(member.status ? member.status === "active" : member.is_active) ? "rgba(16,185,129,0.25)" : "rgba(107,114,128,0.25)"}`,
                  textTransform: "uppercase",
                }}>
                  {member.status ? member.status.replace("_", " ") : (member.is_active ? "Active" : "Inactive")}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                {member.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Phone style={{ width: "13px", height: "13px", color: "#C8A97E", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "#57534E" }}>{member.phone}</span>
                  </div>
                )}
                {member.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Mail style={{ width: "13px", height: "13px", color: "#C8A97E", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "#57534E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.email}</span>
                  </div>
                )}
                {staffRatings[member.id] !== undefined && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "#C8A97E", fontSize: "13px" }}>★</span>
                    <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "12px", color: "#57534E" }}>
                      {staffRatings[member.id] !== null ? Number(staffRatings[member.id]).toFixed(2) : "N/A"} rating
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "12px", borderTop: "1px solid #F0EBE2" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditMember(member); }}
                  style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 600, padding: "7px 16px", borderRadius: "8px", border: "1.5px solid #EDE8E0", background: "#fff", color: "#57534E", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C8A97E"; (e.currentTarget as HTMLElement).style.color = "#8B6914"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#EDE8E0"; (e.currentTarget as HTMLElement).style.color = "#57534E"; }}
                >
                  <Pencil style={{ width: "12px", height: "12px" }} /> Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedStaff(member); setProfileOpen(true); fetchStaffProfile(member.id).then(() => setAssignDialogOpen(true)); }}
                  style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 600, padding: "7px 16px", borderRadius: "8px", border: "1.5px solid #EDE8E0", background: "#fff", color: "#57534E", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C8A97E"; (e.currentTarget as HTMLElement).style.color = "#8B6914"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#EDE8E0"; (e.currentTarget as HTMLElement).style.color = "#57534E"; }}
                >
                  Services
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedStaff(member); setProfileOpen(true); fetchStaffProfile(member.id).then(() => setScheduleDialogOpen(true)); }}
                  style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 600, padding: "7px 16px", borderRadius: "8px", border: "1.5px solid #EDE8E0", background: "#fff", color: "#57534E", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C8A97E"; (e.currentTarget as HTMLElement).style.color = "#8B6914"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#EDE8E0"; (e.currentTarget as HTMLElement).style.color = "#57534E"; }}
                >
                  Schedule
                </button>
                {userRole === "owner" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteStaffId(member.id);
                      setDeleteDialogOpen(true);
                    }}
                    style={{ fontFamily: "'Montserrat',sans-serif", fontSize: "11px", fontWeight: 600, padding: "7px 12px", borderRadius: "8px", border: "1.5px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)", color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.06)"; }}
                  >
                    <Trash2 style={{ width: "12px", height: "12px" }} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {staff.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <p className="z-subtitle">
                No staff members yet. Add your first staff or receptionist!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Staff Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-4xl grid gap-4 p-6">
          <DialogHeader>
            <DialogTitle>
              {selectedStaff ? selectedStaff.name : "Staff Profile"}
            </DialogTitle>
          </DialogHeader>

          {profileLoading ? (
            <div className="p-6">Loading...</div>
          ) : selectedStaff ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-2">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-2xl font-semibold text-white bg-gradient-to-br from-green-500 to-teal-500">
                    {selectedStaff.image ? (
                      <img
                        src={selectedStaff.image}
                        alt={selectedStaff.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (selectedStaff.name || "")
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold">
                      {selectedStaff.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedStaff.role}
                    </p>
                    <p className="text-sm">{selectedStaff.email}</p>
                    <p className="text-sm">{selectedStaff.phone}</p>
                    <p className="text-sm">
                      Emergency: {selectedStaff.emergency_contact || "N/A"}
                    </p>
                  </div>
                </div>



                <div>
                  <h4 className="font-medium text-sm text-gray-600">Notes</h4>
                  <p className="mt-1 text-sm">
                    {selectedStaff.notes || "No notes"}
                  </p>
                </div>
              </div>

              <div className="md:col-span-2">
                <h4 className="text-lg font-semibold mb-3">Booking History</h4>
                <div className="space-y-3 max-h-56 overflow-auto">
                  {staffBookings.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No bookings
                    </div>
                  ) : (
                    staffBookings.map((b: any) => (
                      <div
                        key={b.id}
                        className="flex justify-between items-center p-3 rounded-lg border bg-white/50 dark:bg-gray-900/40"
                      >
                        <div>
                          <div className="text-sm font-medium">
                            {b.services?.name || "Service"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {b.client_name || "Client"} •{" "}
                            {b.preferred_date
                              ? format(new Date(b.preferred_date), "PPP")
                              : "Date N/A"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{b.status || "-"}</div>
                          <div className="text-xs text-muted-foreground">
                            GH₵{Number(b.services?.price || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-cream dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500">Services Completed</p>
                    <p className="text-lg font-semibold mt-1">
                      {
                        staffBookings.filter(
                          (b: any) => b.status === "completed"
                        ).length
                      }
                    </p>
                  </div>

                  <div className="p-3 bg-cream dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500">Total Earned</p>
                    <p className="text-lg font-semibold mt-1">
                      GH₵
                      {staffBookings
                        .filter((b: any) => b.status === "completed")
                        .reduce(
                          (s: number, b: any) =>
                            s + Number(b.services?.price || 0),
                          0
                        )
                        .toFixed(2)}
                    </p>
                  </div>

                  <div className="p-3 bg-cream dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500">
                      Monthly Hours (this month)
                    </p>
                    <p className="text-lg font-semibold mt-1">
                      {(() => {
                        const now = new Date();
                        const m = now.getMonth();
                        const y = now.getFullYear();
                        const hours = staffAttendance.reduce(
                          (sum: number, rec: any) => {
                            if (!rec.check_in || !rec.check_out) return sum;
                            const ci = new Date(rec.check_in);
                            const co = new Date(rec.check_out);
                            if (ci.getMonth() === m && ci.getFullYear() === y) {
                              return (
                                sum +
                                (co.getTime() - ci.getTime()) / (1000 * 60 * 60)
                              );
                            }
                            return sum;
                          },
                          0
                        );
                        return `${hours.toFixed(1)} h`;
                      })()}
                    </p>
                  </div>

                  <div className="p-3 bg-cream dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500">Attendance Records</p>
                    <p className="text-lg font-semibold mt-1">
                      {staffAttendance.length}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-lg font-semibold mb-2">
                    Performance Summary
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Completed bookings:{" "}
                    {
                      staffBookings.filter((b: any) => b.status === "completed")
                        .length
                    }{" "}
                    • Avg revenue per completed: GH₵
                    {(
                      staffBookings
                        .filter((b: any) => b.status === "completed")
                        .reduce(
                          (s: number, b: any) =>
                            s + Number(b.services?.price || 0),
                          0
                        ) /
                      Math.max(
                        1,
                        staffBookings.filter(
                          (b: any) => b.status === "completed"
                        ).length
                      )
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      {/* Assign Services Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md grid gap-4 p-6">
          <DialogHeader>
            <DialogTitle>Assign Services to {selectedStaff?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="max-h-64 overflow-auto">
              {servicesList.map((s) => (
                <label key={s.id} className="flex items-center gap-2 p-2">
                  <input
                    type="checkbox"
                    checked={assignedServices.includes(s.id)}
                    onChange={(e) => {
                      const next = assignedServices.slice();
                      if (e.target.checked) next.push(s.id);
                      else {
                        const idx = next.indexOf(s.id);
                        if (idx >= 0) next.splice(idx, 1);
                      }
                      setAssignedServices(next);
                    }}
                  />
                  <span className="text-sm">{s.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                if (!selectedStaff) return;
                const res = await assignServicesToStaff(selectedStaff.id, assignedServices);
                if (res.success) {
                  toast.success('Assigned services');
                  setAssignDialogOpen(false);
                } else {
                  toast.error(res.error?.message || 'Failed to assign services');
                }
              }}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule / Off-days Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-2xl grid gap-4 p-6">
          <DialogHeader>
            <DialogTitle>Schedule & Off days for {selectedStaff?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-white/5 rounded-lg border">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium">Working Hours (weekly)</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Shop hours: {(settings as any)?.open_time && (settings as any)?.close_time
                      ? ((settings as any)?.use24HourFormat ? `${(settings as any).open_time} — ${(settings as any).close_time}` : `${formatTo12Hour((settings as any).open_time)} — ${formatTo12Hour((settings as any).close_time)}`)
                      : ((settings as any)?.use24HourFormat ? '08:30 — 21:00' : '8:30 AM — 9:00 PM')}
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-auto p-2 border rounded mb-3 bg-white/3">
                {workingHours.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No working hours set for this staff.</div>
                ) : (
                  workingHours.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between text-sm py-1">
                      <div className="truncate">
                        <strong className="inline-block w-14">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][w.day_of_week]}</strong>
                        <span className="ml-2">{(settings as any)?.use24HourFormat ? `${w.start_time} - ${w.end_time}` : `${formatTo12Hour(w.start_time)} - ${formatTo12Hour(w.end_time)}`}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className="space-y-2" onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedStaff) return;
                const f = new FormData(e.currentTarget as HTMLFormElement);
                const day = Number(f.get('day'));
                const start = String(f.get('start'));
                const end = String(f.get('end'));
                // Validate time format
                if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(start) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(end)) {
                  toast.error('Please enter valid times using the time picker (HH:mm)');
                  return;
                }
                // Ensure end is after start
                if (timeToMinutes(end) <= timeToMinutes(start)) {
                  toast.error('End time must be later than start time');
                  return;
                }
                const res = await addWorkingHours(selectedStaff.id, day, start, end);
                if (res.error) toast.error(res.error.message || 'Failed to add hours');
                else {
                  toast.success('Added working hours');
                  const wh = await getWorkingHours(selectedStaff.id);
                  if (!wh.error) setWorkingHours(wh.data || []);
                }
                // reset form fields
                (e.currentTarget as HTMLFormElement).reset();
              }}>
                <div className="grid grid-cols-3 gap-2">
                  <select name="day" className="rounded border px-2 py-1 col-span-1">
                    <option value="1">Mon</option>
                    <option value="2">Tue</option>
                    <option value="3">Wed</option>
                    <option value="4">Thu</option>
                    <option value="5">Fri</option>
                    <option value="6">Sat</option>
                    <option value="0">Sun</option>
                  </select>
                  <input name="start" type="time" className="rounded border px-2 py-1 col-span-1" required />
                  <input name="end" type="time" className="rounded border px-2 py-1 col-span-1" required />
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Add Working Hours</Button>
                </div>
              </form>
            </div>

            <div className="p-4 bg-white/5 rounded-lg border">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium">Off Days & Exceptions</h4>
                  <p className="text-xs text-muted-foreground mt-1">Add temporary off days for this staff. Use the Delete action to remove mistakes.</p>
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-auto p-2 border rounded mb-3 bg-white/3">
                {offDays.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No off days recorded.</div>
                ) : (
                  offDays.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between text-sm py-1">
                      <div className="truncate">
                        <div className="font-medium">{d.off_date}</div>
                        {d.reason && <div className="text-xs text-muted-foreground">{d.reason}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={async () => {
                          if (!selectedStaff) return;
                          const ok = confirm(`Delete off day ${d.off_date}?`);
                          if (!ok) return;
                          try {
                            const del = await deleteOffDay(d.id);
                            if (!del.success) throw del.error;
                            toast.success('Off day deleted');
                            const od = await getOffDays(selectedStaff.id);
                            if (!od.error) setOffDays(od.data || []);
                          } catch (err: any) {
                            toast.error(err?.message || 'Failed to delete off day');
                          }
                        }}>Delete</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className="space-y-2" onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedStaff) return;
                const f = new FormData(e.currentTarget as HTMLFormElement);
                const date = String(f.get('date'));
                const reason = String(f.get('reason')) || undefined;
                const res = await addOffDay(selectedStaff.id, date, reason);
                if (res.error) toast.error(res.error.message || 'Failed to add off day');
                else {
                  toast.success('Added off day');
                  const od = await getOffDays(selectedStaff.id);
                  if (!od.error) setOffDays(od.data || []);
                }
                (e.currentTarget as HTMLFormElement).reset();
              }}>
                <div className="grid grid-cols-2 gap-2">
                  <input name="date" type="date" className="rounded border px-2 py-1" required />
                  <input name="reason" placeholder="Reason (optional)" className="rounded border px-2 py-1" />
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Add Off Day</Button>
                </div>
              </form>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    {/* Create Login Modal */}
    {loginModalOpen && loginStaff && (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
        <div style={{ background:"#fff", borderRadius:16, padding:32, width:"100%", maxWidth:420, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:700, marginBottom:4 }}>Create System Login</h2>
          <p style={{ fontSize:12, color:"#78716C", marginBottom:24 }}>This will create a login account for <strong>{loginStaff.name}</strong> ({loginStaff.role || "staff"}).</p>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", color:"#A8A29E", display:"block", marginBottom:6 }}>EMAIL</label>
            <input value={loginStaff.email || ""} disabled style={{ width:"100%", padding:"11px 14px", borderRadius:8, border:"1.5px solid #EDE8E0", background:"#F5F5F4", fontSize:13, color:"#78716C" }} />
            {!loginStaff.email && <p style={{ fontSize:11, color:"#EF4444", marginTop:4 }}>⚠ Add an email to this staff member first.</p>}
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", color:"#A8A29E", display:"block", marginBottom:6 }}>TEMPORARY PASSWORD</label>
            <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
              placeholder="Min 6 characters" style={{ width:"100%", padding:"11px 14px", borderRadius:8, border:"1.5px solid #EDE8E0", fontSize:13, outline:"none" }} />
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setLoginModalOpen(false)} style={{ flex:1, padding:"11px", borderRadius:8, border:"1.5px solid #EDE8E0", background:"#fff", cursor:"pointer", fontSize:13, fontWeight:600, color:"#78716C" }}>Cancel</button>
            <button onClick={handleCreateLogin} disabled={loginLoading || !loginStaff.email}
              style={{ flex:1, padding:"11px", borderRadius:8, border:"none", background: loginLoading || !loginStaff.email ? "#ccc" : "linear-gradient(135deg,#C9A84C,#A8892E)", color:"#fff", cursor: loginLoading || !loginStaff.email ? "not-allowed" : "pointer", fontSize:13, fontWeight:700 }}>
              {loginLoading ? "Creating..." : "Create Login"}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default Staff;
