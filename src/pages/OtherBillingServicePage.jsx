import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/src/context/AuthContext";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Scale,
  CheckCircle2,
  ClipboardCheck,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
export const OtherBillingServicePage = () => {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };
  const faqs = [
    {
      q: "What types of issues fall under 'Other'?",
      a: "This includes unapplied senior citizen discounts, name change inquiries, meter deposit questions, or unclassified penalty charges that you need clarified."
    },
    {
      q: "Do I need to attach a picture?",
      a: "No, a picture is not mandatory for general inquiries or 'Other' billing issues. However, if you have a document that supports your concern, you are welcome to attach it."
    },
    {
      q: "How fast will I get a response?",
      a: "General billing inquiries are typically routed to our consumer relations officers and answered within 24-48 business hours."
    }
  ];
  return <div className="bg-[#F8F6F2] font-sans min-h-screen">
      
      <section className="relative py-20 bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900 to-slate-900" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider mb-6">
              <HelpCircle className="h-4 w-4" /> Account Support
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-poppins mb-6 text-center">Other Billing Issues</h1>
            <p className="text-lg text-slate-300 leading-relaxed text-center max-w-2xl">
              Have a concern about your statement that doesn't fit the standard categories? Report miscellaneous account issues directly to our finance team here.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          <div className="lg:col-span-2 space-y-12">

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 font-poppins mb-4">Service Overview</h2>
              <p className="text-slate-600 leading-relaxed text-sm">
                SORECO-1 understands that not every billing concern fits neatly into a predefined box. Whether you are inquiring about a missing discount, clarifying a specific line-item fee on your statement, or reporting an unlisted issue, you can use the "Other Billing Issue" service to reach our billing department directly.
              </p>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <AlertCircle className="h-6 w-6 text-purple-600" />
                <h2 className="text-2xl font-bold text-slate-900 font-poppins">Common Inquiries</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-600 text-sm">
                <div className="p-5 rounded-2xl bg-[#F5F3FF] border border-purple-100">
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Missing Discounts</h4>
                  <p className="text-xs text-slate-500">Inquiries regarding senior citizen discounts or lifeline subsidies that were not applied to your current billing cycle.</p>
                </div>
                <div className="p-5 rounded-2xl bg-[#F5F3FF] border border-purple-100">
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Unexplained Fees</h4>
                  <p className="text-xs text-slate-500">Clarifications regarding specific line-item charges, penalties, or historical arrears added to your statement.</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <HelpCircle className="h-6 w-6 text-purple-600" />
                <h2 className="text-2xl font-bold text-slate-900 font-poppins">Frequently Asked Questions</h2>
              </div>
              <div className="space-y-4">
                {faqs.map((faq, idx) => <div key={idx} className="border-b border-slate-100 pb-4">
                    <button
    onClick={() => toggleFaq(idx)}
    className="w-full flex justify-between items-center text-left py-2 hover:text-purple-600 transition-colors focus:outline-none"
  >
                      <span className="font-bold text-slate-800 text-sm font-poppins">{faq.q}</span>
                      {openFaq === idx ? <ChevronUp className="h-4 w-4 text-purple-600" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
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
              <h3 className="text-xl font-bold text-slate-900 font-poppins mb-4">Submit Inquiry</h3>
              <p className="text-slate-500 text-xs leading-relaxed mb-6">
                Log in to submit a text-based inquiry regarding other billing concerns directly to our finance desk.
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex gap-3 text-xs text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  <span>No photo evidence required</span>
                </div>
                <div className="flex gap-3 text-xs text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  <span>Direct department routing</span>
                </div>
              </div>

              <Link to={user ? "/dashboard" : "/login"}>
                <button className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all flex items-center justify-center gap-2 text-sm">
                  {user ? "Go to Dashboard & Submit" : "Log In & Submit"} <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              {!user && <div className="text-center mt-4">
                  <span className="text-[10px] text-slate-400">Or <Link to="/register" className="text-purple-600 hover:underline font-semibold">register an account</Link> to start.</span>
                </div>}
            </div>
          </div>

        </div>
      </div>
    </div>;
};
