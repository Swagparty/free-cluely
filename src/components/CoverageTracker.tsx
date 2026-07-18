import React from "react"
import { useTranslation } from "react-i18next"
import { BarChart3 } from "lucide-react"
import { useCoverage } from "../hooks/useCoverage"
import type { CoverageStatus } from "../types"

const statusColors: Record<CoverageStatus, string> = {
  not_started: "bg-gray-300 dark:bg-gray-600",
  partial: "bg-copilot-warning",
  covered: "bg-copilot-success"
}

const CoverageTracker: React.FC = () => {
  const { t } = useTranslation()
  const { coverageState, overallProgress } = useCoverage()

  if (coverageState.length === 0) return null

  return (
    <div className="px-3 py-2 border-b border-copilot-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <BarChart3 size={13} className="text-copilot-info" />
          <span className="text-xs font-semibold text-copilot-text">{t("coverage.title")}</span>
        </div>
        <span className="text-[10px] text-copilot-text-muted">{overallProgress}%</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {coverageState.map((area) => (
          <div key={area.competencyId} className="flex items-center gap-2">
            <span className="text-[10px] text-copilot-text-secondary w-20 truncate shrink-0"
              title={area.competencyName}>
              {area.competencyName}
            </span>
            <div className="flex-1 h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ${statusColors[area.status]}`}
                style={{ width: `${area.depthScore}%` }}
              />
            </div>
            <span className="text-[10px] text-copilot-text-muted w-8 text-right">
              {area.depthScore}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CoverageTracker
