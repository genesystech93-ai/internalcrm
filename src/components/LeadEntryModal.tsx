"use client";

import React, { useState, useEffect } from "react";
import { createLeadAction, getCustomStatusesAction, CustomStatusItem } from "@/app/actions/leads";
import { getCampaignsAction, CampaignItem } from "@/app/actions/campaigns";
import { getAssignableStaffAction, AssignableStaffItem } from "@/app/actions/teams";
import { getClientsAction, ClientItem } from "@/app/actions/clients";
import { LeadSource, LeadStatus } from "@prisma/client";
import { PlusCircle, X, Calendar, Phone, Mail, MapPin, User, Clock, AlertCircle, CheckCircle2, Loader2, Building2 } from "lucide-react";
import { ModalPortal } from "@/components/ModalPortal";

interface LeadEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LeadEntryModal({ isOpen, onClose, onSuccess }: LeadEntryModalProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form Fields (11 Fields)
  const [customerName, setCustomerName] = useState("");
  const [dob, setDob] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [source, setSource] = useState<LeadSource>("DIALER");
  const [closerName, setCloserName] = useState("");
  const [status, setStatus] = useState<LeadStatus>("UPLOADED");
  const [callBackTime, setCallBackTime] = useState("");
  const [notes, setNotes] = useState("");
  const [customStatusName, setCustomStatusName] = useState("");

  const [customStatuses, setCustomStatuses] = useState<CustomStatusItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [staffSuggestions, setStaffSuggestions] = useState<AssignableStaffItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedTerms, setSelectedTerms] = useState<string>("NET_14");

  useEffect(() => {
    if (isOpen) {
      getCustomStatusesAction().then((res) => setCustomStatuses(res));
      getCampaignsAction().then((res) => {
        setCampaigns(res);
        if (res.length > 0 && (!campaignId || !res.some((c) => c.id === campaignId))) {
          setCampaignId(res[0].id);
        }
      });
      getAssignableStaffAction().then((res) => setStaffSuggestions(res));
      getClientsAction().then((res) => setClients(res));
    }
  }, [isOpen, campaignId]);

  // Keyboard shortcut Ctrl+N and Escape listener
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Basic date parsing validation
    const parsedDob = new Date(dob);
    if (isNaN(parsedDob.getTime())) {
      setMessage({ text: "Please enter a valid Date of Birth.", type: "error" });
      setLoading(false);
      return;
    }

    const fd = new FormData();
    fd.append("customerName", customerName);
    fd.append("dob", dob);
    fd.append("mobile", mobile);
    fd.append("address", address);
    fd.append("email", email);
    fd.append("campaignId", campaignId);
    fd.append("source", source);
    fd.append("closerName", closerName);
    fd.append("status", status);
    if (status === "CUSTOM" && customStatusName.trim()) {
      fd.append("customStatusName", customStatusName.trim());
    }
    if (status === "CALL_BACK" && callBackTime) {
      fd.append("callBackTime", callBackTime);
    }
    fd.append("notes", notes);
    if (selectedClientId) {
      fd.append("clientId", selectedClientId);
      fd.append("clientNetTerms", selectedTerms);
    }

    const res = await createLeadAction(fd);

    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: selectedClientId ? "Lead created & directly submitted to corporate buyer!" : "Lead successfully recorded in pipeline!", type: "success" });
      setTimeout(() => {
        onSuccess?.();
        onClose();
        // Reset form
        setCustomerName("");
        setMobile("");
        setAddress("");
        setEmail("");
        setCloserName("");
        setStatus("UPLOADED");
        setCustomStatusName("");
        setCallBackTime("");
        setNotes("");
        setSelectedClientId("");
        setSelectedTerms("NET_14");
        setMessage(null);
      }, 700);
    }
    setLoading(false);
  };

  return (
    <ModalPortal>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      >
      <div className="liquid-glass w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-8 border border-white/90 dark:border-slate-700 shadow-2xl relative custom-scrollbar">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#F97316] to-[#EA580C] text-white flex items-center justify-center shadow-md shadow-orange-500/25">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-[#0F172A] dark:text-white tracking-tight">
                Rapid Lead Data Intake
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] border border-orange-500/20">
                11 Fields • Ctrl+N
              </span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Engineered for high-velocity transfer intake in &lt; 25 seconds.
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`mb-5 p-3.5 rounded-2xl text-xs font-semibold flex items-start gap-2.5 backdrop-blur-md ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                : "bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-400"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Customer Name & DOB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                1. Customer Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Robert M. Jenkins"
                  className="liquid-glass-input w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                2. Date of Birth (DOB) *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="liquid-glass-input w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Mobile & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                  3. Customer Mobile Number *
                </label>
                <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                  {mobile.length}/10 digits
                </span>
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit mobile number"
                  className="liquid-glass-input w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-mono font-bold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                4. Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  maxLength={150}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@domain.com"
                  className="liquid-glass-input w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Address */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
              5. Customer Street Address & ZIP *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
              <textarea
                rows={2}
                required
                maxLength={300}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full street address, apartment/suite, city, state, and ZIP..."
                className="liquid-glass-input w-full pl-10 pr-3.5 py-2 rounded-xl text-xs font-medium focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Row 4: Campaign, Source & Closer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                6. Campaign *
              </label>
              <select
                required
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="liquid-glass-input w-full px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none"
              >
                {campaigns.length === 0 ? (
                  <option value="">No campaigns available</option>
                ) : (
                  campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.vertical ? `(${c.vertical})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                7. Lead Source *
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="liquid-glass-input w-full px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="DIALER">Dialer Transfer</option>
                <option value="MANUAL_DIAL">Manual Dial</option>
                <option value="REFERENCE">Reference</option>
                <option value="CUSTOM">Custom Source</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                  8. Assigned Closer (Optional)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCloserName("Direct")}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      closerName === "Direct"
                        ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                        : "bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20 border border-slate-500/20"
                    }`}
                    title="Direct intake without assigned closer"
                  >
                    + Direct
                  </button>
                  <button
                    type="button"
                    onClick={() => setCloserName("Self (Agent Closed)")}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      closerName.toLowerCase().includes("self")
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C] hover:bg-orange-500/20 border border-orange-500/20"
                    }`}
                    title="Click if you closed this deal yourself"
                  >
                    {closerName.toLowerCase().includes("self") ? "✓ Self" : "+ Self"}
                  </button>
                </div>
              </div>
              <input
                type="text"
                list="closer-suggestions"
                maxLength={100}
                value={closerName}
                onChange={(e) => setCloserName(e.target.value)}
                placeholder="e.g. Direct, Self, or select closer..."
                className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none"
              />
              {closerName.toLowerCase().includes("self") && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                  <span>🎯</span>
                  <span>Self-Closed Deal: You will be credited with BOTH Agent and Closer incentives upon approval.</span>
                </p>
              )}
              <datalist id="closer-suggestions">
                <option value="Direct" />
                <option value="Self (Agent Closed)" />
                {staffSuggestions.map((s) => (
                  <option
                    key={s.id}
                    value={s.name ? `${s.name} (@${s.username})` : `@${s.username}`}
                  >
                    {s.role} {s.currentTeamName ? `• ${s.currentTeamName}` : ""}
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          {/* Optional Direct Client Buyer Dispatch */}
          <div className="p-3.5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Direct Client Buyer Submission (Optional)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Skip closer verification</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    const c = clients.find((cl) => cl.id === e.target.value);
                    if (c) setSelectedTerms(c.defaultNetTerms);
                  }}
                  className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="">-- No Direct Buyer (Pipeline Only) --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.defaultNetTerms.replace("_", " ")})
                    </option>
                  ))}
                </select>
              </div>

              {selectedClientId && (
                <div>
                  <select
                    value={selectedTerms}
                    onChange={(e) => setSelectedTerms(e.target.value)}
                    className="liquid-glass-input w-full px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none"
                  >
                    <option value="NET_7">Net 7 (7 Days SLA)</option>
                    <option value="NET_14">Net 14 (14 Days SLA)</option>
                    <option value="NET_21">Net 21 (21 Days SLA)</option>
                    <option value="NET_30">Net 30 (30 Days SLA)</option>
                  </select>
                </div>
              )}
            </div>
            {selectedClientId && (
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                ⚡ Direct Submission Enabled: Lead will be immediately dispatched to {clients.find(c => c.id === selectedClientId)?.name || "buyer"} with {selectedTerms.replace("_", " ")} SLA upon creation.
              </p>
            )}
          </div>

          {/* Row 5: Status & Callback Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                9. Initial Status (Agent Permitted) *
              </label>
              <select
                value={status}
                onChange={(e) => {
                  const val = e.target.value as LeadStatus;
                  setStatus(val);
                  if (val !== "CUSTOM") setCustomStatusName("");
                }}
                className="liquid-glass-input w-full px-3 py-2.5 rounded-xl text-xs font-bold focus:outline-none"
              >
                <option value="UPLOADED">Uploaded (Awaiting Admin Review)</option>
                <option value="PENDING_VERIFICATION">Pending Verification</option>
                <option value="CALL_BACK">Call Back (Requires Date & Time)</option>
                <option value="VOICEMAIL">Voicemail</option>
                <option value="CUSTOM">✨ Custom Status (Enter Name Below)</option>
                {customStatuses.map((cs) => (
                  <option key={cs.id} value="CUSTOM">Custom: {cs.name}</option>
                ))}
              </select>
            </div>

            {/* Field 10: Call Back Time - Conditional */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1">
                10. Call Back Time {status === "CALL_BACK" && <span className="text-red-500">* Required</span>}
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
                <input
                  type="datetime-local"
                  required={status === "CALL_BACK"}
                  disabled={status !== "CALL_BACK"}
                  value={callBackTime}
                  onChange={(e) => setCallBackTime(e.target.value)}
                  className="liquid-glass-input w-full pl-10 pr-3 py-2.5 rounded-xl text-xs font-mono disabled:opacity-40 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Row 5b: Custom Status Input Field & Fast Tag Selection */}
          {status === "CUSTOM" && (
            <div className="p-3.5 rounded-2xl bg-pink-500/10 border border-pink-500/25 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-700 dark:text-pink-300">
                  Enter Custom Status Label *
                </label>
                <span className="text-[10px] text-pink-600 dark:text-pink-400 font-semibold">
                  Saved to lead & pipeline
                </span>
              </div>
              <input
                type="text"
                required
                maxLength={100}
                value={customStatusName}
                onChange={(e) => setCustomStatusName(e.target.value)}
                placeholder="e.g. Docs Under Review, VIP Follow-Up, Awaiting OTP..."
                className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none border-pink-400/40 text-[#0F172A] dark:text-white"
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Quick presets:</span>
                {[
                  "Docs Under Review",
                  "Callback Tomorrow",
                  "VIP High Priority",
                  "Payment Link Sent",
                  "Manager Review",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomStatusName(preset)}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/70 dark:bg-slate-800 text-pink-700 dark:text-pink-300 border border-pink-500/30 hover:bg-pink-500/20 transition-all cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Row 6: Agent Notes (Field 11) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                11. Summary Notes & Handoff Detail
              </label>
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                {notes.length}/1000 chars
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Important customer conversation context, plan interest, callback notes..."
              className="liquid-glass-input w-full px-3.5 py-2 rounded-xl text-xs font-medium focus:outline-none resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="liquid-glass-button-secondary px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="liquid-glass-button-primary px-7 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlusCircle className="w-4 h-4" />
              )}
              <span>{loading ? "Recording Lead..." : "Submit Lead (< 25s)"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
