"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Check,
  ClipboardList,
  Sparkles,
  Save,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Eye,
  Loader2,
  ListChecks,
} from "lucide-react";
import {
  CampaignItem,
  getCampaignCriteriaAction,
  saveCampaignCriteriaAction,
  getStandardTemplatesAction,
} from "@/app/actions/campaigns";
import {
  CampaignCriteria,
  CampaignQuestion,
  QuestionInputType,
  MVA_STANDARD_TEMPLATE,
  SLIP_AND_FALL_TEMPLATE,
  WORKERS_COMP_TEMPLATE,
  PERSONAL_INJURY_TEMPLATE,
} from "@/lib/campaign-templates";
import { ModalPortal } from "@/components/ModalPortal";

interface CampaignCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: CampaignItem | null;
  onSaved?: () => void;
}

export function CampaignCriteriaModal({
  isOpen,
  onClose,
  campaign,
  onSaved,
}: CampaignCriteriaModalProps) {
  const [criteria, setCriteria] = useState<CampaignCriteria | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // New Question Draft Form
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newType, setNewType] = useState<QuestionInputType>("text");
  const [newRequired, setNewRequired] = useState(true);
  const [newPlaceholder, setNewPlaceholder] = useState("");

  useEffect(() => {
    if (isOpen && campaign) {
      setLoading(true);
      setMessage(null);
      getCampaignCriteriaAction(campaign.id)
        .then((res) => {
          setCriteria(res);
          if (res.sections.length > 0) {
            setNewSection(res.sections[0]);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, campaign]);

  if (!isOpen || !campaign) return null;

  const handleApplyTemplate = (templateCriteria: CampaignCriteria) => {
    setCriteria({
      ...templateCriteria,
      campaignId: campaign.id,
    });
    if (templateCriteria.sections.length > 0) {
      setNewSection(templateCriteria.sections[0]);
    }
    setMessage({
      text: `Loaded "${templateCriteria.templateName}" template with ${templateCriteria.questions.length} questions. Click "Save Criteria" to apply.`,
      type: "success",
    });
  };

  const handleSave = async () => {
    if (!criteria) return;
    setSaving(true);
    setMessage(null);

    const res = await saveCampaignCriteriaAction(campaign.id, criteria);
    if (res.error) {
      setMessage({ text: res.error, type: "error" });
    } else {
      setMessage({ text: res.message || "Criteria updated successfully!", type: "success" });
      onSaved?.();
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
    setSaving(false);
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!criteria) return;
    setCriteria({
      ...criteria,
      questions: criteria.questions.filter((q) => q.id !== questionId),
    });
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!criteria || !newLabel.trim()) return;

    const newQ: CampaignQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      section: newSection.trim() || criteria.sections[0] || "1. General Questions",
      label: newLabel.trim(),
      type: newType,
      required: newRequired,
      placeholder: newPlaceholder.trim() || undefined,
    };

    const updatedSections = criteria.sections.includes(newQ.section)
      ? criteria.sections
      : [...criteria.sections, newQ.section];

    setCriteria({
      ...criteria,
      sections: updatedSections,
      questions: [...criteria.questions, newQ],
    });

    setNewLabel("");
    setNewPlaceholder("");
    setShowAddQuestion(false);
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
                <ListChecks className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Campaign Intake Questionnaire & Criteria Builder
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-xs border border-orange-500/20">
                    {campaign.name}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure required case questions that Closers complete during verification calls.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className={`liquid-glass-button-secondary text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer ${
                  previewMode ? "text-orange-600 border-orange-500/30 bg-orange-50/50" : ""
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{previewMode ? "Edit Builder" : "Closer Preview"}</span>
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

          {/* Quick Preset Selector Toolbar */}
          <div className="p-3 sm:px-6 bg-slate-100/70 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Load Standard Sample:
              </span>

              <button
                type="button"
                onClick={() => handleApplyTemplate(MVA_STANDARD_TEMPLATE)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white transition-all shadow-xs cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>🚗 MVA Sample (32 Questions)</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate(SLIP_AND_FALL_TEMPLATE)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-500/30 hover:text-orange-500 transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                <span>⚠️ Slip & Fall</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate(WORKERS_COMP_TEMPLATE)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-500/30 hover:text-orange-500 transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                <span>💼 Workers' Comp</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate(PERSONAL_INJURY_TEMPLATE)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-orange-500/30 hover:text-orange-500 transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                <span>🩹 General Injury</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                {criteria?.questions.length || 0} Questions Configured
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

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
            {loading ? (
              <div className="py-20 text-center text-slate-400">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-orange-500" />
                <p className="text-xs font-semibold">Loading criteria questions...</p>
              </div>
            ) : !criteria ? (
              <div className="py-12 text-center text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold">No criteria configured yet</p>
                <p className="text-xs mt-1">Select a standard template above to get started.</p>
              </div>
            ) : previewMode ? (
              /* Closer Preview Mode */
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Closer View Preview:</strong> This is how the case questionnaire will appear to Closers and Admins during verification calls.
                  </span>
                </div>

                {criteria.sections.map((sec, secIdx) => {
                  const secQuestions = criteria.questions.filter((q) => q.section === sec);
                  if (secQuestions.length === 0) return null;

                  return (
                    <div
                      key={secIdx}
                      className="liquid-glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4"
                    >
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400 pb-2 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                        <span>{sec}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {secQuestions.length} Fields
                        </span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {secQuestions.map((q) => (
                          <div
                            key={q.id}
                            className={q.type === "textarea" ? "md:col-span-2" : ""}
                          >
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              {q.label}
                              {q.required && <span className="text-red-500 ml-1">*</span>}
                            </label>

                            {q.type === "yes_no" ? (
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-xl text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                                  Yes
                                </span>
                                <span className="px-3 py-1 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-500">
                                  No
                                </span>
                              </div>
                            ) : q.type === "textarea" ? (
                              <textarea
                                disabled
                                placeholder={q.placeholder || "Enter details..."}
                                rows={2}
                                className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 cursor-not-allowed"
                              />
                            ) : (
                              <input
                                type="text"
                                disabled
                                placeholder={q.placeholder || "Enter details..."}
                                className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 cursor-not-allowed"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Builder Mode */
              <div className="space-y-6">
                {criteria.sections.map((sec, secIdx) => {
                  const secQuestions = criteria.questions.filter((q) => q.section === sec);

                  return (
                    <div
                      key={secIdx}
                      className="liquid-glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                          <span>{sec}</span>
                        </h4>
                        <span className="text-[11px] font-mono text-slate-500">
                          {secQuestions.length} Questions
                        </span>
                      </div>

                      {secQuestions.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No questions in this section yet.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {secQuestions.map((q, idx) => (
                            <div
                              key={q.id}
                              className="py-2.5 flex items-center justify-between gap-3 group hover:bg-slate-500/5 px-2 rounded-xl transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {q.label}
                                  </span>
                                  {q.required ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                      Required
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20">
                                      Optional
                                    </span>
                                  )}
                                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                    {q.type}
                                  </span>
                                </div>
                                {q.placeholder && (
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                                    Hint: {q.placeholder}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Question"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Custom Question Accordion */}
                <div className="liquid-glass-card p-4 rounded-2xl border border-dashed border-orange-500/40">
                  {!showAddQuestion ? (
                    <button
                      type="button"
                      onClick={() => setShowAddQuestion(true)}
                      className="w-full py-2.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-500 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Custom Question to Criteria</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAddQuestion} className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          New Case Intake Question
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddQuestion(false)}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Question Title / Text *
                          </label>
                          <input
                            type="text"
                            required
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="e.g. Did you receive physical therapy?"
                            className="liquid-glass-input text-xs w-full py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Section Group
                          </label>
                          <input
                            type="text"
                            value={newSection}
                            onChange={(e) => setNewSection(e.target.value)}
                            placeholder="e.g. 1. Accident Details"
                            className="liquid-glass-input text-xs w-full py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Answer Input Type
                          </label>
                          <select
                            value={newType}
                            onChange={(e) => setNewType(e.target.value as QuestionInputType)}
                            className="liquid-glass-input text-xs w-full py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            <option value="text">Single-line Text</option>
                            <option value="textarea">Multi-line Paragraph</option>
                            <option value="yes_no">Yes / No Toggle</option>
                            <option value="date">Date Picker</option>
                            <option value="number">Numeric</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Placeholder / Hint
                          </label>
                          <input
                            type="text"
                            value={newPlaceholder}
                            onChange={(e) => setNewPlaceholder(e.target.value)}
                            placeholder="e.g. e.g. Hospital name or None"
                            className="liquid-glass-input text-xs w-full py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700"
                          />
                        </div>

                        <div className="sm:col-span-2 flex items-center justify-between pt-1">
                          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newRequired}
                              onChange={(e) => setNewRequired(e.target.checked)}
                              className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                            />
                            <span>Mandatory field for Closer submission</span>
                          </label>

                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Question</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Save Actions */}
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="liquid-glass-button-secondary text-xs px-4 py-2 rounded-xl font-bold cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !criteria}
              className="liquid-glass-button text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Campaign Criteria</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
