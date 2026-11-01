import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { useNavigate } from "react-router";
import { api } from "@/src/lib/api";
import { compressImage } from "@/src/lib/imageCompressor";
import { validateName, validatePhoneNumber } from "@/src/lib/disposableEmail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  User,
  Mail,
  Shield,
  ShieldCheck,
  Save,
  Loader2,
  Phone,
  MapPin,
  Camera,
  ArrowLeft,
  ClipboardCheck,
  Eye,
  Edit,
  XCircle,
  ChevronDown,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BARANGAYS } from "@/src/pages/63barangay";
export const ProfilePage = () => {
  const { user, userData, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(userData?.fullName || "");
  const [accountNumber, setAccountNumber] = useState(userData?.accountNumber || "");
  const [phoneNumber, setPhoneNumber] = useState(userData?.phoneNumber || "");
  const [address, setAddress] = useState(userData?.address || "");
  const [profileImage, setProfileImage] = useState(userData?.profileImage || "");
  const [hasUnpaidBill, setHasUnpaidBill] = useState(Boolean(userData?.hasUnpaidBill));
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [fetchingTickets, setFetchingTickets] = useState(true);
  const [editingTicket, setEditingTicket] = useState(null);
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("billing");
  const [editIsUrgent, setEditIsUrgent] = useState(false);
  const [isUpdatingTicket, setIsUpdatingTicket] = useState(false);

  useEffect(() => {
    if (userData) {
      setFullName(userData.fullName || "");
      setAccountNumber(userData.accountNumber || "");
      setPhoneNumber(userData.phoneNumber || "");
      setAddress(userData.address || "");
      setProfileImage(userData.profileImage || "");
      setHasUnpaidBill(Boolean(userData.hasUnpaidBill));
    }
  }, [userData]);

  const fetchTickets = async () => {
    try {
      const list = await api.tickets.list();
      setTickets(list);
    } catch (err) {
      console.error("Error fetching user tickets:", err);
    } finally {
      setFetchingTickets(false);
    }
  };
  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const nameVal = fullName ? validateName(fullName) : { isValid: true };
  const phoneVal = phoneNumber ? validatePhoneNumber(phoneNumber) : { isValid: true };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 256, 0.7);
        setProfileImage(compressed);
      } catch (err) {
        toast.error(err.message || "Upload rejected: Only PNG, JPG, and JPEG images are allowed.");
        if (e.target) e.target.value = "";
      }
    }
  };
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!user) return;

    const nameCheck = validateName(fullName);
    if (!nameCheck.isValid) {
      return toast.error(`Full Name: ${nameCheck.error}`);
    }

    if (phoneNumber) {
      const phoneCheck = validatePhoneNumber(phoneNumber);
      if (!phoneCheck.isValid) {
        return toast.error(`Mobile Number: ${phoneCheck.error}`);
      }
    }
    
    if (accountNumber && accountNumber !== "PENDING" && accountNumber.trim().length !== 8) {
      return toast.error("Please enter exactly 8 digits for your utility account number.");
    }

    setLoading(true);
    try {
      if (accountNumber && accountNumber !== "PENDING" && accountNumber !== userData?.accountNumber) {
        const { exists } = await api.auth.checkAccountNumber(accountNumber.trim(), user.id);
        if (exists) {
          setLoading(false);
          return toast.error("This utility number is already existing.");
        }
      }

      const updated = await updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        address,
        profileImage,
        accountNumber: accountNumber.trim(),
        hasUnpaidBill
      });
      if (updated && updated.hasUnpaidBill !== undefined) {
        setHasUnpaidBill(Boolean(updated.hasUnpaidBill));
      }
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };
  const openEditModal = (ticket) => {
    setEditingTicket(ticket);
    setEditCategory(ticket.category || "");
    setEditDescription(ticket.description || "");
    setEditType(ticket.type || "billing");
    setEditIsUrgent(ticket.isUrgent === 1);
  };
  const handleUpdateTicketSubmit = async (e) => {
    e.preventDefault();
    if (!editingTicket) return;
    setIsUpdatingTicket(true);
    try {
      await api.tickets.update(editingTicket.id, {
        category: editCategory,
        description: editDescription,
        type: editType,
        isUrgent: editIsUrgent
      });
      toast.success("Service request updated successfully");
      setEditingTicket(null);
      await fetchTickets();
    } catch (err) {
      toast.error("Failed to update request");
    } finally {
      setIsUpdatingTicket(false);
    }
  };
  const handleCancelTicket = async (ticketId) => {
    const confirm = window.confirm("Are you sure you want to cancel this request? Once cancelled, it will be locked and you cannot edit it further.");
    if (!confirm) return;
    try {
      await api.tickets.update(ticketId, { status: "cancelled" });
      toast.success("Request cancelled successfully");
      await fetchTickets();
    } catch (err) {
      toast.error("Failed to cancel request");
    }
  };
  return <div className="container mx-auto px-4 py-12 max-w-2xl space-y-6">
      <div className="flex justify-start">
        <Button
    variant="ghost"
    onClick={() => navigate(-1)}
    className="gap-2 text-slate-600 hover:text-slate-900 transition-colors"
  >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <Card className="border-slate-100 shadow-xl overflow-hidden">
        <div className="h-32 bg-primary/10 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                <AvatarImage src={profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${userData?.fullName}`} />
                <AvatarFallback>{userData?.fullName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="h-6 w-6" />
                <input type="file" className="hidden" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={handleImageChange} />
              </label>
            </div>
          </div>
        </div>
        
        <CardHeader className="pt-16 pb-4">
          <CardTitle className="text-2xl font-bold">{userData?.fullName}</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Shield className="h-3 w-3" /> {userData?.role?.toUpperCase()} ACCOUNT
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleUpdate}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="fullName" className="text-slate-500">Full Name</Label>
                  <span className="text-[11px] font-medium text-emerald-700">Complete legal name only</span>
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`pl-10 ${fullName && !nameVal.isValid ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}`}
                  />
                </div>
                {fullName && !nameVal.isValid ? (
                  <p className="text-[11px] text-red-600 font-medium">{nameVal.error}</p>
                ) : (
                  <p className="text-[10px] text-slate-400">Complete legal name as registered with SORECO-1</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-500">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
    value={userData?.email || ""}
    disabled
    className="pl-10 bg-slate-50 border-slate-100 text-slate-500"
  />
                </div>
                <p className="text-[10px] text-slate-400 italic">Email cannot be changed online for security reasons.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="accountNumber" className="text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-orange-600" /> Utility Account Number
                  </Label>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Locked</span>
                </div>
                <div className="relative">
                  <Input
                    id="accountNumber"
                    value={accountNumber || userData?.accountNumber || ""}
                    disabled
                    readOnly
                    className="font-mono bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed select-none font-bold"
                  />
                  <ShieldCheck className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  Your utility account number is permanently registered to this profile and cannot be changed online.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-slate-500">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="09XX XXX XXXX"
                      className={`pl-10 ${phoneNumber && !phoneVal.isValid ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""}`}
                    />
                  </div>
                  {phoneNumber && !phoneVal.isValid ? (
                    <p className="text-[11px] text-red-600 font-medium">{phoneVal.error}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400">11 digits starting with 09</p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="address" className="text-slate-500">Service Address (Barangay)</Label>
                    <span className="text-xs text-orange-600 font-medium">63 Barangays</span>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                    <select
                      id="address"
                      value={BARANGAYS.find(b => address && (address.toLowerCase() === b.toLowerCase() || address.toLowerCase().includes(b.toLowerCase()))) || address || ""}
                      onChange={(e) => setAddress(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 appearance-none text-slate-800 cursor-pointer font-medium hover:border-orange-300"
                    >
                      <option value="" disabled>
                        -- Select your residential barangay in Bulan --
                      </option>
                      {address && !BARANGAYS.some(b => address.toLowerCase().includes(b.toLowerCase())) && (
                        <option value={address}>{address} (Custom)</option>
                      )}
                      {BARANGAYS.map((brgy) => (
                        <option key={brgy} value={brgy}>
                          Brgy. {brgy}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Account Billing Status */}
              <div className="space-y-2">
                <Label className="text-slate-500 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-orange-600" /> Account Billing Status
                </Label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="hasUnpaidBill"
                    checked={hasUnpaidBill}
                    onChange={(e) => setHasUnpaidBill(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                  />
                  <Label htmlFor="hasUnpaidBill" className="text-sm text-slate-700 cursor-pointer">
                    I currently have an unpaid bill or my account is disconnected.
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/50 border-t p-6">
            <Button type="submit" className="bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 text-white gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* My Service Requests section removed per user request */}

      {editingTicket && <Dialog open={!!editingTicket} onOpenChange={(open) => !open && setEditingTicket(null)}>
          <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Edit Service Request {editingTicket.id}</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Modify your request details. Changes are allowed only while the status is pending.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateTicketSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="editType" className="text-slate-600 text-xs">Request Type</Label>
                <select
    id="editType"
    value={editType}
    onChange={(e) => setEditType(e.target.value)}
    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
  >
                  <option value="billing">Billing Dispute</option>
                  <option value="reconnection">Reconnection</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editCategory" className="text-slate-600 text-xs">Category</Label>
                <Input
    id="editCategory"
    value={editCategory}
    onChange={(e) => setEditCategory(e.target.value)}
    placeholder="e.g. High Consumption, Meter Damage"
    required
  />
              </div>

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <Label htmlFor="editDescription" className="text-slate-600 text-xs font-semibold">Description</Label>
                  <span className={cn(
                    "text-[11px] font-mono",
                    editDescription.length > 500 ? "text-rose-600 font-bold" : "text-slate-400"
                  )}>
                    {editDescription.length} / 500 texts (limited to 500 texts only)
                  </span>
                </div>
                <textarea
                  id="editDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm min-h-[90px] max-h-[160px] resize-y bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Provide more details about your request (limited to 500 texts only)..."
                  maxLength={500}
                  required
                />
                {editDescription.length > 500 && (
                  <p className="text-[11px] text-rose-600 font-semibold">Description exceeds the 500-character limit. Please shorten your text.</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
    type="checkbox"
    id="editIsUrgent"
    checked={editIsUrgent}
    onChange={(e) => setEditIsUrgent(e.target.checked)}
    className="rounded text-primary focus:ring-primary"
  />
                <Label htmlFor="editIsUrgent" className="text-slate-700 cursor-pointer text-sm">Mark this request as Urgent</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setEditingTicket(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdatingTicket} className="bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 text-white">
                  {isUpdatingTicket ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>}
    </div>;
};
export default ProfilePage;
