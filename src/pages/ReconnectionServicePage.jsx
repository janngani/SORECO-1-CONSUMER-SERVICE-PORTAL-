import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/src/context/AuthContext";
import {
  Zap,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Users,
  ClipboardList,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
export const ReconnectionServicePage = () => {
  const { user, userData } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };
  const faqs = [
    {
      q: "How long does it take for the power to be reconnected?",
      a: "For standard connections where the meter is still in place, SORECO-1 aim to restore power within 24 to 48 hours after payment verification and successful submission of the online reconnection request."
    },
    {
      q: "Is there a reconnection fee?",
      a: "Yes. SORECO-1 charges a standard reconnection service fee of PHP 150.00, which is added to your settlement bill or paid directly at our payment channels."
    },
    {
      q: "What if my meter has been pulled out?",
      a: "If your meter has been physically removed due to prolonged disconnection (over 3 months), your premises will need a safety re-inspection by our municipal crew before restoration can be approved."
    },
    {
      q: "Can I upload a screenshot of GCash/PayMaya receipt?",
      a: "Yes. In the application attachment, you can upload clear screenshots of GCash, PayMaya, or Bank transfer confirmations showing the reference number, amount, and date."
    }
  ];
  return <div className="bg-[#F8F6F2] font-sans min-h-screen">
      
      <section className="relative py-20 bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900 to-slate-900" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6">
              <Zap className="h-4 w-4" /> Power Restoration
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-poppins mb-6 text-center">Reconnection of Service</h1>
            <p className="text-lg text-slate-300 leading-relaxed text-center max-w-2xl">
              Restore electrical service to your home or commercial premises efficiently through our online service queue. Secure, reliable, and processed by our local Bulan crew.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          <div className="lg:col-span-2 space-y-12">

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 font-poppins mb-4">Service Description</h2>
              <p className="text-slate-600 leading-relaxed text-sm">
                This service allows consumers whose power has been disconnected due to arrears (unpaid bills) or voluntary temporary closures to formally request electric service restoration. By using our digital portal, SORECO-1 member-consumers in Sorsogon can settle their arrears, submit proof of payment, and register their requests instantly. This eliminates the need to travel and queue at the Bulan cooperative office.
              </p>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Users className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-slate-900 font-poppins">Who is Eligible?</h2>
              </div>
              <ul className="space-y-4 text-slate-600 text-sm">
                <li className="flex gap-3">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 mt-1.5 flex-shrink-0" />
                  <span>Existing SORECO-1 registered member-consumers under active accounts in Bulan, Sorsogon.</span>
                </li>
                <li className="flex gap-3">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 mt-1.5 flex-shrink-0" />
                  <span>Accounts that have fully settled their prior balance or established an approved cooperative installment agreement.</span>
                </li>
                <li className="flex gap-3">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 mt-1.5 flex-shrink-0" />
                  <span>Premises that meet the electric safety standards (no current wiring faults or hazard warnings).</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <ClipboardList className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-slate-900 font-poppins">Required Documents</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm mb-2">1. Valid Identification</h4>
                  <p className="text-xs text-slate-500">Government-issued ID of the registered account holder (e.g. UMID, Driver's License, SSS, Passport).</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm mb-2">2. Proof of Payment</h4>
                  <p className="text-xs text-slate-500">Photocopy or digital screenshot of the paid receipt covering all outstanding arrears plus reconnection fee.</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm mb-2">3. Authorization Letter</h4>
                  <p className="text-xs text-slate-500">Required if the application is filed by a representative rather than the principal account holder.</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm mb-2">4. Meter Location Photograph</h4>
                  <p className="text-xs text-slate-500">A clear picture of the current meter pole/box at your premises is highly recommended to expedite crew location.</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <FileCheck2 className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-slate-900 font-poppins">Online Application Process</h2>
              </div>
              <div className="relative border-l-2 border-primary/20 pl-8 ml-3 space-y-8">
                {[
    { step: "01", title: "Log In or Register", desc: "Access the SORECO-1 Consumer Portal. If you do not have an account, register using your Account Number." },
    { step: "02", title: "Select 'Submit Reconnection'", desc: "Navigate to your Dashboard, click on 'Submit Request', and choose Reconnection." },
    { step: "03", title: "Fill Details & Attach Proof", desc: "Provide your account information, outstanding balance amount, and upload the image of your payment receipt." },
    { step: "04", title: "Track & Reconnect", desc: "Monitor your dashboard. Once our officers verify the payment, our engineering team will dispatch a crew to restore power." }
  ].map((item, idx) => <div key={idx} className="relative">
                    <div className="absolute -left-[41px] top-1 bg-gradient-to-br from-amber-500 to-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shadow-sm">
                      {item.step}
                    </div>
                    <h4 className="font-bold text-slate-900 font-poppins text-sm mb-1">{item.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>)}
              </div>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <HelpCircle className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-slate-900 font-poppins">Frequently Asked Questions</h2>
              </div>
              <div className="space-y-4">
                {faqs.map((faq, idx) => <div key={idx} className="border-b border-slate-100 pb-4">
                    <button
    onClick={() => toggleFaq(idx)}
    className="w-full flex justify-between items-center text-left py-2 hover:text-primary transition-colors focus:outline-none"
  >
                      <span className="font-bold text-slate-800 text-sm font-poppins">{faq.q}</span>
                      {openFaq === idx ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </button>
                    {openFaq === idx && <div className="mt-2 text-xs text-slate-500 leading-relaxed pl-1 transition-all">
                        {faq.a}
                      </div>}
                  </div>)}
              </div>
            </div>

          </div>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm sticky top-24">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wider mb-4 border border-amber-200">
                <Zap className="h-3.5 w-3.5 text-amber-600" /> Fast-Track Service
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-poppins mb-2">File Reconnection Online</h3>
              <p className="text-slate-500 text-xs leading-relaxed mb-6">
                Submit your official payment receipt to fast-track lineman crew dispatch for service re-energization.
              </p>

              <div className="space-y-3.5 mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex gap-3 text-xs text-slate-700">
                  <Clock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-slate-900">24 to 48 Hours Processing</span>
                    <span className="text-[11px] text-slate-500">Standard crew restoration turnaround</span>
                  </div>
                </div>
                <div className="flex gap-3 text-xs text-slate-700">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-slate-900">PHP 150.00 Fee + Arrears</span>
                    <span className="text-[11px] text-slate-500">Attach payment receipt photo</span>
                  </div>
                </div>
              </div>

              <Link to={user ? "/dashboard" : "/login"}>
                <button className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 text-sm">
                  {user ? "Go to Dashboard & Apply" : "Log In to Apply"} <ArrowRight className="h-4 w-4" />
                </button>
              </Link>

              {!user && (
                <div className="text-center mt-4">
                  <span className="text-[11px] text-slate-400">
                    Don't have an account?{" "}
                    <Link to="/register" className="text-amber-600 hover:underline font-semibold">
                      Register with Account Number
                    </Link>
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>;
};
