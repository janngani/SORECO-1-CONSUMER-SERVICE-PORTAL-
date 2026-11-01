import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Search, ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/src/lib/api";
import { cn } from "@/lib/utils";

export const BarangayTicketsPage = () => {
  const { barangayName } = useParams();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await api.tickets.list();
        const filtered = data.filter(t => {
          const address = t.address ? t.address.toLowerCase() : "";
          return address.includes(barangayName.toLowerCase());
        });
        setTickets(filtered);
      } catch (err) {
        console.error("Failed to load tickets", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [barangayName]);

  const filteredTickets = tickets.filter(ticket => {
    const term = searchTerm.toLowerCase();
    return (
      (ticket.consumerName && ticket.consumerName.toLowerCase().includes(term)) ||
      (ticket.accountNumber && ticket.accountNumber.toLowerCase().includes(term)) ||
      (ticket.category && ticket.category.toLowerCase().includes(term))
    );
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return (
    <div className="min-h-screen bg-[#F8F6F2] pb-12">
      <div className="bg-[#EB5A00] rounded-b-[2rem] pt-8 pb-12 px-4 shadow-md relative overflow-hidden">
        <div className="container mx-auto max-w-6xl relative z-10">
          <button 
            onClick={() => navigate('/barangays')}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-6 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Barangays
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                <MapPin className="h-8 w-8" />
                {barangayName}
              </h1>
              <p className="text-orange-100 mt-2 font-medium">Manage all consumer requests specifically from this barangay.</p>
            </div>
            
            <div className="relative w-full max-w-md">
              <Input
                type="text"
                placeholder="Search consumer or account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-11 pr-4 rounded-xl border-none shadow-sm text-slate-800 bg-white"
              />
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl -mt-6 relative z-20">
        <Card className="border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden bg-white rounded-2xl">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E65100] border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/90 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider py-4">Consumer</TableHead>
                    <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider py-4">Type</TableHead>
                    <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider py-4">Status</TableHead>
                    <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider py-4">Priority</TableHead>
                    <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider py-4">Date</TableHead>
                    <TableHead className="text-right font-bold text-slate-800 text-xs uppercase tracking-wider py-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.length > 0 ? (
                    filteredTickets.map((t) => (
                      <TableRow key={t.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                        <TableCell className="py-4">
                          <div className="font-bold text-slate-900 text-sm">{t.consumerName || "Unknown Consumer"}</div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">Acc: {t.accountNumber || "N/A"}</div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="font-semibold text-slate-800 text-sm">{t.category}</div>
                          <div className="text-[11px] text-slate-500 capitalize mt-0.5">{t.type}</div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            className={cn(
                              "capitalize text-[11px] font-bold px-3 py-1 shadow-sm",
                              t.status === "pending" && "bg-orange-100 text-orange-800 hover:bg-orange-200",
                              t.status === "reviewing" && "bg-blue-100 text-blue-800 hover:bg-blue-200",
                              t.status === "dispatched" && "bg-purple-100 text-purple-800 hover:bg-purple-200",
                              t.status === "resolved" && "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            )}
                          >
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          {t.isUrgent === 1 ? (
                            <Badge variant="outline" className="text-[11px] font-bold text-red-600 bg-red-50 border-red-200">
                              🔴 High
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px] font-medium text-slate-600 border-slate-200 bg-slate-50">
                              Normal
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="text-sm font-medium text-slate-700">
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <Link to={`/ticket/${t.id}`}>
                            <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-8 px-4 rounded-lg shadow-sm gap-2">
                              Manage <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16 text-slate-500">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                            <Search className="h-6 w-6 text-slate-400" />
                          </div>
                          <p className="font-medium text-slate-700 text-base">No requests found</p>
                          <p className="text-sm text-slate-500 max-w-sm">There are no active requests from consumers in {barangayName}.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default BarangayTicketsPage;
