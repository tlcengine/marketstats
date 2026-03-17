"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { api, type BrandingProfileAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  Save,
  User,
  Building2,
  Phone,
  Mail,
  Globe,
  Briefcase,
  ImageIcon,
  Check,
  X,
} from "lucide-react";

// ── Image upload component ──

function ImageUploader({
  label,
  currentData,
  currentMime,
  onSelect,
  accept,
  previewSize,
}: {
  label: string;
  currentData: string | null;
  currentMime: string | null;
  onSelect: (file: File | null) => void;
  accept?: string;
  previewSize?: "sm" | "lg";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      onSelect(file);
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    },
    [onSelect]
  );

  const displaySrc =
    preview ?? (currentData && currentMime ? `data:${currentMime};base64,${currentData}` : null);

  const size = previewSize === "lg" ? "h-32 w-48" : "h-24 w-24";

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-dark-gray">{label}</p>
      <div className="flex items-start gap-4">
        <div
          className={`${size} flex items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border-warm bg-cream`}
        >
          {displaySrc ? (
            <img
              src={displaySrc}
              alt={label}
              className="h-full w-full object-contain"
            />
          ) : (
            <ImageIcon className="h-8 w-8 text-border-warm" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            className="gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            Choose File
          </Button>
          {displaySrc && (
            <button
              onClick={() => {
                setPreview(null);
                onSelect(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-xs text-red-500 hover:underline"
            >
              Remove
            </button>
          )}
          <p className="text-[11px] text-body-gray">
            PNG, JPG, or WebP. Max 2MB.
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept || "image/png,image/jpeg,image/webp"}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ── Form field ──

function FormField({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-dark-gray">
        <Icon className="h-3.5 w-3.5 text-body-gray" />
        {label}
      </label>
      <Input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-white"
      />
    </div>
  );
}

// ── Branding preview ──

function BrandingPreview({
  profile,
  headshotPreview,
  logoPreview,
}: {
  profile: {
    agent_name: string;
    title: string;
    company_name: string;
    phone: string;
    email: string;
    website: string;
    headshot_data: string | null;
    headshot_mime: string | null;
    logo_data: string | null;
    logo_mime: string | null;
  };
  headshotPreview: string | null;
  logoPreview: string | null;
}) {
  const headshotSrc =
    headshotPreview ??
    (profile.headshot_data && profile.headshot_mime
      ? `data:${profile.headshot_mime};base64,${profile.headshot_data}`
      : null);

  const logoSrc =
    logoPreview ??
    (profile.logo_data && profile.logo_mime
      ? `data:${profile.logo_mime};base64,${profile.logo_data}`
      : null);

  const hasContent = profile.agent_name || profile.company_name;

  if (!hasContent) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border-warm bg-cream">
        <p className="text-sm text-body-gray">
          Fill in the form and save to see your branding preview.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border-warm bg-white shadow-sm">
      {/* Gold accent bar */}
      <div className="h-1.5 bg-gold" />

      <div className="p-6">
        <div className="flex items-start gap-5">
          {/* Logo / Headshot */}
          <div className="flex flex-col items-center gap-3">
            {logoSrc && (
              <img
                src={logoSrc}
                alt="Company logo"
                className="h-16 w-auto object-contain"
              />
            )}
            {headshotSrc && (
              <img
                src={headshotSrc}
                alt="Agent headshot"
                className="h-20 w-20 rounded-full border-2 border-gold/30 object-cover"
              />
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            {profile.company_name && (
              <h3 className="font-serif text-xl font-bold text-dark-gray">
                {profile.company_name}
              </h3>
            )}
            {profile.agent_name && (
              <p className="mt-1 text-sm font-medium text-dark-gray">
                {profile.agent_name}
                {profile.title && (
                  <span className="ml-1 text-body-gray">- {profile.title}</span>
                )}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-body-gray">
              {profile.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {profile.phone}
                </span>
              )}
              {profile.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {profile.email}
                </span>
              )}
              {profile.website && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {profile.website}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sample chart footer */}
        <div className="mt-6 rounded-lg bg-cream p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-body-gray">
                Sample Chart
              </p>
              <p className="font-serif text-lg font-bold text-dark-gray">
                Median Sales Price
              </p>
            </div>
            <div className="text-right">
              <p className="font-serif text-2xl font-bold text-gold">$485K</p>
              <p className="text-xs text-emerald-600">+5.2% YoY</p>
            </div>
          </div>
          <div className="mt-3 flex gap-1">
            {[40, 55, 48, 62, 58, 70, 65, 78, 72, 85, 80, 88].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gold/40"
                style={{ height: h }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Branded footer */}
      <div className="border-t border-border-warm bg-cream px-6 py-3">
        <p className="text-center text-[10px] text-body-gray">
          Powered by MarketStats | {profile.company_name || "Your Company"} |{" "}
          {profile.agent_name || "Agent Name"}
        </p>
      </div>
    </div>
  );
}

// ── Main page ──

export default function BrandingPage() {
  // Form state
  const [agentName, setAgentName] = useState("");
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [headshotFile, setHeadshotFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch existing profile
  const { data: profile } = useSWR(
    "branding/default",
    () => api.getBranding("default"),
    { revalidateOnFocus: false }
  );

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setAgentName(profile.agent_name || "");
      setTitle(profile.title || "");
      setCompanyName(profile.company_name || "");
      setPhone(profile.phone || "");
      setEmail(profile.email || "");
      setWebsite(profile.website || "");
    }
  }, [profile]);

  const handleHeadshotSelect = useCallback((file: File | null) => {
    setHeadshotFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setHeadshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setHeadshotPreview(null);
    }
  }, []);

  const handleLogoSelect = useCallback((file: File | null) => {
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const formData = new FormData();
      formData.append("user_email", "default");
      formData.append("agent_name", agentName);
      formData.append("title", title);
      formData.append("company_name", companyName);
      formData.append("phone", phone);
      formData.append("email", email);
      formData.append("website", website);

      if (headshotFile) {
        formData.append("headshot", headshotFile);
      }
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      await api.saveBranding(formData);
      await mutate("branding/default");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save branding:", err);
    } finally {
      setSaving(false);
    }
  }, [agentName, title, companyName, phone, email, website, headshotFile, logoFile]);

  // Build preview profile from current form state
  const previewProfile = {
    agent_name: agentName,
    title,
    company_name: companyName,
    phone,
    email,
    website,
    headshot_data: profile?.headshot_data ?? null,
    headshot_mime: profile?.headshot_mime ?? null,
    logo_data: profile?.logo_data ?? null,
    logo_mime: profile?.logo_mime ?? null,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-dark-gray">
          Branding & Profile
        </h1>
        <p className="mt-1 text-sm text-body-gray">
          Configure your agent branding to appear on exported charts and reports.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Agent Information */}
          <div className="rounded-xl border border-border-warm bg-white p-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-dark-gray">
              Agent Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Agent Name"
                icon={User}
                value={agentName}
                onChange={setAgentName}
                placeholder="Jane Smith"
              />
              <FormField
                label="Title"
                icon={Briefcase}
                value={title}
                onChange={setTitle}
                placeholder="Licensed Realtor"
              />
              <FormField
                label="Company Name"
                icon={Building2}
                value={companyName}
                onChange={setCompanyName}
                placeholder="Berkshire Hathaway"
              />
              <FormField
                label="Phone"
                icon={Phone}
                value={phone}
                onChange={setPhone}
                placeholder="(555) 123-4567"
                type="tel"
              />
              <FormField
                label="Email"
                icon={Mail}
                value={email}
                onChange={setEmail}
                placeholder="jane@example.com"
                type="email"
              />
              <FormField
                label="Website"
                icon={Globe}
                value={website}
                onChange={setWebsite}
                placeholder="https://example.com"
                type="url"
              />
            </div>
          </div>

          {/* Images */}
          <div className="rounded-xl border border-border-warm bg-white p-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-dark-gray">
              Images
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <ImageUploader
                label="Agent Headshot"
                currentData={profile?.headshot_data ?? null}
                currentMime={profile?.headshot_mime ?? null}
                onSelect={handleHeadshotSelect}
                previewSize="sm"
              />
              <ImageUploader
                label="Company Logo"
                currentData={profile?.logo_data ?? null}
                currentMime={profile?.logo_mime ?? null}
                onSelect={handleLogoSelect}
                previewSize="lg"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5 bg-gold text-white hover:bg-gold/90"
              size="lg"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
            {profile?.updated_at && (
              <span className="text-xs text-body-gray">
                Last saved: {new Date(profile.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div>
          <h2 className="mb-4 font-serif text-lg font-semibold text-dark-gray">
            Branding Preview
          </h2>
          <BrandingPreview
            profile={previewProfile}
            headshotPreview={headshotPreview}
            logoPreview={logoPreview}
          />
        </div>
      </div>
    </div>
  );
}
