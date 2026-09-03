"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  getCompanySettingsAction,
  updateCompanySettingsAction,
  uploadCompanyLogoAction,
  removeCompanyLogoAction,
  CompanySettings,
} from "@/app/actions/company-settings";
import { Building2, Upload, Trash2, CheckCircle2, AlertCircle, Globe, Mail, Phone, MapPin, Sparkles, FileText } from "lucide-react";

export function CompanySettingsCard() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSettings = async () => {
    try {
      const data = await getCompanySettingsAction();
      setSettings(data);
      if (data.hasCustomLogo) {
        setLogoPreview(`/api/logo?v=${Date.now()}`);
      } else {
        setLogoPreview(null);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Fast client validation
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Logo image must be smaller than 5MB." });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("logoFile", file);

    const res = await uploadCompanyLogoAction(formData);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({ type: "success", text: res.message || "Logo uploaded successfully!" });
      setLogoPreview(URL.createObjectURL(file));
      await loadSettings();
    }
    setIsUploading(false);
  };

  const handleRemoveLogo = async () => {
    if (!confirm("Are you sure you want to remove the custom logo and revert to the default brand monogram?")) return;
    setIsUploading(true);
    const res = await removeCompanyLogoAction();
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Logo removed." });
      setLogoPreview(null);
      await loadSettings();
    }
    setIsUploading(false);
  };

  const handleSaveDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await updateCompanySettingsAction(formData);

    if (res.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({ type: "success", text: res.message || "Settings saved successfully." });
      await loadSettings();
    }
    setIsSaving(false);
  };

  if (!settings) {
    return (
      <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
        <div className="h-4 w-72 bg-slate-200 dark:bg-slate-700 rounded-lg mb-8" />
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
      </div>
    );
  }

  return (
    <div id="company-settings" className="liquid-glass-card rounded-3xl p-6 sm:p-8 mb-8 border border-white/80 dark:border-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#F97316]">
              <Building2 className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
              Company Branding & Organization Profile
            </h2>
          </div>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Upload your official company logo, customize brand identifiers, and update corporate floor details.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md ${
            message.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              : "bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid: Logo Uploader on Left, Details Form on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Official Logo Upload Center */}
        <div className="lg:col-span-4 flex flex-col items-center text-center p-6 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/80 dark:border-slate-700/60">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
              Official Company Logo
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-orange-500/10 text-[#EA580C] dark:text-[#FB923C]">
              {logoPreview ? "Custom Logo Active" : "Default Badge Active"}
            </span>
          </div>

          {/* Logo Display Box */}
          <div className="w-36 h-36 rounded-2xl border-2 border-dashed border-orange-300 dark:border-slate-600 bg-white/70 dark:bg-slate-900/60 flex flex-col items-center justify-center p-3 relative group overflow-hidden shadow-sm">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreview}
                alt="Uploaded Company Logo"
                className="w-full h-full object-contain drop-shadow-sm"
              />
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FB923C] to-[#F97316] text-white flex items-center justify-center font-extrabold text-2xl shadow-md shadow-orange-500/25 mb-1.5">
                  G
                </div>
                <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8]">
                  Genesoft Monogram
                </span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-3 mb-4">
            Recommended: Transparent PNG, SVG, or high-res WEBP. Maximum file size: 5MB.
          </p>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={handleLogoUpload}
            className="hidden"
          />

          <div className="w-full flex flex-col gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="liquid-glass-button-primary w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? "Uploading Logo..." : "Upload New Logo"}</span>
            </button>

            {logoPreview && (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleRemoveLogo}
                className="liquid-glass-button-secondary w-full py-2 px-3 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:border-red-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Custom Logo</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Corporate Details Form */}
        <div className="lg:col-span-8">
          <form onSubmit={handleSaveDetails} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5">
                  Legal Entity Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  required
                  defaultValue={settings.companyName}
                  placeholder="e.g. Genesoft Infotech Private Limited"
                  className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5">
                  Brand Display Name
                </label>
                <input
                  type="text"
                  name="brandName"
                  required
                  defaultValue={settings.brandName}
                  placeholder="e.g. Genesoft Infotech"
                  className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#F97316] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5">
                Operations Tagline
              </label>
              <input
                type="text"
                name="tagline"
                defaultValue={settings.tagline}
                placeholder="e.g. High-Velocity BPO Sales Floor & Campaign Operations"
                className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Floor Support Email</span>
                </label>
                <input
                  type="email"
                  name="supportEmail"
                  required
                  defaultValue={settings.supportEmail}
                  placeholder="support@genesoftinfotech.com"
                  className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Operations Hotline Phone</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  defaultValue={settings.phone}
                  placeholder="+1 (888) 436-3763"
                  className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Corporate Website URL</span>
                </label>
                <input
                  type="url"
                  name="website"
                  defaultValue={settings.website}
                  placeholder="https://genesoftinfotech.com"
                  className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Registration / CIN Number</span>
                </label>
                <input
                  type="text"
                  name="registrationNumber"
                  defaultValue={settings.registrationNumber}
                  placeholder="GEN-INF-2026-BPO"
                  className="liquid-glass-input w-full px-3.5 py-2.5 rounded-xl text-xs font-mono focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
                <span>Headquarters Office Address</span>
              </label>
              <textarea
                name="headquarters"
                rows={2}
                defaultValue={settings.headquarters}
                placeholder="Full corporate headquarters address..."
                className="liquid-glass-input w-full px-3.5 py-2 rounded-xl text-xs font-medium focus:outline-none resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="liquid-glass-button-primary py-2.5 px-6 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-orange-500/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save Company Profile"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
