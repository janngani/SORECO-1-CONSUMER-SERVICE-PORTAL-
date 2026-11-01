import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { compressImage } from "@/src/lib/imageCompressor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  FileText,
  Zap,
  MessageSquare,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Megaphone,
  Calendar,
  Send,
  Paperclip,
  X,
  ZoomIn,
  Download,
  Clock,
  HelpCircle,
  ArrowRight
} from "lucide-react";
import { ServiceTracker } from "@/src/components/ServiceTracker";
import { cn } from "@/lib/utils";
export const ConsumerDashboard = () => {
  const { user, userData, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isProfileIncomplete = Boolean(
    !isAdmin && user && (
      !user.accountNumber ||
      user.accountNumber === "PENDING" ||
      user.accountNumber === "12345678" ||
      !user.phoneNumber ||
      (!user.address && !user.barangay) ||
      !user.fullName ||
      user.fullName === "Consumer" ||
      user.fullName === "User" ||
      user.fullName.includes("@") ||
      user.needsOnboarding === true ||
      user.onboardingCompleted === false
    )
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    } else if (!authLoading && user && (isAdmin || user.role === "admin" || user.role?.toLowerCase() === "admin" || user.isAdmin === true)) {
      toast.info("Notice: Consumer portal route is restricted. Redirected to Admin Dashboard.", {
        id: "consumer-route-restricted-toast",
        duration: 5000
      });
      navigate("/admin", { replace: true });
    } else if (!authLoading && user && !isAdmin && isProfileIncomplete) {
      window.dispatchEvent(new CustomEvent("open-consumer-onboarding"));
    }
  }, [user, authLoading, navigate, isAdmin, isProfileIncomplete]);

  const [tickets, setTickets] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("pending");
  const [latestKnownUpdate, setLatestKnownUpdate] = useState(0);

  useEffect(() => {
    if (tickets && tickets.length > 0) {
      const mostRecentTicket = [...tickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).pop();
      if (mostRecentTicket) {
        const mostRecentTime = new Date(mostRecentTicket.updatedAt).getTime();
        
        if (latestKnownUpdate === 0) {
          const searchParams = new URLSearchParams(location.search);
          if (!searchParams.get("tab") && !searchParams.get("inquiryId") && !searchParams.get("ticketId")) {
            if (["pending", "reviewing", "dispatched", "resolved"].includes(mostRecentTicket.status)) {
              setActiveFilter(mostRecentTicket.status);
            }
          }
          setLatestKnownUpdate(mostRecentTime);
        } else if (mostRecentTime > latestKnownUpdate) {
          if (["pending", "reviewing", "dispatched", "resolved", "asking for a clearer picture", "clearer_picture"].includes(mostRecentTicket.status)) {
            if (["pending", "reviewing", "dispatched", "resolved"].includes(mostRecentTicket.status)) {
              setActiveFilter(mostRecentTicket.status);
            }
            
            const labels = {
              pending: "Pending",
              reviewing: "Admin Reviewed",
              dispatched: "Crew Dispatched",
              resolved: "Resolved",
              "asking for a clearer picture": "Action Needed: Clearer Picture",
              clearer_picture: "Action Needed: Clearer Picture"
            };
            
            toast.info(`Your ticket status was updated to: ${labels[mostRecentTicket.status] || mostRecentTicket.status}`, {
              position: "top-right"
            });
          }
          setLatestKnownUpdate(mostRecentTime);
        }
      }
    }
  }, [tickets, latestKnownUpdate, location.search]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get("tab");
    const inquiryIdParam = searchParams.get("inquiryId");
    const ticketIdParam = searchParams.get("ticketId");

    if (ticketIdParam) {
      navigate(`/ticket/${ticketIdParam}`);
      return;
    }

    if (tabParam === "inquiries" || inquiryIdParam) {
      setActiveFilter("inquiries");
      if (inquiryIdParam) {
        setActiveInquiryChatId(inquiryIdParam);
        setTimeout(() => {
          const el = document.getElementById(`inquiry-card-${inquiryIdParam}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 300);
      }
    } else if (tabParam === "notifications") {
      setActiveFilter("notifications");
    } else if (tabParam) {
      setActiveFilter(tabParam);
    }
  }, [location.search, navigate]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [requestType, setRequestType] = useState("billing");
  const [billingCategory, setBillingCategory] = useState("");
  const [description, setDescription] = useState("");
  const [checklist, setChecklist] = useState({
    paid: false,
    receiptReady: false,
    accessClear: false
  });

  const [activeInquiryChatId, setActiveInquiryChatId] = useState(null);
  const [inquiryReplyText, setInquiryReplyText] = useState("");
  const [isSendingInquiryReply, setIsSendingInquiryReply] = useState(false);
  const [inquiryChatImages, setInquiryChatImages] = useState([]);
  const [isProcessingInquiryImages, setIsProcessingInquiryImages] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const inquiryFileInputRef = useRef(null);

  const handleInquiryFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsProcessingInquiryImages(true);
    try {
      const compressedResults = await Promise.all(
        files.map(async (file) => {
          try {
            return await compressImage(file, 800, 0.7);
          } catch (err) {
            toast.error(err.message || "Upload rejected: Only PNG, JPG, and JPEG images are allowed.");
            return null;
          }
        })
      );
      const validImages = compressedResults.filter(Boolean);
      if (validImages.length > 0) {
        setInquiryChatImages((prev) => [...prev, ...validImages]);
        toast.success(`Attached ${validImages.length} picture${validImages.length > 1 ? "s" : ""}`);
      }
    } catch (err) {
      toast.error(err.message || "Upload rejected: Only PNG, JPG, and JPEG images are allowed.");
    } finally {
      setIsProcessingInquiryImages(false);
      if (inquiryFileInputRef.current) {
        inquiryFileInputRef.current.value = "";
      }
    }
  };

  const removeInquiryImage = (indexToRemove) => {
    setInquiryChatImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCancel = async (ticketId) => {
    if (!window.confirm("Are you sure you want to cancel this service request? This action cannot be undone, and the request will be removed from official technical queues.")) return;
    try {
      await api.tickets.update(ticketId, { status: "cancelled" });
      toast.success("Request successfully cancelled and withdrawn.");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to cancel request. Please try again or contact support.");
    }
  };
  const fetchData = async () => {
    try {
      const [ticketsData, announcementsData, inquiriesData] = await Promise.all([
        api.tickets.list().catch((err) => {
          console.warn("Tickets list fetch error:", err);
          return [];
        }),
        api.announcements.list().catch((err) => {
          console.warn("Announcements list fetch error:", err);
          return [];
        }),
        api.inquiries.listMy().catch((err) => {
          console.warn("Inquiries listMy failed:", err);
          return [];
        })
      ]);
      setTickets(Array.isArray(ticketsData) ? ticketsData : []);
      setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);
      setInquiries(Array.isArray(inquiriesData) ? inquiriesData : []);
    } catch (error) {
      console.warn("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInquiryReply = async (inqId) => {
    if (!inquiryReplyText.trim() && inquiryChatImages.length === 0) return;
    const wordCount = inquiryReplyText.trim() ? inquiryReplyText.trim().split(/\s+/).filter(Boolean).length : 0;
    if (wordCount > 100) {
      toast.error("Reply exceeds the 100-word limit. Please shorten your message.");
      return;
    }
    setIsSendingInquiryReply(true);
    try {
      const targetInq = inquiries.find((i) => i.id === inqId);
      if (!targetInq) return;
      const currentMessages = targetInq.messages || [];
      const newMessage = {
        senderId: user?.uid || user?.id,
        senderName: userData?.fullName || "Consumer",
        text: inquiryReplyText.trim(),
        images: inquiryChatImages.length > 0 ? inquiryChatImages : undefined,
        createdAt: new Date().toISOString()
      };
      const updatedMessages = [...currentMessages, newMessage];
      await api.inquiries.update(inqId, { messages: updatedMessages });
      toast.success("Reply sent successfully!");
      setInquiryReplyText("");
      setInquiryChatImages([]);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to send reply");
    } finally {
      setIsSendingInquiryReply(false);
    }
  };
  useEffect(() => {
    if (!user) return;
    fetchData();
    const interval = setInterval(fetchData, 3e4);
    return () => clearInterval(interval);
  }, [user]);
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 0.7);
        setPreviewImage(compressed);
      } catch (err) {
        toast.error(err.message || "Upload rejected: Only PNG, JPG, and JPEG images are allowed.");
        if (e.target) e.target.value = "";
        setPreviewImage(null);
      }
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const wordCount = description.trim() ? description.trim().split(/\s+/).filter(Boolean).length : 0;
    if (wordCount > 100) {
      toast.error("Description exceeds the 100-word limit. Please shorten your description.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.tickets.create({
        consumerName: userData?.fullName,
        accountNumber: userData?.accountNumber,
        type: requestType,
        category: requestType === "billing" ? billingCategory : requestType === "other-billing" ? "Other Billing Issue" : "Reconnection",
        description,
        evidenceImage: previewImage,
        checklist: requestType === "reconnection" ? checklist : null
      });
      toast.success("Request submitted successfully!");
      setPreviewImage(null);
      setDescription("");
      setBillingCategory("");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="min-h-screen bg-[#F8F6F2] py-8">
      <div className="container mx-auto px-4 max-w-6xl space-y-8">

      {isProfileIncomplete && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 p-4 sm:p-5 rounded-2xl text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-900">Member Verification Required</p>
              <p className="text-xs text-amber-800 leading-relaxed mt-0.5">
                Your portal profile is missing official utility connection information (account number, legal name, or barangay).
                Please complete your verification details to request services.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent("open-consumer-onboarding"))}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs shrink-0 rounded-xl shadow-md h-10 px-4 cursor-pointer"
          >
            Complete Verification Now
          </Button>
        </div>
      )}
      
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-400/20 px-3 py-1 rounded-full text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              Sorsogon Consumer Portal
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white">{userData?.fullName || "Valued Consumer"}</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Track outstanding requests, file a dispute, or contact dispatch personnel right from your digital space.
            </p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 min-w-[240px] space-y-2 w-full md:w-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Account Details</span>
              {userData?.isGoogleUser && (
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded font-medium">
                  Google Linked
                </span>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Account No:</span>
                <span className="font-mono font-semibold text-indigo-300">{userData?.accountNumber || "Pending Setup"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Barangay:</span>
                <span className="font-semibold text-slate-200 truncate max-w-[180px] sm:max-w-[140px]">{userData?.address || "Pending Setup"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Mobile:</span>
                <span className="font-semibold text-slate-200">{userData?.phoneNumber || "Not set"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Status:</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {[
    {
      id: "pending",
      label: "Pending",
      count: tickets.filter((t) => t.status === "pending").length,
      color: "border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100/50",
      activeColor: "bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-600/10"
    },
    {
      id: "reviewing",
      label: "Reviewing",
      count: tickets.filter((t) => t.status === "reviewing").length,
      color: "border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100/50",
      activeColor: "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10"
    },
    {
      id: "action_needed",
      label: "Action Needed",
      count: tickets.filter((t) => t.status === "asking for a clearer picture" || t.status === "clearer_picture").length,
      color: "border-orange-200 text-orange-700 bg-orange-50/50 hover:bg-orange-100/50",
      activeColor: "bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-600/10"
    },
    {
      id: "dispatched",
      label: "Dispatched",
      count: tickets.filter((t) => t.status === "dispatched").length,
      color: "border-purple-200 text-purple-700 bg-purple-50/50 hover:bg-purple-100/50",
      activeColor: "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-600/10"
    },
    {
      id: "resolved",
      label: "Resolved",
      count: tickets.filter((t) => t.status === "resolved").length,
      color: "border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/50",
      activeColor: "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/10"
    },
    {
      id: "cancelled",
      label: "Cancelled",
      count: tickets.filter((t) => t.status === "cancelled").length,
      color: "border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100/50",
      activeColor: "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/10"
    }
  ].map((tab) => {
    const isActive = activeFilter === tab.id;
    return <button
      key={tab.id}
      onClick={() => setActiveFilter(tab.id)}
      className={cn(
        "flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer relative min-h-[44px]",
        isActive ? tab.activeColor : `${tab.color} border-slate-200`
      )}
    >
              <span className="flex items-center gap-1.5 truncate">
                {tab.label}
              </span>
              {tab.count > 0 && <span className={cn(
      "text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full shrink-0",
      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-800"
    )}>
                  {tab.count}
                </span>}
            </button>;
  })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {activeFilter === "notifications"
                ? "System Updates & Alerts"
                : activeFilter === "inquiries"
                ? "My Inquiries & Chats"
                : activeFilter === "completed"
                ? "Request History & Archived Tickets"
                : activeFilter === "resolved"
                ? "Resolved Requests"
                : "Active Requests"}
            </h2>
          </div>

          {loading ? <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div> : activeFilter === "notifications" ? <div className="space-y-4">
              {tickets.length === 0 ? <Card className="border-dashed border-2 bg-slate-50/50">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <MessageSquare className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">No alerts found.</p>
                    <p className="text-slate-400 text-xs">We'll notify you here if your request status updates.</p>
                  </CardContent>
                </Card> : <div className="space-y-3">
                  {tickets.map((t) => {
                    let messages = [];
                    try {
                      messages = JSON.parse(t.messages || "[]");
                    } catch {}
                    const lastMsg = messages[messages.length - 1];
                    const isNew = lastMsg && lastMsg.senderId === "admin";
                    return <Card key={t.id} className={cn(
                      "border-slate-100 hover:border-slate-200 transition-colors shadow-sm relative overflow-hidden",
                      isNew && "border-l-4 border-l-rose-500"
                    )}>
                        <CardContent className="p-4 flex gap-3 items-start pl-5">
                          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 mt-1 relative">
                            <MessageSquare className="h-4 w-4" />
                            {isNew && (
                              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                              </span>
                            )}
                          </div>
                          <div className="flex-grow space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                                Ticket Update: {t.category}
                                {isNew && (
                                  <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 font-bold text-[9px] px-1 py-0 h-4">
                                    NEW REPLY
                                  </Badge>
                                )}
                              </span>
                              <Badge variant="outline" className="text-[10px] capitalize">{t.status}</Badge>
                            </div>
                            <p className="text-xs text-slate-500">
                              {lastMsg ? `Last message: "${lastMsg.text}"` : `Your ticket is currently ${t.status}. No chat activity yet.`}
                            </p>
                            {(() => {
                              let fb = t.feedback;
                              if (typeof fb === "string") {
                                try { fb = JSON.parse(fb); } catch (e) {}
                              }
                              if (fb && fb.adminResponse) {
                                return (
                                  <div className="mt-2 p-2.5 bg-blue-50/90 border border-blue-150 rounded-lg text-xs space-y-1">
                                    <span className="font-bold text-blue-900 flex items-center gap-1.5 text-[11px]">
                                      <MessageSquare className="h-3 w-3 text-blue-600" /> Admin Feedback Response:
                                    </span>
                                    <p className="text-slate-700 italic text-xs leading-relaxed">"{fb.adminResponse}"</p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            <div className="flex justify-between items-center pt-2">
                              <span className="text-[10px] text-slate-400 font-mono">ID: {t.id}</span>
                              <Link to={`/ticket/${t.id}`}>
                                <Button size="sm" variant="link" className="h-auto p-0 text-xs text-indigo-600 font-semibold hover:text-indigo-800">
                                  Open Chat & Details →
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>;
                  })}
                </div>}
            </div> : activeFilter === "inquiries" ? <div className="space-y-4">
              {inquiries.length === 0 ? <Card className="border-dashed border-2 bg-slate-50/50">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <MessageSquare className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">No inquiries found.</p>
                    <p className="text-slate-400 text-xs">Submit an inquiry on the contact page to start a chat.</p>
                  </CardContent>
                </Card> : inquiries.map((inq) => <Card key={inq.id} id={`inquiry-card-${inq.id}`} className={cn("overflow-hidden border-slate-100 shadow-sm hover:shadow-md transition-all", activeInquiryChatId === inq.id && "ring-2 ring-teal-500 border-teal-500 shadow-md")}>
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
                            <MessageSquare className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold text-slate-800">
                              {inq.subject}
                            </CardTitle>
                            <CardDescription className="text-xs">Inquiry ID: {inq.id}</CardDescription>
                          </div>
                        </div>
                        <Badge className="bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-50 font-semibold text-xs">
                          General Inquiry
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100/50">
                        <p className="text-sm text-slate-600 font-semibold mb-1">Your original message:</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {inq.message}
                        </p>
                      </div>

                      <div className="border-t border-slate-100 pt-4 space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Conversation History</h4>
                        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 max-h-[250px] overflow-y-auto space-y-3">
                          <div className="flex flex-col items-start max-w-[85%] text-xs space-y-1">
                            <span className="font-semibold text-slate-600">You (Original Inquiry)</span>
                            <div className="bg-white border border-slate-100 p-2.5 rounded-2xl rounded-tl-none shadow-sm text-slate-800">
                              {inq.message}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {new Date(inq.createdAt || inq.createdat || Date.now()).toLocaleString()}
                            </span>
                          </div>

                          {inq.messages && inq.messages.map((msg, idx) => {
                            const isMe = msg.senderId !== "admin";
                            const imageList = msg.images || (msg.image ? [msg.image] : []);
                            const hasImages = imageList.length > 0;

                            return (
                              <div key={idx} className={cn("flex flex-col max-w-[85%] text-xs space-y-1", isMe ? "items-end ml-auto" : "items-start")}>
                                <span className="font-semibold text-slate-600">
                                  {isMe ? "You" : (msg.senderName || "Admin")}
                                </span>
                                <div className={cn("p-2.5 rounded-2xl shadow-sm space-y-2", isMe ? "bg-teal-600 text-white rounded-tr-none" : "bg-white border border-slate-100 text-slate-800 rounded-tl-none")}>
                                  {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                                  {hasImages && (
                                    <div className={cn(
                                      "grid gap-2 pt-1",
                                      imageList.length === 1 ? "grid-cols-1" : "grid-cols-2"
                                    )}>
                                      {imageList.map((imgSrc, imgIdx) => (
                                        <div
                                          key={imgIdx}
                                          onClick={() => setLightboxImage(imgSrc)}
                                          className="relative group rounded-xl overflow-hidden border border-black/10 cursor-pointer bg-black/5 hover:opacity-95 transition-all shadow-sm"
                                        >
                                          <img
                                            src={imgSrc}
                                            alt={`Attached picture ${imgIdx + 1}`}
                                            className="w-full h-24 object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                                          />
                                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold gap-1">
                                            <ZoomIn className="h-3 w-3" /> Expand
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(msg.createdAt).toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {activeInquiryChatId === inq.id && inquiryChatImages.length > 0 && (
                          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                              <span className="flex items-center gap-1.5 text-teal-700">
                                <ImageIcon className="h-3.5 w-3.5" />
                                {inquiryChatImages.length} picture{inquiryChatImages.length > 1 ? "s" : ""} attached
                              </span>
                              <button
                                type="button"
                                onClick={() => setInquiryChatImages([])}
                                className="text-rose-500 hover:text-rose-700 text-[11px] font-medium"
                              >
                                Clear all
                              </button>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                              {inquiryChatImages.map((imgSrc, index) => (
                                <div key={index} className="relative shrink-0">
                                  <img
                                    src={imgSrc}
                                    alt={`Preview ${index + 1}`}
                                    className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeInquiryImage(index)}
                                    className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-md transition-colors"
                                    title="Remove image"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => inquiryFileInputRef.current?.click()}
                                className="w-14 h-14 shrink-0 rounded-lg border-2 border-dashed border-slate-300 hover:border-teal-600 flex flex-col items-center justify-center text-slate-400 hover:text-teal-600 transition-colors bg-white"
                                title="Add more pictures"
                              >
                                <Plus className="h-4 w-4" />
                                <span className="text-[8px] font-bold mt-0.5">Add</span>
                              </button>
                            </div>
                          </div>
                        )}

                        <input
                          type="file"
                          ref={inquiryFileInputRef}
                          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                          multiple
                          onChange={handleInquiryFilesChange}
                          className="hidden"
                        />

                        <div className="flex gap-2 items-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setActiveInquiryChatId(inq.id);
                              inquiryFileInputRef.current?.click();
                            }}
                            disabled={isSendingInquiryReply || isProcessingInquiryImages}
                            className={cn(
                              "shrink-0 h-9 w-9 border-slate-200 text-slate-600 hover:text-teal-600 hover:bg-teal-50 transition-colors relative",
                              activeInquiryChatId === inq.id && inquiryChatImages.length > 0 && "border-teal-600 text-teal-600 bg-teal-50"
                            )}
                            title="Attach pictures"
                          >
                            {isProcessingInquiryImages ? (
                              <Clock className="h-4 w-4 animate-spin text-teal-600" />
                            ) : (
                              <Paperclip className="h-4 w-4" />
                            )}
                            {activeInquiryChatId === inq.id && inquiryChatImages.length > 0 && (
                              <span className="absolute -top-1 -right-1 bg-teal-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                                {inquiryChatImages.length}
                              </span>
                            )}
                          </Button>

                          <Input
                            placeholder={activeInquiryChatId === inq.id && inquiryChatImages.length > 0 ? "Add a response (optional)..." : "Type a response to the admin..."}
                            value={activeInquiryChatId === inq.id ? inquiryReplyText : ""}
                            onChange={(e) => {
                              setActiveInquiryChatId(inq.id);
                              setInquiryReplyText(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && activeInquiryChatId === inq.id) {
                                handleSendInquiryReply(inq.id);
                              }
                            }}
                            className="text-xs bg-white h-9 focus-visible:ring-teal-600"
                          />
                          <Button
                            size="sm"
                            disabled={
                              isSendingInquiryReply ||
                              activeInquiryChatId !== inq.id ||
                              (!inquiryReplyText.trim() && inquiryChatImages.length === 0)
                            }
                            onClick={() => handleSendInquiryReply(inq.id)}
                            className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 shrink-0 h-9"
                          >
                            <Send className="h-3 w-3" /> Send
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>)}
            </div> : (() => {
    const filtered = tickets.filter((t) => {
      if (activeFilter === "pending") return t.status === "pending";
      if (activeFilter === "reviewing") return t.status === "reviewing";
      if (activeFilter === "action_needed") return t.status === "asking for a clearer picture" || t.status === "clearer_picture";
      if (activeFilter === "dispatched") return t.status === "dispatched";
      if (activeFilter === "resolved") return t.status === "resolved";
      if (activeFilter === "completed") return t.status === "resolved" || t.status === "completed" || t.status === "cancelled";
      if (activeFilter === "cancelled") return t.status === "cancelled";
      return true;
    });
    if (filtered.length === 0) {
      return <Card className="border-dashed border-2 bg-slate-50/30 border-slate-200 rounded-2xl">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
                    
                    <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
                      <div className="absolute inset-0 bg-indigo-50 rounded-full animate-pulse opacity-40" />
                      <div className="absolute inset-4 bg-indigo-100 rounded-full flex items-center justify-center">
                        <FileText className="h-12 w-12 text-slate-400" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">No requests matching "{activeFilter}"</h3>
                    <p className="text-slate-400 text-xs max-w-sm mb-6 leading-relaxed">
                      You don't have any requests under this tab. Click the button below to submit a reconnection or billing issue.
                    </p>
                    <Button
        onClick={() => setIsCreateDialogOpen(true)}
        className="bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 text-white font-semibold rounded-xl px-6 py-2.5 transition-all duration-200"
      >
                      <Plus className="h-4 w-4 mr-2" /> Request Service
                    </Button>
                  </CardContent>
                </Card>;
    }
    return <div className="space-y-4">
                {filtered.map((ticket) => <Card key={ticket.id} className="overflow-hidden border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className={cn(
      "p-2 rounded-lg",
      ticket.type === "billing" ? "bg-blue-100 text-blue-600" : ticket.type === "other-billing" ? "bg-purple-100 text-purple-600" : "bg-orange-100 text-orange-600"
    )}>
                            {ticket.type === "billing" ? <FileText className="h-5 w-5" /> : ticket.type === "other-billing" ? <HelpCircle className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2 font-bold text-slate-800">
                              {ticket.category}
                            </CardTitle>
                            <CardDescription className="text-xs font-mono font-medium text-slate-500">Ticket ID: {ticket.id}</CardDescription>
                          </div>
                        </div>
                        <Badge variant={ticket.status === "resolved" ? "default" : "secondary"} className={cn(
                          "capitalize text-xs font-semibold px-2 py-1",
                          ticket.status === "pending" && "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
                          ticket.status === "reviewing" && "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
                          ticket.status === "dispatched" && "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50",
                          ticket.status === "resolved" && "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50",
                          ticket.status === "cancelled" && "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50 font-bold",
                          (ticket.status === "asking for a clearer picture" || ticket.status === "clearer_picture") && "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50"
                        )}>
                          {ticket.status === "clearer_picture" || ticket.status === "asking for a clearer picture" ? "Action Needed: Clearer Picture" : ticket.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="mb-6">
                        <p className="text-sm text-slate-600 line-clamp-2 mb-4">{ticket.description}</p>
                        <ServiceTracker status={ticket.status} />

                        {(() => {
                          let fb = ticket.feedback;
                          if (typeof fb === "string") {
                            try { fb = JSON.parse(fb); } catch (e) {}
                          }
                          if (fb && fb.adminResponse) {
                            return (
                              <div className="mt-4 p-3 bg-blue-50/90 border border-blue-100 rounded-xl text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                                    <MessageSquare className="h-3.5 w-3.5 text-blue-600" /> Admin Official Response:
                                  </span>
                                  {fb.adminResponseAt && (
                                    <span className="text-[10px] text-blue-600/70 font-medium">
                                      {new Date(fb.adminResponseAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-700 leading-relaxed font-normal bg-white/70 p-2 rounded-lg border border-blue-100/60 mt-1">
                                  {fb.adminResponse}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50/30 border-t py-3 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1.5 uppercase font-semibold">
                          <Calendar className="h-3 w-3" />
                          Submitted {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "Just now"}
                        </span>
                        {ticket.status === "cancelled" && (
                          <span className="text-[10px] text-rose-500 font-bold uppercase mt-0.5">
                            WITHDRAWN FROM QUEUE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {ticket.status !== "resolved" && ticket.status !== "cancelled" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleCancel(ticket.id)}
                            className="h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold"
                          >
                            Cancel Request
                          </Button>
                        )}
                        <Link to={`/ticket/${ticket.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 gap-2 text-primary hover:text-primary hover:bg-primary/5 text-xs font-semibold">
                            <MessageSquare className="h-3.5 w-3.5" /> Details
                          </Button>
                        </Link>
                      </div>
                    </CardFooter>
                  </Card>)}
              </div>;
  })()}
        </div>

        <div className="space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xl font-bold text-slate-900">Quick Actions</h2>
          </div>
          
          <Card className="border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardContent className="p-4 space-y-3.5">
              {userData?.hasUnpaidBill && (
                <button
                  onClick={() => {
                    setRequestType("reconnection");
                    setIsCreateDialogOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-orange-100 bg-orange-50/30 text-orange-950 hover:bg-orange-50/70 transition-all font-semibold text-sm cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl bg-orange-100/50 w-8 h-8 rounded-lg flex items-center justify-center">⚡</span>
                    <div className="flex flex-col">
                      <span className="font-bold">Reconnection</span>
                      <span className="text-[10px] text-slate-500 font-normal">Electric connection restore</span>
                    </div>
                  </div>
                  <span className="text-orange-400 group-hover:translate-x-1 transition-transform">→</span>
                </button>
              )}

              <button
                onClick={() => {
                  setRequestType("billing");
                  setIsCreateDialogOpen(true);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-blue-100 bg-blue-50/30 text-blue-950 hover:bg-blue-50/70 transition-all font-semibold text-sm cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl bg-blue-100/50 w-8 h-8 rounded-lg flex items-center justify-center">📝</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Billing Dispute</span>
                    <span className="text-[10px] text-slate-500 font-normal">Report overcharging & wrong readings</span>
                  </div>
                </div>
                <span className="text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              <button
    onClick={() => {
      setRequestType("other-billing");
      setIsCreateDialogOpen(true);
    }}
    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-purple-100 bg-purple-50/30 text-purple-950 hover:bg-purple-50/70 transition-all font-semibold text-sm cursor-pointer text-left group"
  >
                <div className="flex items-center gap-3">
                  <span className="text-xl bg-purple-100/50 w-8 h-8 rounded-lg flex items-center justify-center text-purple-500">
                    <HelpCircle className="h-5 w-5" />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-bold">Other Billing Issue</span>
                    <span className="text-[10px] text-slate-500 font-normal">Miscellaneous account concerns</span>
                  </div>
                </div>
                <span className="text-purple-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              <button
                onClick={() => setActiveFilter("completed")}
                className={cn(
                  "w-full flex items-center justify-between p-3.5 rounded-xl border transition-all font-semibold text-sm cursor-pointer text-left group",
                  activeFilter === "completed" || activeFilter === "resolved"
                    ? "border-emerald-500 bg-emerald-50/80 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20 font-bold"
                    : "border-slate-100 bg-slate-50/30 text-slate-950 hover:bg-slate-50/70"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl bg-slate-100/50 w-8 h-8 rounded-lg flex items-center justify-center">📄</span>
                  <div className="flex flex-col">
                    <span className="font-bold">Request History</span>
                    <span className="text-[10px] text-slate-500 font-normal">View resolved & completed tickets archive</span>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              <Link to="/profile" className="block">
                <div className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/30 text-slate-950 hover:bg-slate-50/70 transition-all font-semibold text-sm cursor-pointer text-left group">
                  <div className="flex items-center gap-3">
                    <span className="text-xl bg-slate-100/50 w-8 h-8 rounded-lg flex items-center justify-center">👤</span>
                    <div className="flex flex-col">
                      <span className="font-bold">Profile</span>
                      <span className="text-[10px] text-slate-500 font-normal">Manage settings & contact details</span>
                    </div>
                  </div>
                  <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Official SORECO-1 Announcement Board */}
      <div className="pt-8 border-t border-slate-200/80 space-y-6">
        <div className="flex flex-col items-center justify-center text-center gap-3 border-b border-slate-200/60 pb-4">
          <div className="flex flex-col items-center justify-center text-center gap-2">
            <div className="p-2.5 rounded-2xl bg-orange-100 text-orange-600 shrink-0 inline-flex items-center justify-center shadow-inner">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-poppins tracking-tight text-center">
                SORECO-1 Advisory & Announcement Board
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 text-center max-w-lg mx-auto mt-0.5">
                Official power advisories, maintenance schedules, and co-op notices
              </p>
            </div>
          </div>
          {announcements.some(ann => ann.createdAt && (new Date() - new Date(ann.createdAt)) / (1000 * 60 * 60) < 48) && (
            <Badge className="bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs animate-pulse px-3.5 py-1 rounded-full shadow-sm">
              New Advisories
            </Badge>
          )}
        </div>

        {announcements.length === 0 ? (
          <Card className="border-dashed border-2 bg-slate-50/50 border-slate-200 rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm">
              <Megaphone className="h-10 w-10 text-slate-300 mb-3 opacity-60" />
              <p className="font-medium text-slate-600">No public announcements published at this time.</p>
              <p className="text-xs text-slate-400 mt-1">Check back later for scheduled power interruption updates.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {announcements.slice(0, 6).map((ann) => {
              const isRecent = ann.createdAt && (new Date() - new Date(ann.createdAt)) / (1000 * 60 * 60) < 48;
              return (
                <Card
                  key={ann.id}
                  className={cn(
                    "border-slate-200/80 bg-white hover:border-orange-300 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer group flex flex-col justify-between relative",
                    isRecent && "ring-2 ring-orange-500/30 border-orange-300"
                  )}
                  onClick={() => setSelectedAnnouncement(ann)}
                >
                  <div>
                    {isRecent && (
                      <div className="absolute top-2.5 right-2.5 z-10">
                        <span className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          New
                        </span>
                      </div>
                    )}
                    {ann.image ? (
                      <div
                        className="relative w-full h-40 overflow-hidden bg-slate-100 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage(ann.image);
                        }}
                        title="Click to view full picture"
                      >
                        <img
                          src={ann.image}
                          alt={ann.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-xs">
                          <ZoomIn className="h-4 w-4" /> Expand Photo
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-20 bg-gradient-to-br from-amber-50 to-orange-100/60 p-4 flex items-center gap-3 border-b border-orange-100">
                        <div className="p-2 rounded-xl bg-white shadow-xs text-orange-600 shrink-0">
                          <Megaphone className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-amber-900 uppercase tracking-wider font-mono">Public Advisory</span>
                      </div>
                    )}
                    
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug">
                        {ann.title}
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                        <Calendar className="h-3 w-3 text-orange-500 shrink-0" />
                        <span>
                          {ann.createdAt
                            ? new Date(ann.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "Published recently"}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-4 pt-0">
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{ann.content}</p>
                    </CardContent>
                  </div>

                  <CardFooter className="p-4 pt-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs font-bold text-orange-600 group-hover:text-orange-700">
                    <span>Read Full Notice</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[520px] max-h-[92dvh] overflow-y-auto scroll-touch rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900">Create New Request</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select the type of service you need and provide details.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue={requestType || "billing"} value={requestType} onValueChange={(v) => setRequestType(v)}>
            <TabsList className={`grid w-full ${userData?.hasUnpaidBill ? "grid-cols-3" : "grid-cols-2"} mb-6 bg-slate-100 p-1 rounded-xl h-auto`}>
              <TabsTrigger value="billing" className="gap-1 sm:gap-1.5 text-[11px] sm:text-xs py-2 px-1 rounded-lg">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="truncate">Billing Dispute</span>
              </TabsTrigger>
              {userData?.hasUnpaidBill && (
                <TabsTrigger value="reconnection" className="gap-1 sm:gap-1.5 text-[11px] sm:text-xs py-2 px-1 rounded-lg">
                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" /> <span className="truncate">Reconnection</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="other-billing" className="gap-1 sm:gap-1.5 text-[11px] sm:text-xs py-2 px-1 rounded-lg">
                <HelpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" /> <span className="truncate">Other Issue</span>
              </TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <TabsContent value="billing" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Dispute Category</Label>
                  <select
                    id="billingCategory"
                    value={billingCategory}
                    onChange={(e) => setBillingCategory(e.target.value)}
                    className="flex h-10 w-full sm:w-[300px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 appearance-none text-slate-800 cursor-pointer font-medium hover:border-orange-300"
                    required
                  >
                    <option value="" disabled>Select category</option>
                    <option value="Overcharging / High Bill">Overcharging / High Bill</option>
                    <option value="Wrong Meter Reading">Wrong Meter Reading</option>
                    <option value="Payment Not Reflected">Payment Not Reflected</option>
                  </select>
                </div>
              </TabsContent>
              
              {userData?.hasUnpaidBill && (
                <TabsContent value="reconnection" className="space-y-4 mt-0">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                    <Label className="text-sm font-bold flex items-center gap-2 text-slate-800">
                      <AlertCircle className="h-4 w-4 text-primary" /> Pre-submission Checklist
                    </Label>
                    <div className="space-y-2">
                      {[
                        { id: "paid", label: "I have paid all outstanding balances" },
                        { id: "receiptReady", label: "I have the proof of payment ready" },
                        { id: "accessClear", label: "Meter area is accessible for crew" }
                      ].map((item) => <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={item.id}
                          className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                          onChange={(e) => setChecklist({ ...checklist, [item.id]: e.target.checked })}
                          required
                        />
                        <Label htmlFor={item.id} className="text-xs font-normal cursor-pointer text-slate-600">
                          {item.label}
                        </Label>
                      </div>)}
                    </div>
                  </div>
                </TabsContent>
              )}

              {/* other-billing has no extra fields */}
              <TabsContent value="other-billing" className="space-y-4 mt-0">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                  <p>Submit any other billing-related inquiries or concerns here. Please provide as much detail as possible in the description below.</p>
                </div>
              </TabsContent>

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <Label htmlFor="description" className="text-xs sm:text-sm font-semibold text-slate-800">Detailed Description</Label>
                  <span className={cn(
                    "text-[11px] font-mono",
                    description.length > 500 ? "text-rose-600 font-bold" : "text-slate-400"
                  )}>
                    {description.length} / 500 texts (limited to 500 texts only)
                  </span>
                </div>
                <Textarea
                  id="description"
                  placeholder="Please provide details about your request (limited to 500 texts only)..."
                  className="w-full min-h-[100px] max-h-[180px] resize-y text-sm bg-white"
                  required
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {description.length > 500 && (
                  <p className="text-[11px] text-rose-600 font-semibold">Description exceeds the 500-character limit. Please shorten your text.</p>
                )}
              </div>

              {requestType !== "other-billing" && (
                <div className="space-y-2">
                  <Label>Supporting Document / Proof of Payment</Label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                      {previewImage ? <img src={previewImage} alt="Preview" className="h-full w-full object-contain p-2" /> : <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <ImageIcon className="w-8 h-8 mb-3 text-slate-400" />
                          <p className="mb-2 text-sm text-slate-500 font-semibold">Click to upload image</p>
                          <p className="text-xs text-slate-400">PNG, JPG or JPEG only</p>
                        </div>}
                      <input type="file" className="hidden" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={handleImageChange} required />
                    </label>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90" disabled={isSubmitting || description.length > 500}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Submit Request
              </Button>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Selected Announcement View Dialog */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[620px] max-h-[90dvh] overflow-y-auto scroll-touch rounded-2xl bg-white p-4 sm:p-6 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-orange-600">
                <Megaphone className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider font-mono">Public Announcement</span>
              </div>
              <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px] font-bold">
                SORECO-1 Notice
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900 leading-snug">
              {selectedAnnouncement?.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-slate-500 text-xs pt-0.5">
              <Calendar className="h-3.5 w-3.5 text-orange-500" /> Published on {selectedAnnouncement?.createdAt ? new Date(selectedAnnouncement.createdAt).toLocaleString("en-US", {
                dateStyle: "full",
                timeStyle: "short"
              }) : "Recent"}
            </DialogDescription>
          </DialogHeader>

          {/* Announcement Picture in Dialog */}
          {selectedAnnouncement?.image && (
            <div className="mt-4 rounded-xl overflow-hidden border border-orange-200 bg-orange-50/50 p-2 group relative">
              <img
                src={selectedAnnouncement.image}
                alt={selectedAnnouncement.title}
                className="w-full max-h-72 object-contain rounded-lg cursor-pointer bg-white"
                onClick={() => setLightboxImage(selectedAnnouncement.image)}
              />
              <div 
                onClick={() => setLightboxImage(selectedAnnouncement.image)}
                className="absolute inset-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center cursor-pointer text-white font-semibold text-xs gap-2 backdrop-blur-xs"
              >
                <ZoomIn className="h-4 w-4" /> Click to Enlarge Picture
              </div>
            </div>
          )}

          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
            {selectedAnnouncement?.content}
          </div>

          <div className="pt-3 flex items-center gap-2">
            {selectedAnnouncement?.image && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setLightboxImage(selectedAnnouncement.image)}
                className="h-10 border-orange-200 text-orange-700 hover:bg-orange-50 rounded-xl font-semibold text-xs gap-1.5"
              >
                <ZoomIn className="h-4 w-4" /> View Fullscreen
              </Button>
            )}
            <Button
              onClick={() => setSelectedAnnouncement(null)}
              className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-semibold text-xs"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <div className="absolute -top-12 right-0 flex items-center gap-2">
              <a
                href={lightboxImage}
                download="inquiry-picture.jpg"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                title="Download Image"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                onClick={() => setLightboxImage(null)}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={lightboxImage}
              alt="Enlarged inquiry picture"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div></div>;
};
