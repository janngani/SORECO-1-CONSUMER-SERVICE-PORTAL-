import { CheckCircle2, Clock, Truck, CheckCircle, Camera, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
export const ServiceTracker = ({ status }) => {
  const isCancelled = status === "cancelled";
  if (isCancelled) {
    return <div className="w-full py-4 px-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-1">
      <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
        <XCircle className="h-6 w-6 text-rose-600" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-rose-900">Service Request Withdrawn</h4>
        <p className="text-[11px] text-rose-700 leading-relaxed">
          This ticket has been cancelled by the consumer. It is no longer visible to technical personnel and no further action will be taken.
        </p>
      </div>
    </div>;
  }
  const stages = [
    { id: "pending", label: "Submitted", icon: <Clock className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: "reviewing", label: "Reviewing", icon: <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: "dispatched", label: "Dispatched", icon: <Truck className="h-4 w-4 sm:h-5 sm:w-5" /> },
    { id: "resolved", label: "Resolved", icon: <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" /> }
  ];
  const isClearerPicture = status === "asking for a clearer picture" || status === "clearer_picture";
  const getCurrentIndex = () => {
    if (isClearerPicture) return 1;
    return stages.findIndex((s) => s.id === status);
  };
  const currentIndex = getCurrentIndex();
  return <div className="w-full py-4 space-y-4">
      <div className="relative flex justify-between">
        
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
        <div
    className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-br from-amber-500 to-orange-600 -translate-y-1/2 z-0 transition-all duration-500"
    style={{ width: `${Math.max(0, currentIndex) / (stages.length - 1) * 100}%` }}
  />

        {stages.map((stage, index) => {
    const isActive = index <= currentIndex;
    const isCurrent = index === currentIndex;
    return <div key={stage.id} className="relative z-10 flex flex-col items-center">
              <div
      className={cn(
        "h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center transition-all duration-300",
        isActive ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white scale-110 shadow-lg shadow-primary/20" : "bg-white text-slate-300 border-2 border-slate-100",
        isCurrent && "ring-4 ring-primary/20"
      )}
    >
                {stage.icon}
              </div>
              <span className={cn(
      "mt-1.5 sm:mt-2 text-[9px] sm:text-xs font-medium text-center max-w-[65px] sm:max-w-[80px] leading-tight sm:leading-normal",
      isActive ? "text-primary" : "text-slate-400"
    )}>
                {stage.label}
              </span>
            </div>;
  })}
      </div>

      {isClearerPicture && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs font-medium">
          <Camera className="h-4 w-4 text-orange-600 shrink-0 animate-pulse" />
          <span>
            <strong>Action Needed:</strong> Our personnel requested a clearer photo of your evidence. Please upload a new image below.
          </span>
        </div>
      )}
    </div>;
};
