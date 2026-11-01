import { motion } from "motion/react";
import { ShieldCheck, Target, Eye, Landmark, MapPin, Award } from "lucide-react";
export const AboutPage = () => {
  return <div className="bg-[#F8F6F2] py-16 md:py-24 font-sans">
      <div className="container mx-auto px-4">
        
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4"
  >
            <Landmark className="h-3 w-3" /> SORECO-1 Profile
          </motion.div>
          <motion.h1
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight font-poppins mb-6"
  >
            Sorsogon I Electric Cooperative, Inc.
          </motion.h1>
          <motion.p
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    className="text-lg text-slate-600 leading-relaxed"
  >
            Powering progress, serving communities, and driving technological modernization across the First District of Sorsogon since 1973.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          <motion.div
    initial={{ opacity: 0, y: 25 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all"
  >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 font-poppins mb-4">Our Mission</h3>
            <p className="text-slate-600 leading-relaxed text-sm">
              To provide reliable, high-quality, and affordable electric service to all member-consumers, while enhancing their quality of life through rural electrification and proactive community initiatives.
            </p>
          </motion.div>

          <motion.div
    initial={{ opacity: 0, y: 25 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: 0.1 }}
    className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all"
  >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
              <Eye className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 font-poppins mb-4">Our Vision</h3>
            <p className="text-slate-600 leading-relaxed text-sm">
              To be a premier, highly digitized, and technologically advanced electric distribution utility, fueling the economic growth of Sorsogon and fostering sustainable clean energy development.
            </p>
          </motion.div>

          <motion.div
    initial={{ opacity: 0, y: 25 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: 0.2 }}
    className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all"
  >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 font-poppins mb-4">Core Values</h3>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600" />
                <strong>Integrity:</strong> Honest and transparent governance.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600" />
                <strong>Service Excellence:</strong> Reliable customer support.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600" />
                <strong>Innovation:</strong> Adopting smart grid & digital portals.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600" />
                <strong>Social Care:</strong> True community commitment.
              </li>
            </ul>
          </motion.div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-100 shadow-sm mb-24 flex flex-col items-center text-center">
          <div className="max-w-3xl mb-12">
            <h2 className="text-3xl font-bold text-slate-900 font-poppins mb-4">Our Historical Journey</h2>
            <p className="text-slate-600">
              Sorsogon I Electric Cooperative, Inc. (SORECO-1) was incorporated on November 15, 1973 under the provisions of Presidential Decree No. 269. From a modest municipal operation, we have grown to power thousands of Sorsogueño households and businesses.
            </p>
          </div>

          <div className="relative border-l border-slate-100 pl-8 ml-4 space-y-12">
            {[
    { year: "1973", title: "Establishment", desc: "Cooperative incorporated, laying down original wooden poles and rural connection structures." },
    { year: "1985", title: "Full Coverage Expansion", desc: "Completed 100% barangay-level lines for main coastal municipalities in the district." },
    { year: "2005", title: "Substation Upgrade", desc: "Inaugurated Bulan Substation, boosting distribution capacity to meet commercial demand." },
    { year: "2026", title: "Digitalization Era", desc: "Launched SORECO-1 Digital Consumer Portal to handle modern service requests online." }
  ].map((item, idx) => <div key={idx} className="relative">
                <div className="absolute -left-[41px] top-1.5 bg-gradient-to-br from-amber-500 to-orange-600 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center shadow-sm" />
                <span className="text-primary font-black text-xl font-mono block mb-1">{item.year}</span>
                <h4 className="text-lg font-bold text-slate-900 font-poppins mb-2">{item.title}</h4>
                <p className="text-slate-600 text-sm max-w-2xl">{item.desc}</p>
              </div>)}
          </div>
        </div>

        <div className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 font-poppins mb-4">Cooperative Leadership</h2>
            <p className="text-slate-500">Committed professionals steering SORECO-1 towards an efficient, resilient, and digital utility future.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[].map((leader, i) => <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl mx-auto mb-6">
                  {leader.initial}
                </div>
                <h4 className="text-lg font-bold text-slate-900 font-poppins">{leader.name}</h4>
                <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider font-semibold">{leader.role}</p>
                <div className="flex justify-center gap-2 mt-4 text-xs text-slate-400">
                  <span>Sorsogon I Cooperative</span>
                </div>
              </div>)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-100 shadow-sm">
          <div>
            <span className="text-primary font-bold text-xs uppercase tracking-wider mb-2 block">Coverage Area</span>
            <h2 className="text-3xl font-bold text-slate-900 font-poppins mb-6">Our Sorsogon Service Area</h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              SORECO-1 is exclusively authorized to supply electric distribution across the municipalities of the First District of Sorsogon. Our service footprint includes highly responsive crews stationed at the following operational offices:
            </p>
            <div className="space-y-4">
              {[
    { name: "Bulan Main Office", address: "Zone-5, Immaculada Concepcion Street, Bulan, Sorsogon" },
    { name: "Bulan Sub-Office", address: "National Highway, Bulan, Sorsogon" },
    { name: "Irosin Service Center", address: "San Julian, Irosin, Sorsogon" },
    { name: "Matnog Customer Desk", address: "Poblacion, Matnog, Sorsogon" }
  ].map((loc, idx) => <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm font-poppins">{loc.name}</h5>
                    <p className="text-xs text-slate-500 mt-0.5">{loc.address}</p>
                  </div>
                </div>)}
            </div>
          </div>

          <div className="bg-[#FFF5EC] rounded-[2rem] p-8 flex flex-col justify-between border border-[#F4A261]/10">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-primary mb-6 shadow-sm">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 font-poppins mb-4">Cooperative Credentials</h3>
              <p className="text-slate-600 leading-relaxed text-sm mb-6">
                Under the regulatory oversight of the National Electrification Administration (NEA), SORECO-1 is consistently rated for high performance and operational transparency. We serve over 85,000 active electric service connections with an unwavering commitment to safe, reliable, and modern distribution lines.
              </p>
            </div>
            <div className="border-t border-[#F4A261]/20 pt-6">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Class-A Electric Cooperative</span>
                <span>NEA Certified</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
