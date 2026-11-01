import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { api } from "@/src/lib/api";
import { isDisposableEmail, validateName, validatePhoneNumber } from "@/src/lib/disposableEmail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  UserPlus, 
  Loader2, 
  ShieldCheck, 
  X, 
  Check, 
  Circle, 
  Eye, 
  EyeOff, 
  MapPin, 
  HelpCircle,
  Zap,
  Mail,
  Phone,
  Lock,
  User
} from "lucide-react";
import { BARANGAYS } from "@/src/pages/63barangay";

export const RegisterPage = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    barangay: "",
    accountNumber: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    hasUnpaidBill: false
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAccountHint, setShowAccountHint] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleRegister = async () => {
    try {
      setGoogleLoading(true);
      localStorage.setItem("oauth_intent", "register");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Google register error:", error);
      toast.error(error.message || "Failed to initialize Google registration.");
      setGoogleLoading(false);
    }
  };

  const handleChange = (e) => {
    if (e.target.id === "phoneNumber") {
      const val = e.target.value.replace(/\D/g, "").substring(0, 11);
      setFormData({ ...formData, [e.target.id]: val });
      return;
    }
    if (e.target.id === "accountNumber") {
      const val = e.target.value.replace(/\D/g, "").substring(0, 8);
      setFormData({ ...formData, [e.target.id]: val });
      return;
    }
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const password = formData.password;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const firstNameValidation = validateName(formData.firstName);
  const middleNameValidation = formData.middleName ? validateName(formData.middleName) : { isValid: true };
  const lastNameValidation = validateName(formData.lastName);
  
  const firstNameHasIssue = formData.firstName && !firstNameValidation.isValid;
  const middleNameHasIssue = formData.middleName && !middleNameValidation.isValid;
  const lastNameHasIssue = formData.lastName && !lastNameValidation.isValid;
  const anyNameHasIssue = firstNameHasIssue || middleNameHasIssue || lastNameHasIssue;

  const phoneValidation = validatePhoneNumber(formData.phoneNumber);
  const phoneHasIssue = formData.phoneNumber && !phoneValidation.isValid;

  const handleRegister = async (e) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return toast.error("Please enter a complete and valid email address (e.g. name@example.com). Missing '@' or domain extension '.'");
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      return toast.error("Please provide both first name and last name.");
    }

    if (!firstNameValidation.isValid) return toast.error(`First Name: ${firstNameValidation.error}`);
    if (formData.middleName && !middleNameValidation.isValid) return toast.error(`Middle Name: ${middleNameValidation.error}`);
    if (!lastNameValidation.isValid) return toast.error(`Last Name: ${lastNameValidation.error}`);

    if (isDisposableEmail(formData.email)) {
      return toast.error("Registration rejected: Disposable or temporary email addresses (such as @vtmpj.com) cannot be verified and are not permitted. Please use a permanent, legitimate email address.");
    }

    if (!phoneValidation.isValid) {
      return toast.error(`Mobile Number: ${phoneValidation.error}`);
    }

    if (!formData.barangay) {
      return toast.error("Please select your residential barangay from the 63 Bulan barangays.");
    }

    if (!/^\d+$/.test(formData.accountNumber) || formData.accountNumber.trim().length !== 8) {
      return toast.error("Utility account number must contain numbers only (no letters allowed) and be exactly 8 digits.");
    }

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      return toast.error(
        "Password is too weak! It must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      );
    }

    if (formData.password !== formData.confirmPassword) {
      return toast.error("Passwords do not match.");
    }

    setLoading(true);
    try {
      // Check if account number is unique
      const { exists } = await api.auth.checkAccountNumber(formData.accountNumber.trim());
      if (exists) {
        setLoading(false);
        return toast.error("This utility number is already existing.");
      }

      const trimmedEmail = formData.email.trim().toLowerCase();
      const resolvedFullName = [formData.firstName.trim(), formData.middleName.trim(), formData.lastName.trim()]
        .filter(Boolean)
        .join(" ");

      await register({
        fullName: resolvedFullName,
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim(),
        lastName: formData.lastName.trim(),
        barangay: formData.barangay,
        email: trimmedEmail,
        password: formData.password,
        accountNumber: formData.accountNumber.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        hasUnpaidBill: Boolean(formData.hasUnpaidBill)
      });
      
      const confirmMessage = "Soreco-1 has sent you an email confirmation please check your email and verify.";
      toast.success(confirmMessage, {
        duration: 12000
      });

      // Redirect to Sign In page with email and message
      navigate("/login", {
        state: {
          email: trimmedEmail,
          registered: true,
          message: confirmMessage
        }
      });
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div 
      className="w-full min-h-[calc(100vh-80px)] bg-[#F8F6F2] flex flex-col items-center justify-start p-4 pt-6"
    >
      <Card 
        className="w-full max-w-2xl shadow-2xl border-slate-200/80 rounded-2xl relative cursor-default overflow-hidden bg-white p-0 gap-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 text-slate-400 hover:text-red-500 hover:bg-red-50 z-10 rounded-full"
          onClick={() => navigate("/")}
          title="Close registration"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Brand Banner */}
        <div className="bg-gradient-to-r from-[#D84315] via-[#E65100] to-[#F57C00] px-6 py-6 text-white text-center sm:text-left flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
            <Zap className="h-6 w-6 text-amber-300 fill-amber-300" />
          </div>
          <div>
            <div className="inline-block px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide uppercase mb-1">
              SORECO-1 Consumer Registration
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">Create Member Account</h2>
            <p className="text-xs text-orange-100 font-medium">
              Access digital bill tracking, submit inquiries, and monitor power advisories
            </p>
          </div>
        </div>

        <form onSubmit={handleRegister}>
          <CardContent className="p-6 space-y-6">
            
            {/* Quick Google Sign Up Option */}
            <div className="space-y-3 pb-3 border-b border-slate-100">
              <Button
                type="button"
                variant="outline"
                disabled={googleLoading}
                onClick={handleGoogleRegister}
                className="w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium flex items-center justify-center gap-2.5 rounded-xl shadow-2xs"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                <span className="text-sm font-semibold text-slate-700">
                  {googleLoading ? "Connecting to Google..." : "Fast Sign Up with Google"}
                </span>
              </Button>
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-semibold">
                  <span className="bg-white px-2.5 text-slate-400">Or complete manual application</span>
                </div>
              </div>
            </div>

            {/* Section 1: Personal Details */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 border-b border-slate-100 gap-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-orange-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    1. Member-Consumer Full Name
                  </h3>
                </div>
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Complete names only • No numbers allowed
                </span>
              </div>

              {anyNameHasIssue && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700 font-medium animate-in fade-in">
                  <X className="h-4 w-4 shrink-0 text-red-600" />
                  <span>
                    {firstNameHasIssue ? firstNameValidation.error : 
                     middleNameHasIssue ? middleNameValidation.error : 
                     lastNameValidation.error}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs font-semibold text-slate-700">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="e.g. Juan"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`h-10 text-sm focus-visible:ring-orange-500 ${
                      firstNameHasIssue ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""
                    }`}
                  />
                  {firstNameHasIssue ? (
                    <p className="text-[11px] text-red-600 font-medium">{firstNameValidation.error}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400">Legal first name (letters only)</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="middleName" className="text-xs font-semibold text-slate-700">
                    Middle Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="middleName"
                    placeholder="e.g. Delos"
                    value={formData.middleName}
                    onChange={handleChange}
                    className={`h-10 text-sm focus-visible:ring-orange-500 ${
                      middleNameHasIssue ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""
                    }`}
                  />
                  {middleNameHasIssue ? (
                    <p className="text-[11px] text-red-600 font-medium">{middleNameValidation.error}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400">Optional middle name</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs font-semibold text-slate-700">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="e.g. Santos"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`h-10 text-sm focus-visible:ring-orange-500 ${
                      lastNameHasIssue ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""
                    }`}
                  />
                  {lastNameHasIssue ? (
                    <p className="text-[11px] text-red-600 font-medium">{lastNameValidation.error}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400">Legal family name (letters only)</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Jurisdiction & Utility Account */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <MapPin className="h-4 w-4 text-orange-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. Barangay Jurisdiction & SORECO-1 Utility Account
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Barangay Selection (63 Barangays) */}
                <div className="space-y-1.5">
                  <Label htmlFor="barangay" className="text-xs font-semibold text-slate-700">
                    Barangay <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="barangay"
                      value={formData.barangay}
                      onChange={handleChange}
                      required
                      className="w-full h-10 px-3 pr-8 rounded-md border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
                    >
                      <option value="">-- Select from 63 Barangays --</option>
                      {BARANGAYS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-400">Select your registered residential location in Bulan.</p>
                </div>

                {/* Utility Account Number */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="accountNumber" className="text-xs font-semibold text-slate-700">
                      Utility Account Number <span className="text-red-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowAccountHint(!showAccountHint)}
                      className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
                    >
                      <HelpCircle className="h-3 w-3" /> Where to find?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="accountNumber"
                      placeholder="e.g. 10293847"
                      required
                      maxLength={8}
                      value={formData.accountNumber}
                      onChange={handleChange}
                      className="h-10 text-sm font-mono pr-10 focus-visible:ring-orange-500"
                    />
                    <ShieldCheck className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Enter the <strong>8-digit utility account number (e.g., ********)</strong> found on the upper section of your monthly SORECO-1 electric bill.
                  </p>
                </div>

                {/* Account Billing Status */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      Account Billing Status
                    </Label>
                    <div className="flex items-start gap-2.5 mt-0.5">
                      <input
                        type="checkbox"
                        id="hasUnpaidBill"
                        name="hasUnpaidBill"
                        checked={formData.hasUnpaidBill}
                        onChange={(e) => setFormData(prev => ({ ...prev, hasUnpaidBill: e.target.checked }))}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                      <label htmlFor="hasUnpaidBill" className="text-xs text-slate-700 cursor-pointer select-none leading-relaxed">
                        I currently have an unpaid bill / disconnected service requiring reconnection
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Check this box if your electric connection is currently disconnected due to unpaid arrears. If unchecked, your account will be registered as active and connected.
                    </p>
                  </div>
                </div>
              </div>

              {showAccountHint && (
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-200/70 text-xs text-orange-950 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
                  <HelpCircle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-orange-900">How to locate your Utility Account Number:</p>
                    <p className="text-slate-700">
                      Look at the topmost header box of your official SORECO-1 paper or digital electric bill statement. Look for the label <strong>"ACCOUNT NO."</strong> or <strong>"UTILITY NO."</strong> displaying an 8-digit identifier (for example: <code className="font-mono bg-white px-1 py-0.5 rounded border border-orange-200">10293847</code>).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Contact Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <Mail className="h-4 w-4 text-orange-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  3. Contact Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      required
                      pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                      title="Please enter a valid email address with '@' and a domain (e.g. name@example.com)"
                      value={formData.email}
                      onChange={handleChange}
                      className="h-10 text-sm focus-visible:ring-orange-500 pr-10"
                    />
                    <Mail className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-400">A verification link will be delivered to this email to activate your account.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumber" className="text-xs font-semibold text-slate-700">
                    Mobile Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="phoneNumber"
                      placeholder="09XX XXX XXXX"
                      required
                      maxLength={11}
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      className={`h-10 text-sm focus-visible:ring-orange-500 pr-10 ${
                        phoneHasIssue ? "border-red-500 focus-visible:ring-red-500 bg-red-50/30" : ""
                      }`}
                    />
                    <Phone className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  {phoneHasIssue ? (
                    <p className="text-[11px] text-red-600 font-medium">{phoneValidation.error}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400">11 digits starting with 09 (e.g. 09171234567)</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Password Security */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <Lock className="h-4 w-4 text-orange-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  4. Security Credentials
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="h-10 text-sm pr-10 focus-visible:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="h-10 text-sm pr-10 focus-visible:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password strength requirements */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
                <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                  Password Security Requirements:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="flex items-center gap-1.5">
                    {hasUppercase ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                    )}
                    <span className={hasUppercase ? "text-emerald-700 font-medium" : "text-slate-500"}>
                      Uppercase (A-Z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasLowercase ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                    )}
                    <span className={hasLowercase ? "text-emerald-700 font-medium" : "text-slate-500"}>
                      Lowercase (a-z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasNumber ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                    )}
                    <span className={hasNumber ? "text-emerald-700 font-medium" : "text-slate-500"}>
                      Number (0-9)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasSpecial ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                    )}
                    <span className={hasSpecial ? "text-emerald-700 font-medium" : "text-slate-500"}>
                      Symbol (!@#$)
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </CardContent>

          <CardFooter className="p-6 pt-0 flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full h-11 bg-[#E65100] hover:bg-[#D84315] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Complete Registration
            </Button>

            <div className="text-center text-xs text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="text-orange-600 font-bold hover:underline">
                Sign in to your portal
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
export default RegisterPage;
