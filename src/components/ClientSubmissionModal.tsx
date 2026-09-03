"use client";

import React, { useState, useEffect } from "react";
import { X, Building2, Calendar, Clock, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { getClientsAction, submitLeadToClientAction, ClientItem } from "@/app/actions/clients";
import { NetTermsType, netTermsToDays, calculateApprovalDeadline } from "@/lib/client-store";

interface ClientSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leadId: string;
  leadCustomerName: string;
  currentClientName?: string | null;
  currentNetTerms?: NetTermsType | null;
}

const NET_OPTIONS: { id: NetTermsType; label: string; days: number; desc: string; badgeColor: string }[] = [
  { id: "NET_7", label: "Net 7", days: 7, desc: "Fast approval (7 calendar days)", badgeColor: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { id: "NET_14", label: "Net 14", days: 14, desc: "Standard buyer window (14 calendar days)", badgeColor: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { id: "NET_21", label: "Net 21", days: 21, desc: "Extended verification (21 calendar days)", badgeColor: "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { id: "NET_30", label: "Net 30", days: 30, desc: "Corporate monthly cycle (30 calendar days)", badgeColor: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
];

export function ClientSubmissionModal({
  isOpen,
  onClose,
  onSuccess,
  leadId,
  leadCustomerName,
  currentClientName,
  currentNetTerms,
}: ClientSubmissionModalProps) {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedTerms, setSelectedTerms] = useState<NetTermsType>(currentNetTerms || "NET_14");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getClientsAction().then((list) => {
        setClients(list);
        if (list.length > 0 && !selectedClientId) {
          setSelectedClientId(list[0].id);
          if (!currentNetTerms) {
            setSelectedTerms(list[0].defaultNetTerms);
          }
        }
      });
    }
  }, [isOpen, selectedClientId, currentNetTerms]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Compute live approval deadline based on selected terms
  const today = new Date();
  const deadline = calculateApprovalDeadline(today, selectedTerms);
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setError("Please select a corporate client.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await submitLeadToClientAction({
      leadId,
      clientId: selectedClientId,
      netTerms: selectedTerms,
    });

    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="liquid-glass w-full max-w-lg rounded-3xl p-6 sm:p-7 border border-white/80 dark:border-slate-700 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Submit Lead to Client
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lead: <strong className="text-slate-800 dark:text-slate-200">{leadCustomerName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Client Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              1. Select Buyer / Client Organization
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => {
                const cId = e.target.value;
                setSelectedClientId(cId);
                const found = clients.find((c) => c.id === cId);
                if (found) setSelectedTerms(found.defaultNetTerms);
              }}
              className="w-full p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            >
              {clients.length === 0 ? (
                <option value="">No registered clients. Please add a client first.</option>
              ) : (
                clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Default: {c.defaultNetTerms.replace("_", " ")})
                  </option>
                ))
              )}
            </select>
            {selectedClient?.contactPerson && (
              <p className="text-[11px] text-slate-400 mt-1 pl-1">
                Contact: {selectedClient.contactPerson} {selectedClient.email ? `• ${selectedClient.email}` : ""}
              </p>
            )}
          </div>

          {/* Net Terms Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              2. Approval Window (Net Terms)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {NET_OPTIONS.map((opt) => {
                const isSelected = selectedTerms === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedTerms(opt.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/70 dark:bg-orange-950/30 shadow-md ring-2 ring-orange-500/20"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-orange-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-slate-900 dark:text-white">{opt.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${opt.badgeColor}`}>
                        {opt.days} Days
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Approval Deadline Preview Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-500" />
                <span>Submitted:</span>
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {today.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-orange-500/15">
              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Expected Approval SLA:</span>
              </span>
              <div className="text-right">
                <span className="font-extrabold text-orange-600 dark:text-orange-400 font-mono text-sm">
                  {deadline.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  (Due in {netTermsToDays(selectedTerms)} days)
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedClientId}
              className="liquid-glass-button px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? "Submitting..." : "Confirm Client Submission"}</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
