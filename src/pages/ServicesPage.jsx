import { Link } from "react-router";
import { motion } from "motion/react";
import {
  Zap,
  FileText,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  HelpCircle
} from "lucide-react";

export const ServicesPage = () => {
  return (
    <div className="bg-[#F8F6F2] py-16 md:py-24 font-sans min-h-screen">
      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold uppercase tracking-wider mb-4 border border-amber-500/20"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-600" /> SORECO-1 Digital Services
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight font-poppins mb-6"
          >
            Consumer Services
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-600 leading-relaxed"
          >
            Easily request electric service reconnection, file billing disputes, and submit account concerns directly online. Transparent tracking and faster turnaround for Bulan consumers.
          </motion.p>
        </div>

        {/* 3 Main Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mx-auto mb-12">
          
          {/* Card 1: Reconnection of Service */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            className="bg-white p-8 rounded-[2.5rem] border border-amber-200/80 shadow-md shadow-amber-500/5 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="mb-6 w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
                <Zap className="h-8 w-8" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold uppercase tracking-wider mb-3 border border-amber-200">
                Fast-Track Priority
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 font-poppins mb-3">Reconnection of Service</h3>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                Restore electric service to disconnected premises after settling unpaid arrears or temporary cutoffs. Upload your payment receipt online for swift crew dispatch.
              </p>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span>PHP 150.00 standard reconnection fee</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span>Restoration within 24 to 48 hours</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span>Accepts GCash, Maya & Cashier receipts</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span>Real-time lineman dispatch tracking</span>
                </div>
              </div>
            </div>
            
            <Link to="/services/reconnection" className="block pt-2">
              <button className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 group text-sm">
                View Reconnection Details <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </motion.div>

          {/* Card 2: Billing Dispute */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-6 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <FileText className="h-8 w-8" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold uppercase tracking-wider mb-3 border border-blue-200">
                Audited Review
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 font-poppins mb-3">Billing Dispute</h3>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                Lodge formal disputes regarding sudden consumption spikes, meter reading discrepancies, or duplicate charges. Upload photographs of your meter face and statements.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Attach current meter glass reading photo</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Interactive messaging with dispute officers</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Suspends standard cutoff during audit</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Full historical reading audit trail</span>
                </div>
              </div>
            </div>

            <Link to="/services/billing-dispute">
              <button className="w-full py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all flex items-center justify-center gap-2 group text-sm">
                View Dispute Details <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </motion.div>

          {/* Card 3: Other Billing Issue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-6 w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-inner">
                <HelpCircle className="h-8 w-8" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-bold uppercase tracking-wider mb-3 border border-purple-200">
                Finance Desk
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 font-poppins mb-3">Other Billing Issue</h3>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                Report any miscellaneous billing questions, fees, Senior Citizen discount applications, or meter reclassification requests.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  <span>Senior Citizen Discount verification</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  <span>Transfer of electric service ownership</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  <span>Direct review by the finance department</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  <span>No physical paperwork required online</span>
                </div>
              </div>
            </div>

            <Link to="/services/other-billing">
              <button className="w-full py-3.5 px-5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all flex items-center justify-center gap-2 group text-sm">
                View Details <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </motion.div>
        </div>

      </div>
    </div>
  );
};
