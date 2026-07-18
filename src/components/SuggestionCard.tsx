import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangle, MessageCircle, BarChart3, ShieldAlert, Info, ChevronDown, ChevronUp } from "lucide-react"
import type { Suggestion, SuggestionType } from "../types"

interface SuggestionCardProps {
  suggestion: Suggestion
  onDismiss: (id: string) => void
  onUse: (id: string) => void
}

const typeConfig: Record<SuggestionType, {
  icon: React.FC<any>
  colorClass: string
  bgClass: string
  labelKey: string
}> = {
  consistency_flag: {
    icon: AlertTriangle,
    colorClass: "text-copilot-error",
    bgClass: "bg-copilot-error/10 border-copilot-error/30",
    labelKey: "suggestions.consistencyFlag"
  },
  follow_up_question: {
    icon: MessageCircle,
    colorClass: "text-copilot-warning",
    bgClass: "bg-copilot-warning/10 border-copilot-warning/30",
    labelKey: "suggestions.followUp"
  },
  coverage_nudge: {
    icon: BarChart3,
    colorClass: "text-copilot-info",
    bgClass: "bg-copilot-info/10 border-copilot-info/30",
    labelKey: "suggestions.coverageNudge"
  },
  bias_alert: {
    icon: ShieldAlert,
    colorClass: "text-orange-400",
    bgClass: "bg-orange-400/10 border-orange-400/30",
    labelKey: "suggestions.biasAlert"
  },
  info_lookup: {
    icon: Info,
    colorClass: "text-purple-400",
    bgClass: "bg-purple-400/10 border-purple-400/30",
    labelKey: "suggestions.infoLookup"
  }
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onDismiss, onUse }) => {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const config = typeConfig[suggestion.suggestionType]
  const Icon = config.icon
  const contentTruncated = suggestion.content.length > 120

  return (
    <div className={`border rounded-lg p-2.5 animate-slide-in ${config.bgClass}`}>
      <div className="flex items-start gap-2">
        <Icon size={14} className={`${config.colorClass} mt-0.5 shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${config.colorClass}`}>
              {t(config.labelKey)}
            </span>
            {suggestion.priority === "high" && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-copilot-error/20 text-copilot-error font-medium">
                !
              </span>
            )}
          </div>

          <p className="text-xs text-copilot-text leading-relaxed">
            {expanded || !contentTruncated
              ? suggestion.content
              : suggestion.content.slice(0, 120) + "..."}
          </p>

          {contentTruncated && (
            <button onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-0.5 mt-1 text-[10px] text-copilot-text-muted
                hover:text-copilot-text-secondary transition-colors">
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              {expanded ? t("suggestions.less") : t("suggestions.more")}
            </button>
          )}

          {expanded && suggestion.reasoning && (
            <p className="text-[10px] text-copilot-text-muted mt-1 italic">
              {suggestion.reasoning}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => onDismiss(suggestion.id)}
              className="text-[10px] px-2 py-1 rounded border border-copilot-border
                text-copilot-text-muted hover:text-copilot-text hover:border-copilot-border
                transition-colors">
              {t("suggestions.dismiss")}
            </button>
            <button onClick={() => onUse(suggestion.id)}
              className="text-[10px] px-2 py-1 rounded mona-gradient text-white
                font-medium hover:opacity-90 transition-opacity">
              {t("suggestions.use")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SuggestionCard
