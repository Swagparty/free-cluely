import React, { useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Lightbulb } from "lucide-react"
import { useSuggestions } from "../hooks/useSuggestions"
import SuggestionCard from "./SuggestionCard"
import { useSession } from "../hooks/useSession"

const SuggestionFeed: React.FC = () => {
  const { t } = useTranslation()
  const { suggestions, dismiss, use } = useSuggestions()
  const { endSession, status } = useSession()
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (feedRef.current && suggestions.length > 0) {
      feedRef.current.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [suggestions.length])

  return (
    <div className="flex flex-col border-b border-copilot-border">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Lightbulb size={13} className="text-copilot-warning" />
          <span className="text-xs font-semibold text-copilot-text">{t("suggestions.title")}</span>
          {suggestions.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-mona-primary/20 text-mona-primary-light font-medium">
              {suggestions.length}
            </span>
          )}
        </div>
        {status === "active" && (
          <button onClick={endSession}
            className="text-[10px] px-2 py-1 rounded border border-copilot-error/30
              text-copilot-error hover:bg-copilot-error/10 transition-colors">
            {t("session.endSession")}
          </button>
        )}
      </div>

      <div ref={feedRef} className="px-3 pb-2 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
        {suggestions.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-copilot-text-muted">{t("suggestions.empty")}</p>
          </div>
        ) : (
          suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onDismiss={dismiss}
              onUse={use}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default SuggestionFeed
