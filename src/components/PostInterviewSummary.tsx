import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { ClipboardCheck, ThumbsUp, ThumbsDown, ArrowRight, ShieldCheck } from "lucide-react"
import { useSessionStore } from "../stores/sessionStore"
import type { OverallFit } from "../types"

const fitLabels: Record<OverallFit, { key: string; color: string }> = {
  strong_yes: { key: "summary.strongYes", color: "text-copilot-success" },
  yes: { key: "summary.yes", color: "text-copilot-success/80" },
  maybe: { key: "summary.maybe", color: "text-copilot-warning" },
  no: { key: "summary.no", color: "text-copilot-error/80" },
  strong_no: { key: "summary.strongNo", color: "text-copilot-error" }
}

const PostInterviewSummary: React.FC = () => {
  const { t } = useTranslation()
  const { endResponse, resetSession } = useSessionStore()
  const [overrides, setOverrides] = useState<Record<string, number>>({})

  if (!endResponse) return null

  const { scorecardDraft } = endResponse

  const handleOverride = (competencyId: string, value: number) => {
    setOverrides((prev) => ({ ...prev, [competencyId]: value }))
  }

  const fitConfig = fitLabels[scorecardDraft.overallFit]

  return (
    <div className="p-3 flex flex-col gap-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={16} className="text-mona-primary" />
        <h2 className="font-heading text-sm font-bold text-copilot-text">{t("summary.title")}</h2>
      </div>

      <div className="mona-card p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-copilot-text-secondary">{t("summary.overallFit")}</span>
          <span className={`text-sm font-bold ${fitConfig.color}`}>{t(fitConfig.key)}</span>
        </div>
        <p className="text-xs text-copilot-text leading-relaxed">{scorecardDraft.candidateSummary}</p>
      </div>

      <div className="mona-card p-3">
        <span className="text-xs font-semibold text-copilot-text mb-2 block">{t("summary.competencies")}</span>
        <div className="flex flex-col gap-2">
          {scorecardDraft.competencyScores.map((score) => {
            const current = overrides[score.competencyId] ?? score.suggestedRating
            return (
              <div key={score.competencyId} className="mona-surface p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-copilot-text-secondary">
                    {score.competencyId}
                  </span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star}
                        onClick={() => handleOverride(score.competencyId, star)}
                        className={`w-5 h-5 rounded text-[10px] font-medium transition-colors
                          ${star <= current
                            ? "mona-gradient text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-copilot-text-muted hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
                        {star}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-copilot-text-muted leading-relaxed">{score.evidence}</p>
              </div>
            )
          })}
        </div>
      </div>

      {scorecardDraft.strengths.length > 0 && (
        <div className="mona-card p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ThumbsUp size={12} className="text-copilot-success" />
            <span className="text-xs font-semibold text-copilot-text">{t("summary.strengths")}</span>
          </div>
          <ul className="flex flex-col gap-1">
            {scorecardDraft.strengths.map((s, i) => (
              <li key={i} className="text-[10px] text-copilot-text-secondary pl-4 relative before:content-['•']
                before:absolute before:left-1 before:text-copilot-success">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {scorecardDraft.concerns.length > 0 && (
        <div className="mona-card p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ThumbsDown size={12} className="text-copilot-error" />
            <span className="text-xs font-semibold text-copilot-text">{t("summary.concerns")}</span>
          </div>
          <ul className="flex flex-col gap-1">
            {scorecardDraft.concerns.map((c, i) => (
              <li key={i} className="text-[10px] text-copilot-text-secondary pl-4 relative before:content-['•']
                before:absolute before:left-1 before:text-copilot-error">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {scorecardDraft.suggestedNextSteps.length > 0 && (
        <div className="mona-card p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ArrowRight size={12} className="text-copilot-info" />
            <span className="text-xs font-semibold text-copilot-text">{t("summary.nextSteps")}</span>
          </div>
          <ul className="flex flex-col gap-1">
            {scorecardDraft.suggestedNextSteps.map((s, i) => (
              <li key={i} className="text-[10px] text-copilot-text-secondary pl-4 relative before:content-['→']
                before:absolute before:left-0 before:text-copilot-info">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {scorecardDraft.illegalQuestionFlags.length > 0 && (
        <div className="bg-copilot-error/10 border border-copilot-error/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ShieldCheck size={12} className="text-copilot-error" />
            <span className="text-xs font-semibold text-copilot-error">{t("summary.complianceFlags")}</span>
          </div>
          <ul className="flex flex-col gap-1">
            {scorecardDraft.illegalQuestionFlags.map((f, i) => (
              <li key={i} className="text-[10px] text-copilot-error/80">{f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 mt-1">
        <button onClick={resetSession}
          className="flex-1 py-2 rounded-md border border-copilot-border text-xs
            text-copilot-text-secondary hover:bg-mona-hover transition-colors">
          {t("summary.backToIdle")}
        </button>
        <button className="flex-1 py-2 rounded-md mona-gradient text-white text-xs font-semibold
          hover:opacity-90 transition-opacity">
          {t("summary.confirm")}
        </button>
      </div>
    </div>
  )
}

export default PostInterviewSummary
