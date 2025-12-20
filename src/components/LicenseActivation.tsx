import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

// License status from Rust uses adjacently tagged format: { type: "valid" } or { type: "invalid", data: { reason: "..." } }
interface LicenseStatusObject {
  type: "valid" | "needs_validation" | "grace_period" | "invalid" | "not_activated";
  data?: { reason?: string; hours_remaining?: number };
}

interface LicenseInfo {
  status: LicenseStatusObject;
  license_key_preview: string | null;
  machine_id: string | null;
  activated_at: string | null;
  last_validated_at: string | null;
  grace_period_until: string | null;
}

interface LicenseActivationProps {
  onActivated: () => void;
}

export default function LicenseActivation({ onActivated }: LicenseActivationProps) {
  const [licenseKey, setLicenseKey] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [machineId, setMachineId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Get machine ID on mount
  useEffect(() => {
    invoke<string>("get_machine_id").then(setMachineId).catch(console.error);
    // Focus name input on mount
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }, []);

  // Handle license activation
  const handleActivate = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedKey = licenseKey.trim();

    if (!trimmedName) {
      setError("Please enter your name");
      return;
    }

    if (!trimmedEmail) {
      setError("Please enter your email");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!trimmedKey) {
      setError("Please enter a license key");
      return;
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmedKey)) {
      setError("Invalid license key format. Please check and try again.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<LicenseInfo>("activate_license", {
        licenseKey: trimmedKey,
        userName: trimmedName,
        userEmail: trimmedEmail,
      });

      // Check the status
      if (result.status.type === "valid") {
        onActivated();
      } else if (result.status.type === "invalid") {
        setError(result.status.data?.reason || "License is invalid");
      } else {
        setError("Activation failed. Please try again.");
      }
    } catch (err) {
      console.error("License activation error:", err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleActivate();
    }
  };

  // Format the license key as user types (add dashes)
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toLowerCase();

    // Remove non-hex characters except dashes
    value = value.replace(/[^0-9a-f-]/g, "");

    // Auto-format UUID pattern
    const clean = value.replace(/-/g, "");
    if (clean.length <= 32) {
      const parts = [
        clean.slice(0, 8),
        clean.slice(8, 12),
        clean.slice(12, 16),
        clean.slice(16, 20),
        clean.slice(20, 32),
      ].filter(Boolean);
      value = parts.join("-");
    }

    setLicenseKey(value);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">SpeakEasy</h1>
          <p className="text-text-secondary mt-1">Voice-to-Text Application</p>
        </div>

        {/* Activation card */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-text-primary">
              Activate Your License
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              Enter your license key to get started
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Name input */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Your Name
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                placeholder="John Doe"
                className="w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent border-slate-300 bg-white"
                disabled={isLoading}
                autoComplete="name"
              />
            </div>

            {/* Email input */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent border-slate-300 bg-white"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            {/* License key input */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                License Key
              </label>
              <input
                type="text"
                value={licenseKey}
                onChange={handleKeyChange}
                onKeyDown={handleKeyDown}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className={`w-full px-4 py-3 border rounded-lg text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  error
                    ? "border-red-300 bg-red-50"
                    : "border-slate-300 bg-white"
                }`}
                disabled={isLoading}
                autoComplete="off"
                spellCheck={false}
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            {/* Activate button */}
            <button
              onClick={handleActivate}
              disabled={isLoading || !name.trim() || !email.trim() || !licenseKey.trim()}
              className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Activating...
                </>
              ) : (
                "Activate License"
              )}
            </button>

            {/* Machine ID info */}
            {machineId && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-text-secondary">
                  <span className="font-medium">Machine ID:</span>{" "}
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                    {machineId.substring(0, 20)}...
                  </code>
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-text-secondary text-center">
              Don't have a license key?{" "}
              <a
                href="mailto:support@speakeasy.app"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Contact us
              </a>{" "}
              to request beta access.
            </p>
          </div>
        </div>

        {/* Beta notice */}
        <div className="mt-6 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Beta Version
          </span>
        </div>
      </div>
    </div>
  );
}
