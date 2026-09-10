"use client";

import React, { useState, useEffect } from "react";
import { ModalPortal } from "@/components/ModalPortal";
import {
  X,
  DollarSign,
  Building2,
  CreditCard,
  Calendar,
  Check,
  AlertCircle,
  Loader2,
  HelpCircle,
} from "lucide-react";
import {
  SalaryProfileItem,
  updateStaffSalaryAndBankingAction,
} from "@/app/actions/salary";

interface SalaryAndBankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: SalaryProfileItem | null;
  onSuccess?: () => void;
}

export function SalaryAndBankingModal({
  isOpen,
  onClose,
  staff,
  onSuccess,
}: SalaryAndBankingModalProps) {
  const [baseSalary, setBaseSalary] = useState<number>(25000);
  const [payFrequency, setPayFrequency] = useState<string>("MONTHLY");
  const [effectiveDate, setEffectiveDate] = useState<string>("");
  const [bank, setBank] = useState<string>("");
  const [accountNo, setAccountNo] = useState<string>("");
  const [ifsc, setIfsc] = useState<string>("");
  const [accountType, setAccountType] = useState<string>("SAVINGS");
  const [panNo, setPanNo] = useState<string>("");
  const [upiId, setUpiId] = useState<string>("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (staff) {
      setBaseSalary(staff.baseSalary || 25000);
      setPayFrequency(staff.payFrequency || "MONTHLY");
      setEffectiveDate(staff.effectiveDate || new Date().toISOString().split("T")[0]);
      setBank(staff.bank || "");
      setAccountNo(staff.accountNo || "");
      setIfsc(staff.ifsc || "");
      setAccountType(staff.accountType || "SAVINGS");
      setPanNo(staff.panNo || "");
      setUpiId(staff.upiId || "");
      setError(null);
    }
  }, [staff, isOpen]);

  if (!isOpen || !staff) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const res = await updateStaffSalaryAndBankingAction(staff.userId, {
      baseSalary: Number(baseSalary) || 0,
      payFrequency,
      effectiveDateStr: effectiveDate,
      bank: bank.trim() || undefined,
      accountNo: accountNo.trim() || undefined,
      ifsc: ifsc.trim().toUpperCase() || undefined,
      accountType,
      panNo: panNo.trim().toUpperCase() || undefined,
      upiId: upiId.trim() || undefined,
    });

    if (res.error) {
      setError(res.error);
      setIsSaving(false);
    } else {
      setIsSaving(false);
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <ModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="salary-banking-modal-title"
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#F97316] shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="salary-banking-modal-title"
                className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight"
              >
                Edit Staff Salary & Banking Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {staff.name} &bull; <span className="font-mono text-[#F97316]">@{staff.username}</span> &bull; {staff.role}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Section 1: Compensation & Base Salary */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>1. Compensation Structure</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Monthly Base Salary (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="500"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(Number(e.target.value))}
                    placeholder="25000"
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-500/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Pay Frequency *
                  </label>
                  <select
                    value={payFrequency}
                    onChange={(e) => setPayFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-500/20 transition-colors cursor-pointer"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="BI_WEEKLY">Bi-Weekly</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Effective From Date
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-500/20 transition-colors cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Banking & Direct Deposit Details */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>2. Official Bank Routing & Payout Details</span>
                </div>
                <span className="text-[10px] text-slate-400">Used for monthly NEFT/IMPS disbursement</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    placeholder="e.g. HDFC Bank, State Bank of India"
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-500/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Account Type
                  </label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-500/20 transition-colors cursor-pointer"
                  >
                    <option value="SAVINGS">Savings Account</option>
                    <option value="SALARY">Salary Account</option>
                    <option value="CURRENT">Current Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g. 5010023456789"
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-500/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    placeholder="e.g. HDFC0001234"
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono font-bold uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-500/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    UPI ID / VPA (Optional)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. employee@okaxis"
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-500/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    PAN Card Number (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={panNo}
                    onChange={(e) => setPanNo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono font-bold uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-orange-500/20 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#F97316] hover:bg-[#EA580C] shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Salary & Banking Details</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
