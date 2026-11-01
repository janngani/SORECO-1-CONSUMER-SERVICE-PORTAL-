import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { compressImage } from "@/src/lib/imageCompressor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle2,
  Truck,
  MessageSquare,
  Image as ImageIcon,
  Camera,
  RotateCcw,
  Star,
  Paperclip,
  X,
  Plus,
  ZoomIn,
  Download,
  History
} from "lucide-react";
import { ServiceTracker } from "@/src/components/ServiceTracker";
import { ConsumerTransactionHistoryModal } from "@/src/components/ConsumerTransactionHistoryModal";
import { cn } from "@/lib/utils";
export const TicketDetails = () => {
  const { id } = useParams();
  const { user, userData, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [newPreviewImage, setNewPreviewImage] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [selectedChatImages, setSelectedChatImages] = useState([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const scrollRef = useRef(null);
  const chatFileInputRef = useRef(null);

  const handleChatFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsProcessingImages(true);
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
        setSelectedChatImages((prev) => [...prev, ...validImages]);
        toast.success(`Attached ${validImages.length} picture${validImages.length > 1 ? "s" : ""}`);
      }
    } catch (err) {
      toast.error(err.message || "Upload rejected: Only PNG, JPG, and JPEG images are allowed.");
    } finally {
      setIsProcessingImages(false);
      if (chatFileInputRef.current) {
        chatFileInputRef.current.value = "";
      }
    }
  };

  const removeChatImage = (indexToRemove) => {
    setSelectedChatImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const lastTicketHashRef = useRef("");
  const prevMessagesCountRef = useRef(0);
  const initialChatScrolledRef = useRef(false);

  const scrollChatToBottom = (smooth = true) => {
    if (scrollRef.current) {
      // Find the scrollable viewport inside Radix ScrollArea or parent container
      const viewport = scrollRef.current.closest("[data-radix-scroll-area-viewport]") || scrollRef.current.parentElement;
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: smooth ? "smooth" : "auto"
        });
      }
    }
  };

  const fetchTicket = async (isBackground = false) => {
    if (!id) return;
    try {
      const data = await api.tickets.get(id);

      // Frontend IDOR verification (WSTG-ATHZ-04)
      if (!isAdmin && user) {
        const isOwner = data.user_id === user.id ||
          data.consumerId === user.id ||
          (data.accountNumber && userData?.accountNumber && data.accountNumber === userData.accountNumber);
        if (!isOwner) {
          toast.error("Not allowed: You do not have permission to view this ticket");
          navigate("/dashboard");
          return;
        }
      }

      const hash = `${data.status}_${data.messages?.length}_${data.checklist?.length}_${JSON.stringify(data.feedback || {})}`;
      
      // Prevent unnecessary re-render triggers during background polling
      if (isBackground && hash === lastTicketHashRef.current) {
        return;
      }
      lastTicketHashRef.current = hash;
      setTicket(data);
    } catch (error) {
      if (!isBackground) {
        console.error("Error fetching ticket:", error);
        const isForbidden = error?.status === 403 || error?.message?.includes("Not allowed") || error?.message?.includes("permission");
        toast.error(isForbidden ? "Not allowed: You do not have permission to view this ticket" : "Ticket not found");
        navigate(isAdmin ? "/admin" : "/dashboard");
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Always start at the top of the UI when opening/switching tickets
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    initialChatScrolledRef.current = false;
    prevMessagesCountRef.current = 0;
    lastTicketHashRef.current = "";
    fetchTicket(false);

    const interval = setInterval(() => {
      fetchTicket(true);
    }, 20000);

    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    const currentCount = ticket?.messages?.length || 0;
    if (currentCount > 0 && !initialChatScrolledRef.current) {
      initialChatScrolledRef.current = true;
      prevMessagesCountRef.current = currentCount;
      // Scroll only inside the chat window without affecting the page scroll position
      setTimeout(() => {
        scrollChatToBottom(false);
      }, 100);
    } else if (currentCount > prevMessagesCountRef.current) {
      prevMessagesCountRef.current = currentCount;
      scrollChatToBottom(true);
    }
  }, [ticket?.messages?.length]);
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!message.trim() && selectedChatImages.length === 0) || !id || !user) return;
    const wordCount = message.trim() ? message.trim().split(/\s+/).filter(Boolean).length : 0;
    if (wordCount > 100) {
      toast.error("Message exceeds the 100-word limit. Please shorten your message.");
      return;
    }
    setIsSending(true);
    try {
      const newMessage = {
        senderId: user.id || user.uid,
        senderName: userData?.fullName || (isAdmin ? "Staff" : "User"),
        text: message.trim(),
        images: selectedChatImages.length > 0 ? selectedChatImages : undefined,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        isAdmin
      };
      const updatedMessages = [...ticket.messages || [], newMessage];
      await api.tickets.update(id, { messages: updatedMessages });
      setMessage("");
      setSelectedChatImages([]);
      await fetchTicket();
      setTimeout(() => scrollChatToBottom(true), 100);
    } catch (error) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };
  const updateTicketStatus = async (newStatus, automatedMessage) => {
    if (!id || !ticket) return;
    const currentStatus = ticket.status || "";
    const isResolved = currentStatus === "resolved";
    const isCancelled = currentStatus === "cancelled";
    const isDispatched = currentStatus === "dispatched";
    const isReviewing = currentStatus === "reviewing";

    if (isResolved || isCancelled) return;
    if (newStatus === "reviewing" && (isReviewing || isDispatched)) return;
    if (newStatus === "dispatched" && isDispatched) return;
    try {
      const updateData = { status: newStatus };
      if (automatedMessage) {
        const newMessage = {
          senderId: user?.id || user?.uid || "admin",
          senderName: "SORECO-1 Support",
          text: automatedMessage,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          isAdmin: true,
          isAuto: true
        };
        updateData.messages = [...ticket.messages || [], newMessage];
      }
      await api.tickets.update(id, updateData);
      const isReconnection = ticket.type === "reconnection" || (ticket.category || "").toLowerCase().includes("reconnection");
      if (newStatus === "resolved" && isReconnection) {
        toast.success("Ticket resolved & consumer successfully updated to Connected!");
      } else {
        toast.success(`Ticket status updated to ${newStatus}`);
      }
      window.dispatchEvent(new Event("refresh-user-profile"));
      fetchTicket();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800, 0.7);
        setNewPreviewImage(compressed);
      } catch (err) {
        toast.error(err.message || "Upload rejected: Only PNG, JPG, and JPEG images are allowed.");
        if (e.target) e.target.value = "";
        setNewPreviewImage(null);
      }
    }
  };
  const handleUpdateImage = async () => {
    if (!id || !newPreviewImage) return;
    setIsUpdatingImage(true);
    try {
      const systemMessage = {
        senderId: "system",
        senderName: "System",
        text: "Consumer has updated the evidence image.",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        isAdmin: true
      };
      const updatedMessages = [...ticket.messages || [], systemMessage];
      const updatePayload = {
        evidenceImage: newPreviewImage,
        messages: updatedMessages
      };
      if (ticket?.status === "asking for a clearer picture" || ticket?.status === "clearer_picture") {
        updatePayload.status = "reviewing";
      }
      await api.tickets.update(id, updatePayload);
      setNewPreviewImage(null);
      toast.success("Evidence image updated successfully");
      fetchTicket();
    } catch (error) {
      toast.error("Failed to update image");
    } finally {
      setIsUpdatingImage(false);
    }
  };
  const requestClearerPicture = async () => {
    if (!id || !user || !ticket) return;
    const currentStatus = ticket.status || "";
    const isResolved = currentStatus === "resolved";
    const isCancelled = currentStatus === "cancelled";
    const isDispatched = currentStatus === "dispatched";
    const isClearerPicture = currentStatus === "asking for a clearer picture" || currentStatus === "clearer_picture";

    if (isResolved || isCancelled || isDispatched || isClearerPicture) return;
    try {
      const newMessage = {
        senderId: user.id || user.uid,
        senderName: userData?.fullName || "Staff",
        text: "Hello! Could you please provide a clearer picture of your evidence? The current one is a bit blurry and we need a better view to process your request.",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        isAdmin: true,
        isAuto: true
      };
      const updatedMessages = [...ticket.messages || [], newMessage];
      await api.tickets.update(id, {
        status: "asking for a clearer picture",
        messages: updatedMessages,
        actionType: "request_clearer_picture",
        notificationType: "clearer_picture",
        consumerEmail: ticket?.consumerEmail || ticket?.email,
        consumerName: ticket?.consumerName,
        customMessage: "Our technical personnel reviewed your request and noticed that the uploaded evidence photo is unclear or blurry. Please click the link below to upload a clearer photo so we can process your request promptly."
      });
      toast.success("Request for clearer picture sent & notification email dispatched");
      fetchTicket();
    } catch (error) {
      toast.error("Failed to send request");
    }
  };
  const handleSubmitFeedback = async () => {
    if (!id) return;
    setIsSubmittingFeedback(true);
    try {
      await api.tickets.update(id, {
        feedback: {
          rating: feedbackRating,
          comment: feedbackComment.trim(),
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
      if (feedbackRating === 5) {
        toast.success("Thank you for a Full star Review!");
      } else {
        toast.success("Thank you for reviewing our services will make sure to improvise it better.");
      }
      fetchTicket();
    } catch (error) {
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };
  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center">
        <Clock className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  if (!ticket) return null;
  return <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link to={isAdmin ? "/admin" : "/dashboard"} className="inline-block mb-6">
        <Button
          variant="ghost"
          className="gap-2 text-slate-700 hover:text-slate-900 font-bold bg-white border border-slate-200/80 shadow-sm hover:bg-slate-50 rounded-xl px-4 py-2 text-xs transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-slate-700" />
          {isAdmin ? "Back to Admin Dashboard" : "Back to Consumer Dashboard"}
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="capitalize">
                  {ticket.type}
                </Badge>
                <Badge className={cn(
                  "capitalize",
                  ticket.status === "pending" && "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
                  ticket.status === "reviewing" && "bg-blue-100 text-blue-700 hover:bg-blue-100",
                  ticket.status === "dispatched" && "bg-purple-100 text-purple-700 hover:bg-purple-100",
                  ticket.status === "resolved" && "bg-green-100 text-green-700 hover:bg-green-100",
                  (ticket.status === "asking for a clearer picture" || ticket.status === "clearer_picture") && "bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-100"
                )}>
                  {(ticket.status === "clearer_picture" || ticket.status === "asking for a clearer picture") ? "Action Needed: Clearer Picture" : ticket.status}
                </Badge>
              </div>
              <CardTitle className="text-xl">{ticket.category}</CardTitle>
              <CardDescription className="text-xs font-mono font-bold text-slate-500">Ticket ID: {ticket.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <p className="text-slate-500 mb-1">Consumer</p>
                <p className="font-bold text-slate-900">{ticket.consumerName}</p>
                <p className="text-xs text-slate-400 font-mono">Account: {ticket.accountNumber || "N/A"}</p>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="mt-2 w-full flex items-center justify-center gap-2 border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 font-bold h-8 text-xs rounded-lg"
                  >
                    <History className="h-3.5 w-3.5" /> View Past Transaction History
                  </Button>
                )}
              </div>
              <div className="text-sm">
                <p className="text-slate-500 mb-1">Description</p>
                <p className="text-slate-700 leading-relaxed">{ticket.description}</p>
              </div>
              {ticket.evidenceImage && <div className="pt-2">
                  <p className="text-sm text-slate-500 mb-2">Attached Evidence</p>
                  <div className="relative group">
                    <img
    src={newPreviewImage || ticket.evidenceImage}
    alt="Evidence"
    className="w-full rounded-lg border border-slate-100 shadow-sm"
  />
                    {!isAdmin && ticket.status !== "resolved" && <div className="mt-3 space-y-2">
                        {!newPreviewImage ? <label className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors text-sm font-medium">
                            <Camera className="h-4 w-4" /> Change Image
                            <input type="file" className="hidden" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={handleImageChange} />
                          </label> : <div className="flex gap-2">
                            <Button
    size="sm"
    className="flex-grow bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90"
    onClick={handleUpdateImage}
    disabled={isUpdatingImage}
  >
                              {isUpdatingImage ? <Clock className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                              Save New Image
                            </Button>
                            <Button
    size="sm"
    variant="outline"
    onClick={() => setNewPreviewImage(null)}
    disabled={isUpdatingImage}
  >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>}
                      </div>}
                  </div>
                </div>}

              {isAdmin && (() => {
                const currentStatus = ticket.status || "";
                const isResolved = currentStatus === "resolved";
                const isDispatched = currentStatus === "dispatched";
                const isReviewing = currentStatus === "reviewing";
                const isClearerPicture = currentStatus === "asking for a clearer picture" || currentStatus === "clearer_picture";
                const isCancelled = currentStatus === "cancelled";

                // Progressive workflow guards:
                // 1. Request Clearer Picture: Disabled if already dispatched, resolved, cancelled, or currently waiting for clearer photo
                const isClearerPictureDisabled = isResolved || isDispatched || isCancelled || isClearerPicture;

                // 2. Set to Reviewing: Disabled if already reviewing, or once crew is dispatched, resolved, or cancelled
                const isReviewingDisabled = isReviewing || isDispatched || isResolved || isCancelled;

                // 3. Dispatch Crew: Disabled if already dispatched, resolved, or cancelled
                const isDispatchCrewDisabled = isDispatched || isResolved || isCancelled;

                // 4. Mark Resolved: Disabled if already resolved or cancelled
                const isResolvedDisabled = isResolved || isCancelled;

                return (
                  <div className="pt-4 border-t space-y-3">
                    <p className="text-sm font-bold text-slate-900">Admin Actions</p>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={requestClearerPicture}
                        disabled={isClearerPictureDisabled}
                        className={cn(
                          "justify-start gap-2.5 h-9 font-bold text-xs disabled:!opacity-100 disabled:pointer-events-none disabled:cursor-not-allowed",
                          isClearerPictureDisabled
                            ? "text-orange-950 bg-orange-100/90 border-orange-300 font-bold"
                            : "text-orange-700 border-orange-300 bg-white hover:bg-orange-50 hover:border-orange-400 cursor-pointer shadow-2xs"
                        )}
                      >
                        <ImageIcon className={cn("h-4 w-4 shrink-0", isClearerPictureDisabled ? "text-orange-900" : "text-orange-600")} />
                        <span className={cn(isClearerPictureDisabled ? "text-orange-950 font-bold" : "")}>Request Clearer Picture</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTicketStatus(
                          "reviewing",
                          "Your request is currently being reviewed by our technical team."
                        )}
                        disabled={isReviewingDisabled}
                        className={cn(
                          "justify-start gap-2.5 h-9 font-bold text-xs disabled:!opacity-100 disabled:pointer-events-none disabled:cursor-not-allowed",
                          isReviewing
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : isReviewingDisabled
                            ? "text-slate-900 bg-slate-100 border-slate-300 font-bold"
                            : "text-blue-700 border-blue-300 bg-white hover:bg-blue-50 hover:border-blue-400 cursor-pointer shadow-2xs"
                        )}
                      >
                        <Clock className={cn("h-4 w-4 shrink-0", isReviewing ? "text-white" : isReviewingDisabled ? "text-slate-800" : "text-blue-600")} />
                        <span className={cn(isReviewing ? "text-white" : isReviewingDisabled ? "text-slate-900 font-bold" : "")}>
                          {isReviewing ? "Currently Reviewing" : "Set to Reviewing"}
                        </span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTicketStatus(
                          "dispatched",
                          "A technical crew has been dispatched to your location. Please ensure our personnel have access to the meter or service area."
                        )}
                        disabled={isDispatchCrewDisabled}
                        className={cn(
                          "justify-start gap-2.5 h-9 font-bold text-xs disabled:!opacity-100 disabled:pointer-events-none disabled:cursor-not-allowed",
                          isDispatched
                            ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                            : isDispatchCrewDisabled
                            ? "text-slate-900 bg-slate-100 border-slate-300 font-bold"
                            : "text-purple-700 border-purple-300 bg-white hover:bg-purple-50 hover:border-purple-400 cursor-pointer shadow-2xs"
                        )}
                      >
                        <Truck className={cn("h-4 w-4 shrink-0", isDispatched ? "text-white" : isDispatchCrewDisabled ? "text-slate-800" : "text-purple-600")} />
                        <span className={cn(isDispatched ? "text-white" : isDispatchCrewDisabled ? "text-slate-900 font-bold" : "")}>
                          {isDispatched ? "Crew Dispatched" : "Dispatch Crew"}
                        </span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTicketStatus(
                          "resolved",
                          (ticket.type === "reconnection" || (ticket.category || "").toLowerCase().includes("reconnection"))
                            ? "Great news! Your reconnection request has been resolved and your electrical service has been restored to Connected. If you have any further questions or need assistance, please feel free to message us here. Thank you!"
                            : "Great news! Your service request has been resolved. If you have any further questions or if the issue persists, feel free to chat with us here. Thank you!"
                        )}
                        disabled={isResolvedDisabled}
                        className={cn(
                          "justify-start gap-2.5 h-9 font-bold text-xs disabled:!opacity-100 disabled:pointer-events-none disabled:cursor-not-allowed",
                          isResolved
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : isResolvedDisabled
                            ? "text-slate-900 bg-slate-100 border-slate-300 font-bold"
                            : "text-emerald-700 border-emerald-300 bg-white hover:bg-emerald-50 hover:border-emerald-400 cursor-pointer shadow-2xs"
                        )}
                      >
                        <CheckCircle2 className={cn("h-4 w-4 shrink-0", isResolved ? "text-white" : isResolvedDisabled ? "text-slate-800" : "text-emerald-600")} />
                        <span className={cn(isResolved ? "text-white" : isResolvedDisabled ? "text-slate-900 font-bold" : "")}>
                          {isResolved ? "Resolved & Completed" : "Mark Resolved"}
                        </span>
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Service Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceTracker status={ticket.status} />
            </CardContent>
          </Card>

          {ticket.status === "resolved" && <Card className="border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="bg-green-50/50 pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> 
                  Consumer Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {(() => {
                  const parsedFeedback = (() => {
                    if (!ticket.feedback) return null;
                    if (typeof ticket.feedback === "string") {
                      try { return JSON.parse(ticket.feedback); } catch (e) { return null; }
                    }
                    return ticket.feedback;
                  })();

                  if (parsedFeedback) {
                    return (
                      <div className="space-y-3">
                        <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={cn(
                                    "h-4 w-4",
                                    s <= (parsedFeedback.rating || 0) ? "text-yellow-500 fill-yellow-500" : "text-slate-200"
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {parsedFeedback.createdAt ? new Date(parsedFeedback.createdAt).toLocaleDateString() : ""}
                            </span>
                          </div>
                          {parsedFeedback.comment && (
                            <p className="text-sm text-slate-700 italic pt-1 leading-relaxed">"{parsedFeedback.comment}"</p>
                          )}
                        </div>

                        {/* Admin Official Response */}
                        {parsedFeedback.adminResponse ? (
                          <div className="p-3.5 bg-blue-50/90 border border-blue-200/90 rounded-xl text-xs space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-blue-900 flex items-center gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5 text-blue-600" /> Admin Official Response:
                              </p>
                              {parsedFeedback.adminResponseAt && (
                                <span className="text-[10px] text-blue-600/75 font-medium">
                                  {new Date(parsedFeedback.adminResponseAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-800 leading-relaxed font-normal bg-white/80 p-2.5 rounded-lg border border-blue-100">
                              {parsedFeedback.adminResponse}
                            </p>
                          </div>
                        ) : isAdmin ? (
                          <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2">
                            <p className="text-xs font-semibold text-slate-700">Reply to Consumer Feedback</p>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Type official admin response..."
                                className="text-xs h-8 bg-white"
                                id="ticket-admin-reply-input"
                              />
                              <Button
                                size="sm"
                                className="h-8 bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 text-xs text-white shrink-0"
                                onClick={async () => {
                                  const inputEl = document.getElementById("ticket-admin-reply-input");
                                  const text = inputEl ? inputEl.value.trim() : "";
                                  if (!text) return;
                                  try {
                                    const updatedFeedback = {
                                      ...parsedFeedback,
                                      adminResponse: text,
                                      adminResponseAt: new Date().toISOString()
                                    };
                                    await api.tickets.update(ticket.id, { feedback: updatedFeedback });
                                    setTicket({ ...ticket, feedback: updatedFeedback });
                                    toast.success("Admin response sent successfully!");
                                  } catch (err) {
                                    toast.error("Failed to send response");
                                  }
                                }}
                              >
                                Reply
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-lg text-[11px] text-slate-500 flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>Awaiting cooperative admin official response</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (!isAdmin) {
                    return (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-500">How would you rate our service?</p>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              onClick={() => setFeedbackRating(s)}
                              className="focus:outline-none"
                            >
                              <Star
                                className={cn(
                                  "h-6 w-6 transition-all",
                                  s <= feedbackRating ? "text-yellow-500 fill-yellow-500 scale-110" : "text-slate-200 hover:text-yellow-200"
                                )}
                              />
                            </button>
                          ))}
                        </div>
                        <textarea
                          placeholder="Any additional comments?"
                          className="w-full min-h-[80px] p-3 text-sm border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                        />
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          onClick={handleSubmitFeedback}
                          disabled={isSubmittingFeedback}
                        >
                          {isSubmittingFeedback ? <Clock className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                          Submit Feedback
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div className="text-center py-4">
                      <p className="text-xs text-slate-400 italic">No feedback provided yet.</p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>}
        </div>

        <div className="lg:col-span-2">
          <Card className="border-slate-100 shadow-lg h-[65dvh] min-h-[460px] sm:h-[600px] flex flex-col">
            <CardHeader className="border-b py-3 sm:py-4 px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">In-Ticket Chat</CardTitle>
                  <CardDescription className="text-xs">Direct communication with SORECO-1 Staff</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-grow p-0 overflow-hidden">
              <ScrollArea className="h-full p-4 sm:p-6">
                <div className="space-y-6">
                  {ticket.messages && ticket.messages.length > 0 ? ticket.messages.map((msg, i) => {
                    const isStaffOrAdminMsg = Boolean(
                      msg.isAdmin ||
                      msg.senderId === "admin" ||
                      msg.senderId === "system" ||
                      msg.isAuto ||
                      msg.senderRole === "admin" ||
                      msg.senderName?.toLowerCase().includes("admin") ||
                      msg.senderName?.toLowerCase().includes("soreco") ||
                      msg.senderName?.toLowerCase().includes("support") ||
                      msg.senderName?.toLowerCase().includes("staff")
                    );

                    const isMe = isAdmin
                      ? (isStaffOrAdminMsg || msg.senderId === (user?.id || user?.uid))
                      : (!isStaffOrAdminMsg && (msg.senderId === (user?.id || user?.uid) || !msg.senderId));

                    const imageList = msg.images || (msg.image ? [msg.image] : []);
                    const hasImages = imageList.length > 0;

                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex flex-col max-w-[85%]",
                          isMe ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div className={cn("flex items-center gap-2 mb-1", isMe ? "justify-end" : "justify-start")}>
                          <span className={cn("text-[10px] font-bold uppercase tracking-wider", isMe ? "text-amber-600" : "text-slate-500")}>
                            {msg.isAuto ? "SORECO-1 Auto-Notification" : `${msg.senderName} ${msg.isAdmin ? "(Staff)" : ""}`}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className={cn(
                          "px-4 py-3 rounded-2xl text-sm shadow-sm space-y-2",
                          isMe ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-tr-none shadow-sm" : "bg-slate-100 text-slate-800 rounded-tl-none"
                        )}>
                          {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}

                          {hasImages && (
                            <div className={cn(
                              "grid gap-2 pt-1",
                              imageList.length === 1 ? "grid-cols-1" : imageList.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
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
                                    className="w-full h-28 sm:h-36 object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                                    <ZoomIn className="h-4 w-4" /> Expand
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                      <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                      <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
            </CardContent>

            <CardFooter className="border-t p-4 flex flex-col gap-3">
              
              {selectedChatImages.length > 0 && (
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      {selectedChatImages.length} picture{selectedChatImages.length > 1 ? "s" : ""} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedChatImages([])}
                      className="text-rose-500 hover:text-rose-700 text-xs font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                    {selectedChatImages.map((imgSrc, index) => (
                      <div key={index} className="relative shrink-0 group">
                        <img
                          src={imgSrc}
                          alt={`Preview ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeChatImage(index)}
                          className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-md transition-colors"
                          title="Remove image"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => chatFileInputRef.current?.click()}
                      className="w-16 h-16 shrink-0 rounded-lg border-2 border-dashed border-slate-300 hover:border-primary flex flex-col items-center justify-center text-slate-400 hover:text-primary transition-colors bg-white"
                      title="Add more pictures"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-[9px] font-bold mt-0.5">Add</span>
                    </button>
                  </div>
                </div>
              )}

              <input
                type="file"
                ref={chatFileInputRef}
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                multiple
                onChange={handleChatFilesChange}
                className="hidden"
              />

              <form onSubmit={handleSendMessage} className="flex flex-col w-full gap-1.5">
                <div className="flex w-full gap-2 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={isSending || isProcessingImages}
                    className={cn(
                      "shrink-0 border-slate-200 text-slate-600 hover:text-primary hover:bg-primary/5 transition-colors relative",
                      selectedChatImages.length > 0 && "border-primary text-primary bg-primary/10"
                    )}
                    title="Attach pictures (PNG, JPG, JPEG only)"
                  >
                    {isProcessingImages ? (
                      <Clock className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                    {selectedChatImages.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-gradient-to-br from-amber-500 to-orange-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                        {selectedChatImages.length}
                      </span>
                    )}
                  </Button>

                  <Input
                    placeholder={selectedChatImages.length > 0 ? "Add a message (optional, limited to 500 texts only)..." : "Type your message here (limited to 500 texts only)..."}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-grow focus-visible:ring-primary"
                    disabled={isSending}
                    maxLength={500}
                  />

                  <Button
                    type="submit"
                    size="icon"
                    className="bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90 text-white shrink-0"
                    disabled={isSending || (!message.trim() && selectedChatImages.length === 0) || (message.length > 500)}
                  >
                    {isSending ? <Clock className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>

                {message.trim().length > 0 && (
                  <div className="flex justify-between items-center px-1 text-[11px]">
                    <span className={cn(
                      "font-mono font-medium",
                      message.length > 500 ? "text-rose-600 font-bold" : "text-slate-400"
                    )}>
                      {message.length} / 500 texts
                    </span>
                    {message.length > 500 && (
                      <span className="text-rose-600 font-bold animate-pulse">
                        Message exceeds 500-character limit
                      </span>
                    )}
                  </div>
                )}
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <div className="absolute top-2 right-2 sm:-top-12 sm:right-0 flex items-center gap-2 z-10">
              <a
                href={lightboxImage}
                download="chat-picture.jpg"
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
              alt="Enlarged chat picture"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
      
      <ConsumerTransactionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        consumer={{
          fullName: ticket?.consumerName,
          consumerName: ticket?.consumerName,
          accountNumber: ticket?.accountNumber,
        }}
        tickets={ticket ? [ticket] : []}
      />
    </div>;
};
