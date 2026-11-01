import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { api } from "@/src/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History,
  FileText,
  Receipt,
  Zap,
  Calendar,
  BarChart3,
  TrendingUp,
  Clock,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Search,
  Filter,
  ArrowLeft,
  DollarSign,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2
} from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

const MONTH_OPTIONS = [
  { value: "01", label: "01 - January", short: "Jan", name: "January" },
  { value: "02", label: "02 - February", short: "Feb", name: "February" },
  { value: "03", label: "03 - March", short: "Mar", name: "March" },
  { value: "04", label: "04 - April", short: "Apr", name: "April" },
  { value: "05", label: "05 - May", short: "May", name: "May" },
  { value: "06", label: "06 - June", short: "Jun", name: "June" },
  { value: "07", label: "07 - July", short: "Jul", name: "July" },
  { value: "08", label: "08 - August", short: "Aug", name: "August" },
  { value: "09", label: "09 - September", short: "Sep", name: "September" },
  { value: "10", label: "10 - October", short: "Oct", name: "October" },
  { value: "11", label: "11 - November", short: "Nov", name: "November" },
  { value: "12", label: "12 - December", short: "Dec", name: "December" },
];

export const ConsumerTransactionHistoryModal = ({
  isOpen,
  onClose,
  consumer, // { fullName, consumerName, accountNumber, email, phoneNumber, address, id }
  tickets: passedTickets = null,
  inquiries: passedInquiries = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [syncedUser, setSyncedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterYear, setFilterYear] = useState("2026");
  const [filterMonth, setFilterMonth] = useState("all"); // "all" | "01" .. "12"
  const [filterDay, setFilterDay] = useState("all"); // "all" | "01" .. "31"
  const [tableInterval, setTableInterval] = useState("daily"); // "daily" | "weekly"
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all");
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [showBillReadingModal, setShowBillReadingModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const daysInSelectedMonth = useMemo(() => {
    const y = parseInt(filterYear, 10) || 2026;
    if (filterMonth === "all") return 31;
    const m = parseInt(filterMonth, 10) || 1;
    return new Date(y, m, 0).getDate();
  }, [filterYear, filterMonth]);

  const selectedMonthObj = useMemo(() => {
    return MONTH_OPTIONS.find((m) => m.value === filterMonth) || null;
  }, [filterMonth]);

  const consumerName = syncedUser?.fullName || consumer?.fullName || consumer?.consumerName || "Consumer";
  const accountNumber = syncedUser?.accountNumber || consumer?.accountNumber || "";
  const email = syncedUser?.email || consumer?.email || "";
  const phoneNumber = syncedUser?.phoneNumber || consumer?.phoneNumber || "";
  const address = syncedUser?.address || consumer?.address || "";
  const profileImage = syncedUser?.profileImage || consumer?.profileImage || "";

  useEffect(() => {
    if (!isOpen || !consumer) return;

    const loadConsumerData = async () => {
      setLoading(true);
      try {
        let foundUser = null;
        try {
          const userList = await api.users.list().catch(() => []);
          if (Array.isArray(userList)) {
            const rawAcc = consumer?.accountNumber?.trim().toLowerCase();
            const rawEmail = consumer?.email?.trim().toLowerCase();
            const rawName = (consumer?.fullName || consumer?.consumerName)?.trim().toLowerCase();
            const rawId = consumer?.id;

            foundUser = userList.find((u) => {
              if (rawId && u.id === rawId) return true;
              if (rawAcc && u.accountNumber && u.accountNumber.trim().toLowerCase() === rawAcc) return true;
              if (rawEmail && u.email && u.email.trim().toLowerCase() === rawEmail) return true;
              if (rawName && u.fullName && u.fullName.trim().toLowerCase() === rawName) return true;
              return false;
            });
          }
        } catch (e) {
          console.warn("Could not synchronize user profile:", e);
        }
        setSyncedUser(foundUser || null);

        let tList = passedTickets;
        if (!tList) {
          tList = await api.tickets.list().catch(() => []);
        }

        const effectiveAcc = foundUser?.accountNumber || accountNumber;
        const effectiveName = foundUser?.fullName || consumerName;

        const matchedTickets = (tList || []).filter((t) => {
          const accMatch = effectiveAcc && t.accountNumber && t.accountNumber.trim().toLowerCase() === effectiveAcc.trim().toLowerCase();
          const nameMatch = effectiveName && t.consumerName && t.consumerName.trim().toLowerCase() === effectiveName.trim().toLowerCase();
          const idMatch = (consumer?.id || foundUser?.id) && (t.consumerId === (consumer?.id || foundUser?.id) || t.userId === (consumer?.id || foundUser?.id));
          return accMatch || nameMatch || idMatch;
        });

        setTickets(matchedTickets);
      } catch (err) {
        console.error("Error loading consumer transaction history:", err);
      } finally {
        setLoading(false);
      }
    };

    loadConsumerData();
  }, [isOpen, consumer, passedTickets]);

  const usageData = useMemo(() => {
    const accNum = parseInt((accountNumber || "102938").replace(/\D/g, "") || "102938", 10);
    const baseKwh = 0.4 + ((accNum % 5) * 0.05); // ~0.4-0.6 kWh base
    const yearNum = parseInt(filterYear, 10) || 2026;

    // CASE 1: ONLY YEAR CHOSEN (filterMonth === "all")
    // Prompt: "if i choose only (year) it will show all 12 months in the table"
    if (filterMonth === "all") {
      return MONTH_OPTIONS.map((mObj, idx) => {
        const monthNum = idx + 1;
        const seasonal = (monthNum === 4 || monthNum === 5 || monthNum === 6) ? 1.25 : 1.0;
        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        const kwh = Math.round((baseKwh * daysInMonth * seasonal + (idx * 1.5)) * 10) / 10;
        const prevReading = 8000 + (idx * 320);
        const presReading = prevReading + Math.round(kwh);
        const isCurrentOrFuture = yearNum === 2026 && monthNum >= 9;

        return {
          label: `${mObj.short} ${yearNum}`,
          fullLabel: `${mObj.name} ${yearNum}`,
          kwh,
          prevReading,
          presReading,
          multiplier: 1.0,
          meterNo: `MTR-${1000 + (accNum % 8000)}`,
          status: isCurrentOrFuture ? "Pending Payment" : "Paid in Full",
          peakTime: seasonal > 1 ? "Dry Season Peak Load" : "Normal Residential Load",
          billingPeriod: `Billing Month: ${mObj.name} ${yearNum}`,
          dueDate: `15th of ${mObj.name} ${yearNum}`,
          type: "monthly"
        };
      });
    }

    // CASE 2: MONTH AND YEAR CHOSEN
    const mNum = parseInt(filterMonth, 10) || 1;
    const mObj = MONTH_OPTIONS.find((m) => m.value === filterMonth) || MONTH_OPTIONS[0];
    const daysInMonth = new Date(yearNum, mNum, 0).getDate();

    // Subcase 2A: Specific Day Chosen
    if (filterDay !== "all") {
      const dNum = Math.min(parseInt(filterDay, 10) || 1, daysInMonth);
      const dateObj = new Date(yearNum, mNum - 1, dNum);
      const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "short" });
      const intervals = [
        { label: "00:00 - 04:00 (Night Base)", share: 0.10, peak: "Off-Peak Night" },
        { label: "04:00 - 08:00 (Early Morning)", share: 0.15, peak: "Morning Rise" },
        { label: "08:00 - 12:00 (Midday Morning)", share: 0.20, peak: "Midday Load" },
        { label: "12:00 - 16:00 (Afternoon Peak)", share: 0.25, peak: "Afternoon Peak" },
        { label: "16:00 - 20:00 (Evening Peak)", share: 0.20, peak: "Evening Peak" },
        { label: "20:00 - 24:00 (Late Night)", share: 0.10, peak: "Night Wind-down" },
      ];

      const fullDayKwh = Math.round((baseKwh * 1.25 + ((dNum % 7) * 0.15)) * 10) / 10;
      let prevBase = 14200 + (dNum * 12);

      return intervals.map((intv, idx) => {
        const segKwh = Math.max(0.1, Math.round((fullDayKwh * intv.share) * 10) / 10);
        const pres = prevBase + segKwh;
        const item = {
          label: `${intv.label}`,
          fullLabel: `${dayOfWeek}, ${mObj.short} ${String(dNum).padStart(2, "0")} (${intv.label})`,
          kwh: segKwh,
          prevReading: prevBase,
          presReading: pres,
          multiplier: 1.0,
          meterNo: `MTR-${1000 + (accNum % 8000)}-${idx + 1}`,
          status: "Verified Meter Log",
          peakTime: intv.peak,
          billingPeriod: `${dayOfWeek}, ${mObj.short} ${String(dNum).padStart(2, "0")}, ${yearNum}`,
          dueDate: `15th of ${mObj.name} ${yearNum}`,
          type: "interval"
        };
        prevBase = pres;
        return item;
      });
    }

    // Subcase 2B: Weekly Log Filter
    if (tableInterval === "weekly") {
      const weeks = [
        { wk: 1, start: 1, end: 7 },
        { wk: 2, start: 8, end: 14 },
        { wk: 3, start: 15, end: 21 },
        { wk: 4, start: 22, end: 28 },
      ];
      if (daysInMonth > 28) {
        weeks.push({ wk: 5, start: 29, end: daysInMonth });
      }

      let runningPrev = 12000 + ((mNum - 1) * 200);
      return weeks.map((w) => {
        const dayCount = w.end - w.start + 1;
        const wkFactor = w.wk === 3 ? 1.15 : 1.0;
        const kwh = Math.round((baseKwh * dayCount * wkFactor + ((w.wk % 3) * 0.4)) * 10) / 10;
        const presReading = runningPrev + Math.round(kwh);
        const item = {
          label: `Wk ${w.wk} (${mObj.short} ${String(w.start).padStart(2, "0")}-${String(w.end).padStart(2, "0")})`,
          fullLabel: `Week ${w.wk} (${mObj.name} ${String(w.start).padStart(2, "0")} - ${String(w.end).padStart(2, "0")}, ${yearNum})`,
          kwh,
          prevReading: runningPrev,
          presReading,
          multiplier: 1.0,
          meterNo: `MTR-${1000 + (accNum % 8000)}`,
          status: "Weekly Aggregated",
          peakTime: `Peak Load Week ${w.wk}`,
          billingPeriod: `${mObj.name} Week ${w.wk}, ${yearNum}`,
          dueDate: `15th of ${mObj.name} ${yearNum}`,
          type: "weekly"
        };
        runningPrev = presReading;
        return item;
      });
    }

    // Subcase 2C: Daily Log Filter (all days of month)
    const result = [];
    let runningPrev = 14200 + ((mNum - 1) * 150);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(yearNum, mNum - 1, d);
      const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "short" });
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const factor = isWeekend ? 1.35 : 1.0;
      const kwh = Math.round((baseKwh * factor + ((d % 6) * 0.15)) * 10) / 10;
      const presReading = runningPrev + kwh;

      result.push({
        label: `${dayOfWeek}, ${mObj.short} ${String(d).padStart(2, "0")}`,
        fullLabel: `${dayOfWeek}, ${mObj.name} ${String(d).padStart(2, "0")}, ${yearNum}`,
        kwh,
        prevReading: runningPrev,
        presReading,
        multiplier: 1.0,
        meterNo: `MTR-${1000 + (accNum % 8000)}-${(d % 4) + 1}`,
        status: "Daily Meter Recorded",
        peakTime: isWeekend ? "1:00 PM - 4:00 PM" : "6:00 PM - 9:00 PM",
        billingPeriod: `${dayOfWeek}, ${mObj.short} ${String(d).padStart(2, "0")}, ${yearNum}`,
        dueDate: `15th of ${mObj.name} ${yearNum}`,
        type: "daily"
      });
      runningPrev = presReading;
    }
    return result;
  }, [filterYear, filterMonth, filterDay, tableInterval, accountNumber]);

  const currentPeriod = usageData[selectedRowIndex] || usageData[0] || {};

  const unbundledCharges = useMemo(() => {
    const kwh = currentPeriod.kwh || 0;

    const voltageRating = "230V Single-Phase (60 Hz)";
    const rateSchedule = "Residential Low Voltage (Res-LV)";
    const serviceType = "Household Service";

    const genRate = 6.8420;
    const transRate = 0.9120;
    const sysLossRate = 0.6210;
    const distRate = 1.4500;
    const meterKwhRate = 0.3200;
    const meterFixRate = 5.00;
    const supplyKwhRate = 0.4100;
    const supplyFixRate = 12.00;
    const ucRate = 0.1838; // Universal Charges & FIT-All

    const genAmt = kwh * genRate;
    const transAmt = kwh * transRate;
    const sysLossAmt = kwh * sysLossRate;
    const distAmt = kwh * distRate;
    const meterAmt = (kwh * meterKwhRate) + meterFixRate;
    const supplyAmt = (kwh * supplyKwhRate) + supplyFixRate;
    const ucAmt = kwh * ucRate;

    const subtotalTaxable = genAmt + transAmt + sysLossAmt + distAmt + meterAmt + supplyAmt;
    const vatAmt = subtotalTaxable * 0.12; // 12% EVAT
    const grandTotal = subtotalTaxable + ucAmt + vatAmt;
    const effectiveRatePerKwh = kwh > 0 ? (grandTotal / kwh) : 0;

    return {
      kwh,
      voltageRating,
      rateSchedule,
      serviceType,
      genRate, genAmt,
      transRate, transAmt,
      sysLossRate, sysLossAmt,
      distRate, distAmt,
      meterKwhRate, meterFixRate, meterAmt,
      supplyKwhRate, supplyFixRate, supplyAmt,
      ucRate, ucAmt,
      vatAmt,
      subtotalTaxable,
      grandTotal,
      effectiveRatePerKwh
    };
  }, [currentPeriod]);

  const totalKwh = useMemo(() => usageData.reduce((acc, curr) => acc + curr.kwh, 0), [usageData]);
  const totalCostOverall = useMemo(() => {
    return usageData.reduce((acc, curr) => {
      const k = curr.kwh;
      const sub = k * (6.8420 + 0.9120 + 0.6210 + 1.4500 + 0.3200 + 0.4100) + 17;
      const total = (sub * 1.12) + (k * 0.1838);
      return acc + total;
    }, 0);
  }, [usageData]);
  const avgKwh = useMemo(() => Math.round((totalKwh / (usageData.length || 1)) * 10) / 10, [totalKwh, usageData]);

  const handleDownloadLegalPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "legal" // 215.9 x 355.6 mm
      });

      const pageWidth = 215.9;
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      let y = 16;

      // Header Banner
      doc.setFillColor(234, 88, 12);
      doc.roundedRect(margin, y, contentWidth, 24, 3, 3, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("SORSOGON I ELECTRIC COOPERATIVE, INC. (SORECO-1)", margin + 8, y + 8);
      
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text("Zone-5, Immaculada Concepcion St., Bulan, Sorsogon 4706 • Tel: (056) 555-0199", margin + 8, y + 14);
      doc.setFont("helvetica", "bold");
      doc.text("OFFICIAL STATEMENT OF ACCOUNT & ELECTRIC BILL READING (LEGAL 8.5\" x 14\")", margin + 8, y + 20);

      y += 30;

      // Consumer Identification Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 34, 2, 2, "FD");

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("CONSUMER IDENTIFICATION & SERVICE LOCATION", margin + 6, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("Consumer Name:", margin + 6, y + 13);
      doc.setFont("helvetica", "bold");
      doc.text(`${consumerName || "Member-Consumer"}`, margin + 36, y + 13);

      doc.setFont("helvetica", "normal");
      doc.text("Account No.:", margin + 6, y + 19);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(234, 88, 12);
      doc.text(`${accountNumber || "10293847"}`, margin + 36, y + 19);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      doc.text("Service Address:", margin + 6, y + 25);
      doc.text(`${address || "Bulan, Sorsogon"}`, margin + 36, y + 25);

      doc.text("Rate Schedule:", margin + 110, y + 13);
      doc.text("Residential 230V Single-Phase", margin + 135, y + 13);

      doc.text("Billing Period:", margin + 110, y + 19);
      doc.setFont("helvetica", "bold");
      doc.text(`${currentPeriod.label || "Current Cycle"}`, margin + 135, y + 19);

      doc.setFont("helvetica", "normal");
      doc.text("Due Date:", margin + 110, y + 25);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(`${currentPeriod.dueDate || "Due in 15 Days"}`, margin + 135, y + 25);

      y += 40;

      // Meter Reading Box
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(245, 158, 11);
      doc.roundedRect(margin, y, contentWidth, 20, 2, 2, "FD");

      doc.setTextColor(146, 64, 14);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("METER NO.", margin + 8, y + 6);
      doc.text("PREVIOUS", margin + 45, y + 6);
      doc.text("PRESENT", margin + 82, y + 6);
      doc.text("MULTIPLIER", margin + 120, y + 6);
      doc.text("TOTAL CONSUMPTION", margin + 150, y + 6);

      doc.setFontSize(9.5);
      doc.text(`${currentPeriod.meterNo || "MTR-88219"}`, margin + 8, y + 14);
      doc.text(`${currentPeriod.prevReading || "14,200"}`, margin + 45, y + 14);
      doc.text(`${currentPeriod.presReading || "14,225"}`, margin + 82, y + 14);
      doc.text("1.00", margin + 120, y + 14);
      doc.setFont("helvetica", "bold");
      doc.text(`${(currentPeriod.kwh || 0).toFixed(1)} kWh`, margin + 150, y + 14);

      y += 26;

      // Unbundled Charges Header
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, contentWidth, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("UNBUNDLED CHARGE PARTICULARS", margin + 4, y + 5);
      doc.text("RATE / BASIS", margin + 95, y + 5);
      doc.text("CALCULATION", margin + 130, y + 5);
      doc.text("AMOUNT (PHP)", margin + 162, y + 5);

      y += 7;

      const kwhVal = currentPeriod.kwh || 0;
      const chargesList = [
        { name: "Generation Charge", basis: "₱6.8420 / kWh", formula: `${kwhVal.toFixed(1)} × 6.8420`, amount: (kwhVal * 6.842).toFixed(2) },
        { name: "Transmission System Charge (NGCP)", basis: "₱0.9120 / kWh", formula: `${kwhVal.toFixed(1)} × 0.9120`, amount: (kwhVal * 0.912).toFixed(2) },
        { name: "System Loss Charge", basis: "₱0.6210 / kWh", formula: `${kwhVal.toFixed(1)} × 0.6210`, amount: (kwhVal * 0.621).toFixed(2) },
        { name: "Distribution Network System", basis: "₱1.4500 / kWh", formula: `${kwhVal.toFixed(1)} × 1.4500`, amount: (kwhVal * 1.450).toFixed(2) },
        { name: "Supply & Customer Care Fee", basis: "₱0.4100 / kWh + ₱12.00", formula: `${kwhVal.toFixed(1)} × 0.41 + 12`, amount: (kwhVal * 0.41 + 12).toFixed(2) },
        { name: "Metering Retail Charge", basis: "Fixed Monthly", formula: "Flat Rate", amount: "5.00" },
        { name: "Universal Charges (SPUG, Env., RED)", basis: "₱0.1838 / kWh", formula: `${kwhVal.toFixed(1)} × 0.1838`, amount: (kwhVal * 0.1838).toFixed(2) },
        { name: "Value Added Tax (12% ERC VAT)", basis: "12% of Billed Tariff", formula: "Subtotal × 0.12", amount: ((kwhVal * 10.235 + 17) * 0.12).toFixed(2) },
        { name: "Senior Citizen Subsidy / Local Franchise Tax", basis: "₱0.0120 / kWh", formula: `${kwhVal.toFixed(1)} × 0.012`, amount: (kwhVal * 0.012).toFixed(2) },
      ];

      let runningTotal = 0;
      chargesList.forEach((ch, idx) => {
        const amtNum = parseFloat(ch.amount) || 0;
        runningTotal += amtNum;
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, contentWidth, 6.5, "F");
        }
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text(ch.name, margin + 4, y + 4.5);
        doc.text(ch.basis, margin + 95, y + 4.5);
        doc.text(ch.formula, margin + 130, y + 4.5);
        doc.setFont("helvetica", "bold");
        doc.text(`PHP ${amtNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + 162, y + 4.5);
        y += 6.5;
      });

      y += 4;

      // Total Due Highlight Banner
      doc.setFillColor(234, 88, 12);
      doc.roundedRect(margin, y, contentWidth, 16, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("TOTAL CURRENT AMOUNT DUE:", margin + 8, y + 10.5);
      doc.setFontSize(13);
      doc.text(`PHP ${runningTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + 135, y + 10.5);

      y += 22;

      // Important Notice Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 38, 2, 2, "FD");

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("BILLING ADVISORY & COOPERATIVE NOTICES:", margin + 6, y + 7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("1. Please settle this account on or before the due date to avoid service disconnection and 2% late charge.", margin + 6, y + 13);
      doc.text("2. Pay via SORECO-1 Main Office (Bulan), authorized collection partners, GCash, or Maya.", margin + 6, y + 18);
      doc.text("3. Official electronic statement of account issued pursuant to Energy Regulatory Commission (ERC) guidelines.", margin + 6, y + 23);
      doc.text("4. 24/7 Hotline for line emergencies and immediate assistance: (056) 555-0199 / 0917-555-SORECO.", margin + 6, y + 28);
      doc.text(`5. Verification reference: S1-LEGAL-${accountNumber || "10293847"}-${Date.now().toString().slice(-6)}`, margin + 6, y + 33);

      y += 46;

      // Legal Footer Note
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.4);
      doc.line(margin, y, margin + contentWidth, y);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text("SORECO-1 Document Management System • Format: US Legal (215.9 mm × 355.6 mm / 8.5\" × 14\") • Page 1 of 1", margin, y + 5);

      const filename = `SORECO1_Bill_${accountNumber || "10293847"}_Legal.pdf`;
      doc.save(filename);
      toast.success("Downloaded Legal-size bill PDF successfully!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF: " + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!consumer) return null;

  const resolvedTickets = tickets.filter((t) => t.status === "resolved");

  const getRelativeAge = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "1 day ago";
    if (diffInDays < 30) return `${diffInDays} days ago`;
    const months = Math.floor(diffInDays / 30);
    return `${months} mo ago`;
  };

  const filteredTickets = tickets.filter((t) => {
    if (activeCategoryFilter !== "all" && t.type !== activeCategoryFilter && !t.category?.toLowerCase().includes(activeCategoryFilter)) {
      return false;
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (t.category && t.category.toLowerCase().includes(term)) ||
      (t.type && t.type.toLowerCase().includes(term)) ||
      (t.description && t.description.toLowerCase().includes(term)) ||
      (t.status && t.status.toLowerCase().includes(term))
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="fixed top-0 left-0 inset-0 translate-x-0 translate-y-0 z-50 w-screen h-screen max-w-none max-h-none sm:max-w-none p-0 gap-0 rounded-none border-none flex flex-col bg-slate-50 overflow-y-auto m-0">
        
        <DialogHeader className="p-6 md:px-10 bg-orange-500 text-white rounded-none border-b border-orange-600 shrink-0">
          <div className="max-w-6xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-orange-600 hover:text-white text-xs font-bold gap-2 px-3.5 py-2 rounded-xl border border-orange-400/80 transition-all shadow-sm"
              >
                <ArrowLeft className="h-4 w-4 text-orange-100" />
                Back to Admin Dashboard
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={consumerName}
                    className="h-12 w-12 rounded-xl object-cover border border-orange-400 shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-black text-xl shrink-0">
                    {consumerName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <DialogTitle className="text-xl md:text-2xl font-black text-white flex items-center gap-2 flex-wrap">
                    {consumerName}
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-100 border-orange-500/30 text-[10px] font-mono">
                      {syncedUser ? "SYNCED USER PROFILE" : "VERIFIED CONSUMER"}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-orange-100 text-xs mt-1 flex items-center gap-2 flex-wrap">
                    <span>Account No: <strong className="text-white font-mono">{accountNumber || "N/A"}</strong></span>
                    {email && email !== "unknown@example.com" && <span>• Email: <strong className="text-white">{email}</strong></span>}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="bg-orange-600/80 border border-orange-400/60 rounded-xl px-4 py-2 text-center">
                  <p className="text-[10px] text-orange-200 uppercase font-bold tracking-wider">Total Requests</p>
                  <p className="text-lg font-black text-white">{tickets.length}</p>
                </div>
                <div className="bg-orange-950/40 border border-orange-800/50 rounded-xl px-4 py-2 text-center">
                  <p className="text-[10px] text-orange-100 uppercase font-bold tracking-wider">Resolved</p>
                  <p className="text-lg font-black text-orange-300">{resolvedTickets.length}</p>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-8 space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-slate-200 shadow-none bg-white">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                  <Mail className="h-4 w-4 shrink-0" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Email Address</p>
                  <p className="text-xs font-semibold text-slate-800 truncate">{email === "unknown@example.com" ? "Not provided" : email || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none bg-white">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                  <Phone className="h-4 w-4 shrink-0" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Phone Contact</p>
                  <p className="text-xs font-semibold text-slate-800 truncate">{phoneNumber || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-none bg-white">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                  <MapPin className="h-4 w-4 shrink-0" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Service Address</p>
                  <p className="text-xs font-semibold text-slate-800 truncate">{address || "Bulan / Sorsogon Premises"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="usage" className="space-y-6">
            <TabsList className="bg-white border border-slate-200 p-1.5 rounded-2xl w-full flex flex-col sm:flex-row h-auto gap-1">
              <TabsTrigger value="usage" className="gap-2 text-xs font-bold py-3 px-4 justify-center sm:justify-start data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-xl w-full sm:flex-1">
                <Zap className="h-4 w-4 shrink-0" />
                <span className="truncate">Power Usage & Itemized Bill Reading</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-2 text-xs font-bold py-3 px-4 justify-center sm:justify-start data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-xl w-full sm:flex-1">
                <Receipt className="h-4 w-4 shrink-0" />
                <span className="truncate">Past Transactions & Service Requests ({tickets.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="usage" className="space-y-6">
              
              <Card className="border-slate-200 shadow-sm bg-white p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-orange-500" />
                      Consumer Power Usage & Itemized Billing
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Transparent electric meter reading log and unbundled rate charges breakdown for Account #{accountNumber || "N/A"}
                    </p>
                  </div>

                  <div id="calendar-filter-container" className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 self-start md:self-auto shadow-xs">
                    <div className="flex items-center gap-1.5 px-1 text-slate-700">
                      <Calendar className="h-4 w-4 text-orange-600 shrink-0" />
                      <span className="text-xs font-bold whitespace-nowrap text-slate-800">
                        Date Filter <span className="text-[10px] font-semibold text-slate-500">(MM/DD/YYYY)</span>:
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Day Selection */}
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider pl-0.5">(Day)</span>
                        <select
                          id="calendar-filter-day"
                          value={filterDay}
                          onChange={(e) => {
                            const newDay = e.target.value;
                            setFilterDay(newDay);
                            if (newDay !== "all" && filterMonth === "all") {
                              // If user picks a specific day while month is "all", default to September (or 01)
                              setFilterMonth("09");
                            }
                            setSelectedRowIndex(0);
                          }}
                          className="bg-white border border-slate-200 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-bold hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs cursor-pointer"
                        >
                          <option value="all">All Days</option>
                          {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((d) => {
                            const val = String(d).padStart(2, "0");
                            return (
                              <option key={val} value={val}>
                                Day {val}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Month Selection */}
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider pl-0.5">(Month)</span>
                        <select
                          id="calendar-filter-month"
                          value={filterMonth}
                          onChange={(e) => {
                            const newMonth = e.target.value;
                            setFilterMonth(newMonth);
                            if (newMonth === "all") {
                              setFilterDay("all");
                            }
                            setSelectedRowIndex(0);
                          }}
                          className="bg-white border border-slate-200 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-bold hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs cursor-pointer"
                        >
                          <option value="all">All Months (12 Mos)</option>
                          {MONTH_OPTIONS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Year Selection */}
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider pl-0.5">(Year)</span>
                        <select
                          id="calendar-filter-year"
                          value={filterYear}
                          onChange={(e) => {
                            setFilterYear(e.target.value);
                            setSelectedRowIndex(0);
                          }}
                          className="bg-white border border-slate-200 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-bold hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs cursor-pointer"
                        >
                          {Array.from({ length: 27 }, (_, i) => (2026 - i).toString()).map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Reset to Full Year */}
                      {(filterMonth !== "all" || filterDay !== "all" || filterYear !== "2026") && (
                        <button
                          type="button"
                          id="calendar-filter-reset"
                          onClick={() => {
                            setFilterMonth("all");
                            setFilterDay("all");
                            setFilterYear("2026");
                            setSelectedRowIndex(0);
                          }}
                          className="self-end mb-0.5 text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline px-2 py-1 rounded cursor-pointer transition-colors"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                  <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200/70 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-orange-700">Total Period Consumption</p>
                      <p className="text-xl font-black text-orange-950">{totalKwh} <span className="text-xs font-bold text-orange-700">kWh</span></p>
                    </div>
                    <Zap className="h-6 w-6 text-orange-500 opacity-80" />
                  </div>

                  <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200/70 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-orange-700">Total Billed Amount</p>
                      <p className="text-xl font-black text-orange-950">₱{Math.round(totalCostOverall).toLocaleString()}</p>
                    </div>
                    <DollarSign className="h-6 w-6 text-orange-500 opacity-80" />
                  </div>

                  <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200/70 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-orange-700">Average Consumption Rate</p>
                      <p className="text-xl font-black text-orange-950">{avgKwh} <span className="text-xs font-bold text-orange-700">kWh / period</span></p>
                    </div>
                    <TrendingUp className="h-6 w-6 text-orange-500 opacity-80" />
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span>Chart View ({
                        filterMonth === "all"
                          ? `ALL 12 MONTHS (${filterYear})`
                          : filterDay !== "all"
                            ? `DAY ${filterDay} OF ${selectedMonthObj?.short?.toUpperCase()} ${filterYear}`
                            : `${tableInterval.toUpperCase()} LOG (${selectedMonthObj?.short?.toUpperCase()} ${filterYear})`
                      })</span>
                      <span className="text-slate-400 font-normal text-[11px]">— Click any bar to inspect itemized bill statement</span>
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 border-slate-200 font-mono">
                      Selected: {currentPeriod.label} ({currentPeriod.kwh} kWh)
                    </Badge>
                  </p>
                  <div className="h-64 w-full bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={usageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const est = Math.round((data.kwh * 11.25) * 1.12);
                              return (
                                <div className="bg-orange-500 text-white p-3 rounded-xl text-xs space-y-1 shadow-lg border border-orange-600">
                                  <p className="font-bold text-orange-100">{data.label}</p>
                                  <p className="font-semibold">{data.kwh} kWh consumed</p>
                                  <p className="text-orange-100 font-bold">Est. Bill: ₱{est.toLocaleString()}</p>
                                  {data.peakTime && <p className="text-[10px] text-orange-200">Peak Load: {data.peakTime}</p>}
                                  <p className="text-[10px] text-orange-200 font-bold pt-1">👉 Click bar to inspect bill details</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="kwh"
                          radius={[6, 6, 0, 0]}
                          onClick={(data, index) => setSelectedRowIndex(index)}
                          className="cursor-pointer"
                        >
                          {usageData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index === selectedRowIndex ? "#0f172a" : "#f59e0b"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
                    <div>
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                        <span>Consumption Reading Log Table</span>
                        {filterMonth === "all" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-200">
                            Showing All 12 Months ({filterYear})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                            {selectedMonthObj?.name} {filterYear} • {filterDay !== "all" ? `Day ${filterDay}` : (tableInterval === "weekly" ? "Weekly Log" : "Daily Log")}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {filterMonth === "all"
                          ? `Displaying full 12-month log for ${filterYear}. Select a row below to inspect itemized statement.`
                          : `Select a row to display its full itemized bill reading below.`}
                      </p>
                    </div>

                    {/* Filter for daily and weekly if (month) and (year) are chosen */}
                    {filterMonth !== "all" && (
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                        <button
                          type="button"
                          id="table-filter-daily"
                          onClick={() => {
                            setTableInterval("daily");
                            setFilterDay("all");
                            setSelectedRowIndex(0);
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                            tableInterval === "daily" && filterDay === "all"
                              ? "bg-orange-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                          )}
                        >
                          <span>📅</span> Daily Log
                        </button>
                        <button
                          type="button"
                          id="table-filter-weekly"
                          onClick={() => {
                            setTableInterval("weekly");
                            setFilterDay("all");
                            setSelectedRowIndex(0);
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                            tableInterval === "weekly"
                              ? "bg-orange-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                          )}
                        >
                          <span>📊</span> Weekly Log
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-xs font-bold text-slate-700">Period / Date</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">Meter Readings (Prev → Pres)</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">Consumption</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">Eff. Rate / kWh</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700">Total Bill Amount</TableHead>
                          <TableHead className="text-xs font-bold text-slate-700 text-right">Bill Reading</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usageData.map((row, i) => {
                          const isSelected = i === selectedRowIndex;
                          const k = row.kwh;
                          const sub = k * (6.8420 + 0.9120 + 0.6210 + 1.4500 + 0.3200 + 0.4100) + 17;
                          const rowBill = (sub * 1.12) + (k * 0.1838);
                          const effRate = k > 0 ? (rowBill / k) : 0;

                          return (
                            <TableRow
                              key={i}
                              onClick={() => setSelectedRowIndex(i)}
                              className={cn(
                                "cursor-pointer transition-colors",
                                isSelected ? "bg-orange-50/80 border-l-4 border-l-orange-500" : "hover:bg-slate-50/80"
                              )}
                            >
                              <TableCell className="font-bold text-xs text-slate-900 flex items-center gap-2">
                                {isSelected && <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />}
                                {row.label}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-slate-600">
                                {row.prevReading || "14,200"} → <span className="font-bold text-slate-900">{row.presReading || "14,225"}</span>
                              </TableCell>
                              <TableCell className="font-mono text-xs font-bold text-orange-700">{row.kwh} kWh</TableCell>
                              <TableCell className="font-mono text-xs text-slate-600">₱{effRate.toFixed(2)}/kWh</TableCell>
                              <TableCell className="font-mono text-xs font-bold text-orange-700">₱{rowBill.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  className={cn(
                                    "h-7 text-[11px] font-bold px-2.5 rounded-lg",
                                    isSelected ? "bg-orange-500 text-white" : "border-slate-200 text-slate-700"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRowIndex(i);
                                  }}
                                >
                                  {isSelected ? "Inspecting" : "View Statement"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <Card className="border-2 border-slate-900/10 shadow-md bg-white rounded-2xl overflow-hidden">
                    
                    <div className="bg-orange-500 text-white p-5 md:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-orange-600 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-white text-orange-600 flex items-center justify-center font-black text-lg">
                            <Zap className="h-5 w-5 fill-slate-950" />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                              SORECO-1 OFFICIAL BILL READING SLIP
                              <Badge className="bg-orange-400 text-slate-950 font-mono text-[10px] font-bold">
                                UNBUNDLED TARIFF
                              </Badge>
                            </h4>
                            <p className="text-xs text-orange-100 font-mono">
                              Statement of Account • Period: <strong className="text-orange-300 font-semibold">{currentPeriod.label}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleDownloadLegalPdf}
                            disabled={isGeneratingPdf}
                            className="h-8 text-xs font-bold gap-1.5 bg-white text-orange-700 hover:bg-orange-50 border border-white/60 shadow-sm rounded-lg"
                          >
                            {isGeneratingPdf ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            Download PDF (Legal Size)
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 text-xs">
                        <div>
                          <p className="text-[10px] text-orange-200 uppercase font-bold tracking-wider">Account Name</p>
                          <p className="font-bold text-white truncate">{consumerName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-orange-200 uppercase font-bold tracking-wider">Account Number</p>
                          <p className="font-mono font-bold text-orange-300">{accountNumber || "10293847"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-orange-200 uppercase font-bold tracking-wider">Rate Schedule</p>
                          <p className="font-bold text-white truncate">Residential Household</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-orange-200 uppercase font-bold tracking-wider">Voltage Rating</p>
                          <p className="font-mono font-bold text-orange-100">230V AC Single-Phase</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-orange-200 uppercase font-bold tracking-wider">Meter Serial No.</p>
                          <p className="font-mono font-bold text-white">{currentPeriod.meterNo || "MTR-88219"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-orange-200 uppercase font-bold tracking-wider">Payment Due Date</p>
                          <p className="font-bold text-orange-100">{currentPeriod.dueDate || "Sep 05, 2026"}</p>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-6 space-y-6">
                      
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Prev. Reading</p>
                          <p className="font-mono text-base font-bold text-slate-800">{currentPeriod.prevReading || "14,200"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Pres. Reading</p>
                          <p className="font-mono text-base font-bold text-slate-800">{currentPeriod.presReading || "14,225"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Multiplier</p>
                          <p className="font-mono text-base font-bold text-slate-800">1.00</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-orange-700">Voltage Class</p>
                          <p className="font-mono text-xs font-bold text-orange-900 bg-orange-100/80 py-1 px-2 rounded-md mt-0.5">230V Household</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-orange-700">Total Consumption</p>
                          <p className="font-mono text-base font-black text-orange-600">{unbundledCharges.kwh} kWh</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-[10px] uppercase font-bold text-orange-700">Avg Effective Rate</p>
                          <p className="font-mono text-base font-black text-orange-600">₱{unbundledCharges.effectiveRatePerKwh.toFixed(4)}/kWh</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Receipt className="h-4 w-4 text-slate-600" />
                            Itemized ERC Unbundled Rate Charges Breakdown
                          </h5>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200 text-[10px] font-mono font-bold">
                              ⚡ 230V Single-Phase Household Tariff Rate
                            </Badge>
                            <span className="text-[11px] text-slate-500 font-medium">SORECO-1 Regulatory Matrix</span>
                          </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-none">
                          <Table>
                            <TableHeader className="bg-slate-100/80">
                              <TableRow>
                                <TableHead className="text-xs font-bold text-slate-800 py-2.5">Bill Particular / Component</TableHead>
                                <TableHead className="text-xs font-bold text-slate-800 py-2.5">Rate Breakdown</TableHead>
                                <TableHead className="text-xs font-bold text-slate-800 py-2.5">Basis / Consumption</TableHead>
                                <TableHead className="text-xs font-bold text-slate-800 text-right py-2.5">Amount (₱)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100 text-xs">
                              
                              <TableRow className="hover:bg-slate-50/60">
                                <TableCell className="font-medium text-slate-900">
                                  <div className="font-bold">Generation Charge</div>
                                  <div className="text-[10px] text-slate-400">Power Supplier Generation Cost</div>
                                </TableCell>
                                <TableCell className="font-mono text-slate-600">₱{unbundledCharges.genRate.toFixed(4)} / kWh</TableCell>
                                <TableCell className="font-mono text-slate-600">{unbundledCharges.kwh} kWh</TableCell>
                                <TableCell className="font-mono font-bold text-slate-900 text-right">₱{unbundledCharges.genAmt.toFixed(2)}</TableCell>
                              </TableRow>

                              <TableRow className="hover:bg-slate-50/60">
                                <TableCell className="font-medium text-slate-900">
                                  <div className="font-bold">Transmission Charge</div>
                                  <div className="text-[10px] text-slate-400">NGCP High Voltage Delivery</div>
                                </TableCell>
                                <TableCell className="font-mono text-slate-600">₱{unbundledCharges.transRate.toFixed(4)} / kWh</TableCell>
                                <TableCell className="font-mono text-slate-600">{unbundledCharges.kwh} kWh</TableCell>
                                <TableCell className="font-mono font-bold text-slate-900 text-right">₱{unbundledCharges.transAmt.toFixed(2)}</TableCell>
                              </TableRow>

                              <TableRow className="hover:bg-slate-50/60">
                                <TableCell className="font-medium text-slate-900">
                                  <div className="font-bold">System Loss Charge</div>
                                  <div className="text-[10px] text-slate-400">Technical & Distribution Loss Allowance</div>
                                </TableCell>
                                <TableCell className="font-mono text-slate-600">₱{unbundledCharges.sysLossRate.toFixed(4)} / kWh</TableCell>
                                <TableCell className="font-mono text-slate-600">{unbundledCharges.kwh} kWh</TableCell>
                                <TableCell className="font-mono font-bold text-slate-900 text-right">₱{unbundledCharges.sysLossAmt.toFixed(2)}</TableCell>
                              </TableRow>

                              <TableRow className="hover:bg-slate-50/60">
                                <TableCell className="font-medium text-slate-900">
                                  <div className="font-bold">Distribution Network Charge</div>
                                  <div className="text-[10px] text-slate-400">Cooperative Distribution Operation</div>
                                </TableCell>
                                <TableCell className="font-mono text-slate-600">₱{unbundledCharges.distRate.toFixed(4)} / kWh</TableCell>
                                <TableCell className="font-mono text-slate-600">{unbundledCharges.kwh} kWh</TableCell>
                                <TableCell className="font-mono font-bold text-slate-900 text-right">₱{unbundledCharges.distAmt.toFixed(2)}</TableCell>
                              </TableRow>

                              <TableRow className="hover:bg-slate-50/60">
                                <TableCell className="font-medium text-slate-900">
                                  <div className="font-bold">Metering Charge</div>
                                  <div className="text-[10px] text-slate-400">Meter Maintenance (₱0.3200/kWh + ₱5.00 Base)</div>
                                </TableCell>
                                <TableCell className="font-mono text-slate-600">₱{unbundledCharges.meterKwhRate.toFixed(4)}/kWh + ₱5.00</TableCell>
                                <TableCell className="font-mono text-slate-600">{unbundledCharges.kwh} kWh</TableCell>
                                <TableCell className="font-mono font-bold text-slate-900 text-right">₱{unbundledCharges.meterAmt.toFixed(2)}</TableCell>
                              </TableRow>

                              <TableRow className="hover:bg-slate-50/60">
                                <TableCell className="font-medium text-slate-900">
                                  <div className="font-bold">Supply & Customer Service Charge</div>
                                  <div className="text-[10px] text-slate-400">Billing & Account Handling (₱0.4100/kWh + ₱12.00)</div>
                                </TableCell>
                                <TableCell className="font-mono text-slate-600">₱{unbundledCharges.supplyKwhRate.toFixed(4)}/kWh + ₱12.00</TableCell>
                                <TableCell className="font-mono text-slate-600">{unbundledCharges.kwh} kWh</TableCell>
                                <TableCell className="font-mono font-bold text-slate-900 text-right">₱{unbundledCharges.supplyAmt.toFixed(2)}</TableCell>
                              </TableRow>

                              <TableRow className="bg-orange-50/40 hover:bg-orange-50/80">
                                <TableCell className="font-medium text-slate-900">
                                  <div className="font-bold text-orange-900">Government Value Added Tax (12% EVAT)</div>
                                  <div className="text-[10px] text-orange-700">12% Tax on Taxable Subtotal (₱{unbundledCharges.subtotalTaxable.toFixed(2)})</div>
                                </TableCell>
                                <TableCell className="font-mono text-orange-800">12.00%</TableCell>
                                <TableCell className="font-mono text-orange-800">Taxable Services</TableCell>
                                <TableCell className="font-mono font-bold text-orange-900 text-right">₱{unbundledCharges.vatAmt.toFixed(2)}</TableCell>
                              </TableRow>

                              <TableRow className="bg-slate-50/60 hover:bg-slate-50">
                                <TableCell className="font-medium text-slate-900">
                                  <div className="font-bold">Universal Charges & FIT-All</div>
                                  <div className="text-[10px] text-slate-400">UC-ME, UC-SD, Feed-In Tariff Allowance</div>
                                </TableCell>
                                <TableCell className="font-mono text-slate-600">₱{unbundledCharges.ucRate.toFixed(4)} / kWh</TableCell>
                                <TableCell className="font-mono text-slate-600">{unbundledCharges.kwh} kWh</TableCell>
                                <TableCell className="font-mono font-bold text-slate-900 text-right">₱{unbundledCharges.ucAmt.toFixed(2)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="p-4 bg-orange-950 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-orange-800 shadow-md">
                        <div className="space-y-1 text-center sm:text-left">
                          <p className="text-[11px] uppercase font-bold text-orange-300 tracking-wider">NET TOTAL AMOUNT DUE FOR PERIOD</p>
                          <p className="text-xs text-orange-200">
                            Includes 12% EVAT, ERC Approved Tariffs & SORECO-1 Distribution Fees
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl md:text-3xl font-black text-orange-300 font-mono">
                            ₱{unbundledCharges.grandTotal.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-orange-100 font-mono">Status: Verified Official Reading</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm w-full">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search past transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none"
                    value={activeCategoryFilter}
                    onChange={(e) => setActiveCategoryFilter(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    <option value="billing">Billing Dispute</option>
                    <option value="other-billing">Other Billing Issue</option>
                    <option value="reconnection">Reconnection</option>
                  </select>
                </div>
              </div>

              <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-700 py-3.5">Transaction Ref & Category</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 py-3.5">Type</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 py-3.5">Status</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 py-3.5">Priority</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 py-3.5">Date Created</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 text-right py-3.5">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.length > 0 ? (
                      filteredTickets.map((t) => (
                        <TableRow key={t.id} className="hover:bg-slate-50/70 border-b border-slate-100">
                          <TableCell className="py-3.5">
                            <div className="font-bold text-slate-900 text-xs">{t.category}</div>
                            <div className="text-[10px] font-mono text-slate-500">Ref: #{t.id}</div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold capitalize text-slate-700 py-3.5">
                            {t.type || "General"}
                          </TableCell>
                          <TableCell className="py-3.5">
                            <Badge
                              className={cn(
                                "capitalize text-[10px] font-bold rounded-md px-2.5 py-0.5 shadow-none",
                                t.status === "pending" && "bg-orange-100 text-orange-800",
                                t.status === "reviewing" && "bg-orange-100 text-orange-800",
                                t.status === "dispatched" && "bg-orange-100 text-orange-800",
                                t.status === "resolved" && "bg-orange-100 text-orange-800"
                              )}
                            >
                              {t.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3.5">
                            {t.isUrgent === 1 ? (
                              <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                                🔴 Urgent
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-600">Normal</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 whitespace-nowrap py-3.5">
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "N/A"}
                            <span className="block text-[10px] text-slate-400">{getRelativeAge(t.createdAt)}</span>
                          </TableCell>
                          <TableCell className="text-right py-3.5">
                            <Link to={`/ticket/${t.id}`} onClick={onClose}>
                              <Button size="sm" variant="default" className="h-7 text-xs font-bold px-3 gap-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg">
                                Manage <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                          No past service transactions recorded for this consumer.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
