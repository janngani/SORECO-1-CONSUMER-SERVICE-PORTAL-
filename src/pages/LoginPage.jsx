import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { useAuth } from "@/src/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogIn, Loader2, ArrowLeft, Mail, Lock, KeyRound, CheckCircle2, ShieldAlert, Eye, EyeOff, Send, RefreshCw, Zap, X, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { cn } from "@/lib/utils";

export const LoginPage = () => {
  const { login, sendOtp, verifyOtp, resetPassword, resendConfirmation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupBanner, setSignupBanner] = useState(null);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [unauthorizedNotice, setUnauthorizedNotice] = useState(null);
  const [showResendBox, setShowResendBox] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Failed login lockout & countdown states (10 failed attempts -> 60s cooldown)
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);

  // Flow views: "login" | "forgot" (enter email) | "otp" (enter 6-digit OTP) | "reset" (create new password)
  const [view, setView] = useState("login");
  const [resetEmail, setResetEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  useEffect(() => {
    let timer;
    if (otpResendCountdown > 0) {
      timer = setTimeout(() => setOtpResendCountdown(otpResendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpResendCountdown]);

  const checkLockoutStatus = async (targetEmail) => {
    try {
      const emailParam = targetEmail ? `?email=${encodeURIComponent(targetEmail.trim().toLowerCase())}` : "";
      const res = await fetch(`/api/auth/lockout-status${emailParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.locked && data.remainingSeconds > 0) {
          setLockoutSeconds(data.remainingSeconds);
          setAttemptsRemaining(0);
          localStorage.setItem("login_lockout_until", (Date.now() + data.remainingSeconds * 1000).toString());
        } else if (data.attemptsLeft !== undefined && data.attemptsLeft < 10) {
          setAttemptsRemaining(data.attemptsLeft);
        } else if (!data.locked) {
          if (lockoutSeconds === 0) {
            localStorage.removeItem("login_lockout_until");
          }
        }
      }
    } catch {
      // Non-blocking network check
    }
  };

  useEffect(() => {
    const savedLockout = localStorage.getItem("login_lockout_until");
    if (savedLockout) {
      const until = parseInt(savedLockout, 10);
      const remaining = Math.ceil((until - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutSeconds(remaining);
      } else {
        localStorage.removeItem("login_lockout_until");
      }
    }
    // Sync with backend lockout status on mount
    checkLockoutStatus();
  }, []);

  useEffect(() => {
    let timer;
    if (lockoutSeconds > 0) {
      timer = setInterval(() => {
        setLockoutSeconds((prev) => {
          if (prev <= 1) {
            localStorage.removeItem("login_lockout_until");
            setAttemptsRemaining(null);
            toast.info("Security cooldown period ended. You may now attempt to sign in.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (location.state?.email) {
      const cleanRegEmail = location.state.email.trim().toLowerCase();
      setEmail(cleanRegEmail);
      setResetEmail(cleanRegEmail);
      setRegisteredEmail(cleanRegEmail);
    }
    if (location.state?.message) {
      setSignupBanner(location.state.message);
    }
    
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("confirmed") === "true") {
      setSignupBanner("Your email has been confirmed successfully! You can now log in with your password.");
      setRegisteredEmail("");
    }
  }, [location.state]);

  useEffect(() => {
    const checkRecovery = async () => {
      const hash = window.location.hash;
      const search = window.location.search;
      
      if (search.includes("recovery=true") || hash.includes("type=recovery") || hash.includes("access_token")) {
        setView("reset");
        toast.info("Recovery session active! Please enter your new password below.");
      }
    };
    checkRecovery();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    try {
      localStorage.setItem("oauth_intent", "login");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to initialize Google login.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (lockoutSeconds > 0) {
      toast.error(`Account access suspended. Please wait ${lockoutSeconds} second${lockoutSeconds === 1 ? '' : 's'} for the security cooldown to complete.`);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a complete and valid email address (e.g. name@example.com). Missing '@' or domain extension '.'");
      return;
    }

    setUnauthorizedNotice(null);
    setLoading(true);
    try {
      const loggedInUser = await login({ email: email.trim().toLowerCase(), password });

      // Clear any lockout state on success
      localStorage.removeItem("login_lockout_until");
      setAttemptsRemaining(null);
      setLockoutSeconds(0);

      // Immediate frontend security verification
      if (loggedInUser.role !== "admin" && /\d/.test(loggedInUser.fullName || "")) {
        setUnauthorizedNotice(
          `Access Denied: The account "${loggedInUser.fullName}" is not authorized to log in because it uses numbers in the name. SORECO-1 policy requires complete legal names only.`
        );
        toast.error("Log in is not authorized for accounts using numbers with their names.");
        return;
      }

      toast.success(`Welcome back, ${loggedInUser.fullName || "User"}!`);
      const isAdminTarget = Boolean(
        loggedInUser.role === "admin" ||
        loggedInUser.role?.toLowerCase() === "admin" ||
        loggedInUser.isAdmin === true ||
        loggedInUser.email === "admin01@gmail.com" ||
        loggedInUser.email === "janry.maligaso@sorsu.edu.ph" ||
        loggedInUser.email === "admin@gov.ph"
      );
      if (isAdminTarget) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.message || "";
      if (error.locked || error.status === 429 || errMsg.includes("10 in a row") || errMsg.includes("temporarily locked") || errMsg.includes("Too many failed login attempts")) {
        const secs = Number(error.remainingSeconds) || 60;
        setLockoutSeconds(secs);
        setAttemptsRemaining(0);
        localStorage.setItem("login_lockout_until", (Date.now() + secs * 1000).toString());
        toast.error(`Security Cooldown: 10 failed login attempts. Please wait ${secs}s before trying again.`);
      } else if (error.attemptsLeft !== undefined) {
        setAttemptsRemaining(error.attemptsLeft);
        if (error.attemptsLeft <= 3 && error.attemptsLeft > 0) {
          toast.warning(`Invalid credentials. ${error.attemptsLeft} attempt${error.attemptsLeft > 1 ? "s" : ""} remaining before a 60-second cooldown.`);
        } else {
          toast.error(errMsg || "Invalid login credentials. Please check your email and password.");
        }
      } else if (
        errMsg.includes("not authorized") ||
        errMsg.includes("unauthorized") ||
        errMsg.includes("numbers with their names") ||
        errMsg.includes("numbers in their name") ||
        errMsg.includes("Access Denied")
      ) {
        setUnauthorizedNotice(errMsg);
        toast.error(errMsg);
      } else if (errMsg.includes("not confirmed") || errMsg.includes("Email not confirmed")) {
        setShowResendBox(true);
        toast.error("Your email has not been confirmed yet. Please check your inbox for the confirmation email.");
      } else {
        toast.error(errMsg || "Invalid login credentials. Please check your email and password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const cleanInputEmail = email.trim().toLowerCase();
    const targetEmail = registeredEmail || cleanInputEmail || resetEmail.trim().toLowerCase();
    
    if (!targetEmail) {
      return toast.error("Please enter your registered email address first.");
    }

    // Security check: If registeredEmail is set from registration, user cannot arbitrarily alter it to another address
    if (registeredEmail && cleanInputEmail && cleanInputEmail !== registeredEmail) {
      return toast.error(
        `Confirmation can only be resent to your registered email (${registeredEmail}). If you need to use a different address, please register again.`
      );
    }

    setResendLoading(true);
    try {
      await resendConfirmation(targetEmail);
      toast.success("Soreco-1 has sent you an email confirmation please check your email and verify.");
      setShowResendBox(false);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Could not resend confirmation email. Please verify the email address.");
    } finally {
      setResendLoading(false);
    }
  };

  // Step 1: User enters email -> Server generates secure 6-digit OTP -> Sends OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail) {
      return toast.error("Please enter your registered email address");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return toast.error("Please enter a complete and valid email address (e.g. name@example.com). Missing '@' or domain extension '.'");
    }
    setLoading(true);
    try {
      await sendOtp(cleanEmail);
      toast.success("Soreco-1 has sent you an OTP. Please check your email.");
      setView("otp");
      setOtpResendCountdown(60); // 60s cooldown for resend
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to send verification code. Please check your email address.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: User enters OTP -> Server verifies OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();
    const cleanOtp = otpCode.trim();
    if (!cleanEmail) {
      return toast.error("Email address missing. Please start over.");
    }
    if (!cleanOtp || cleanOtp.length !== 6) {
      return toast.error("Please enter the 6-digit verification code sent to your email");
    }

    setLoading(true);
    try {
      const res = await verifyOtp(cleanEmail, cleanOtp);
      toast.success(res.message || "Verification code confirmed!");
      setView("reset");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Invalid or expired verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: User creates new password -> Supabase Auth updates password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail) {
      return toast.error("Please enter your registered email address");
    }
    if (!newPassword) {
      return toast.error("Please enter a new password");
    }
    if (newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters long");
    }
    if (newPassword !== confirmNewPassword) {
      return toast.error("Passwords do not match");
    }

    setLoading(true);
    try {
      const res = await resetPassword(newPassword, cleanEmail, otpCode.trim());
      toast.success(res.message || "Your password has been successfully updated!");
      setView("login");
      setResetEmail("");
      setOtpCode("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to update password. Please check your verification code.");
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
          onClick={() => {
            if (view !== "login") {
              setView("login");
              setResetSent(false);
            } else {
              navigate("/");
            }
          }}
          title="Back"
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
              SORECO-1 Consumer Portal
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              {view === "login" ? "Sign In to Member Account" : view === "forgot" ? "Reset Password" : view === "otp" ? "Enter Verification Code" : "Create New Password"}
            </h2>
            <p className="text-xs text-orange-100 font-medium">
              {view === "login"
                ? "Access digital bill tracking, submit inquiries, and monitor power advisories"
                : view === "forgot"
                ? "Enter your registered email to receive a password reset code"
                : view === "otp"
                ? "Enter the 6-digit OTP code sent to your inbox"
                : "Enter your new secure password"}
            </p>
          </div>
        </div>

        {view === "login" && (
          <form onSubmit={handleLogin}>
            <CardContent className="p-6 space-y-6">
              
              {/* Quick Google Sign In Option */}
              <div className="space-y-3 pb-3 border-b border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || lockoutSeconds > 0}
                  className="w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-medium flex items-center justify-center gap-2.5 rounded-xl shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={handleGoogleLogin}
                >
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
                  Continue with Google
                </Button>
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-4 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Or sign in with email</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>
              </div>

              {/* 10-Attempt Lockout Countdown Alert */}
              {lockoutSeconds > 0 && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 text-xs flex items-start gap-3 shadow-md animate-in fade-in duration-200">
                  <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200 shadow-2xs">
                    <Clock className="h-5 w-5 animate-spin" style={{ animationDuration: '4s' }} />
                  </div>
                  <div className="flex-1 text-left space-y-1.5 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                      <p className="font-extrabold text-rose-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        Account Access Cooldown
                      </p>
                      <span className="font-mono font-black text-rose-700 bg-rose-100/90 border border-rose-300 px-2.5 py-0.5 rounded-full text-xs shadow-2xs self-start sm:self-auto">
                        {formatCountdown(lockoutSeconds)}
                      </span>
                    </div>
                    <p className="text-rose-800 text-xs leading-relaxed font-medium">
                      Too many consecutive failed login attempts (10 in a row). For security protection, login attempts are suspended for 60 seconds.
                    </p>
                    <div className="w-full bg-rose-200/80 h-1.5 rounded-full overflow-hidden mt-2">
                      <div 
                        className="bg-rose-600 h-full transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${Math.min(100, (lockoutSeconds / 60) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Warning Notice when approaching 10 failed attempts */}
              {attemptsRemaining !== null && attemptsRemaining <= 3 && attemptsRemaining > 0 && lockoutSeconds === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex items-center gap-2.5 shadow-2xs animate-in fade-in">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="font-medium text-xs leading-normal">
                    Security Warning: <strong>{attemptsRemaining}</strong> attempt{attemptsRemaining > 1 ? "s" : ""} remaining before a 60-second lockout is enforced.
                  </p>
                </div>
              )}

              {unauthorizedNotice && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-start gap-3 shadow-xs animate-in fade-in">
                  <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-left space-y-1.5">
                    <p className="font-bold text-red-900 text-xs tracking-wider uppercase">Log In Not Authorized</p>
                    <p className="text-red-800 text-xs leading-relaxed font-medium">
                      {unauthorizedNotice}
                    </p>
                    <p className="text-slate-600 text-[11px] leading-normal">
                      Per SORECO-1 system policy, accounts registered with numbers in their name cannot be authorized. Consumers must use their complete legal name only (letters only).
                    </p>
                    <div className="pt-1">
                      <Link
                        to="/register"
                        className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-900 underline"
                      >
                        Register a new account with complete name &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {signupBanner && (
                <div className="p-4 bg-amber-50/95 border border-amber-200/90 rounded-2xl text-amber-900 text-sm flex items-start gap-3 shadow-xs">
                  <Mail className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-left space-y-2">
                    <div>
                      <p className="font-bold text-amber-900 text-xs tracking-wider uppercase">Verification Pending</p>
                      <p className="text-amber-800 text-xs mt-0.5 font-medium leading-relaxed">{signupBanner}</p>
                    </div>

                    {registeredEmail && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/70 border border-amber-200/80 text-[11px] font-mono font-bold text-amber-950">
                        <span>Target:</span>
                        <span>{registeredEmail}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendLoading}
                        className="text-xs font-bold text-amber-950 hover:text-amber-800 hover:underline flex items-center gap-1.5 cursor-pointer"
                      >
                        {resendLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Resend confirmation email
                      </button>

                      {registeredEmail && (
                        <Link
                          to="/register"
                          onClick={() => { setSignupBanner(null); setRegisteredEmail(""); }}
                          className="text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline"
                        >
                          Wrong address? Register with correct email &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {showResendBox && !signupBanner && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center justify-between">
                  <span className="font-medium">Need another confirmation link?</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={resendLoading}
                    onClick={handleResendConfirmation}
                    className="text-xs h-7 border-blue-300 text-blue-700 bg-white hover:bg-blue-100"
                  >
                    {resendLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                    Resend
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  required
                  pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                  title="Please enter a valid email address with '@' and a domain (e.g. name@example.com)"
                  value={email}
                  disabled={loading || lockoutSeconds > 0}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => checkLockoutStatus(email)}
                  className="focus-visible:ring-primary border-slate-200 h-11 rounded-xl disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                  <button
                    type="button"
                    disabled={lockoutSeconds > 0}
                    onClick={() => setView("forgot")}
                    className="text-xs text-primary hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={password}
                    disabled={loading || lockoutSeconds > 0}
                    onChange={(e) => setPassword(e.target.value)}
                    className="focus-visible:ring-primary border-slate-200 pr-10 h-11 rounded-xl disabled:bg-slate-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    disabled={lockoutSeconds > 0}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className={cn(
                  "w-full text-white transition-all text-sm font-bold h-11 rounded-xl shadow-md",
                  lockoutSeconds > 0 
                    ? "bg-slate-400 cursor-not-allowed opacity-90 text-white" 
                    : "bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90"
                )}
                disabled={loading || lockoutSeconds > 0}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : lockoutSeconds > 0 ? (
                  <span className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4 animate-pulse" />
                    Security Cooldown ({formatCountdown(lockoutSeconds)})
                  </span>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In to Portal
                  </>
                )}
              </Button>

              <div className="text-center text-xs text-slate-500 pt-2">
                Don't have a consumer account?{" "}
                <Link to="/register" className="text-primary font-semibold hover:underline">
                  Register here
                </Link>
              </div>

            </CardContent>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={handleSendOtp}>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="resetEmail" className="text-slate-700 font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="resetEmail"
                    type="email"
                    placeholder="your-email@example.com"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10 focus-visible:ring-primary border-slate-200 h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  className="w-full text-white bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 transition-all text-sm font-bold h-11 rounded-xl shadow-md"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Verification Code"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-600 hover:text-slate-900 text-xs font-semibold h-10 rounded-xl"
                  onClick={() => setView("login")}
                >
                  Cancel & Return to Sign In
                </Button>
              </div>
            </CardContent>
          </form>
        )}

        {view === "otp" && (
          <form onSubmit={handleVerifyOtp}>
            <CardContent className="p-6 space-y-6 text-center">
              <p className="text-xs text-slate-600">
                We sent a 6-digit OTP code to <strong className="text-slate-900">{resetEmail}</strong>. Please enter it below.
              </p>
              <div className="space-y-2">
                <Label htmlFor="otpCode" className="text-slate-700 font-medium">6-Digit OTP Code</Label>
                <div className="relative max-w-xs mx-auto">
                  <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="otpCode"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="pl-10 tracking-widest text-lg font-mono text-center focus-visible:ring-primary border-slate-200 h-11 rounded-xl"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Code expires in 10 minutes.</p>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={loading || otpResendCountdown > 0}
                  className="text-xs font-semibold text-primary hover:underline disabled:text-slate-400 disabled:no-underline"
                >
                  {otpResendCountdown > 0
                    ? `Resend code in ${otpResendCountdown}s`
                    : "Didn't receive code? Resend OTP"}
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  className="w-full text-white bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 transition-all text-sm font-bold h-11 rounded-xl shadow-md"
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify Code"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-600 hover:text-slate-900 text-xs font-semibold h-10 rounded-xl"
                  onClick={() => setView("forgot")}
                >
                  Change Email Address
                </Button>
              </div>
            </CardContent>
          </form>
        )}

        {view === "reset" && (
          <form onSubmit={handleResetPassword}>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-slate-700 font-medium">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="focus-visible:ring-primary border-slate-200 pr-10 h-11 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword" className="text-slate-700 font-medium">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmNewPassword"
                    type={showConfirmNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="focus-visible:ring-primary border-slate-200 pr-10 h-11 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  className="w-full text-white bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 transition-all text-sm font-bold h-11 rounded-xl shadow-md"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save New Password"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-600 hover:text-slate-900 text-xs font-semibold h-10 rounded-xl"
                  onClick={() => {
                    setView("login");
                    setResetEmail("");
                    setOtpCode("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </form>
        )}
      </Card>
    </div>
  );
};

