import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSessionStore } from "../stores/sessionStore"
import ConnectionStatus from "./ConnectionStatus"

const SessionBanner: React.FC = () => {
  const { t } = useTranslation()
  const { jobContext, candidateContext, startedAt, notesOnlyMode } = useSessionStore()
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="px-3 py-2 border-b border-copilot-border bg-mona-surface/50">
      <div className="flex items-center justify-between mb-1">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-copilot-text truncate">
            {t("session.interview")}: {jobContext?.title || "—"}
          </div>
          <div className="text-xs text-copilot-text-secondary truncate">
            {t("session.candidate")}: {candidateContext?.name || "—"}
          </div>
        </div>
        <div className="flex items-center gap-3 ml-2">
          <span className="text-xs font-mono text-copilot-text-muted">{formatTime(elapsed)}</span>
          <ConnectionStatus />
        </div>
      </div>

      {notesOnlyMode && (
        <div className="mt-1 px-2 py-1 bg-copilot-warning/10 border border-copilot-warning/30
          rounded text-[10px] text-copilot-warning text-center">
          {t("session.notesOnlyMode")}
        </div>
      )}
    </div>
  )
}

export default SessionBanner
