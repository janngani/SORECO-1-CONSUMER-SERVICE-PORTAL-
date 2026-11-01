import { Link } from "react-router";
import { motion } from "motion/react";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PrivacyPolicyPage = () => {
  return (
    <div className="bg-[#F8F6F2] py-12 md:py-20 font-sans min-h-[calc(100vh-80px)]">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Link to="/">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 font-semibold rounded-xl shadow-2xs transition-all hover:-translate-x-0.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-slate-500" /> Back to Home
            </Button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 md:p-12 rounded-[2rem] shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-primary">SORECO-1 Legal</span>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 font-poppins">Privacy Policy</h1>
            </div>
          </div>
          
          <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
            <p className="text-sm font-semibold text-slate-400">Last updated: October 1, 2026</p>
            <p className="leading-relaxed">At SORECO-1, we value your privacy. This policy outlines how we collect, use, and protect the data you provide when using our Consumer Portal.</p>
            
            <h2 className="text-xl font-bold text-slate-900">1. Information We Collect</h2>
            <p className="leading-relaxed">We collect personal information necessary for providing electrical services, such as your name, account number, address, email, and mobile number. We also collect usage data through our portal to improve service delivery.</p>
            
            <h2 className="text-xl font-bold text-slate-900">2. How We Use Your Data</h2>
            <p className="leading-relaxed">Your data is used strictly for billing, service advisory notifications, account management, and providing support. We do not sell your personal information to third parties.</p>
            
            <h2 className="text-xl font-bold text-slate-900">3. Data Security</h2>
            <p className="leading-relaxed">We employ industry-standard security measures to protect your personal data from unauthorized access or disclosure.</p>
            
            <h2 className="text-xl font-bold text-slate-900">4. Your Rights</h2>
            <p className="leading-relaxed">You have the right to access, correct, or request the deletion of your personal data stored in our system, subject to regulatory requirements.</p>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-100 text-right">
            <span className="text-xs text-slate-400 font-medium">Sorsogon I Electric Cooperative, Inc.</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
