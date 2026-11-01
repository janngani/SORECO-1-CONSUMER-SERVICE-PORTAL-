import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import { supabase } from "@/src/lib/supabase";
import { toast } from "sonner";

const AuthContext = createContext({
  user: null,
  userData: null,
  loading: true,
  isAdmin: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  forgotPassword: async () => {},
  resetPassword: async () => {},
  resendConfirmation: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Derive isAdmin reactively from user so it is always 100% in sync without race conditions
  const isAdmin = Boolean(
    user && (
      user.role === "admin" ||
      user.role?.toLowerCase() === "admin" ||
      user.isAdmin === true ||
      user.email === "admin01@gmail.com" ||
      user.email === "janry.maligaso@sorsu.edu.ph" ||
      user.email === "admin@gov.ph"
    )
  );

  const fetchProfile = async (sessionToken) => {
    if (!sessionToken) {
      localStorage.removeItem("auth_token");
      setUser(null);
      setLoading(false);
      return;
    }
    localStorage.setItem("auth_token", sessionToken);
    let retries = 3;
    let delay = 1000;
    let success = false;
    let lastError = null;

    while (retries > 0 && !success) {
      try {
        const data = await api.auth.me();
        
        // Clear any stored OAuth intent
        localStorage.removeItem("oauth_intent");

        const isUserAdmin = Boolean(
          data?.role === "admin" ||
          data?.role?.toLowerCase() === "admin" ||
          data?.isAdmin === true ||
          data?.email === "admin01@gmail.com" ||
          data?.email === "janry.maligaso@sorsu.edu.ph" ||
          data?.email === "admin@gov.ph"
        );

        if (isUserAdmin && data) {
          data.role = "admin";
          data.isAdmin = true;
        }

        // Name restriction check removed
        
        setUser(data);
        success = true;
      } catch (error) {
        lastError = error;
        const errMsg = error?.message || "";
        if (errMsg.includes("401") || errMsg.includes("403") || errMsg.includes("Unauthorized") || errMsg.includes("Access Denied") || errMsg.includes("numbers in their name") || errMsg.includes("expired") || errMsg.includes("Invalid or expired session")) {
          console.info("Definitive auth failure, logging out:", errMsg);
          localStorage.removeItem("auth_token");
          setUser(null);
          setLoading(false);
          return;
        }
        console.warn(`Transient/network error fetching user profile, retrying (${retries} left):`, errMsg);
        retries--;
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.5;
        }
      }
    }

    if (!success) {
      console.warn("Failed to fetch user profile after retries:", lastError);
      const errMsg = lastError?.message || "";
      if (errMsg.includes("401") || errMsg.includes("Unauthorized") || errMsg.includes("expired") || errMsg.includes("Invalid or expired session")) {
        localStorage.removeItem("auth_token");
        setUser(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        // 1. Handle Supabase email confirmation via token_hash (e.g. ?token_hash=...&type=signup or email)
        const tokenHash = searchParams.get("token_hash");
        const otpType = searchParams.get("type");
        if (tokenHash && otpType) {
          try {
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: otpType
            });
            if (!error && data?.session?.access_token) {
              localStorage.setItem("auth_token", data.session.access_token);
              // Clean URL query
              window.history.replaceState({}, document.title, window.location.pathname);
              toast.success("Your email has been confirmed successfully! Welcome to SORECO-1 Portal.");
              await fetchProfile(data.session.access_token);
              return;
            } else if (error) {
              console.warn("Error verifying OTP from email link:", error.message);
              toast.error(`Confirmation error: ${error.message}`);
            }
          } catch (otpErr) {
            console.error("Exception during verifyOtp:", otpErr);
          }
        }

        // 2. Handle PKCE authorization code exchange (e.g. ?code=...)
        const code = searchParams.get("code");
        if (code) {
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error && data?.session?.access_token) {
              localStorage.setItem("auth_token", data.session.access_token);
              window.history.replaceState({}, document.title, window.location.pathname);
              toast.success("Authentication completed successfully!");
              await fetchProfile(data.session.access_token);
              return;
            }
          } catch (codeErr) {
            console.warn("Exception during exchangeCodeForSession:", codeErr);
          }
        }

        // 3. Handle email confirmation success indicator in query
        if (searchParams.get("confirmed") === "true") {
          toast.success("Email confirmed successfully! You can now log in or access the portal.");
        }

        // 4. Handle error redirect from Supabase
        const authErrorDesc = hashParams.get("error_description") || searchParams.get("error_description");
        if (authErrorDesc) {
          const decoded = decodeURIComponent(authErrorDesc.replace(/\+/g, " "));
          console.warn("Supabase Auth Notice:", decoded);
          toast.error(decoded);
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // 5. Check hash fragment for signup confirmation or access tokens
        if (window.location.hash.includes("type=signup")) {
          toast.success("Your email has been confirmed successfully! Welcome to SORECO-1 Portal.");
        }

        // 6. Check existing session or local storage
        const token = localStorage.getItem("auth_token");
        if (token) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              await fetchProfile(session.access_token);
            } else if (token) {
              await fetchProfile(token);
            } else {
              localStorage.removeItem("auth_token");
              setUser(null);
              setLoading(false);
            }
          } catch (sessionErr) {
            console.warn("Error getting supabase session, falling back to local token:", sessionErr);
            await fetchProfile(token);
          }
        } else {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              localStorage.setItem("auth_token", session.access_token);
              await fetchProfile(session.access_token);
            } else {
              setUser(null);
              setLoading(false);
            }
          } catch {
            setUser(null);
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn("Initial session fetch error:", err);
        setLoading(false);
      }
    };

    initAuth();

    const handleAuthExpired = () => {
      localStorage.removeItem("auth_token");
      setUser(null);
    };

    const handleRefreshProfile = () => {
      const token = localStorage.getItem("auth_token");
      if (token) {
        fetchProfile(token);
      }
    };

    window.addEventListener("auth-expired", handleAuthExpired);
    window.addEventListener("refresh-user-profile", handleRefreshProfile);
    window.addEventListener("user-status-updated", handleRefreshProfile);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.access_token) {
          const currentToken = localStorage.getItem("auth_token");
          if (currentToken !== session.access_token || !user) {
            localStorage.setItem("auth_token", session.access_token);
            await fetchProfile(session.access_token);
          }
        } else if (event === "SIGNED_OUT") {
          localStorage.removeItem("auth_token");
          setUser(null);
        }
      }
    );

    return () => {
      window.removeEventListener("auth-expired", handleAuthExpired);
      window.removeEventListener("refresh-user-profile", handleRefreshProfile);
      window.removeEventListener("user-status-updated", handleRefreshProfile);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const login = async (credentials) => {
    const data = await api.auth.login(credentials.email, credentials.password);
    if (data && data.session && data.session.access_token) {
      localStorage.setItem("auth_token", data.session.access_token);
      try {
        if (data.session.refresh_token) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });
        }
      } catch (syncErr) {
        console.warn("Could not set supabase client session:", syncErr);
      }
      const profileData = await api.auth.me();

      if (profileData) {
        const isUserAdmin = Boolean(
          profileData.role === "admin" ||
          profileData.role?.toLowerCase() === "admin" ||
          profileData.isAdmin === true ||
          profileData.email === "admin01@gmail.com" ||
          profileData.email === "janry.maligaso@sorsu.edu.ph" ||
          profileData.email === "admin@gov.ph"
        );
        if (isUserAdmin) {
          profileData.role = "admin";
          profileData.isAdmin = true;
        }
      }

      // Check whether user's name has numbers
      if (profileData && profileData.role !== "admin" && /\d/.test(profileData.fullName || "")) {
        localStorage.removeItem("auth_token");
        try {
          await supabase.auth.signOut();
        } catch {}
        setUser(null);
        throw new Error(
          "Access Denied: Log in is not authorized for accounts using numbers with their names. In accordance with SORECO-1 policy, only complete legal names are permitted."
        );
      }

      setUser(profileData);
      return profileData;
    }
    throw new Error("Invalid login response. Please try again.");
  };

  const register = async (formData) => {
    const data = await api.auth.register({
      fullName: formData.fullName,
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      barangay: formData.barangay,
      email: formData.email,
      password: formData.password,
      accountNumber: formData.accountNumber,
      phoneNumber: formData.phoneNumber
    });
    return {
      success: true,
      supabaseConfirmRequired: data?.supabaseConfirmRequired ?? (!data?.session),
      session: data?.session || null,
      user: data?.user || null,
      email: formData.email,
      message: data?.message
    };
  };

  const resendConfirmation = async (email) => {
    return await api.auth.resendConfirmation(email);
  };

  const updateProfile = async (profileData) => {
    const res = await api.auth.updateProfile(profileData);
    if (res?.user) {
      setUser(res.user);
      return res.user;
    }
    const updated = await api.auth.me();
    setUser(updated);
    return updated;
  };

  const completeOnboarding = async (formData) => {
    const res = await api.auth.completeOnboarding(formData);
    if (res?.user) {
      setUser(res.user);
      return res.user;
    }
    const updated = await api.auth.me();
    setUser(updated);
    return updated;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase signOut error:", e);
    }
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  const sendOtp = async (email) => {
    return await api.auth.sendOtp(email);
  };

  const verifyOtp = async (email, otp) => {
    return await api.auth.verifyOtp(email, otp);
  };

  const forgotPassword = async (email) => {
    return await api.auth.sendOtp(email);
  };

  const resetPassword = async (newPassword, email, otp = null) => {
    if (email) {
      return await api.auth.resetPassword(email, newPassword, otp);
    }
    throw new Error("Email is required for resetting password");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData: user,
        loading,
        isAdmin,
        login,
        register,
        resendConfirmation,
        updateProfile,
        completeOnboarding,
        logout,
        sendOtp,
        verifyOtp,
        forgotPassword,
        resetPassword,
        refreshUser: () => fetchProfile(localStorage.getItem("auth_token"))
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
