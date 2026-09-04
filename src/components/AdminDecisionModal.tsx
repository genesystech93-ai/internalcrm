"use client";

import React, { useState } from "react";
import { adminDecisionAction, adminReclassifyLeadAction } from "@/app/actions/leads";
import { LeadStatus } from "@prisma/client";
import { XCircle, X, ShieldAlert } from "lucide-react";
import { ModalPortal } from "@/components/ModalPortal";

interface AdminDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leadId: string;
  leadCustomerName: string;
  mode: "REJECT" | "RECLASSIFY";
  currentStatus?: LeadStatus;
  targetStatus?: LeadStatus;
}

export function AdminDecisionModal({
  isOpen,
  onClose,
  onSuccess,
  leadId,
  leadCustomerName,
  mode,
  currentStatus,
  targetStatus,
}: AdminDecisionModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isApprovedReversal = currentStatus === "APPROVED";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Audit reason is strictly mandatory.");
      return;
    }

    setLoading(true);
    setError(null);

    let res;
    if (mode === "REJECT") {
      res = await adminDecisionAction(leadId, "REJECTED", reason);
    } else if (targetStatus) {
      res = await adminReclassifyLeadAction(leadId, targetStatus, reason);
    }

    if (res?.error) {
      setError(res.error);
    } else {
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  return (
    <ModalPortal>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      >
        <div className="liquid-glass w-full max-w-md rounded-3xl p-6 sm:p-8 border border-white/90 dark:border-slate-700 shadow-2xl relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[#64748B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
              isApprovedReversal ? "bg-amber-500/15 text-[#D97706]" : "bg-red-500/15 text-[#EF4444]"
            }`}
          >
            {isApprovedReversal ? <ShieldAlert className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white">
              {isApprovedReversal
                ? "Reclassify Approved Lead & Reverse Incentive"
                : mode === "REJECT"
                ? "Reject Lead (Mandatory Reason)"
                : `Reclassify Lead to ${targetStatus}`}
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Lead: <strong className="text-[#0F172A] dark:text-white">{leadCustomerName}</strong>
            </p>
          </div>
        </div>

        {isApprovedReversal && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-[#B45309] dark:text-amber-300 leading-relaxed">
            ⚠️ <strong>Incentive Reversal Notice:</strong> This lead was previously marked <strong>APPROVED</strong> and generated an active incentive earning. Reclassifying will <strong>auto-void and reverse the credited commission</strong> from the agent.
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-400 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
              Mandatory Audit Reason *
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a detailed operational reason for this decision..."
              className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="liquid-glass-button-secondary flex-1 py-2.5 rounded-xl font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white shadow-md cursor-pointer ${
                isApprovedReversal
                  ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                  : "bg-red-600 hover:bg-red-700 shadow-red-600/20"
              }`}
            >
              {loading ? "Processing..." : "Confirm & Log Audit"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
