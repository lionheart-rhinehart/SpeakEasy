import { useState, ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
  badge?: string | number;
  headerAction?: ReactNode;
}

export default function CollapsibleSection({
  title,
  icon,
  defaultExpanded = false,
  children,
  badge,
  headerAction,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <section className="border-b border-slate-200 last:border-b-0">
      {/* Header - clickable to expand/collapse */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-3 text-left hover:bg-slate-50 transition-colors rounded"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-500">{icon}</span>}
          <h3 className="text-sm font-medium text-text-primary">{title}</h3>
          {badge !== undefined && (
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerAction && (
            <span onClick={(e) => e.stopPropagation()}>{headerAction}</span>
          )}
          {/* Chevron icon */}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Content - animated expand/collapse */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isExpanded ? "max-h-[3000px] opacity-100 pb-4" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-4">{children}</div>
      </div>
    </section>
  );
}
