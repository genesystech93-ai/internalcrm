"use client";

import React, { useRef } from "react";
import { ModalPortal } from "./ModalPortal";
import { AugustLedgerItem } from "@/app/actions/salary";
import { formatMonthLabel, parseMonthDateRange, numberToWordsINR } from "@/lib/date-utils";
import {
  Printer,
  X,
  Building,
  CreditCard,
  ShieldCheck,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AugustLedgerItem | null;
  monthKey: string;
}

export function PayslipModal({ isOpen, onClose, item, monthKey }: PayslipModalProps) {
  const printContentRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !item) return null;

  const dateRange = parseMonthDateRange(monthKey);
  const daysInMonth = dateRange?.daysInMonth || 30;
  const monthLabel = formatMonthLabel(monthKey);

  const baseSalary = item.basicSalary;
  const earnedBase = item.augNetSalary;
  const bonus = item.bonus || 0;
  const deductions = item.deductions || 0;
  const finalPayout = item.finalPayout ?? Math.max(0, earnedBase + bonus - deductions);

  // Unpaid absence deduction calculation
  const absenceDeduction = Math.max(0, baseSalary - earnedBase);
  const totalEarnings = earnedBase + bonus;
  const totalDeductions = deductions; // Note: earnedBase already reflects absent days from base, custom deductions are additional.

  const status = item.status || (monthKey === "2026-08" ? "DISBURSED" : "PENDING");
  const utrRef = item.utrRef || (status === "DISBURSED" ? `GEN-${monthKey.replace("-", "")}-${item.username.toUpperCase()}` : null);
  const disbursedDate = item.disbursedAt || (status === "DISBURSED" ? (monthKey === "2026-08" ? "2026-09-01" : new Date().toISOString().split("T")[0]) : null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-payslip, #printable-payslip * {
              visibility: visible;
            }
            #printable-payslip {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              max-width: 100% !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: none !important;
              padding: 20px !important;
              margin: 0 !important;
            }
            .no-print {
              display: none !important;
            }
          }
        ` }} />

        <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[95vh] flex flex-col">
          {/* Modal Header & Top Toolbar (Hidden during print) */}
          <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Official Salary Slip Preview
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {item.name} (@{item.username}) — {monthLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Voucher Body */}
          <div
            id="printable-payslip"
            ref={printContentRef}
            className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-slate-800 dark:text-slate-200"
          >
            {/* 1. Company Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b-2 border-slate-200 dark:border-slate-800 gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-orange-500/30">
                    G
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                      Genesoft Infotech Private Limited
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      BPO Floor & Customer Operations Division
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  CIN: U72200DL2024PTC123456 • Corporate Payroll Registry
                </p>
              </div>

              <div className="sm:text-right">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 mb-1">
                  PAYSLIP / SALARY VOUCHER
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Period: <span className="text-orange-600 dark:text-orange-400">{monthLabel}</span>
                </p>
                <p className="text-[10px] font-mono text-slate-400">
                  Voucher No: PAY-{monthKey.replace("-", "")}-{item.username.toUpperCase()}
                </p>
              </div>
            </div>

            {/* 2. Disbursement Status Banner */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-2.5">
                {status === "DISBURSED" ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                ) : status === "PROCESSING" ? (
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Payout Status:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        status === "DISBURSED"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                          : status === "PROCESSING"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                          : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
                      }`}
                    >
                      {status === "DISBURSED" ? "Disbursed & Settled" : status === "PROCESSING" ? "In Transit / Processing" : "Pending Authorization"}
                    </span>
                  </div>
                  {status === "DISBURSED" && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      Disbursed on <span className="font-semibold text-slate-700 dark:text-slate-300">{disbursedDate}</span> via <span className="font-semibold">{item.paymentMethod || "IMPS / Direct Credit"}</span>
                    </p>
                  )}
                </div>
              </div>

              {utrRef && (
                <div className="text-right font-mono text-[11px]">
                  <p className="text-[10px] uppercase font-bold text-slate-400">UTR / Ref No.</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">{utrRef}</p>
                </div>
              )}
            </div>

            {/* 3. Employee & Banking Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Left: Employee Information */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-orange-500" />
                  <span>Employee Information</span>
                </h4>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-medium">Name:</span>
                  <span className="col-span-2 font-bold text-slate-900 dark:text-white">{item.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-medium">Username:</span>
                  <span className="col-span-2 font-mono font-semibold">@{item.username}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-medium">Designation:</span>
                  <span className="col-span-2 font-bold text-orange-600 dark:text-orange-400">{item.role}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-medium">Floor Team:</span>
                  <span className="col-span-2 font-semibold text-slate-700 dark:text-slate-300">{item.team}</span>
                </div>
              </div>

              {/* Right: Bank Routing Information */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Banking & Transfer Details</span>
                </h4>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-medium">Bank Name:</span>
                  <span className="col-span-2 font-bold text-slate-900 dark:text-white">{item.bank || "Direct Floor Transfer"}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-medium">Account No:</span>
                  <span className="col-span-2 font-mono font-bold">{item.accountNo || "N/A"}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-medium">IFSC Code:</span>
                  <span className="col-span-2 font-mono font-semibold">{item.ifsc || "N/A"}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-medium">Account Type:</span>
                  <span className="col-span-2 text-slate-700 dark:text-slate-300 font-medium">{item.accountType || "Savings Account"}</span>
                </div>
              </div>
            </div>

            {/* 4. Shift Attendance Record */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-200/80 dark:border-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-500" />
                <span>Shift Attendance & Working Days Summary</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-center">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Days in Cycle</span>
                  <p className="text-base font-black text-slate-900 dark:text-white font-mono">{daysInMonth}</p>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Present Shifts</span>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">{item.presentDays}</p>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase">Unexcused Absences</span>
                  <p className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">{item.absentDays}</p>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase">Attendance Rate</span>
                  <p className="text-base font-black text-purple-600 dark:text-purple-400 font-mono">
                    {Math.min(100, Math.round((item.presentDays / daysInMonth) * 100))}%
                  </p>
                </div>
              </div>
            </div>

            {/* 5. Itemized Earnings & Deductions Tables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Earnings Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400">
                    Earnings (Credits)
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">Amount (₹)</span>
                </div>
                <div className="p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Base Monthly Salary</p>
                      <p className="text-[10px] text-slate-400">Fixed monthly wage</p>
                    </div>
                    <span className="font-mono font-semibold text-slate-500">₹{baseSalary.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">Attendance Pro-Rated Pay</p>
                      <p className="text-[10px] text-slate-400">{item.presentDays} of {daysInMonth} days credited</p>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">₹{earnedBase.toLocaleString("en-IN")}</span>
                  </div>

                  {bonus > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 text-emerald-600 dark:text-emerald-400">
                      <div>
                        <p className="font-bold">Performance Bonus / Incentive</p>
                        {item.bonusRemarks && (
                          <p className="text-[10px] text-slate-400 font-normal italic">{item.bonusRemarks}</p>
                        )}
                      </div>
                      <span className="font-mono font-bold">+₹{bonus.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t-2 border-slate-200 dark:border-slate-700 font-black text-slate-900 dark:text-white">
                    <span>Total Gross Earnings</span>
                    <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">₹{totalEarnings.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-rose-700 dark:text-rose-400">
                    Deductions (Debits)
                  </span>
                  <span className="text-[10px] text-rose-600 font-bold">Amount (₹)</span>
                </div>
                <div className="p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">Unpaid Absences</p>
                      <p className="text-[10px] text-slate-400">{item.absentDays} days prorated deduction</p>
                    </div>
                    <span className="font-mono font-semibold text-slate-500">
                      {absenceDeduction > 0 ? `-₹${absenceDeduction.toLocaleString("en-IN")}` : "₹0"}
                    </span>
                  </div>

                  {deductions > 0 ? (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 text-rose-600 dark:text-rose-400">
                      <div>
                        <p className="font-bold">Custom Deduction / Advance</p>
                        {item.deductionRemarks && (
                          <p className="text-[10px] text-slate-400 font-normal italic">{item.deductionRemarks}</p>
                        )}
                      </div>
                      <span className="font-mono font-bold">-₹{deductions.toLocaleString("en-IN")}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-400">
                      <div>
                        <p className="font-medium">Other Penalties / Advances</p>
                        <p className="text-[10px]">None recorded</p>
                      </div>
                      <span className="font-mono">₹0</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t-2 border-slate-200 dark:border-slate-700 font-black text-slate-900 dark:text-white">
                    <span>Total Adjustments Deducted</span>
                    <span className="font-mono text-sm text-rose-600 dark:text-rose-400">
                      {totalDeductions > 0 ? `-₹${totalDeductions.toLocaleString("en-IN")}` : "₹0"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Highlighted Net Payout Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-tr from-orange-500/10 via-amber-500/5 to-transparent border-2 border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Total Earned Net Salary Payable
                </span>
                <p className="text-3xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                  ₹{finalPayout.toLocaleString("en-IN")}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 italic">
                  Amount in words: <span className="text-slate-800 dark:text-slate-200 not-italic font-bold">{numberToWordsINR(finalPayout)}</span>
                </p>
              </div>

              <div className="sm:text-right text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Certified Computed Net Payout</span>
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Computed for {monthLabel} billing cycle
                </p>
              </div>
            </div>

            {/* 7. Footer Signatures & Declaration */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 space-y-4">
              <p className="leading-relaxed text-slate-500 dark:text-slate-400">
                <span className="font-bold">Disclaimer:</span> This is a system-generated operational salary voucher from Genesoft Infotech Private Limited. Any questions regarding attendance hours, shift punch counts, or incentive calculations must be addressed to the floor HR administrator within 7 days of slip generation.
              </p>

              <div className="flex flex-col sm:flex-row justify-between items-end pt-4 gap-6">
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-300">Genesoft Infotech Pvt Ltd</p>
                  <p className="text-[10px]">Operations & Payroll Department</p>
                </div>

                <div className="text-center min-w-[200px] border-t border-slate-300 dark:border-slate-700 pt-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Authorized Signature</p>
                  <p className="text-[10px] text-slate-400">Floor Supervisor / Operations Head</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
