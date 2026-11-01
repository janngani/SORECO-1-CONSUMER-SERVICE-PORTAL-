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
export const BillingDisputeServicePage = () => {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };
  const faqs = [
    {
      q: "Will my electricity be disconnected while my bill is under dispute?",
      a: "No. Once a billing dispute is formally lodged through our portal and marked 'Reviewing' or 'Approved for Audit', SORECO-1 temporarily suspends standard disconnection actions for that specific bill until a final resolution is reached."
    },
    {
      q: "What causes billing discrepancies?",
      a: "Discrepancies can occur due to typographical errors during meter reading, faulty meter dials, sudden wiring leaks (earth-leakage), or estimated bill calculations when meters are physically inaccessible."
    },
    {
      q: "How can I prove my meter reading is incorrect?",
      a: "The most definitive proof is a high-resolution, clear photograph of your physical meter face showing the current dial numbers. You can upload this picture directly when filing your dispute."
    },
    {
      q: "How long does the audit resolution process take?",
      a: "Most billing audits are resolved within 5 to 7 business days. If a physical field inspection is required to test your meter, it may take up to 10 business days."
    }
  ];
  return <div className="bg-[#F8F6F2] font-sans min-h-screen">
      
      <section className="relative py-20 bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900 to-slate-900" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6">
              <Scale className="h-4 w-4" /> Consumer Rights
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-poppins mb-6 text-center">Billing Dispute & Audits</h1>
            <p className="text-lg text-slate-300 leading-relaxed text-center max-w-2xl">
              Lodge a formal dispute for billing errors, high consumption spikes, or meter reading issues. Our dedicated audit team will investigate and adjust statements fairly.
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
                SORECO-1 is committed to absolute billing accuracy. If you notice a sudden, unexplainable spike in your monthly electricity bill, believe your meter was read incorrectly, or have been charged twice, you have the right to file an official dispute. The digital portal allows you to state your case, upload relevant photo evidence (like your current meter dials), and chat directly with an audit officer without visiting our Bulan branch.
              </p>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <AlertCircle className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-slate-900 font-poppins">Valid Reasons to File</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-600 text-sm">
                <div className="p-5 rounded-2xl bg-[#FFF5EC] border border-[#F4A261]/10">
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Incorrect Dial Reading</h4>
                  <p className="text-xs text-slate-500">The meter numbers listed on your billing paper are higher than the numbers currently showing on your physical meter glass.</p>
                </div>
                <div className="p-5 rounded-2xl bg-[#FFF5EC] border border-[#F4A261]/10">
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Double Payment Error</h4>
                  <p className="text-xs text-slate-500">Your payments through GCash, banks, or partner establishments were not credited, causing a double-charge in the new bill.</p>
                </div>
                <div className="p-5 rounded-2xl bg-[#FFF5EC] border border-[#F4A261]/10">
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Unusual Consumption Spike</h4>
                  <p className="text-xs text-slate-500">A sudden, massive surge in kilowatt-hours (kWh) despite no new household appliances or changes in energy habits.</p>
                </div>
                <div className="p-5 rounded-2xl bg-[#FFF5EC] border border-[#F4A261]/10">
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Estimated Bill Discrepancy</h4>
                  <p className="text-xs text-slate-500">Your billing statement was computed using high average estimates rather than actual meter read records.</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <ClipboardCheck className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-slate-900 font-poppins">Required Supporting Documents</h2>
              </div>
              <p className="text-slate-500 text-xs mb-6">Uploading clear images helps our billing audit committee resolve disputes much faster without needing physical site visits.</p>
              
              <ul className="space-y-4 text-slate-600 text-sm">
                <li className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Latest Billing Statement:</strong>
                    <span className="block text-xs text-slate-500 mt-0.5">A clear photo of the bill being disputed showing the account number and billing date.</span>
                  </div>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Meter Face Photograph:</strong>
                    <span className="block text-xs text-slate-500 mt-0.5">A high-quality image of the physical glass-encased meter showing the digital display or dial sequence, along with the meter serial number.</span>
                  </div>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Prior Receipts (For Payment Issues):</strong>
                    <span className="block text-xs text-slate-500 mt-0.5">Payment receipts or electronic transaction records validating that prior bills were already fully settled.</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-slate-900 font-poppins">How Disputes are Resolved</h2>
              </div>
              <div className="relative border-l-2 border-primary/20 pl-8 ml-3 space-y-8">
                {[
    { step: "01", title: "Intake & Classification", desc: "Our system assigns your dispute a ticket ID. SORECO-1 audit officers classify the issue based on your inputs." },
    { step: "02", title: "Information Auditing", desc: "An analyst cross-checks your uploaded meter photos with our historical database and the meter reader's handheld log." },
    { step: "03", title: "Field Testing (If Necessary)", desc: "If the data is inconclusive, we dispatch a field team to verify the meter's mechanical condition at your address." },
    { step: "04", title: "Bill Adjustment", desc: "If a discrepancy is proven, we issue a corrected bill statement and credit any overpaid amounts directly to your next cycle." }
  ].map((item, idx) => <div key={idx} className="relative">
                    <div className="absolute -left-[41px] top-1 bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shadow-sm">
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
              <h3 className="text-xl font-bold text-slate-900 font-poppins mb-4">Submit Dispute</h3>
              <p className="text-slate-500 text-xs leading-relaxed mb-6">
                Log in to submit a formal billing dispute with photos of your meter. Track the investigation status and message our officers.
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex gap-3 text-xs text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Meter photos speed up resolution</span>
                </div>
                <div className="flex gap-3 text-xs text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Protects account from disconnection</span>
                </div>
              </div>

              <Link to={user ? "/dashboard" : "/login"}>
                <button className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all flex items-center justify-center gap-2 text-sm">
                  {user ? "Go to Dashboard & File Dispute" : "Log In & File Dispute"} <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              {!user && <div className="text-center mt-4">
                  <span className="text-[10px] text-slate-400">Or <Link to="/register" className="text-primary hover:underline font-semibold">register an account</Link> to start.</span>
                </div>}
            </div>
          </div>

        </div>
      </div>
    </div>;
};
