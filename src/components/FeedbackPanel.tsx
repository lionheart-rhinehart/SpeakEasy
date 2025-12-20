import { useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

type FeedbackCategory = "bug" | "feature" | "general";

interface FeedbackResponse {
  success: boolean;
  feedback_id: string | null;
  error: string | null;
}

const CATEGORY_INFO: Record<FeedbackCategory, { label: string; description: string; icon: string }> = {
  bug: {
    label: "Bug Report",
    description: "Something isn't working correctly",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  },
  feature: {
    label: "Feature Request",
    description: "I'd like to suggest an improvement",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  },
  general: {
    label: "General Feedback",
    description: "Any other thoughts or comments",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
};

export default function FeedbackPanel() {
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [submitResult, setSubmitResult] = useState<"success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      for (const file of Array.from(files)) {
        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer();
        const fileData = Array.from(new Uint8Array(arrayBuffer));

        // Upload to Supabase Storage
        const url = await invoke<string>("upload_feedback_attachment", {
          fileName: file.name,
          fileData,
          contentType: file.type || "application/octet-stream",
        });

        setAttachments((prev) => [...prev, { name: file.name, url }]);
      }
    } catch (error) {
      console.error("Failed to upload attachment:", error);
      setErrorMessage(`Failed to upload: ${error}`);
    } finally {
      setIsUploading(false);
      // Clear the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      setErrorMessage("Please enter your feedback message");
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);
    setErrorMessage(null);

    try {
      const response = await invoke<FeedbackResponse>("submit_feedback", {
        category,
        message: message.trim(),
        videoUrl: videoUrl.trim() || null,
      });

      if (response.success) {
        setSubmitResult("success");
        // Clear the form
        setMessage("");
        setVideoUrl("");
        setAttachments([]);
      } else {
        setSubmitResult("error");
        setErrorMessage(response.error || "Failed to submit feedback");
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      setSubmitResult("error");
      setErrorMessage(String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // If successfully submitted, show success message
  if (submitResult === "success") {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <svg
            className="w-12 h-12 mx-auto text-green-500 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-green-800 mb-1">Thank you!</h3>
          <p className="text-sm text-green-600">
            Your feedback has been submitted. We'll review it and may follow up via email.
          </p>
        </div>
        <button
          onClick={() => setSubmitResult(null)}
          className="w-full px-4 py-2 bg-slate-100 text-text-primary text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
        >
          Send More Feedback
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Selection */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2">
          Category
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(CATEGORY_INFO) as FeedbackCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`p-3 rounded-lg border text-center transition-colors ${
                category === cat
                  ? "bg-primary-50 border-primary-300 text-primary-700"
                  : "bg-white border-slate-200 text-text-secondary hover:border-primary-200 hover:bg-primary-50"
              }`}
            >
              <svg
                className={`w-5 h-5 mx-auto mb-1 ${
                  category === cat ? "text-primary-600" : "text-slate-400"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={CATEGORY_INFO[cat].icon}
                />
              </svg>
              <span className="text-xs font-medium">{CATEGORY_INFO[cat].label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-text-secondary mt-1">
          {CATEGORY_INFO[category].description}
        </p>
      </div>

      {/* Message */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2">
          Your Feedback
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            category === "bug"
              ? "Describe what happened, what you expected, and steps to reproduce..."
              : category === "feature"
              ? "Describe the feature you'd like to see and why it would be helpful..."
              : "Share your thoughts, suggestions, or any other feedback..."
          }
          rows={5}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Video URL (optional) */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2">
          Video URL (optional)
        </label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Paste a Loom or other video link..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <p className="text-xs text-text-secondary mt-1">
          Record a screen capture with Loom and paste the link here
        </p>
      </div>

      {/* Attachments */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2">
          Screenshots (optional)
        </label>
        <div className="space-y-2">
          {/* Existing attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-xs"
                >
                  <span className="truncate max-w-[150px]">{att.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-text-secondary hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Add Screenshot
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !message.trim()}
        className="w-full px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
            Submitting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
            Submit Feedback
          </>
        )}
      </button>

      <p className="text-xs text-text-secondary text-center">
        Your feedback is linked to your license and we may follow up via email.
      </p>
    </div>
  );
}
