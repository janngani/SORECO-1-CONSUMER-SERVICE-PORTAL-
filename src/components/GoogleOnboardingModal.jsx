import React, { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { BARANGAYS } from "@/src/pages/63barangay";
import { validateName, validatePhoneNumber } from "@/src/lib/disposableEmail";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { api } from "@/src/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  MapPin,
  Hash,
  Zap,
  CheckCircle2,
  HelpCircle,
  Loader2,
  LogOut,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  User
} from "lucide-react";
import { toast } from "sonner";

export const GoogleOnboardingModal = () => {
  const { user, completeOnboarding, logout } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [barangay, setBarangay] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [hasUnpaidBill, setHasUnpaidBill] = useState(false);
  const [showBillGuide, setShowBillGuide] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Determine if onboarding is required
  useEffect(() => {
    if (!user) {
      setIsOpen(false);
      return;
    }

    // Admins never need consumer onboarding
    if (user.role === "admin") {
      setIsOpen(false);
      return;
    }

    // Any consumer with incomplete profile MUST complete onboarding
    const isProfileIncomplete = Boolean(
      user.needsOnboarding === true ||
      user.onboardingCompleted === false ||
      !user.phoneNumber ||
      (!user.address && !user.barangay) ||
      !user.accountNumber ||
      user.accountNumber === "PENDING" ||
      user.accountNumber === "12345678" ||
      !user.fullName ||
      user.fullName === "Consumer" ||
      user.fullName === "User" ||
      user.fullName.includes("@")
    );

    if (isProfileIncomplete) {
      setIsOpen(true);
      if (user.phoneNumber) setPhoneNumber(user.phoneNumber);
      if (user.address || user.barangay) setBarangay(user.address || user.barangay);
      if (user.accountNumber && user.accountNumber !== "PENDING" && user.accountNumber !== "12345678") {
        setAccountNumber(user.accountNumber);
      }
      
      // Pre-fill name if available and valid
      if (user.fullName && user.fullName !== "Consumer" && !user.fullName.includes("@") && !firstName && !lastName) {
        const parts = user.fullName.trim().split(" ");
        if (parts.length >= 2) {
          setFirstName(parts[0]);
          setLastName(parts.slice(1).join(" "));
        } else {
          setFirstName(user.fullName);
        }
      }
    } else {
      setIsOpen(false);
    }
  }, [user]);

  // Listen for manual trigger if user wants to re-open from dashboard
  useEffect(() => {
    const handleOpen = () => {
      if (user && user.role !== "admin") {
        if (user.phoneNumber) setPhoneNumber(user.phoneNumber);
        if (user.address || user.barangay) setBarangay(user.address || user.barangay);
        if (user.accountNumber) setAccountNumber(user.accountNumber);
        setIsOpen(true);
      }
    };
    window.addEventListener("open-consumer-onboarding", handleOpen);
    return () => window.removeEventListener("open-consumer-onboarding", handleOpen);
  }, [user]);

  const handlePhoneChange = (e) => {
    setFormError("");
    // Keep digits and leading +
    const cleaned = e.target.value.replace(/[^\d+]/g, "");
    setPhoneNumber(cleaned);
  };

  const handleAccountChange = (e) => {
    setFormError("");
    // Keep numbers only
    const cleaned = e.target.value.replace(/\D/g, "");
    setAccountNumber(cleaned);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const cleanFirst = firstName.trim();
    const cleanMiddle = middleName.trim();
    const cleanLast = lastName.trim();
    const cleanPhone = phoneNumber.trim();
    const cleanBarangay = barangay.trim();
    const cleanAccount = accountNumber.trim();

    // 0. Name Validation
    const firstNameVal = validateName(cleanFirst);
    if (!firstNameVal.isValid) {
      setFormError(`First Name: ${firstNameVal.error}`);
      return;
    }
    const lastNameVal = validateName(cleanLast);
    if (!lastNameVal.isValid) {
      setFormError(`Last Name: ${lastNameVal.error}`);
      return;
    }
    if (cleanMiddle) {
      const middleNameVal = validateName(cleanMiddle);
      if (!middleNameVal.isValid) {
        setFormError(`Middle Name: ${middleNameVal.error}`);
        return;
      }
    }

    // 1. Mobile Number Validation
    const phoneVal = validatePhoneNumber(cleanPhone);
    if (!phoneVal.isValid) {
      setFormError(`Mobile Number: ${phoneVal.error}`);
      return;
    }

    // 2. Barangay Selection Validation
    if (!cleanBarangay) {
      setFormError("Please select your residential barangay in Bulan.");
      return;
    }
    if (!BARANGAYS.includes(cleanBarangay)) {
      setFormError("Please choose a valid barangay from the list of 63 Bulan barangays.");
      return;
    }

    // 3. Utility Number Validation
    if (!cleanAccount) {
      setFormError("Please enter your SORECO-1 Utility Account Number.");
      return;
    }
    if (!/^\d+$/.test(cleanAccount) || cleanAccount.length !== 8) {
      setFormError("Utility account number must contain numbers only (no letters allowed) and be exactly 8 digits.");
      return;
    }

    setSubmitting(true);
    try {
      const { exists } = await api.auth.checkAccountNumber(cleanAccount);
      if (exists) {
        setSubmitting(false);
        setFormError("This utility number is already existing.");
        toast.error("This utility number is already existing.");
        return;
      }

      const resolvedFullName = [cleanFirst, cleanMiddle, cleanLast].filter(Boolean).join(" ");

      await completeOnboarding({
        firstName: cleanFirst,
        middleName: cleanMiddle,
        lastName: cleanLast,
        fullName: resolvedFullName,
        phoneNumber: cleanPhone,
        barangay: cleanBarangay,
        accountNumber: cleanAccount,
        hasUnpaidBill: hasUnpaidBill
      });

      toast.success("Consumer profile activated!", {
        description: `Welcome to SORECO-1, ${resolvedFullName}. Your utility account has been registered.`
      });
      setIsOpen(false);
    } catch (err) {
      console.error("Onboarding submission failed:", err);
      setFormError(err.message || "Failed to save consumer details. Please try again.");
      toast.error(err.message || "Failed to complete onboarding.");
    } finally {
      setSubmitting(false);
    }
  };


  const handleSignOut = async () => {
    try {
      await logout();
      setIsOpen(false);
      toast.info("Signed out successfully.");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Prevent dismissing by clicking outside if onboarding is required
      if (!open && (user?.needsOnboarding || user?.onboardingCompleted === false)) {
        toast.warning("Please complete the required details to access your portal.");
        return;
      }
      setIsOpen(open);
    }}>
      <DialogContent
        showCloseButton={false}
        className="w-[95vw] sm:max-w-xl p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-white max-h-[92dvh] flex flex-col"
      >
        {/* Header with SORECO-1 Branding */}
        <div className="bg-gradient-to-r from-[#D84315] via-[#E65100] to-[#F57C00] p-4 sm:p-6 text-white relative">
          <div className="flex items-center gap-3.5 mb-2">
            <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-xs">
              <Zap className="h-6 w-6 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-white">
                  SORECO-1 Consumer Setup
                </span>
                <Badge variant="outline" className="bg-emerald-500/20 text-white border-white/30 text-[10px] py-0">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-300" /> {user?.isGoogleUser ? "Google Connected" : "Account Verification"}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white mt-1">
                Complete Consumer Registration
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-orange-100 text-xs font-normal leading-relaxed mt-1">
            Welcome to the SORECO-1 Digital Portal! To activate your digital access and submit online service requests,
            please complete your legal name, active mobile number, residential barangay, and utility account number.
          </DialogDescription>

          {/* Connected Account Tag */}
          <div className="mt-3 flex items-center justify-between bg-black/15 backdrop-blur-xs rounded-lg px-3 py-1.5 text-xs text-orange-100 border border-white/10">
            <span className="truncate">
              Signed in as: <strong className="text-white">{user?.email}</strong>
            </span>
            <span className="text-[11px] text-amber-200 shrink-0 ml-2 font-medium">
              {user?.fullName || "Member-Consumer"}
            </span>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-left flex-1">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Member Name */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 border-b border-slate-100 gap-1 text-left">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-orange-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Member-Consumer Full Name
                </h3>
              </div>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                Complete names only • No numbers allowed
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Input
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => { setFormError(""); setFirstName(e.target.value); }}
                  required
                  className={`h-10 text-sm border-slate-200 focus-visible:ring-orange-500 font-medium ${firstName && !validateName(firstName).isValid ? "border-red-500 bg-red-50/30" : ""}`}
                />
              </div>
              <div className="space-y-1">
                <Input
                  placeholder="Middle Name"
                  value={middleName}
                  onChange={(e) => { setFormError(""); setMiddleName(e.target.value); }}
                  className={`h-10 text-sm border-slate-200 focus-visible:ring-orange-500 font-medium ${middleName && !validateName(middleName).isValid ? "border-red-500 bg-red-50/30" : ""}`}
                />
              </div>
              <div className="space-y-1">
                <Input
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => { setFormError(""); setLastName(e.target.value); }}
                  required
                  className={`h-10 text-sm border-slate-200 focus-visible:ring-orange-500 font-medium ${lastName && !validateName(lastName).isValid ? "border-red-500 bg-red-50/30" : ""}`}
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400">Please ensure your name matches your official SORECO-1 account record.</p>
          </div>

          {/* 2. Mobile Number */}
          <div className="space-y-1.5 text-left">
            <Label htmlFor="onboarding-phone" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-orange-600" />
              2. Mobile Number <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="onboarding-phone"
                type="tel"
                placeholder="09XX XXX XXXX"
                value={phoneNumber}
                onChange={handlePhoneChange}
                required
                maxLength={11}
                className={`pl-9 h-11 text-sm border-slate-200 focus-visible:ring-orange-500 font-medium ${phoneNumber && !validatePhoneNumber(phoneNumber).isValid ? "border-red-500 bg-red-50/30" : ""}`}
              />
              <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              11 digits starting with 09 (e.g. 09171234567)
            </p>
          </div>

          {/* 3. Selection of which Barangay */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <Label htmlFor="onboarding-barangay" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-orange-600" />
                3. Selection of Barangay <span className="text-red-500">*</span>
              </Label>
              <span className="text-[11px] font-semibold text-orange-600">63 Bulan Barangays</span>
            </div>
            <div className="relative">
              <select
                id="onboarding-barangay"
                value={barangay}
                onChange={(e) => {
                  setFormError("");
                  setBarangay(e.target.value);
                }}
                required
                className="w-full h-11 pl-9 pr-8 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium text-slate-800"
              >
                <option value="" disabled>
                  -- Select which Barangay your meter is located --
                </option>
                {BARANGAYS.map((bg) => (
                  <option key={bg} value={bg}>
                    Brgy. {bg}
                  </option>
                ))}
              </select>
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Identifies your feeder line and substation zone for targeted power restoration tracking.
            </p>
          </div>

          {/* 4. Utility Number */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <Label htmlFor="onboarding-account" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-orange-600" />
                4. Utility Account Number <span className="text-red-500">*</span>
              </Label>
              <button
                type="button"
                onClick={() => setShowBillGuide(!showBillGuide)}
                className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <HelpCircle className="h-3 w-3" />
                {showBillGuide ? "Hide helper" : "Where to find on electric bill?"}
                {showBillGuide ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            <div className="relative">
              <Input
                id="onboarding-account"
                type="text"
                placeholder="e.g. 10293847"
                value={accountNumber}
                onChange={handleAccountChange}
                required
                maxLength={8}
                className="pl-9 h-11 text-sm font-mono tracking-wider font-semibold border-slate-200 focus-visible:ring-orange-500 text-slate-900"
              />
              <Hash className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>

          {/* 5. Unpaid Bill Status */}
          <div className="pt-2 border-t border-slate-100 text-left">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                5. Account Billing Status <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="onboarding-unpaid-bill"
                  checked={hasUnpaidBill}
                  onChange={(e) => setHasUnpaidBill(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <Label htmlFor="onboarding-unpaid-bill" className="text-xs text-slate-600 cursor-pointer">
                  I currently have an unpaid bill or my account is disconnected.
                </Label>
              </div>
            </div>
          </div>

          {/* Bill Helper Callout */}
          {showBillGuide && (
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2 mt-2">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block text-amber-950">How to find your Utility Number:</strong>
                    <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                      Check the upper section of your monthly SORECO-1 printed statement of account / electric bill.
                      Look for <strong>"Account No."</strong> (usually an 8-digit sequence like <strong>10293847</strong>).
                    </p>
                  </div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/80 font-mono text-[11px] text-slate-700 flex justify-between items-center">
                  <span>SORECO-1 BILLING &bull; ACCT NO:</span>
                  <span className="font-bold text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-sm">
                    [ 8-DIGIT NUMBER ]
                  </span>
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-500 leading-tight">
              Permanently links your online consumer credentials with your actual meter ledger and billing history.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-[#E65100] hover:bg-[#D84315] text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving & Activating Account...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Submit & Activate Consumer Account
                </>
              )}
            </Button>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Wrong account?
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1 font-medium transition-colors"
              >
                <LogOut className="h-3 w-3" />
                Sign out and use another email
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
