import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, ChevronRight, ArrowLeft, MapPin, AlertCircle, CheckCircle2, Clock, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/src/lib/api";
import { supabase } from "@/src/lib/supabase";

export const BARANGAYS = [
  "A. Bonifacio", "Abad Santos", "Aguinaldo", "Antipolo", "Beguin",
  "Benigno S. Aquino", "Bical", "Bonga", "Butag", "Cadandanan",
  "Calomagon", "Calpi", "Cocok-Cabitan", "Daganas", "Danao",
  "Dolos", "E. Quirino", "Fabrica", "G. Del Pilar", "Gate",
  "Inararan", "J. Gerona", "J.P. Laurel", "Jamorawon", "Lajong",
  "Libertad", "M. Roxas", "Magsaysay", "Managanaga", "Marinab",
  "Montecalvario", "N. Roque", "Namo", "Nasuje", "Obrero",
  "Osmeña", "Otavi", "Padre Diaz", "Palale", "Quezon",
  "R. Gerona", "Recto", "Sagrada", "San Francisco", "San Isidro",
  "San Juan Bag-o", "San Juan Daan", "San Rafael", "San Ramon",
  "San Vicente", "Santa Remedios", "Santa Teresita", "Sigad",
  "Somagongsong", "Taromata", "Zone I Poblacion", "Zone II Poblacion",
  "Zone III Poblacion", "Zone IV Poblacion", "Zone V Poblacion",
  "Zone VI Poblacion", "Zone VII Poblacion", "Zone VIII Poblacion"
];

export const BarangaysPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      const data = await api.tickets.list();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // Periodic polling to stay synced with database
    const interval = setInterval(fetchTickets, 10000);

    // Supabase realtime channel for immediate updates
    let channel;
    try {
      channel = supabase
        .channel("realtime-barangays-tickets")
        .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
          fetchTickets();
        })
        .subscribe();
    } catch (e) {
      console.warn("Realtime channel subscription error:", e);
    }

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const filteredBarangays = BARANGAYS.filter(brgy => 
    brgy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUnresolvedTickets = (barangayName) => {
    return tickets.filter(ticket => {
      const address = (ticket.address || ticket.barangay || ticket.serviceAddress || "").toLowerCase();
      const bName = barangayName.toLowerCase();
      const isMatch = address.includes(bName) || 
        (ticket.consumerAddress && ticket.consumerAddress.toLowerCase().includes(bName));
      const status = (ticket.status || "").toLowerCase();
      const isUnresolved = status !== "resolved" && status !== "closed" && status !== "completed";
      return isMatch && isUnresolved;
    });
  };

  const getTicketCount = (barangayName) => {
    return getUnresolvedTickets(barangayName).length;
  };

  // Compile list of barangays that currently have unresolved, unfinished requests
  const barangaysWithUnresolved = BARANGAYS.map(b => {
    const unresolvedList = getUnresolvedTickets(b);
    return {
      name: b,
      tickets: unresolvedList,
      count: unresolvedList.length,
      pendingCount: unresolvedList.filter(t => (t.status || "").toLowerCase() === "pending").length,
      reviewingCount: unresolvedList.filter(t => (t.status || "").toLowerCase() === "reviewing").length,
      dispatchedCount: unresolvedList.filter(t => (t.status || "").toLowerCase() === "dispatched").length,
    };
  }).filter(b => b.count > 0).sort((a, b) => b.count - a.count);

  const totalUnresolvedCount = barangaysWithUnresolved.reduce((sum, b) => sum + b.count, 0);

  const handleBarangayClick = (barangay) => {
    navigate(`/barangays/${encodeURIComponent(barangay)}`);
  };

  return (
    <div className="min-h-screen bg-[#F8F6F2] pb-12">
      <div className="container mx-auto px-4 pt-6 max-w-6xl">
        <button 
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-slate-500 hover:text-orange-600 mb-6 font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div className="bg-gradient-to-r from-[#E65100] to-[#FF7043] rounded-3xl sm:rounded-[2rem] px-8 py-8 mb-8 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-black opacity-10 rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="hidden sm:flex p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-inner">
              <MapPin className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Barangay Directory</h1>
              <p className="text-orange-100 text-sm mt-1.5 font-medium">Select a barangay to view local requests</p>
            </div>
          </div>
          
          <div className="relative z-10 w-full max-w-md flex items-center gap-4">
            <div className="relative flex-1 group">
              <Input
                type="text"
                placeholder="Search a Barangay..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl border-none shadow-md text-sm text-slate-800 bg-white/95 focus:bg-white focus-visible:ring-2 focus-visible:ring-orange-300 transition-all placeholder:text-slate-400"
              />
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
            </div>
          </div>
        </div>

        {/* Highlight Section: Barangays with Current Unresolved / Unfinished Requests */}
        {!loading && (
          <div className="mb-10">
            {barangaysWithUnresolved.length > 0 ? (
              <div className="bg-white border-2 border-red-200 rounded-3xl p-6 shadow-[0_8px_30px_rgb(239,68,68,0.06)] relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-sm">
                      <AlertCircle className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Barangays with Unresolved Requests</h2>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white shadow-sm">
                          {totalUnresolvedCount} Unfinished {totalUnresolvedCount === 1 ? "Request" : "Requests"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {barangaysWithUnresolved.length} {barangaysWithUnresolved.length === 1 ? "barangay has" : "barangays have"} active requests requiring dispatch or resolution
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-red-700 font-semibold bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 flex items-center gap-1.5 self-start sm:self-auto">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                    Action Required
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {barangaysWithUnresolved.map((item) => (
                    <div
                      key={item.name}
                      onClick={() => handleBarangayClick(item.name)}
                      className="group relative bg-gradient-to-br from-white to-red-50/40 rounded-2xl p-4 border border-red-200 hover:border-red-400 hover:shadow-md cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                            <MapPin className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-red-700 transition-colors">
                              {item.name}
                            </h3>
                            <span className="text-[11px] text-red-600 font-medium">
                              {item.count} unresolved {item.count === 1 ? "request" : "requests"}
                            </span>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-red-600 text-white shrink-0 shadow-sm">
                          {item.count}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-red-100 text-[11px]">
                        {item.pendingCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold">
                            {item.pendingCount} Pending
                          </span>
                        )}
                        {item.reviewingCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-semibold">
                            {item.reviewingCount} Reviewing
                          </span>
                        )}
                        {item.dispatchedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-semibold">
                            {item.dispatchedCount} Dispatched
                          </span>
                        )}
                        <span className="ml-auto text-xs text-red-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          View <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-emerald-100 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-800">No Unresolved Requests</h3>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                        All Clear
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      All 63 barangays currently have zero pending or unfinished consumer requests.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  Total Monitored Barangays: <span className="font-bold text-slate-700">63</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Barangay Selection Section */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            {searchQuery ? `Matching Barangays (${filteredBarangays.length})` : "All Barangays (63)"}
          </h2>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")} 
              className="text-xs text-orange-600 hover:underline font-semibold"
            >
              Clear Search
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E65100] border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 px-2 sm:px-0">
            {filteredBarangays.map((barangay) => {
              const count = getTicketCount(barangay);
              const hasUnresolved = count > 0;
              return (
                <div 
                  key={barangay}
                  onClick={() => handleBarangayClick(barangay)}
                  className={`group relative bg-white rounded-2xl p-5 h-36 flex flex-col items-center justify-center shadow-[0_4px_20px_rgb(0,0,0,0.03)] cursor-pointer transition-all duration-300 transform hover:-translate-y-1 ${
                    hasUnresolved 
                      ? "border-2 border-red-300 bg-gradient-to-b from-white to-red-50/20 hover:border-red-500 hover:shadow-[0_12px_30px_rgb(239,68,68,0.15)] ring-2 ring-red-100" 
                      : "border border-slate-100 hover:border-orange-200 hover:shadow-[0_12px_30px_rgb(230,81,0,0.15)]"
                  }`}
                >
                  <div className={`absolute top-4 left-4 transition-colors duration-300 ${
                    hasUnresolved ? "text-red-200 group-hover:text-red-300" : "text-slate-100 group-hover:text-orange-100"
                  }`}>
                    <MapPin className="h-6 w-6" />
                  </div>
                  
                  {hasUnresolved && (
                    <div className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shadow-md border-2 border-white z-10 animate-pulse">
                      {count}
                    </div>
                  )}
                  
                  <h3 className={`text-base font-semibold text-center tracking-wide transition-colors duration-300 mt-2 z-10 line-clamp-2 px-2 ${
                    hasUnresolved 
                      ? "text-slate-800 group-hover:text-red-700 font-bold" 
                      : "text-slate-700 group-hover:text-orange-700"
                  }`}>
                    {barangay}
                  </h3>

                  {count === 0 ? (
                    <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mt-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">No active</span>
                  ) : (
                    <span className="text-[9px] text-red-700 font-bold uppercase tracking-wider mt-3 z-10 bg-red-100 px-2.5 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                      {count} {count === 1 ? "Unresolved" : "Unresolved"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BarangaysPage;
