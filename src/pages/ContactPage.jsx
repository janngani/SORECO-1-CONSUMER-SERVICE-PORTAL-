import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Facebook, 
  Clock, 
  AlertTriangle, 
  Building2, 
  PhoneCall, 
  CreditCard, 
  Wrench, 
  Headphones, 
  Compass, 
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { api } from "@/src/lib/api";

export const ContactPage = () => {
  const [additionalContacts, setAdditionalContacts] = useState([]);

  useEffect(() => {
    const loadAdditional = async () => {
      try {
        const res = await api.settings.get("system");
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed.additionalContacts && Array.isArray(parsed.additionalContacts)) {
            setAdditionalContacts(parsed.additionalContacts);
          }
        }
      } catch (e) {}
    };
    loadAdditional();
  }, []);
  const departments = [
    {
      id: "dept-emergency",
      icon: AlertTriangle,
      badge: "24/7 Line Service",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      title: "24/7 Emergency & Dispatch",
      description: "Immediate reporting for downed power lines, sudden blackouts, transformer sparks, and electrical hazards.",
      contacts: [
        { label: "Dispatch Hotline (Globe)", value: "+63 917-888-2626", href: "tel:+639178882626" },
        { label: "Dispatch Hotline (Smart)", value: "+63 920-999-2626", href: "tel:+639209992626" },
        { label: "Landline Trouble Desk", value: "(056) 555-0199", href: "tel:0565550199" }
      ]
    },
    {
      id: "dept-services",
      icon: Headphones,
      badge: "Consumer Support",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      title: "Member-Consumer Services",
      description: "Assistance with new electrical connections, membership requirements, account transfers, and general inquiries.",
      contacts: [
        { label: "Customer Helpdesk", value: "+63 917-555-1234", href: "tel:+639175551234" },
        { label: "Email Support", value: "info@soreco1.com.ph", href: "mailto:info@soreco1.com.ph" },
        { label: "Institutional Inquiries", value: "services@soreco1.com.ph", href: "mailto:services@soreco1.com.ph" }
      ]
    },
    {
      id: "dept-billing",
      icon: CreditCard,
      badge: "Accounts & Payments",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      title: "Billing & Collection Division",
      description: "Inquiries on monthly statement computation, meter reading clarifications, payment verification, and senior citizen discounts.",
      contacts: [
        { label: "Billing Audit Desk", value: "(056) 555-0198", href: "tel:0565550198" },
        { label: "Billing Email", value: "billing@soreco1.com.ph", href: "mailto:billing@soreco1.com.ph" },
        { label: "Treasury Counter", value: "treasury@soreco1.com.ph", href: "mailto:treasury@soreco1.com.ph" }
      ]
    },
    {
      id: "dept-engineering",
      icon: Wrench,
      badge: "Technical Operations",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      title: "Technical & Engineering Services",
      description: "Substation operations, distribution line upgrades, solar net-metering evaluations, and tree-trimming schedules.",
      contacts: [
        { label: "Engineering Desk", value: "(056) 555-0197", href: "tel:0565550197" },
        { label: "Technical Email", value: "engineering@soreco1.com.ph", href: "mailto:engineering@soreco1.com.ph" }
      ]
    }
  ];

  const branchOffices = [
    {
      id: "branch-bulan",
      name: "Bulan Main Headquarters",
      isHQ: true,
      address: "Zone-5, Immaculada Concepcion Street, Bulan, Sorsogon (Near Immaculada Concepcion Parish)",
      schedule: "Mon - Fri: 8:00 AM - 5:00 PM | Sat: 8:00 AM - 12:00 PM (Cashier Only)",
      phones: ["(056) 555-0199", "+63 917-888-2626"],
      mapsUrl: "https://maps.google.com/?q=Immaculada+Concepcion+Street+Bulan+Sorsogon"
    },
    {
      id: "branch-irosin",
      name: "Irosin Area Sub-Office",
      isHQ: false,
      address: "Poblacion Road, Barangay San Julian, Irosin, Sorsogon",
      schedule: "Mon - Fri: 8:00 AM - 5:00 PM (Payments & Inquiries)",
      phones: ["(056) 555-0244", "+63 918-444-1122"],
      mapsUrl: "https://maps.google.com/?q=San+Julian+Irosin+Sorsogon"
    },
    {
      id: "branch-matnog",
      name: "Matnog Area Sub-Office",
      isHQ: false,
      address: "National Highway, Barangay Camcamanan, Matnog, Sorsogon",
      schedule: "Mon - Fri: 8:00 AM - 4:30 PM (Collection & Assistance)",
      phones: ["(056) 555-0311", "+63 919-333-7788"],
      mapsUrl: "https://maps.google.com/?q=Matnog+Sorsogon"
    },
    {
      id: "branch-magdalena",
      name: "Sta. Magdalena Collection Center",
      isHQ: false,
      address: "Barangay 2, Poblacion, Santa Magdalena, Sorsogon",
      schedule: "Mon, Wed, Fri: 8:30 AM - 3:30 PM (Payment Operations)",
      phones: ["(056) 555-0422"],
      mapsUrl: "https://maps.google.com/?q=Santa+Magdalena+Sorsogon"
    }
  ];

  return (
    <div className="bg-[#F8F6F2] py-12 md:py-20 font-sans min-h-screen">
      <div className="container mx-auto px-4 max-w-6xl">

        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4 border border-primary/20"
          >
            <Building2 className="h-3.5 w-3.5" /> Official Communications Directory
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight font-poppins mb-4"
          >
            Contact SORECO-1
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg text-slate-600 leading-relaxed"
          >
            Direct contact numbers, 24/7 outage emergency lines, area sub-offices, and customer service desks across the First District of Sorsogon.
          </motion.p>
        </div>

        {/* 24/7 Emergency Outage Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-700/50 relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                24/7 Emergency Dispatch Hotlines
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white font-poppins">
                Experiencing a Power Outage or Downed Wire?
              </h2>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                Our emergency linemen and dispatch crews are on duty 24/7. In cases of line sparks, fallen utility poles, or unscheduled blackouts, contact our emergency numbers immediately.
              </p>
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
              <a
                href="tel:+639178882626"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs tracking-wide transition-all shadow-md active:scale-95"
              >
                <PhoneCall className="h-4 w-4" />
                Call (Globe) 0917-888-2626
              </a>
              <a
                href="tel:+639209992626"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs tracking-wide transition-all shadow-md active:scale-95"
              >
                <PhoneCall className="h-4 w-4 text-primary" />
                Call (Smart) 0920-999-2626
              </a>
            </div>
          </div>
        </motion.div>

        {/* Additional Custom Contacts & SIM Specifications */}
        {additionalContacts.length > 0 && (
          <div className="mb-16 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 font-poppins">Additional Registered Hotline & SIM Directory</h3>
                <p className="text-xs text-slate-500">Custom contact numbers and SIM network specifications configured by SORECO-1 administration.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {additionalContacts.map((c, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-primary/10 text-primary font-bold rounded-lg text-[10px] uppercase tracking-wider">
                      {c.simType}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">{c.label}</span>
                  </div>
                  <a href={`tel:${c.number.replace(/\s+/g, '')}`} className="font-mono text-base font-bold text-slate-900 hover:text-primary transition-colors flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-emerald-600" /> {c.number}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Branch Offices & Sub-Stations */}
        <div className="mb-16">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-slate-900 font-poppins">Branch Offices & Collection Centers</h3>
            <p className="text-xs text-slate-500 mt-1">Visit our local service centers for cashier payments, reconnection requests, and inquiries.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {branchOffices.map((branch, index) => (
              <motion.div
                key={branch.id}
                id={branch.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={`p-7 rounded-[2rem] border transition-all flex flex-col justify-between ${
                  branch.isHQ 
                    ? "bg-white border-primary/20 shadow-md ring-1 ring-primary/10" 
                    : "bg-white border-slate-100 shadow-sm hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="text-lg font-bold text-slate-900 font-poppins">{branch.name}</h4>
                  </div>

                  <div className="space-y-3.5 my-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 leading-relaxed">{branch.address}</p>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-500 leading-relaxed">{branch.schedule}</p>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 font-medium">
                        {branch.phones.join(" • ")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Compass className="h-3.5 w-3.5" /> First District, Sorsogon
                  </span>
                  <a
                    href={branch.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    View Map <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Operating Hours & General Inquiries Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                <Clock className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base font-poppins mb-2">Operating Hours</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Standard administrative and cashier service schedules across main offices:
              </p>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex justify-between">
                  <span className="font-medium">Monday - Friday:</span>
                  <span className="font-bold text-slate-800">8:00 AM - 5:00 PM</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-medium">Saturdays:</span>
                  <span className="font-bold text-slate-800">8:00 AM - 12:00 PM</span>
                </li>
                <li className="flex justify-between text-slate-400">
                  <span>Sundays & Holidays:</span>
                  <span>Closed (Dispatch 24/7)</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
                <Facebook className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base font-poppins mb-2">Official Social Page</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Follow our official verified Facebook page for daily power advisories, maintenance schedules, and public notices.
              </p>
            </div>
            <a
              href="https://facebook.com/soreco1official"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
            >
              <Facebook className="h-4 w-4" />
              facebook.com/soreco1official
            </a>
          </div>

          <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base font-poppins mb-2">Consumer Assistance Desk</h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                For account verification, service requests, and ticket tracking, sign in to your consumer portal account for real-time updates.
              </p>
            </div>
            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              Access Consumer Portal
            </a>
          </div>
        </div>

        {/* Main Office Location Map Card */}
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-poppins">Main Office Location & Landmarks</h3>
              <p className="text-xs text-slate-500 mt-1">Zone-5, Immaculada Concepcion Street, Bulan, Sorsogon 4706</p>
            </div>
            <a
              href="https://maps.google.com/?q=Immaculada+Concepcion+Street+Bulan+Sorsogon"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shrink-0"
            >
              <Compass className="h-3.5 w-3.5" />
              Get Directions in Google Maps
            </a>
          </div>

          <div className="relative w-full h-[320px] bg-slate-100 rounded-3xl overflow-hidden flex flex-col items-center justify-center border border-slate-200">
            <div className="absolute inset-0 bg-[#E0DEC9] opacity-30" />
            <div className="absolute inset-x-0 h-4 bg-primary/10 top-1/3" />
            <div className="absolute inset-y-0 w-4 bg-primary/10 left-1/2" />
            
            <div className="relative z-10 text-center p-6 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl max-w-sm shadow-lg">
              <MapPin className="h-8 w-8 text-primary mx-auto mb-3 animate-bounce" />
              <h4 className="font-extrabold text-slate-900 font-poppins text-sm mb-1">SORECO-1 Bulan Headquarters</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                Located along Immaculada Concepcion St., easily accessible near Bulan Parish Church and Municipal Hall.
              </p>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Cashier & Emergency Desk Open
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
