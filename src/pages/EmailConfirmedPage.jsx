import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { CheckCircle2, ShieldCheck, ArrowRight, Building2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

export const EmailConfirmedPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#F8F6F2] flex items-center justify-center p-4 font-sans py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center space-y-6"
      >
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <Building2 className="h-3.5 w-3.5" /> SORECO-1 Official Verification
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-poppins">
            Email Confirmed Successfully!
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your member-consumer account email has been successfully verified and authenticated by SORECO-1. You now have full access to your digital portal, billing statements, and online service requests.
          </p>
        </div>

        <div className="pt-4 space-y-3">
          <Button
            onClick={() => navigate("/login")}
            className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 text-white font-bold text-sm rounded-xl shadow-md gap-2"
          >
            Proceed to Login <ArrowRight className="h-4 w-4" />
          </Button>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Secure 256-Bit SSL Encryption
          </div>
        </div>
      </motion.div>
    </div>
  );
};
