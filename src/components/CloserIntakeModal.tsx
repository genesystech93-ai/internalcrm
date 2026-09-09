"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Save,
  Phone,
  MapPin,
  Mail,
  Calendar,
  User,
  Building2,
  FileText,
  Sparkles,
  ClipboardList,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  LeadItem,
  updateCloserIntakeAction,
} from "@/app/actions/leads";
import {
  parseIntakeAnswers,
  formatClientSubmissionScript,
} from "@/lib/campaign-intake";
import {
  getCampaignCriteriaAction,
  CampaignCriteria,
  CampaignQuestion,
} from "@/app/actions/campaigns";
import { ModalPortal } from "@/components/ModalPortal";

interface CloserIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadItem | null;
  onSuccess?: () => void;
}

export function CloserIntakeModal({
  isOpen,
  onClose,
  lead,
  onSuccess,
}: CloserIntakeModalProps) {
  const [criteria, setCriteria] = useState<CampaignCriteria | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (isOpen && lead) {
      setLoading(true);
      setMessage(null);

      // Parse existing answers from notes
      const existing = parseIntakeAnswers(lead.notes);
      setAnswers(existing);

      getCampaignCriteriaAction(lead.campaignId)
        .then((res) => {
          setCriteria(res);
          // Set defaults for unanswered yes_no or default questions
          const updated = { ...existing };
          for (const q of res.questions) {
            if (!updated[q.id] && q.defaultValue) {
              updated[q.id] = q.defaultValue;
            }
          }
          setAnswers(updated);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  const handleInputChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSave = async (isCompleted: boolean) => {
    setSaving(true);
    setMessage(null);

    // If completing, check required fields
    if (isCompleted && criteria) {
      const missing = criteria.questions.filter((q) => q.required && !answers[q.id]?.trim());
      if (missing.length > 0) {
        setMessage({
          text: `Please complete all required fields (${missing.length} missing: ${missing[0].label}).`,
          type: "error",
        });
        setSaving(false);
        return;
      }
    }

    const res = await updateCloserIntakeAction({
      leadId: lead.id,
      intakeAnswers: answers,
      isCompleted,
    });

    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({
        text: res.message || (isCompleted ? "Case verified and ready for client submission!" : "Progress saved."),
        type: "success",
      });
      onSuccess?.();
      if (isCompleted) {
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    }
    setSaving(false);
  };

  const handleCopyScript = () => {
    const script = formatClientSubmissionScript(lead, answers);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <ModalPortal>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      >
        <div className="liquid-glass w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-white/80 dark:border-slate-700 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Closer Case Verification & Intake Form
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20">
                    {lead.customerName}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete the case questionnaire during the closer qualification call. All questions required for client submission.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyScript}
                className="liquid-glass-button-secondary text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-orange-600 dark:text-orange-400 border-orange-500/20 hover:border-orange-500/40"
                title="Copy formatted client submission script to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Script Copied!" : "Copy Submission Script"}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lead Quick Facts Banner */}
          <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                <Phone className="w-3.5 h-3.5 text-orange-500" />
                <span className="font-mono font-bold">{lead.mobile}</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{lead.address}</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{lead.email}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px]">
                Closer: {lead.closerName || "Unassigned"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-[11px] border border-orange-500/20">
                {lead.campaignName || "Campaign"}
              </span>
            </div>
          </div>

          {/* Toast Message */}
          {message && (
            <div
              className={`p-3 mx-6 mt-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
                message.type === "success"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              }`}
            >
              <span>{message.text}</span>
              <button
                type="button"
                onClick={() => setMessage(null)}
                className="p-1 hover:opacity-75 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Questionnaire Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
            {loading ? (
              <div className="py-20 text-center text-slate-400">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-orange-500" />
                <p className="text-xs font-semibold">Loading campaign criteria questions...</p>
              </div>
            ) : !criteria ? (
              <div className="py-12 text-center text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold">No criteria configured for this campaign</p>
                <p className="text-xs mt-1">Please ask an Administrator to configure intake questions in Campaign Settings.</p>
              </div>
            ) : (
              criteria.sections.map((sec, secIdx) => {
                const secQuestions = criteria.questions.filter((q) => q.section === sec);
                if (secQuestions.length === 0) return null;

                return (
                  <div
                    key={secIdx}
                    className="liquid-glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span>{sec}</span>
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        {secQuestions.length} Questions
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {secQuestions.map((q) => {
                        const val = answers[q.id] || "";
                        const isTextarea = q.type === "textarea";

                        return (
                          <div
                            key={q.id}
                            className={isTextarea ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}
                          >
                            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {q.label}
                              {q.required && <span className="text-red-500 ml-1">*</span>}
                            </label>

                            {q.type === "yes_no" ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleInputChange(q.id, "Yes")}
                                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    val === "Yes"
                                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                  }`}
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInputChange(q.id, "No")}
                                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    val === "No"
                                      ? "bg-red-500 text-white shadow-md shadow-red-500/20 scale-105"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                  }`}
                                >
                                  No
                                </button>
                              </div>
                            ) : isTextarea ? (
                              <textarea
                                rows={2}
                                value={val}
                                onChange={(e) => handleInputChange(q.id, e.target.value)}
                                placeholder={q.placeholder || "Enter details..."}
                                className="liquid-glass-input text-xs w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-slate-900 dark:text-white"
                              />
                            ) : (
                              <input
                                type={q.type === "number" ? "number" : "text"}
                                value={val}
                                onChange={(e) => handleInputChange(q.id, e.target.value)}
                                placeholder={q.placeholder || "Enter answer..."}
                                className="liquid-glass-input text-xs w-full py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-slate-900 dark:text-white"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCopyScript}
              className="liquid-glass-button-secondary text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Formatted Client Submission Script</span>
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="liquid-glass-button-secondary text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer flex-1 sm:flex-initial justify-center"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="liquid-glass-button text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer flex-1 sm:flex-initial justify-center"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
                <span>Complete & Verify Case</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
