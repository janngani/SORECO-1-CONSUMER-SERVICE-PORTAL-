import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Mail, Phone, MapPin, Facebook, Globe, Shield, FileText } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";

export const Footer = () => {
  const location = useLocation();
  const { isAdmin, userData } = useAuth();
  const [settings, setSettings] = useState({
    phoneNumber: "(056) 555-0199 / +63 917-888-2626",
    email: "info@soreco1.com.ph",
    facebookUrl: "https://facebook.com/soreco1",
    websiteUrl: "https://soreco-1.onrender.com",
    address: "Zone-5, Immaculada Concepcion Street, Bulan, Sorsogon, Philippines",
    logoUrl: null,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.settings.get("system");
        if (data && data.value) {
          const parsed = JSON.parse(data.value);
          setSettings((prev) => ({
            phoneNumber: parsed.phoneNumber || prev.phoneNumber,
            email: parsed.email || prev.email,
            facebookUrl: parsed.facebookUrl || prev.facebookUrl,
            websiteUrl: parsed.websiteUrl || prev.websiteUrl,
            address: parsed.address || prev.address,
            logoUrl: parsed.logoUrl || prev.logoUrl,
          }));
        }
      } catch (e) {
      }
    };
    fetchSettings();

    const handleSettingsUpdated = (e) => {
      if (e.detail) {
        setSettings((prev) => ({
          phoneNumber: e.detail.phoneNumber || prev.phoneNumber,
          email: e.detail.email || prev.email,
          facebookUrl: e.detail.facebookUrl || prev.facebookUrl,
          websiteUrl: e.detail.websiteUrl || prev.websiteUrl,
          address: e.detail.address || prev.address,
          logoUrl: e.detail.logoUrl || prev.logoUrl,
        }));
      }
    };

    window.addEventListener("system-settings-updated", handleSettingsUpdated);
    return () => {
      window.removeEventListener("system-settings-updated", handleSettingsUpdated);
    };
  }, []);

  if (
    isAdmin || 
    location.pathname.startsWith("/admin") || 
    location.pathname.startsWith("/barangays") || 
    location.pathname.startsWith("/ticket")
  ) {
    return null;
  }
  return <footer className="bg-slate-900 text-slate-300 py-12 lg:py-16 font-sans">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 lg:gap-12 mb-10 lg:mb-12">

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="SORECO-1 Logo" className="h-9 w-9 object-contain" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-extrabold text-sm shadow-sm">
                  S1
                </div>
              )}
              <span className="text-white text-lg font-black tracking-tight font-poppins">
                SORECO-1
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Sorsogon I Electric Cooperative, Inc. (SORECO-1) is dedicated to providing reliable, digitized, and highly affordable electrical service across Sorsogon's First District.
            </p>
            <div className="flex gap-3 pt-2">
              <a
                href="https://www.facebook.com/soreco1"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-700 transition-colors"
                title="Facebook Page"
                aria-label="SORECO-1 Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a 
                href="https://www.soreco1.org" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-700 transition-colors" 
                title="Official Website"
                aria-label="SORECO-1 Website"
              >
                <Globe className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-white text-sm font-bold font-poppins uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-primary transition-colors">Services Overview</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-primary transition-colors">Contact Support</Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-white text-sm font-bold font-poppins uppercase tracking-wider">Online Services</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {userData?.hasUnpaidBill && (
                <li>
                  <Link to="/services/reconnection" className="hover:text-primary transition-colors">Reconnection of Service</Link>
                </li>
              )}
              <li>
                <Link to="/services/billing-dispute" className="hover:text-primary transition-colors">Billing Disputes & Audits</Link>
              </li>
              <li>
                <Link to="/services/other-billing" className="hover:text-primary transition-colors">Other Billing Issues</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-primary transition-colors">Secure Consumer Portal</Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-primary transition-colors">Register Account</Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-white text-sm font-bold font-poppins uppercase tracking-wider">Bulan Main Office</h4>
            <ul className="space-y-3.5 text-xs text-slate-400">
              <li className="flex gap-2.5">
                <MapPin className="h-4.5 w-4.5 text-primary flex-shrink-0" />
                <span>{settings.address}</span>
              </li>
              <li className="flex gap-2.5">
                <Phone className="h-4.5 w-4.5 text-primary flex-shrink-0" />
                <span>{settings.phoneNumber}</span>
              </li>
              <li className="flex gap-2.5">
                <Mail className="h-4.5 w-4.5 text-primary flex-shrink-0" />
                <span>{settings.email}</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-slate-800 pt-8 mt-12 text-slate-500 text-xs flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {(/* @__PURE__ */ new Date()).getFullYear()} Sorsogon I Electric Cooperative, Inc. All rights reserved.</p>
          <div className="flex gap-6 text-[11px]">
            <Link to="/privacy-policy" className="hover:text-primary transition-colors flex items-center gap-1">
              <Shield className="h-3 w-3" /> Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="hover:text-primary transition-colors flex items-center gap-1">
              <FileText className="h-3 w-3" /> Terms & Conditions
            </Link>
          </div>
        </div>

      </div>
    </footer>;
};
